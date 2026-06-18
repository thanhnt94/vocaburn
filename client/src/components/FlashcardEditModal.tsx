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
  onSave: (updatedCard: any) => Promise<void>
  isSaving: boolean
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
}) => {
  const [formData, setFormData] = useState<any>(null)
  const [customJsonText, setCustomJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [regenStatus, setRegenStatus] = useState<Record<string, string>>({})
  const [isGeneratingField, setIsGeneratingField] = useState<Record<string, boolean>>({})

  const handleGenerateAIField = async (field: 'explanation' | 'hint' | 'mnemonic') => {
    if (!formData?.id) return;
    setIsGeneratingField(prev => ({ ...prev, [field]: true }));
    try {
      const deckId = formData.deck_id || formData.quiz_id;
      const res = await axios.post(`/api/v1/deck/${deckId}/ask-ai`, {
        question_id: formData.id,
        field: field,
        sync: true,
        force: true
      });
      
      const generatedText = res.data[field === 'explanation' ? 'ai_explanation' : field];
      if (generatedText) {
        setFormData((prev: any) => ({
          ...prev,
          [field === 'explanation' ? 'ai_explanation' : field]: generatedText
        }));
      }
    } catch (e) {
      console.error(`Failed to generate AI ${field}`, e);
      alert(`Failed to generate AI ${field}. Please verify AI services are enabled in your admin settings.`);
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
  }, [flashcard])

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
    if (!formData?.id) {
      console.error('[SaveGenAudio] No card ID found, aborting')
      return
    }
    console.log(`[SaveGenAudio] Starting for face=${face}, card_id=${formData.id}`)
    setRegenStatus(prev => ({ ...prev, [face]: 'loading' }))
    try {
      // 1. Prepare options if present
      const updatedOptions = (formData.options || []).map((opt: any) => {
        if (opt.is_correct && formData.explanation) {
          return { ...opt, content: formData.explanation }
        }
        return opt
      })

      // 2. Format request payload
      const payload = {
        content: formData.content,
        explanation: formData.explanation,
        ai_explanation: formData.ai_explanation,
        hint: formData.hint || null,
        mnemonic: formData.mnemonic || null,
        image: formData.image || null,
        audio: formData.audio || null,
        others: formData.others || {},
        options: updatedOptions
      }

      // 3. Save to database immediately
      console.log(`[SaveGenAudio] Saving card to DB...`, payload)
      await axios.patch(`/api/v1/deck/question/${formData.id}`, payload)
      console.log(`[SaveGenAudio] Card saved successfully. Now generating audio...`)

      // 4. Trigger audio generation via backend with force=true
      const res = await axios.get(`/api/v1/deck/generate-audio/${formData.id}`, {
        params: { face, force: true }
      })
      console.log(`[SaveGenAudio] Audio generation response:`, res.data)
      const newUrl = res.data.url
      
      let updatedFormData = { ...formData, options: updatedOptions }
      if (face === 'front') {
        updatedFormData.audio = newUrl
      } else {
        updatedFormData.others = { ...updatedFormData.others, back_audio_url: newUrl }
      }
      setFormData(updatedFormData)

      // Also trigger parent state sync/callback if desired so local state stays in sync
      await onSave(updatedFormData)

      setRegenStatus(prev => ({ ...prev, [face]: 'done' }))
      setTimeout(() => setRegenStatus(prev => ({ ...prev, [face]: '' })), 2000)
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed'
      setRegenStatus(prev => ({ ...prev, [face]: `error:${msg}` }))
      setTimeout(() => setRegenStatus(prev => ({ ...prev, [face]: '' })), 3000)
    }
  }

  if (!isOpen || !formData) return null

  const handleCommit = () => {
    onSave(formData)
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-4xl bg-white md:rounded-[2rem] rounded-[1.25rem] shadow-2xl overflow-hidden"
        >
          <div className="p-6 md:p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between sticky top-0 bg-white pb-6 z-10 border-b border-slate-50 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex-shrink-0 flex items-center justify-center text-white">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Edit Card</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Card #{formData.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"><X className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="space-y-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Side (Definition)</label>
                    <textarea 
                      value={formData.explanation}
                      onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                      className="w-full h-32 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                      placeholder="Enter the definition, synonyms, examples..."
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        AI Deep Analysis
                      </label>
                      <button
                        type="button"
                        onClick={() => handleGenerateAIField('explanation')}
                        disabled={isGeneratingField['explanation']}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hint (Gợi ý)</label>
                      <button
                        type="button"
                        onClick={() => handleGenerateAIField('hint')}
                        disabled={isGeneratingField['hint']}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all"
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mnemonic (Cách nhớ)</label>
                      <button
                        type="button"
                        onClick={() => handleGenerateAIField('mnemonic')}
                        disabled={isGeneratingField['mnemonic']}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all"
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
                </div>
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

              {/* SECTION 4: CUSTOM METADATA */}
              <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 text-left">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">4. Custom Metadata (JSON)</span>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extra Properties</label>
                  <textarea 
                    value={customJsonText}
                    onChange={(e) => handleCustomJsonChange(e.target.value)}
                    className={cn(
                      "w-full h-32 p-4 bg-white rounded-2xl border focus:ring-2 font-mono text-xs text-slate-600 transition-all outline-none resize-none",
                      jsonError
                        ? "border-red-300 focus:ring-red-400"
                        : "border-slate-100 focus:ring-indigo-500"
                    )}
                    placeholder='e.g. { "custom_mode": "vocab", "tags": ["n3", "nouns"] }'
                  />
                  {jsonError ? (
                    <p className="text-[9px] font-bold text-red-500">{jsonError}</p>
                  ) : (
                    <p className="text-[9px] font-medium text-slate-400">
                      Any extra fields stored in the card's metadata. Known fields (audio scripts, image URLs) are excluded.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Sticky Bottom Action Bar for Mobile & Desktop parity */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-4 pb-2 z-10 border-t border-slate-100/80 flex items-center justify-end gap-3 -mx-6 px-6 md:-mx-10 md:px-10 mt-6">
              <button 
                type="button"
                onClick={onClose} 
                className="flex-1 md:flex-none px-6 h-12 md:h-11 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/60 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                Hủy / Đóng
              </button>
              <button 
                type="button"
                onClick={handleCommit} 
                disabled={isSaving} 
                className="flex-[2] md:flex-none px-8 h-12 md:h-11 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? "Đang lưu..." : <><Save className="w-4 h-4" /> Lưu thay đổi</>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
