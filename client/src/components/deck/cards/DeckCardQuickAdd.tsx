import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Maximize2, Sparkles, Settings2, RotateCcw, Check, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export interface QuickAddCardPayload {
  content: string
  explanation: string
  others?: Record<string, any>
  front_audio_content?: string
  back_audio_content?: string
  front_audio_url?: string
  back_audio_url?: string
  front_img?: string
  back_img?: string
  [key: string]: any
}

export interface DeckCardQuickAddProps {
  isOpen: boolean
  onClose: () => void
  deckId: string | number
  onAddCard: (card: QuickAddCardPayload) => Promise<boolean>
  isAdding?: boolean
  onOpenFullEdit?: () => void
}

export function DeckCardQuickAdd({
  isOpen,
  onClose,
  deckId,
  onAddCard,
  isAdding = false,
  onOpenFullEdit,
}: DeckCardQuickAddProps) {
  const { userSettings, updateUserSettings } = useAppStore()
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  // 1. Lấy toàn bộ danh sách cột thực tế từ Database cho bộ thẻ này
  const { data: practiceSettingsData } = useQuery({
    queryKey: ['deck-practice-settings', String(deckId)],
    queryFn: async () => {
      if (!deckId) return null
      const res = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
      return res.data
    },
    enabled: !!deckId && isOpen,
    staleTime: 60 * 1000,
  })

  // 2. Tổng hợp tất cả các cột thực tế có trong Database
  const allDbColumns = useMemo(() => {
    const colsSet = new Set<string>([
      'front',
      'back',
      'furigana',
      'hint',
      'mnemonic',
      'example',
      'front_audio_content',
      'back_audio_content',
      'front_audio_url',
      'back_audio_url',
      'front_img',
      'back_img',
    ])

    const serverCols = practiceSettingsData?.available_columns || []
    if (Array.isArray(serverCols)) {
      serverCols.forEach((c: string) => {
        if (c && typeof c === 'string' && c !== 'ignore') {
          colsSet.add(c.trim())
        }
      })
    }

    return Array.from(colsSet)
  }, [practiceSettingsData])

  // 3. Cột đang chọn hiển thị trong Quick Add (lấy từ UserGlobalSettings DB)
  const activeColumns = useMemo(() => {
    const saved = userSettings?.quick_add_columns
    if (Array.isArray(saved) && saved.length > 0) {
      const seen = new Set<string>()
      const unique = saved.filter(k => {
        if (!k || typeof k !== 'string') return false
        const t = k.trim()
        if (!t || seen.has(t)) return false
        seen.add(t)
        return true
      })
      if (unique.length > 0) return unique
    }
    return ['front', 'back']
  }, [userSettings?.quick_add_columns])

  // Tự động focus vào ô đầu tiên khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Lưu tùy chọn cột vào Database
  const handleSaveColumns = (newCols: string[]) => {
    const seen = new Set<string>()
    const unique = newCols.filter(k => {
      if (!k) return false
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    updateUserSettings({ quick_add_columns: unique }).catch(console.error)
  }

  // Bật/tắt 1 cột
  const handleToggleColumn = (colKey: string) => {
    if (activeColumns.includes(colKey)) {
      if (activeColumns.length <= 1) {
        alert('Cần giữ lại ít nhất 1 cột!')
        return
      }
      handleSaveColumns(activeColumns.filter(c => c !== colKey))
    } else {
      handleSaveColumns([...activeColumns, colKey])
    }
  }

  // Đặt lại về 2 cột mặc định: front, back
  const handleResetColumns = () => {
    handleSaveColumns(['front', 'back'])
  }

  // Cập nhật giá trị nhập của từng ô
  const handleFieldChange = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

  // Gửi thêm thẻ
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Cần có ít nhất front hoặc back
    const frontVal = (fieldValues['front'] || '').trim()
    const backVal = (fieldValues['back'] || '').trim()
    
    // Kiểm tra xem có trường nào được nhập không
    const hasAnyContent = Object.values(fieldValues).some(v => v && v.trim())
    if (!hasAnyContent || isAdding) return

    const others: Record<string, any> = {}
    const payload: QuickAddCardPayload = {
      content: frontVal || Object.values(fieldValues)[0]?.trim() || '',
      explanation: backVal || '',
      others
    }

    // Đổ các trường khác vào others & physical columns
    activeColumns.forEach(key => {
      const val = (fieldValues[key] || '').trim()
      if (!val) return

      if (key === 'front') {
        payload.content = val
      } else if (key === 'back') {
        payload.explanation = val
      } else if (key === 'front_audio_content') {
        payload.front_audio_content = val
        others['front_audio_content'] = val
      } else if (key === 'back_audio_content') {
        payload.back_audio_content = val
        others['back_audio_content'] = val
      } else if (key === 'front_audio_url') {
        payload.front_audio_url = val
        others['front_audio_url'] = val
      } else if (key === 'back_audio_url') {
        payload.back_audio_url = val
        others['back_audio_url'] = val
      } else if (key === 'front_img') {
        payload.front_img = val
        others['front_img'] = val
      } else if (key === 'back_img') {
        payload.back_img = val
        others['back_img'] = val
      } else {
        others[key] = val
      }
    })

    const success = await onAddCard(payload)
    if (success) {
      setFieldValues({})
      firstInputRef.current?.focus()
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/98 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] p-3.5 sm:p-5 text-left pb-6 sm:pb-5"
        >
          <div className="max-w-4xl mx-auto space-y-3">
            {/* 1. Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50 text-orange-600 font-bold text-xs">
                  ⚡
                </span>
                <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
                  Thêm Nhanh Thẻ Mới
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Nút Tùy chọn cột hiển thị */}
                <button
                  type="button"
                  onClick={() => setShowColumnSettings(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                    showColumnSettings
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  )}
                  title="Chọn các cột hiển thị để nhập nhanh"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Tùy chọn cột ({activeColumns.length})</span>
                </button>

                {onOpenFullEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenFullEdit()
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                    title="Mở rộng để nhập tất cả các trường..."
                  >
                    <Maximize2 className="w-3 h-3 text-indigo-600" />
                    <span className="hidden sm:inline">Thêm chi tiết (Đầy đủ)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Khung Tùy chọn cột (Khi bật) */}
            <AnimatePresence>
              {showColumnSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600 text-[11px]">
                        Bấm để bật/tắt các cột muốn nhập nhanh (Tự động lưu vào Database):
                      </span>
                      <button
                        type="button"
                        onClick={handleResetColumns}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Đặt lại (front, back)</span>
                      </button>
                    </div>

                    <div className="max-h-28 overflow-y-auto custom-scrollbar flex flex-wrap items-center gap-1.5 p-1">
                      {allDbColumns.map(colKey => {
                        const isSelected = activeColumns.includes(colKey)
                        return (
                          <button
                            key={colKey}
                            type="button"
                            onClick={() => handleToggleColumn(colKey)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1 cursor-pointer active:scale-95",
                              isSelected
                                ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-2xs"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                            <span>{colKey}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. Inputs & Submit form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div 
                className={cn(
                  "grid gap-2",
                  activeColumns.length === 1 && "grid-cols-1",
                  activeColumns.length === 2 && "grid-cols-1 sm:grid-cols-2",
                  activeColumns.length === 3 && "grid-cols-1 sm:grid-cols-3",
                  activeColumns.length >= 4 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
                )}
              >
                {activeColumns.map((colKey, idx) => (
                  <input
                    key={colKey}
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="text"
                    placeholder={`[${colKey}]...`}
                    value={fieldValues[colKey] || ''}
                    onChange={(e) => handleFieldChange(colKey, e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  💡 Nhấn Enter để lưu và tự động nhập tiếp thẻ sau
                </p>

                <button
                  type="submit"
                  disabled={!Object.values(fieldValues).some(v => v && v.trim()) || isAdding}
                  className="w-full sm:w-auto ml-auto h-9 px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isAdding ? 'Đang lưu...' : '+ Thêm thẻ ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default DeckCardQuickAdd
