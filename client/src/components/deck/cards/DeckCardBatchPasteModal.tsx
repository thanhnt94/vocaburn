import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  X, 
  ClipboardPaste, 
  Sparkles, 
  GripVertical, 
  Plus, 
  AlertCircle, 
  Layers,
  RotateCcw
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

const getColumnMetadata = (key: string): ColumnItem => {
  const isFront = key === 'front'
  const isBack = key === 'back'

  return {
    id: `col-${key}`,
    key: key,
    label: key, // Tên chính xác 100% như trong Database, không hoa/thường lỗi font
    color: isFront ? 'text-indigo-700 font-bold' : isBack ? 'text-emerald-700 font-bold' : 'text-slate-700 font-medium',
    bg: isFront ? 'bg-indigo-50' : isBack ? 'bg-emerald-50' : 'bg-slate-100',
    border: isFront ? 'border-indigo-300' : isBack ? 'border-emerald-300' : 'border-slate-200',
    placeholder: `[${key}]`
  }
}

const sanitizeColumns = (keys: string[]): ColumnItem[] => {
  const seen = new Set<string>()
  const uniqueKeys = (keys || []).filter(k => {
    if (!k || typeof k !== 'string') return false
    const trimmed = k.trim()
    if (!trimmed || seen.has(trimmed)) return false
    seen.add(trimmed)
    return true
  })

  if (uniqueKeys.length === 0) {
    uniqueKeys.push('front', 'back')
  }

  return uniqueKeys.map((k, i) => ({
    ...getColumnMetadata(k),
    id: `col-${i}-${k}`
  }))
}

export function DeckCardBatchPasteModal({
  isOpen,
  onClose,
  deckId,
  onSuccess
}: DeckCardBatchPasteModalProps) {
  const { userSettings, updateUserSettings } = useAppStore()
  const queryClient = useQueryClient()

  // 1. Lấy toàn bộ danh sách cột thực tế của bộ thẻ này từ backend database
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

  // 2. Tổng hợp tất cả các cột thực tế có trong Database (System defaults + Deck custom columns)
  const allDbColumns = useMemo(() => {
    const colsSet = new Set<string>([
      'front',
      'back',
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
        if (c && typeof c === 'string') {
          colsSet.add(c.trim())
        }
      })
    }

    return Array.from(colsSet).map(colKey => getColumnMetadata(colKey))
  }, [practiceSettingsData])

  // 3. Danh sách cột đang chọn để dán (Không cho phép trùng lặp)
  const [columns, setColumns] = useState<ColumnItem[]>(() => {
    const savedKeys = userSettings?.paste_columns
    return sanitizeColumns(savedKeys || ['front', 'back'])
  })

  // Đồng bộ khi userSettings được load từ DB
  useEffect(() => {
    const savedKeys = userSettings?.paste_columns
    if (Array.isArray(savedKeys) && savedKeys.length > 0) {
      setColumns(sanitizeColumns(savedKeys))
    }
  }, [userSettings?.paste_columns])

  const [pasteText, setPasteText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lưu thứ tự cột vào DB
  const handleUpdateColumns = (newCols: ColumnItem[]) => {
    const seen = new Set<string>()
    const deduplicated = newCols.filter(c => {
      if (seen.has(c.key)) return false
      seen.add(c.key)
      return true
    })
    setColumns(deduplicated)
    const keys = deduplicated.map(c => c.key)
    updateUserSettings({ paste_columns: keys }).catch(console.error)
  }

  // Đặt lại về 2 cột mặc định: front, back
  const handleResetDefault = () => {
    const defaultCols = [
      { ...getColumnMetadata('front'), id: 'col-0-front' },
      { ...getColumnMetadata('back'), id: 'col-1-back' },
    ]
    handleUpdateColumns(defaultCols)
  }

  // Thêm cột từ danh sách DB
  const handleAddColumn = (key: string) => {
    if (columns.some(c => c.key === key)) return // Chống trùng
    const field = getColumnMetadata(key)
    const newCols = [...columns, { ...field, id: `col-${Date.now()}-${key}` }]
    handleUpdateColumns(newCols)
  }

  // Xóa cột
  const handleRemoveColumn = (id: string) => {
    if (columns.length <= 1) {
      alert('Cần ít nhất 1 cột để dán dữ liệu!')
      return
    }
    const newCols = columns.filter(c => c.id !== id)
    handleUpdateColumns(newCols)
  }

  // Danh sách các cột trong DB chưa được thêm vào
  const availableToAdd = useMemo(() => {
    const activeKeys = new Set(columns.map(c => c.key))
    return allDbColumns.filter(c => !activeKeys.has(c.key))
  }, [allDbColumns, columns])

  // Parse dòng dán theo đúng thứ tự các cột
  const { parsedCards, rawLinesCount } = useMemo(() => {
    if (!pasteText.trim()) return { parsedCards: [], rawLinesCount: 0 }

    const lines = pasteText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return { parsedCards: [], rawLinesCount: 0 }

    const cards = lines.map(line => {
      let parts: string[] = []
      if (line.includes('\t')) parts = line.split('\t')
      else if (line.includes(';')) parts = line.split(';')
      else if (line.includes('|')) parts = line.split('|')
      else if (line.includes(',')) parts = line.split(',')
      else parts = [line]

      const trimmedParts = parts.map(p => p.trim())
      let content = ''
      let explanation = ''
      const others: Record<string, any> = {}

      columns.forEach((col, idx) => {
        const val = trimmedParts[idx] || ''
        if (!val) return

        if (col.key === 'front') {
          content = val
        } else if (col.key === 'back') {
          explanation = val
        } else if (col.key === 'front_audio_content') {
          others['front_audio_content'] = val
        } else if (col.key === 'back_audio_content') {
          others['back_audio_content'] = val
        } else if (col.key === 'front_audio_url') {
          others['front_audio_url'] = val
        } else if (col.key === 'back_audio_url') {
          others['back_audio_url'] = val
        } else if (col.key === 'front_img') {
          others['front_img'] = val
        } else if (col.key === 'back_img') {
          others['back_img'] = val
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

  // Placeholder mẫu
  const placeholderExample = useMemo(() => {
    const headerRow = columns.map(c => c.label).join('\t')
    const sampleRow = columns.map((c, i) => `Giá trị ${i + 1}`).join('\t')
    return `Mẫu ${columns.length} cột (phân cách bằng Tab):\n${headerRow}\n${sampleRow}`
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

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 text-left select-none">
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
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl relative z-10 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs shadow-indigo-500/20">
                <ClipboardPaste className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>Dán Thẻ Nhiều Cột & Tự Do Sắp Xếp</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  Chọn các cột theo đúng file Excel/Sheets rồi dán vào
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
          <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            
            {/* ═══════════ KHU VỰC CẤU HÌNH THỨ TỰ CỘT ═══════════ */}
            <div className="space-y-2.5 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">
                    Thứ tự {columns.length} cột khi dán:
                  </span>
                </div>

                {/* Reset button to [front, back] */}
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                  title="Khôi phục về chỉ 2 cột front & back"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Đặt lại (front, back)</span>
                </button>
              </div>

              {/* DRAGGABLE REORDER LIST (Kéo thả sắp xếp cột) */}
              <div className="space-y-1">
                <Reorder.Group 
                  axis="x" 
                  values={columns} 
                  onReorder={handleUpdateColumns}
                  className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto custom-scrollbar py-0.5"
                >
                  {columns.map((col, index) => (
                    <Reorder.Item
                      key={col.id}
                      value={col}
                      className={cn(
                        "flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl border bg-white shadow-2xs cursor-grab active:cursor-grabbing select-none transition-shadow",
                        col.border
                      )}
                    >
                      <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className={cn("text-xs font-mono", col.color)}>
                        {col.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(col.id)}
                        className="w-4.5 h-4.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                        title={`Xóa cột ${col.label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* AVAILABLE COLUMNS POOL (Có cuộn giới hạn tránh vỡ layout) */}
              {availableToAdd.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    + Bấm để thêm cột từ Database:
                  </span>
                  <div className="max-h-24 overflow-y-auto custom-scrollbar p-1.5 bg-white rounded-xl border border-slate-200/70 flex flex-wrap items-center gap-1.5">
                    {availableToAdd.map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => handleAddColumn(f.key)}
                        className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Plus className="w-2.5 h-2.5 text-slate-400" />
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════ KHUNG NHẬP DỮ LIỆU DÁN ═══════════ */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Dán dữ liệu từ file Excel/Google Sheets:</span>
                {parsedCards.length > 0 && (
                  <span className="text-indigo-600 font-extrabold">
                    ✅ Nhận diện được {parsedCards.length} thẻ ({rawLinesCount} dòng)
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Xem trước ({parsedCards.length} thẻ sẵn sàng nhập):</span>
                </div>

                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white max-h-48 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-mono text-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 w-10 text-center">#</th>
                        {columns.map((col, idx) => (
                          <th key={col.id} className="p-2 min-w-[120px]">
                            <span className="text-slate-400 font-normal mr-1">{idx + 1}.</span>
                            <span className="font-bold text-slate-800">{col.label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {parsedCards.slice(0, 10).map((card, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-2 text-center font-bold text-slate-400 text-[10px]">
                            {rowIdx + 1}
                          </td>
                          {columns.map((col, colIdx) => {
                            const val = card.rawParts[colIdx] || ''
                            return (
                              <td key={col.id} className="p-2 truncate max-w-[180px] text-slate-800 text-[11px]">
                                {val || <span className="text-slate-300 italic">(Trống)</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {parsedCards.length > 10 && (
                    <div className="p-2 text-center bg-slate-50/60 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                      ... và {parsedCards.length - 10} thẻ khác sẽ được thêm tự động theo đúng các cột trên
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0">
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
    </AnimatePresence>,
    document.body
  )
}

export default DeckCardBatchPasteModal
