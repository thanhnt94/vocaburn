import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, Maximize2, Sparkles, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface DeckCardQuickAddProps {
  isOpen: boolean
  onClose: () => void
  onAddCard: (front: string, back: string) => Promise<boolean>
  isAdding?: boolean
  onOpenFullEdit?: () => void
}

export function DeckCardQuickAdd({
  isOpen,
  onClose,
  onAddCard,
  isAdding = false,
  onOpenFullEdit,
}: DeckCardQuickAddProps) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const frontRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => frontRef.current?.focus(), 150)
    }
  }, [isOpen])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!front.trim() || !back.trim() || isAdding) return

    const success = await onAddCard(front.trim(), back.trim())
    if (success) {
      setFront('')
      setBack('')
      frontRef.current?.focus()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
          className="fixed bottom-[58px] md:bottom-14 left-0 right-0 z-[140] bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-3.5 sm:p-4 text-left"
        >
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50 text-orange-600 font-bold text-xs">
                  ⚡
                </span>
                <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
                  Thêm Nhanh Thẻ Mới
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {onOpenFullEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenFullEdit()
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                    title="Mở rộng để nhập Furigana, ví dụ, hình ảnh, âm thanh..."
                  >
                    <Maximize2 className="w-3 h-3 text-indigo-600" />
                    <span>Thêm chi tiết (Đầy đủ trường)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inputs & Submit form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  ref={frontRef}
                  type="text"
                  placeholder="Mặt trước (Từ vựng, Thuật ngữ)..."
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Mặt sau (Ý nghĩa, Định nghĩa)..."
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  💡 Nhấn Enter để lưu và tự động nhập tiếp thẻ sau
                </p>

                <button
                  type="submit"
                  disabled={!front.trim() || !back.trim() || isAdding}
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
    </AnimatePresence>
  )
}

export default DeckCardQuickAdd
