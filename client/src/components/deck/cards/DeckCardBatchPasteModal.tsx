import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  X, 
  ClipboardPaste, 
  Sparkles, 
  GripVertical, 
  Plus, 
  AlertCircle, 
  Layers,
  Check
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

export interface DeckCardBatchPasteModalProps {
  isOpen: boolean
  onClose: () => void
  deckId: string | number
  onSuccess?: () => void
}

export interface ColumnItem {
  id: string
  key: string
  label: string
  color: string
  bg: string
  border: string
  placeholder: string
}

const AVAILABLE_FIELDS: Omit<ColumnItem, 'id'>[] = [
  { key: 'front', label: 'Mặt trước (Từ vựng)', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', placeholder: '食べる' },
  { key: 'furigana', label: 'Furigana / Cách đọc', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', placeholder: 'たべる' },
  { key: 'back', label: 'Mặt sau (Ý nghĩa)', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', placeholder: 'Ăn (động từ)' },
  { key: 'hint', label: 'Gợi ý (Hint)', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', placeholder: 'Hành động ăn uống' },
  { key: 'mnemonic', label: 'Mẹo nhớ (Mnemonic)', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200', placeholder: 'Bộ thực Thực' },
  { key: 'example', label: 'Ví dụ mẫu', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', placeholder: 'ご飯を食べる' },
  { key: 'front_audio_content', label: 'Text đọc mặt trước', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', placeholder: 'たべる' },
  { key: 'back_audio_content', label: 'Text đọc mặt sau', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', placeholder: 'Ăn' },
  { key: 'ignore', label: '🚫 Bỏ qua cột này', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', placeholder: '123' },
]

export function DeckCardBatchPasteModal({
  isOpen,
  onClose,
  deckId,
  onSuccess
}: DeckCardBatchPasteModalProps) {
  const { userSettings, updateUserSettings } = useAppStore()

  // Columns order list (User can drag and drop to reorder, synced to DB)
  const [columns, setColumns] = useState<ColumnItem[]>(() => {
    const savedKeys = userSettings?.paste_columns
    if (Array.isArray(savedKeys) && savedKeys.length > 0) {
      return savedKeys.map((k, i) => {
        const field = AVAILABLE_FIELDS.find(f => f.key === k) || AVAILABLE_FIELDS[0]
        return { id: `col-${i}-${k}`, ...field }
      })
    }
    return [
      { id: 'col-1', ...AVAILABLE_FIELDS.find(f => f.key === 'front')! },
      { id: 'col-2', ...AVAILABLE_FIELDS.find(f => f.key === 'back')! },
    ]
  })

  // Sync state if userSettings loaded later from backend
  useEffect(() => {
    const savedKeys = userSettings?.paste_columns
    if (Array.isArray(savedKeys) && savedKeys.length > 0) {
      setColumns(savedKeys.map((k, i) => {
        const field = AVAILABLE_FIELDS.find(f => f.key === k) || AVAILABLE_FIELDS[0]
        return { id: `col-${i}-${k}`, ...field }
      }))
    }
  }, [userSettings?.paste_columns])

  const [pasteText, setPasteText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Helper to update columns and persist to database via UserGlobalSettings API
  const handleUpdateColumns = (newCols: ColumnItem[]) => {
    setColumns(newCols)
    const keys = newCols.map(c => c.key)
    updateUserSettings({ paste_columns: keys }).catch(console.error)
  }

  // Preset Configurations
  const applyPreset = (keys: string[]) => {
    const newCols = keys.map((k, i) => {
      const field = AVAILABLE_FIELDS.find(f => f.key === k) || AVAILABLE_FIELDS[0]
      return { id: `col-${Date.now()}-${i}`, ...field }
    })
    handleUpdateColumns(newCols)
  }

  // Add Column
  const handleAddColumn = (key: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.key === key) || AVAILABLE_FIELDS[0]
    const newCols = [...columns, { id: `col-${Date.now()}-${columns.length}`, ...field }]
    handleUpdateColumns(newCols)
  }

  // Remove Column
  const handleRemoveColumn = (id: string) => {
    if (columns.length <= 1) {
      alert('Cần ít nhất 1 cột dữ liệu!')
      return
    }
    const newCols = columns.filter(c => c.id !== id)
    handleUpdateColumns(newCols)
  }

  // Parse lines into cards according to configured columns order
  const { parsedCards, rawLinesCount } = useMemo(() => {
    if (!pasteText.trim()) return { parsedCards: [], rawLinesCount: 0 }

    const lines = pasteText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return { parsedCards: [], rawLinesCount: 0 }

    const cards = lines.map(line => {
      // Auto detect separator per line: Tab preferred, then semicolon, then pipe, then comma
      let parts: string[] = []
      if (line.includes('\t')) {
        parts = line.split('\t')
      } else if (line.includes(';')) {
        parts = line.split(';')
      } else if (line.includes('|')) {
        parts = line.split('|')
      } else if (line.includes(',')) {
        parts = line.split(',')
      } else {
        parts = [line]
      }

      const trimmedParts = parts.map(p => p.trim())
      let content = ''
      let explanation = ''
      const others: Record<string, any> = {}
      const rowValues: Record<string, string> = {}

      columns.forEach((col, idx) => {
        const val = trimmedParts[idx] || ''
        rowValues[col.key] = val
        if (!val || col.key === 'ignore') return

        if (col.key === 'front') {
          content = val
        } else if (col.key === 'back') {
          explanation = val
        } else if (col.key === 'furigana') {
          others['furigana'] = val
        } else if (col.key === 'hint') {
          others['hint'] = val
        } else if (col.key === 'mnemonic') {
          others['mnemonic'] = val
        } else if (col.key === 'example') {
          others['example'] = val
        } else if (col.key === 'front_audio_content') {
          others['front_audio_content'] = val
        } else if (col.key === 'back_audio_content') {
          others['back_audio_content'] = val
        } else {
          others[col.key] = val
        }
      })

      return {
        content,
        explanation,
        others,
        rawParts: trimmedParts
      }
    }).filter(c => c.content || c.explanation)

    return { parsedCards: cards, rawLinesCount: lines.length }
  }, [pasteText, columns])

  // Dynamic placeholder example according to active column order
  const placeholderExample = useMemo(() => {
    const col1 = columns.map(c => c.placeholder).join('\t')
    const col2 = columns.map(c => {
      if (c.key === 'front') return '飲む'
      if (c.key === 'furigana') return 'のむ'
      if (c.key === 'back') return 'Uống'
      if (c.key === 'hint') return 'Hành động uống'
      if (c.key === 'mnemonic') return 'Bộ ẩm Ẩm'
      if (c.key === 'example') return '水を飲む'
      return '...'
    }).join('\t')
    return `Ví dụ định dạng copy từ Excel:\n${col1}\n${col2}`
  }, [columns])

  // Batch Submit
  const handleImport = async () => {
    if (parsedCards.length === 0) {
      setError('Chưa có thẻ hợp lệ nào để nhập. Vui lòng dán dữ liệu vào ô dưới.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Also ensure latest column order is persisted in DB
      await updateUserSettings({ paste_columns: columns.map(c => c.key) }).catch(console.error)

      await axios.post(`/api/v1/deck/${deckId}/import-text-update`, {
        cards: parsedCards.map(({ content, explanation, others }) => ({
          content,
          explanation,
          others
        })),
        mode: 'merge'
      })

      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      onClose()
      setPasteText('')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Có lỗi xảy ra khi dán thẻ hàng loạt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 text-left select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl relative z-10 border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs shadow-indigo-500/20">
                <ClipboardPaste className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>Dán Thẻ Nhiều Cột & Tự Do Sắp Xếp Thứ Tự</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  Tự động ghi nhớ cấu hình thứ tự cột đã chọn vào tài khoản
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            
            {/* ═══════════ KHU VỰC CẤU HÌNH THỨ TỰ CỘT (KÉO THẢ / CHỌN NHANH) ═══════════ */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              {/* Presets & Info */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">
                    Thứ tự các cột khi dán ({columns.length} cột):
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400 font-bold mr-1">Mẫu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset(['front', 'back'])}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold transition-all cursor-pointer hover:bg-indigo-50/40"
                  >
                    2 cột (Từ - Nghĩa)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(['front', 'furigana', 'back'])}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold transition-all cursor-pointer hover:bg-indigo-50/40"
                  >
                    3 cột (Từ - Đọc - Nghĩa)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(['front', 'furigana', 'back', 'mnemonic'])}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold transition-all cursor-pointer hover:bg-indigo-50/40"
                  >
                    4 cột (Đầy đủ)
                  </button>
                </div>
              </div>

              {/* DRAGGABLE REORDER LIST */}
              <div className="space-y-1">
                <p className="text-[11px] text-slate-500 font-medium">
                  🖐️ <em>Kéo thả các ô bên dưới để thay đổi thứ tự tương ứng với file Excel của bạn:</em>
                </p>

                <Reorder.Group 
                  axis="x" 
                  values={columns} 
                  onReorder={handleUpdateColumns}
                  className="flex flex-wrap items-center gap-2 pt-1"
                >
                  {columns.map((col, index) => (
                    <Reorder.Item
                      key={col.id}
                      value={col}
                      className={cn(
                        "flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl border bg-white shadow-xs cursor-grab active:cursor-grabbing select-none transition-shadow",
                        col.border
                      )}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className={cn("text-xs font-black", col.color)}>
                        {col.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(col.id)}
                        className="w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer ml-0.5"
                        title="Xóa cột này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* ADD MORE COLUMNS POOL */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">+ Bấm để thêm cột:</span>
                {AVAILABLE_FIELDS.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleAddColumn(f.key)}
                    className={cn(
                      "px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer hover:shadow-2xs active:scale-95",
                      f.bg,
                      f.color,
                      f.border
                    )}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ═══════════ KHUNG NHẬP DỮ LIỆU DÁN ═══════════ */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Dán văn bản (Copy từ Excel / Google Sheets):</span>
                {parsedCards.length > 0 && (
                  <span className="text-indigo-600 font-extrabold">
                    ✅ Nhận diện được {parsedCards.length} thẻ từ {rawLinesCount} dòng
                  </span>
                )}
              </div>

              <textarea
                rows={5}
                placeholder={placeholderExample}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none shadow-2xs leading-relaxed"
              />
            </div>

            {/* ═══════════ BẢNG XEM TRƯỚC THEO ĐÚNG THỨ TỰ CỘT ═══════════ */}
            {parsedCards.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Xem trước kết quả ({parsedCards.length} thẻ sẵn sàng nhập):</span>
                </div>

                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-600">
                        <tr>
                          <th className="p-2.5 w-10 text-center">#</th>
                          {columns.map((col, idx) => (
                            <th key={col.id} className="p-2.5 min-w-[130px]">
                              <div className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-black flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className={cn("inline-block px-2 py-0.5 rounded-lg border font-black text-[10px]", col.bg, col.color, col.border)}>
                                  {col.label}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedCards.slice(0, 5).map((card, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-2.5 text-center font-bold text-slate-400 text-[10px]">
                              {rowIdx + 1}
                            </td>
                            {columns.map((col, colIdx) => {
                              const val = card.rawParts[colIdx] || ''
                              return (
                                <td key={col.id} className={cn("p-2.5 font-medium truncate max-w-[200px]", col.key === 'ignore' ? 'text-slate-300 line-through' : 'text-slate-800')}>
                                  {val || <span className="text-slate-300 italic">(Trống)</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedCards.length > 5 && (
                    <div className="p-2 text-center bg-slate-50/60 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                      ... và {parsedCards.length - 5} thẻ khác sẽ được thêm tự động theo đúng các cột trên
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer shadow-2xs"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={parsedCards.length === 0 || isSubmitting}
              className="h-10 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Đang nhập thẻ...' : `NHẬP ${parsedCards.length} THẺ NGAY 🚀`}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckCardBatchPasteModal
