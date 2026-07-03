import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Pencil, Sparkles, RefreshCw, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

interface Option {
  id?: number
  content: string
  is_correct: boolean
}

interface Flashcard {
  id: number
  content: string
  explanation: string
  ai_explanation?: string
  hint?: string | null
  mnemonic?: string | null
  image?: string | null
  audio?: string | null
  others?: Record<string, any> | null
  options?: Option[]
}

interface FlashcardEditModalProps {
  isOpen: boolean
  onClose: () => void
  flashcard: Flashcard | null
  onSave: (updatedCard: any, addAnother?: boolean) => Promise<any>
  isSaving: boolean
  availableColumns?: string[]
  practiceSettings?: any
}

// Known structured keys that are displayed in dedicated fields
const STRUCTURED_KEYS = new Set([
  'back_img', 'back_audio_url',
  'front_audio_content', 'back_audio_content',
  'other_content',
  // Legacy keys from imports that shouldn't clutter the JSON editor
  'id', 'item_id', 'order_in_container',
])

export const FlashcardEditModal: React.FC<FlashcardEditModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  onSave,
  isSaving,
  availableColumns = [],
  practiceSettings = {},
}) => {
  const [formData, setFormData] = useState<any>(null)
  const [customJsonText, setCustomJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [regenStatus, setRegenStatus] = useState<Record<string, string>>({})
  const [isGeneratingField, setIsGeneratingField] = useState<Record<string, boolean>>({})

  const showAiExplanation = useMemo(() => {
    return availableColumns.includes('ai_explanation') || 
           availableColumns.includes('explanation_ai') ||
           (formData?.ai_explanation && formData.ai_explanation.trim() !== '')
  }, [availableColumns, formData?.ai_explanation])

  const showHint = useMemo(() => {
    return availableColumns.includes('hint') || 
           availableColumns.includes('gợi ý') ||
           (formData?.hint && formData.hint.trim() !== '')
  }, [availableColumns, formData?.hint])

  const showMnemonic = useMemo(() => {
    return availableColumns.includes('mnemonic') || 
           availableColumns.includes('cách nhớ') ||
           (formData?.mnemonic && formData.mnemonic.trim() !== '')
  }, [availableColumns, formData?.mnemonic])

  const handleGenerateAIField = async (field: string) => {
    if (!formData?.id) return;
    setIsGeneratingField(prev => ({ ...prev, [field]: true }));
    try {
      const deckId = formData.deck_id || formData.quiz_id;
      
      // Call the generic AI generator endpoint
      await axios.post(`/api/v1/deck/${deckId}/cards/${formData.id}/generate-ai`, { field: field });
      
      // Fetch the updated card values from the server
      const res = await axios.get(`/api/v1/deck/${deckId}/cards/${formData.id}`);
      if (res.data) {
        let parsedOthers: any = {}
        if (res.data.others) {
          try {
            parsedOthers = typeof res.data.others === 'string' ? JSON.parse(res.data.others) : res.data.others
          } catch (e) {
            console.error("Failed to parse others field", e)
          }
        }
        setFormData({
          ...res.data,
          others: {
            back_img: '',
            back_audio_url: '',
            front_audio_content: '',
            back_audio_content: '',
            ...parsedOthers
          }
        });
      }
    } catch (e) {
      console.error(`Failed to generate AI ${field}`, e);
      alert(`Gửi yêu cầu tạo AI cho ô ${field} thất bại.`);
    } finally {
      setIsGeneratingField(prev => ({ ...prev, [field]: false }));
    }
  }

  useEffect(() => {
    if (flashcard) {
      let parsedOthers: any = {}
      if (flashcard.others) {
        try {
          parsedOthers = typeof flashcard.others === 'string' ? JSON.parse(flashcard.others) : flashcard.others
        } catch (e) {
          console.error("Failed to parse others field", e)
        }
      }

      const merged = {
        back_img: '',
        back_audio_url: '',
        front_audio_content: '',
        back_audio_content: '',
        ...parsedOthers
      }

      // Pre-fill missing custom columns with empty string
      availableColumns.forEach(col => {
        if (col !== 'front' && col !== 'back' && merged[col] === undefined) {
          merged[col] = ''
        }
      })

      setFormData({
        ...flashcard,
        others: merged
      })

      // Extract custom (non-structured) keys into JSON text
      const customObj: Record<string, any> = {}
      for (const [k, v] of Object.entries(merged)) {
        if (!STRUCTURED_KEYS.has(k)) {
          customObj[k] = v
        }
      }
      setCustomJsonText(
        Object.keys(customObj).length > 0
          ? JSON.stringify(customObj, null, 2)
          : ''
      )
      setJsonError('')
    } else {
      setFormData(null)
      setCustomJsonText('')
    }
  }, [flashcard, availableColumns])

  // Sync customJsonText back into formData.others on valid edits
  const handleCustomJsonChange = (text: string) => {
    setCustomJsonText(text)
    if (!text.trim()) {
      setJsonError('')
      // Clear all custom keys, keep structured ones
      const cleaned: Record<string, any> = {}
      for (const key of STRUCTURED_KEYS) {
        if (formData.others?.[key] !== undefined) {
          cleaned[key] = formData.others[key]
        }
      }
      setFormData({ ...formData, others: cleaned })
      return
    }
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object {...}')
        return
      }
      setJsonError('')
      // Merge: keep structured keys from current formData, overlay parsed custom keys
      const newOthers: Record<string, any> = {}
      for (const key of STRUCTURED_KEYS) {
        if (formData.others?.[key] !== undefined) {
          newOthers[key] = formData.others[key]
        }
      }
      Object.assign(newOthers, parsed)
      setFormData({ ...formData, others: newOthers })
    } catch {
      setJsonError('Invalid JSON syntax')
    }
  }

  const handleSaveAndRegenAudio = async (face: 'front' | 'back') => {
    console.log(`[SaveGenAudio] Starting for face=${face}`)
    setRegenStatus(prev => ({ ...prev, [face]: 'loading' }))
    try {
      let currentCard = { ...formData }
      const updatedOptions = (currentCard.options || []).map((opt: any) => {
        if (opt.is_correct && currentCard.explanation) {
          return { ...opt, content: currentCard.explanation }
        }
        return opt
      })
      currentCard.options = updatedOptions

      // If new card, we must save first to get an ID
      if (!currentCard.id) {
        console.log(`[SaveGenAudio] Card is new. Saving card first to get ID...`)
        const savedResult = await onSave(currentCard, false)
        if (savedResult && savedResult.id) {
          currentCard.id = savedResult.id
          currentCard.deck_id = savedResult.deck_id
          setFormData(currentCard)
        } else {
          throw new Error("Không thể lưu thẻ mới trước khi tạo âm thanh")
        }
      } else {
        // Save existing card to database
        const payload = {
          content: currentCard.content,
          explanation: currentCard.explanation,
          ai_explanation: currentCard.ai_explanation,
          hint: currentCard.hint || null,
          mnemonic: currentCard.mnemonic || null,
          image: currentCard.image || null,
          audio: currentCard.audio || null,
          others: currentCard.others || {},
          options: updatedOptions
        }
        await axios.patch(`/api/v1/deck/question/${currentCard.id}`, payload)
      }

      // Generate audio
      const res = await axios.get(`/api/v1/deck/generate-audio/${currentCard.id}`, {
        params: { face, force: true }
      })
      const newUrl = res.data.url
      
      let updatedFormData = { ...currentCard }
      if (face === 'front') {
        updatedFormData.audio = newUrl
      } else {
        updatedFormData.others = { ...updatedFormData.others, back_audio_url: newUrl }
      }
      setFormData(updatedFormData)

      // Sync parent list
      await onSave(updatedFormData, false)

      setRegenStatus(prev => ({ ...prev, [face]: 'done' }))
      setTimeout(() => setRegenStatus(prev => ({ ...prev, [face]: '' })), 2000)
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || 'Failed'
      setRegenStatus(prev => ({ ...prev, [face]: `error:${msg}` }))
      setTimeout(() => setRegenStatus(prev => ({ ...prev, [face]: '' })), 3000)
    }
  }

  if (!isOpen || !formData) return null

  const handleCommit = async (addAnother = false) => {
    try {
      await onSave(formData, addAnother)
      if (addAnother) {
        // Reset inputs
        const clearedOthers = {
          back_img: '',
          back_audio_url: '',
          front_audio_content: '',
          back_audio_content: '',
        }
        availableColumns.forEach(col => {
          if (col !== 'front' && col !== 'back') {
            (clearedOthers as any)[col] = ''
          }
        })
        setFormData({
          id: undefined,
          deck_id: formData.deck_id,
          content: '',
          explanation: '',
          ai_explanation: '',
          image: null,
          audio: null,
          others: clearedOthers,
          options: []
        })
        setCustomJsonText('')
      }
    } catch (err) {
      console.error("Save error:", err)
    }
  }

  const renderRegenButton = (face: 'front' | 'back') => {
    const status = regenStatus[face] || ''
    const isLoading = status === 'loading'
    const isDone = status === 'done'
    const isError = status.startsWith('error:')
    const errorMsg = isError ? status.replace('error:', '') : ''
    
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSaveAndRegenAudio(face);
          }}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95",
            isDone
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : isError
                ? "bg-red-50 text-red-500 border border-red-200"
                : "bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
          )}
          title={`Save and regenerate ${face} audio`}
        >
          <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          {isLoading ? 'Saving & Generating...' : isDone ? '✓ Saved' : isError ? errorMsg : 'Save & Gen Audio'}
        </button>
      </div>
    )
  }

  if (!isOpen || !formData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-slate-900/65 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-4xl bg-white md:rounded-[2rem] rounded-t-[1.75rem] rounded-b-[1.75rem] shadow-2xl overflow-hidden h-[90vh] md:h-[85vh] flex flex-col z-10"
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between bg-white px-5 py-3.5 border-b border-slate-100 shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex-shrink-0 flex items-center justify-center text-indigo-600">
                   <Pencil className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                   <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Chỉnh sửa thẻ</h2>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Card #{formData.id || 'Mới'}</p>
                </div>
             </div>
             <button onClick={onClose} className="w-8.5 h-8.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all"><X className="w-4.5 h-4.5" /></button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 md:p-8 space-y-5 text-left">
              {/* SECTION 1: TEXT CONTENT */}
              <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 text-left">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">1. Text Content</span>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Front Side (Word / Question)</label>
                  <textarea 
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full h-20 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                    placeholder="Enter the front side word or phrase..."
                  />
                </div>

                <div className={cn("grid gap-4", showAiExplanation ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Side (Definition)</label>
                    <textarea 
                      value={formData.explanation}
                      onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                      className="w-full h-32 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                      placeholder="Enter the definition, synonyms, examples..."
                    />
                  </div>
                  {showAiExplanation && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          AI Deep Analysis
                        </label>
                        <button
                          type="button"
                          onClick={() => handleGenerateAIField('explanation')}
                          disabled={!formData?.id || isGeneratingField['explanation']}
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {isGeneratingField['explanation'] ? 'Generating...' : 'Gen AI'}
                        </button>
                      </div>
                      <textarea 
                        value={formData.ai_explanation || ''}
                        onChange={(e) => setFormData({...formData, ai_explanation: e.target.value})}
                        className="w-full h-32 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                        placeholder="AI explanation, breakdown of grammar, etymology..."
                      />
                    </div>
                  )}
                </div>

                {(showHint || showMnemonic) && (
                  <div className={cn("grid gap-4 mt-2", (showHint && showMnemonic) ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                    {showHint && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hint (Gợi ý)</label>
                          <button
                            type="button"
                            onClick={() => handleGenerateAIField('hint')}
                            disabled={!formData?.id || isGeneratingField['hint']}
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {isGeneratingField['hint'] ? 'Generating...' : 'Gen AI'}
                          </button>
                        </div>
                        <textarea 
                          value={formData.hint || ''}
                          onChange={(e) => setFormData({...formData, hint: e.target.value})}
                          className="w-full h-24 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                          placeholder="Enter a manual hint or click 'Gen AI' to generate one..."
                        />
                      </div>
                    )}

                    {showMnemonic && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mnemonic (Cách nhớ)</label>
                          <button
                            type="button"
                            onClick={() => handleGenerateAIField('mnemonic')}
                            disabled={!formData?.id || isGeneratingField['mnemonic']}
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {isGeneratingField['mnemonic'] ? 'Generating...' : 'Gen AI'}
                          </button>
                        </div>
                        <textarea 
                          value={formData.mnemonic || ''}
                          onChange={(e) => setFormData({...formData, mnemonic: e.target.value})}
                          className="w-full h-24 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                          placeholder="Enter association stories, visual hooks, or click 'Gen AI'..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamically detected custom fields */}
                {availableColumns && availableColumns.filter(c => c !== 'front' && c !== 'back').length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-100">
                    {availableColumns.filter(c => c !== 'front' && c !== 'back').map(col => {
                      const hasAi = practiceSettings?.ai_prompts?.some((p: any) => p.column === col || p.id === col);
                      return (
                        <div key={col} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col}</label>
                            {hasAi && (
                              <button
                                type="button"
                                onClick={() => handleGenerateAIField(col)}
                                disabled={!formData?.id || isGeneratingField[col]}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                {isGeneratingField[col] ? 'Generating...' : 'Gen AI'}
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={formData.others?.[col] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              others: {
                                ...formData.others,
                                [col]: e.target.value
                              }
                            })}
                            className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none resize-none"
                            placeholder={`Nhập ${col}...`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: MULTIMEDIA ASSETS */}
              <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 text-left">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">2. Multimedia & Audio Assets</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front Side Media & Audio */}
                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100/80">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block mb-1">Front Side</span>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Front Image URL</label>
                      <input 
                        type="text"
                        value={formData.image || ''}
                        onChange={(e) => setFormData({...formData, image: e.target.value})}
                        className="w-full p-3 bg-slate-50/50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none"
                        placeholder="e.g. /static/uploads/1/images/word.jpg"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Front Audio Reading Script</label>
                        {renderRegenButton('front')}
                      </div>
                      <p className="text-[8px] font-semibold text-slate-400 italic">
                        Format: `lang_code:text` (e.g. `ja:こんにちは`). Click "Save & Gen Audio" to generate.
                      </p>
                      <textarea 
                        value={formData.others?.front_audio_content || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          others: { ...formData.others, front_audio_content: e.target.value }
                        })}
                        className="w-full h-20 p-3 bg-slate-50/50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                        placeholder="ja:こんにちは"
                      />
                          <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Front Audio URL</label>
                        {formData.audio && (
                          <button
                            type="button"
                            onClick={() => {
                              const audio = new Audio(formData.audio);
                              audio.play().catch(e => console.error("Preview failed:", e));
                            }}
                            className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-all bg-indigo-50 px-2 py-1 rounded-lg"
                            title="Play Front Audio"
                          >
                            <Volume2 className="w-3 h-3" />
                            Test Audio
                          </button>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={formData.audio || ''}
                        onChange={(e) => setFormData({...formData, audio: e.target.value})}
                        className="w-full p-3 bg-slate-50/50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none"
                        placeholder="e.g. /static/uploads/1/audio/1_front.mp3"
                      />
                    </div>
                  </div>

                  {/* Back Side Media & Audio */}
                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100/80">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block mb-1">Back Side</span>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Image URL</label>
                      <input 
                        type="text"
                        value={formData.others?.back_img || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          others: { ...formData.others, back_img: e.target.value }
                        })}
                        className="w-full p-3 bg-slate-50/50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none"
                        placeholder="e.g. /static/uploads/1/images/def.jpg"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Audio Reading Script</label>
                        {renderRegenButton('back')}
                      </div>
                      <p className="text-[8px] font-semibold text-slate-400 italic">
                        Format: `lang_code:text` (e.g. `vi:xin chào`). Click "Save & Gen Audio" to generate.
                      </p>
                      <textarea 
                        value={formData.others?.back_audio_content || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          others: { ...formData.others, back_audio_content: e.target.value }
                        })}
                        className="w-full h-20 p-3 bg-slate-50/50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                        placeholder="vi:xin chào"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Audio URL</label>
                        {formData.others?.back_audio_url && (
                          <button
                            type="button"
                            onClick={() => {
                              const audio = new Audio(formData.others.back_audio_url);
                              audio.play().catch(e => console.error("Preview failed:", e));
                            }}
                            className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-all bg-indigo-50 px-2 py-1 rounded-lg"
                            title="Play Back Audio"
                          >
                            <Volume2 className="w-3 h-3" />
                            Test Audio
                          </button>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={formData.others?.back_audio_url || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          others: { ...formData.others, back_audio_url: e.target.value }
                        })}
                        className="w-full p-3 bg-slate-50/50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none"
                        placeholder="e.g. /static/uploads/1/audio/1_back.mp3"
                      />
                    </div>                  </div>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Sticky Bottom Action Bar for Mobile & Desktop parity */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-3 pb-3 z-10 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 px-4 mt-6">
              <button 
                type="button"
                onClick={onClose} 
                className="px-4 h-9 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                Hủy / Đóng
              </button>
              
              {!formData.id && (
                <button 
                  type="button"
                  onClick={() => handleCommit(true)} 
                  disabled={isSaving} 
                  className="px-4 h-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl uppercase tracking-widest border border-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? "Đang lưu..." : "Lưu & Thêm tiếp"}
                </button>
              )}

              <button 
                type="button"
                onClick={() => handleCommit(false)} 
                disabled={isSaving} 
                className="px-6 h-9 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isSaving ? "Đang lưu..." : <><Save className="w-3.5 h-3.5" /> {formData.id ? "Lưu thay đổi" : "Lưu thẻ"}</>}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
  )
}
