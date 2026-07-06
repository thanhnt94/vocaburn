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

  const getFieldValue = (col: string) => {
    if (!formData) return '';
    if (col === 'front') return formData.content || '';
    if (col === 'back') return formData.explanation || '';
    if (col === 'ai_explanation') return formData.ai_explanation || '';
    if (col === 'hint') return formData.hint || '';
    if (col === 'mnemonic') return formData.mnemonic || '';
    if (col === 'image') return formData.image || '';
    if (col === 'audio') return formData.audio || '';
    if (col === 'front_img') return formData.front_img || '';
    if (col === 'back_img') return formData.back_img || '';
    if (col === 'front_audio_url') return formData.front_audio_url || '';
    if (col === 'back_audio_url') return formData.back_audio_url || '';
    if (col === 'front_audio_content') return formData.front_audio_content || '';
    if (col === 'back_audio_content') return formData.back_audio_content || '';
    return formData.others?.[col] || '';
  };

  const setFieldValue = (col: string, val: string) => {
    if (!formData) return;
    if (col === 'front') {
      setFormData({ ...formData, content: val });
    } else if (col === 'back') {
      setFormData({ ...formData, explanation: val });
    } else if (col === 'ai_explanation') {
      setFormData({ ...formData, ai_explanation: val });
    } else if (col === 'hint') {
      setFormData({ ...formData, hint: val });
    } else if (col === 'mnemonic') {
      setFormData({ ...formData, mnemonic: val });
    } else if (col === 'image') {
      setFormData({ ...formData, image: val });
    } else if (col === 'audio') {
      setFormData({ ...formData, audio: val });
    } else if (col === 'front_img') {
      setFormData({ ...formData, front_img: val });
    } else if (col === 'back_img') {
      setFormData({ ...formData, back_img: val });
    } else if (col === 'front_audio_url') {
      setFormData({ ...formData, front_audio_url: val });
    } else if (col === 'back_audio_url') {
      setFormData({ ...formData, back_audio_url: val });
    } else if (col === 'front_audio_content') {
      setFormData({ ...formData, front_audio_content: val });
    } else if (col === 'back_audio_content') {
      setFormData({ ...formData, back_audio_content: val });
    } else {
      setFormData({
        ...formData,
        others: {
          ...formData.others,
          [col]: val
        }
      });
    }
  };

  const allColumns = useMemo(() => {
    if (!formData) return [];
    const cols = new Set<string>();
    cols.add('front');
    cols.add('back');
    if (formData.ai_explanation !== undefined || availableColumns.includes('ai_explanation')) cols.add('ai_explanation');
    if (formData.hint !== undefined || availableColumns.includes('hint')) cols.add('hint');
    if (formData.mnemonic !== undefined || availableColumns.includes('mnemonic')) cols.add('mnemonic');
    
    availableColumns.forEach(c => {
      if (c !== 'front' && c !== 'back') {
        cols.add(c);
      }
    });

    if (formData.others) {
      Object.keys(formData.others).forEach(k => {
        if (!STRUCTURED_KEYS.has(k)) {
          cols.add(k);
        } else {
          cols.add(k);
        }
      });
    }

    return Array.from(cols);
  }, [availableColumns, formData]);

  const aiCols = useMemo(() => {
    return allColumns.filter(col => {
      if (['ai_explanation', 'hint', 'mnemonic'].includes(col)) return true;
      return practiceSettings?.ai_prompts?.some((p: any) => p.column === col || p.id === col);
    });
  }, [allColumns, practiceSettings]);

  const imageCols = useMemo(() => {
    return allColumns.filter(col => 
      ['front_img', 'back_img', 'image', 'img'].includes(col.toLowerCase()) ||
      col.toLowerCase().includes('image') || col.toLowerCase().includes('img')
    );
  }, [allColumns]);

  const audioCols = useMemo(() => {
    return allColumns.filter(col => 
      col.toLowerCase().includes('audio') || 
      ['audio', 'sound', 'pronunciation'].includes(col.toLowerCase())
    );
  }, [allColumns]);

  const generalCols = useMemo(() => {
    return allColumns.filter(col => {
      if (col === 'front' || col === 'back') return false;
      if (aiCols.includes(col)) return false;
      if (imageCols.includes(col)) return false;
      if (audioCols.includes(col)) return false;
      return true;
    });
  }, [allColumns, aiCols, imageCols, audioCols]);

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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 md:p-8 space-y-6 text-left">
              {/* SECTION 1: TEXT CONTENT & GENERAL FIELDS */}
              <div className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100/60 text-left">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">1. Nội dung chữ & Các trường bổ sung</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mặt trước (Từ / Câu hỏi)</label>
                    <textarea 
                      value={getFieldValue('front')}
                      onChange={(e) => setFieldValue('front', e.target.value)}
                      className="w-full h-20 p-3 bg-white rounded-2xl border border-slate-200/80 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                      placeholder="Nhập mặt trước..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mặt sau (Định nghĩa / Giải nghĩa)</label>
                    <textarea 
                      value={getFieldValue('back')}
                      onChange={(e) => setFieldValue('back', e.target.value)}
                      className="w-full h-20 p-3 bg-white rounded-2xl border border-slate-200/80 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                      placeholder="Nhập mặt sau..."
                    />
                  </div>
                </div>

                {generalCols.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    {generalCols.map(col => (
                      <div key={col} className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.replace(/_/g, ' ')}</label>
                        <textarea
                          rows={2}
                          value={getFieldValue(col)}
                          onChange={(e) => setFieldValue(col, e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-slate-200/80 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none resize-none"
                          placeholder={`Nhập ${col.replace(/_/g, ' ')}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: AI ASSISTANCE */}
              {aiCols.length > 0 && (
                <div className="space-y-4 bg-indigo-50/10 p-5 rounded-3xl border border-indigo-50/40 text-left animate-in fade-in duration-200">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">2. Hỗ trợ học tập bằng AI</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiCols.map(col => {
                      const val = getFieldValue(col);
                      const isMainAi = col === 'ai_explanation';
                      return (
                        <div key={col} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className={cn("text-[10px] font-black uppercase tracking-widest", isMainAi ? "text-indigo-600 flex items-center gap-1.5" : "text-slate-400")}>
                              {isMainAi && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                              {col.replace(/_/g, ' ')}
                            </label>
                            <button
                              type="button"
                              onClick={() => handleGenerateAIField(col)}
                              disabled={!formData?.id || isGeneratingField[col]}
                              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              {isGeneratingField[col] ? 'Generating...' : 'Gen AI'}
                            </button>
                          </div>
                          <textarea
                            rows={isMainAi ? 4 : 2}
                            value={val}
                            onChange={(e) => setFieldValue(col, e.target.value)}
                            className={cn(
                              "w-full p-3 rounded-xl border focus:ring-2 font-medium text-slate-700 transition-all resize-none text-xs outline-none",
                              isMainAi ? "bg-indigo-50/20 border-indigo-100 focus:ring-indigo-500" : "bg-white border-slate-200/80 focus:ring-indigo-500"
                            )}
                            placeholder={`Nhấn 'Gen AI' để tạo hoặc tự nhập ${col.replace(/_/g, ' ')}...`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: IMAGE ASSETS */}
              {imageCols.length > 0 && (
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100 text-left">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">3. Hình ảnh minh họa</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {imageCols.map(col => (
                      <div key={col} className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.replace(/_/g, ' ')}</label>
                        <input
                          type="text"
                          value={getFieldValue(col)}
                          onChange={(e) => setFieldValue(col, e.target.value)}
                          className="w-full p-3 bg-white rounded-xl border border-slate-200/80 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none"
                          placeholder={`Đường dẫn hình ảnh cho ${col.replace(/_/g, ' ')}...`}
                        />
                        {getFieldValue(col) && (
                          <div className="mt-2.5 relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100 bg-slate-900/5 flex items-center justify-center">
                            <img
                              src={getFieldValue(col)}
                              alt={col}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: AUDIO ASSETS */}
              {audioCols.length > 0 && (
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100 text-left">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">4. Phát âm & Âm thanh</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {audioCols.map(col => {
                      const val = getFieldValue(col);
                      const isScript = col.toLowerCase().includes('content') || col.toLowerCase().includes('script');
                      const isFront = col.toLowerCase().includes('front') || (col.toLowerCase().includes('audio') && !col.toLowerCase().includes('back'));
                      
                      return (
                        <div key={col} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.replace(/_/g, ' ')}</label>
                            {isScript ? (
                              renderRegenButton(isFront ? 'front' : 'back')
                            ) : (
                              val && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const audio = new Audio(val);
                                    audio.play().catch(e => console.error("Preview failed:", e));
                                  }}
                                  className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-all bg-indigo-50 px-2 py-1 rounded-lg"
                                  title="Play Audio"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  Nghe thử
                                </button>
                              )
                            )}
                          </div>
                          {isScript ? (
                            <textarea
                              rows={2}
                              value={val}
                              onChange={(e) => setFieldValue(col, e.target.value)}
                              className="w-full p-3 bg-white rounded-xl border border-slate-200/80 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs outline-none"
                              placeholder="Ví dụ ja:こんにちは"
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => setFieldValue(col, e.target.value)}
                              className="w-full p-3 bg-white rounded-xl border border-slate-200/80 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600 outline-none"
                              placeholder="Đường dẫn file âm thanh..."
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
