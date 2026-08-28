import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  X, 
  ClipboardPaste, 
  Sparkles, 
  ArrowLeftRight, 
  GripVertical, 
  Check, 
  AlertCircle, 
  Layers, 
  ChevronRight,
  Settings2
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckCardBatchPasteModalProps {
  isOpen: boolean
  onClose: () => void
  deckId: string | number
  availableColumns?: string[]
  onSuccess?: () => void
}

export type FieldTargetKey = 
  | 'front' 
  | 'back' 
  | 'furigana' 
  | 'hint' 
  | 'mnemonic' 
  | 'front_audio_content' 
  | 'back_audio_content' 
  | 'example' 
  | 'ignore'

interface FieldOption {
  key: FieldTargetKey
  label: string
  color: string
  bg: string
  border: string
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: 'front', label: 'Mặt trước (Từ vựng)', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'back', label: 'Mặt sau (Ý nghĩa)', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'furigana', label: 'Furigana / Cách đọc', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'hint', label: 'Gợi ý (Hint)', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'mnemonic', label: 'Mẹo nhớ (Mnemonic)', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
  { key: 'front_audio_content', label: 'Text đọc mặt trước', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  { key: 'back_audio_content', label: 'Text đọc mặt sau', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  { key: 'example', label: 'Ví dụ mẫu', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'ignore', label: '🚫 Bỏ qua cột này', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
]

export function DeckCardBatchPasteModal({
  isOpen,
  onClose,
  deckId,
  availableColumns = [],
  onSuccess
}: DeckCardBatchPasteModalProps) {
  const [pasteText, setPasteText] = useState('')
  const [delimiter, setDelimiter] = useState<'auto' | '\t' | ';' | '|' | ','>('auto')
  const [columnMappings, setColumnMappings] = useState<FieldTargetKey[]>([
    'front',
    'back',
    'furigana',
    'hint',
    'mnemonic'
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // 1. Detect delimiter and parse raw rows
  const { rawRows, detectedColumnCount } = useMemo(() => {
    if (!pasteText.trim()) return { rawRows: [], detectedColumnCount: 0 }

    const lines = pasteText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return { rawRows: [], detectedColumnCount: 0 }

    // Auto detect delimiter if set to auto
    let activeDelim = delimiter
    if (activeDelim === 'auto') {
      const sample = lines.slice(0, 5).join('\n')
      const tabCount = (sample.match(/\t/g) || []).length
      const semiCount = (sample.match(/;/g) || []).length
      const pipeCount = (sample.match(/\|/g) || []).length
      const commaCount = (sample.match(/,/g) || []).length

      if (tabCount >= 2) activeDelim = '\t'
      else if (semiCount >= 2) activeDelim = ';'
      else if (pipeCount >= 2) activeDelim = '|'
      else if (commaCount >= 2) activeDelim = ','
      else activeDelim = '\t' // default fallback
    }

    let maxCols = 0
    const parsed = lines.map(line => {
      let parts: string[] = []
      if (activeDelim === '\t') parts = line.split('\t')
      else if (activeDelim === ';') parts = line.split(';')
      else if (activeDelim === '|') parts = line.split('|')
      else if (activeDelim === ',') parts = line.split(',')
      else parts = [line]

      const trimmedParts = parts.map(p => p.trim())
      if (trimmedParts.length > maxCols) maxCols = trimmedParts.length
      return trimmedParts
    })

    return { rawRows: parsed, detectedColumnCount: Math.max(maxCols, 2) }
  }, [pasteText, delimiter])

  // Sync columnMappings length with detectedColumnCount
  const activeMappings = useMemo(() => {
    const defaultFallbacks: FieldTargetKey[] = [
      'front',
      'back',
      'furigana',
      'hint',
      'mnemonic',
      'example',
      'front_audio_content',
      'back_audio_content',
      'ignore'
    ]

    const mappings = [...columnMappings]
    while (mappings.length < detectedColumnCount) {
      const nextKey = defaultFallbacks[mappings.length] || 'ignore'
      mappings.push(nextKey)
    }
    return mappings.slice(0, Math.max(detectedColumnCount, 2))
  }, [columnMappings, detectedColumnCount])

  const handleMappingChange = (colIndex: number, newKey: FieldTargetKey) => {
    setColumnMappings(prev => {
      const updated = [...activeMappings]
      updated[colIndex] = newKey
      return updated
    })
  }

  // 2. Map raw rows into structured flashcards
  const mappedCards = useMemo(() => {
    return rawRows.map(row => {
      let content = ''
      let explanation = ''
      const others: Record<string, any> = {}

      activeMappings.forEach((key, idx) => {
        const val = row[idx] || ''
        if (!val || key === 'ignore') return

        if (key === 'front') {
          content = val
        } else if (key === 'back') {
          explanation = val
        } else if (key === 'furigana') {
          others['furigana'] = val
        } else if (key === 'hint') {
          others['hint'] = val
        } else if (key === 'mnemonic') {
          others['mnemonic'] = val
        } else if (key === 'front_audio_content') {
          others['front_audio_content'] = val
        } else if (key === 'back_audio_content') {
          others['back_audio_content'] = val
        } else if (key === 'example') {
          others['example'] = val
        } else {
          others[key] = val
        }
      })

      return {
        content,
        explanation,
        others
      }
    }).filter(c => c.content || c.explanation)
  }, [rawRows, activeMappings])

  // 3. Batch Submit using optimized single-request import endpoint
  const handleImport = async () => {
    if (mappedCards.length === 0) {
      setError('Chưa có thẻ hợp lệ nào để nhập. Vui lòng dán dữ liệu vào ô trên.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await axios.post(`/api/v1/deck/${deckId}/import-text-update`, {
        cards: mappedCards,
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
                  <span>Dán Thẻ Đa Cột Thông Minh</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-200/60">
                    Smart Mapping
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  Copy từ Excel, Google Sheets, Anki (2, 3, 4+ cột) rồi dán vào đây
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

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            {/* Delimiter Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Ký tự phân cách cột:</span>
              </div>
              <div className="flex items-center gap-1">
                {(['auto', '\t', ';', '|', ','] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDelimiter(d)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer",
                      delimiter === d
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {d === 'auto' ? '⚡ Tự nhận diện' : d === '\t' ? 'Tab (Excel)' : d === ';' ? 'Chấm phẩy (;)' : d === '|' ? 'Thanh đứng (|)' : 'Dấu phẩy (,)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Dán văn bản vào khung bên dưới:</span>
                {rawRows.length > 0 && (
                  <span className="text-indigo-600 font-extrabold">
                    Phát hiện {rawRows.length} dòng • {detectedColumnCount} cột
                  </span>
                )}
              </div>
              <textarea
                rows={5}
                placeholder={`Ví dụ dữ liệu 3-4 cột từ Excel:\n食べる\tたべる\tĂn (nhóm 2)\tNhớ bộ thực...\n飲む\tのむ\tUống (nhóm 1)\tBộ ẩm...\n見る\tみる\tNhìn, xem\tBộ kiến...`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none shadow-2xs"
              />
            </div>

            {/* Interactive Column Mapping Row */}
            {detectedColumnCount > 0 && (
              <div className="space-y-2.5 p-3.5 sm:p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-800">
                      Thiết Lập Ánh Xạ Thứ Tự Cột ({detectedColumnCount} Cột)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Bấm vào từng cột để chọn trường dữ liệu tương ứng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {activeMappings.map((mappedKey, idx) => {
                    const currentField = FIELD_OPTIONS.find(f => f.key === mappedKey) || FIELD_OPTIONS[0]
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-2.5 rounded-2xl border bg-white shadow-2xs transition-all flex flex-col gap-1.5",
                          currentField.border
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black">
                            CỘT #{idx + 1}
                          </span>
                          <span className={cn("text-[10px] font-extrabold", currentField.color)}>
                            {idx === 0 ? 'Mặc định 1' : idx === 1 ? 'Mặc định 2' : `Cột ${idx + 1}`}
                          </span>
                        </div>

                        {/* Field Select Dropdown */}
                        <select
                          value={mappedKey}
                          onChange={(e) => handleMappingChange(idx, e.target.value as FieldTargetKey)}
                          className={cn(
                            "w-full h-8 px-2 rounded-xl text-xs font-black border outline-none cursor-pointer transition-all",
                            currentField.bg,
                            currentField.color,
                            currentField.border
                          )}
                        >
                          {FIELD_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Real-time Parsed Preview Table */}
            {mappedCards.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Xem trước kết quả ({mappedCards.length} thẻ sẵn sàng nhập):</span>
                </div>

                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-600">
                        <tr>
                          <th className="p-2.5 w-10 text-center">#</th>
                          {activeMappings.map((key, idx) => {
                            const field = FIELD_OPTIONS.find(f => f.key === key) || FIELD_OPTIONS[0]
                            return (
                              <th key={idx} className="p-2.5 min-w-[130px]">
                                <span className={cn("inline-block px-2 py-0.5 rounded-lg border font-black text-[10px]", field.bg, field.color, field.border)}>
                                  {field.label}
                                </span>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rawRows.slice(0, 5).map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-2.5 text-center font-bold text-slate-400 text-[10px]">
                              {rowIdx + 1}
                            </td>
                            {activeMappings.map((key, colIdx) => (
                              <td key={colIdx} className={cn("p-2.5 font-medium truncate max-w-[200px]", key === 'ignore' ? 'text-slate-300 line-through' : 'text-slate-800')}>
                                {row[colIdx] || <span className="text-slate-300 italic">(Trống)</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {mappedCards.length > 5 && (
                    <div className="p-2 text-center bg-slate-50/60 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                      ... và {mappedCards.length - 5} thẻ khác sẽ được thêm tự động
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
              disabled={mappedCards.length === 0 || isSubmitting}
              className="h-10 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Đang nhập thẻ...' : `NHẬP ${mappedCards.length} THẺ NGAY 🚀`}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckCardBatchPasteModal
