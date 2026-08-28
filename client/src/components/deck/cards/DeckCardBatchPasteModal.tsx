import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardPaste, AlertCircle, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckCardBatchPasteModalProps {
  isOpen: boolean
  onClose: () => void
  deckId: string | number
  onSuccess?: () => void
}

export function DeckCardBatchPasteModal({
  isOpen,
  onClose,
  deckId,
  onSuccess
}: DeckCardBatchPasteModalProps) {
  const [pasteText, setPasteText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  if (!isOpen) return null

  // Parse lines to preview count
  const parsedRows = pasteText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      // Split by tab or semicolon or comma if no tab
      const parts = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : [line, '']
      return {
        front: parts[0]?.trim() || '',
        back: parts.slice(1).join(' ').trim() || ''
      }
    })
    .filter(r => r.front)

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setError('Không có dữ liệu hợp lệ để nhập')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      // Add cards in parallel chunks
      for (const row of parsedRows) {
        await axios.post(`/api/v1/deck/${deckId}/flashcard`, {
          content: row.front,
          explanation: row.back,
          options: []
        })
      }

      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      onClose()
      setPasteText('')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Có lỗi xảy ra khi nhập dữ liệu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
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
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl relative z-10 p-6 border border-slate-100 flex flex-col max-h-[90vh] text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ClipboardPaste className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Dán Thẻ Hàng Loạt</h3>
                <p className="text-[11px] text-slate-400 font-bold">Copy từ Excel/Google Sheets rồi dán vào đây</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-1">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 font-medium leading-relaxed">
              💡 <strong>Định dạng hỗ trợ:</strong> Mỗi dòng một thẻ. Cột 1 là <em>Mặt trước</em>, Cột 2 là <em>Mặt sau</em> (phân cách bằng phím Tab hoặc dấu chấm phẩy <code>;</code>).
            </div>

            <textarea
              rows={6}
              placeholder={`Ví dụ:\n食べる\tĂn (động từ nhóm 2)\n飲む\tUống (động từ nhóm 1)\n見る\tNhìn, xem`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
            />

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-indigo-700">
                  <span>Xem trước ({parsedRows.length} thẻ nhận diện được):</span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 divide-y divide-slate-100 text-xs">
                  {parsedRows.slice(0, 20).map((row, idx) => (
                    <div key={idx} className="p-2 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                      <strong className="text-slate-800 flex-1 truncate">{row.front}</strong>
                      <span className="text-slate-500 flex-1 truncate">{row.back || '(Trống)'}</span>
                    </div>
                  ))}
                  {parsedRows.length > 20 && (
                    <div className="p-2 text-center text-[10px] font-bold text-slate-400">
                      ... và {parsedRows.length - 20} thẻ khác
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={parsedRows.length === 0 || isSubmitting}
              className="px-5 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'ĐANG NHẬP DỮ LIỆU...' : `NHẬP ${parsedRows.length} THẺ 🚀`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckCardBatchPasteModal
