import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DeckPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function DeckPagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}: DeckPaginationProps) {
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false)
  const [targetPageInput, setTargetPageInput] = useState('')

  const handleOpenJump = () => {
    setTargetPageInput(String(currentPage))
    setIsJumpModalOpen(true)
  }

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const pageNum = parseInt(targetPageInput, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
      setIsJumpModalOpen(false)
    }
  }

  return (
    <>
      <div className={cn("flex items-center gap-1.5 shrink-0 select-none", className)}>
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 disabled:border-slate-150 shadow-2xs hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center Clickable Page Badge (Opens Custom Jump Modal) */}
        <button
          onClick={handleOpenJump}
          className="px-3 h-8 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 hover:border-indigo-400 hover:shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
          title="Bấm để nhảy tới trang bất kỳ"
        >
          <span className="text-[11px] font-black text-slate-800 group-hover:text-indigo-600 tracking-wider">
            {currentPage}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">/</span>
          <span className="text-[11px] font-bold text-slate-500">
            {Math.max(1, totalPages)}
          </span>
        </button>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 disabled:border-slate-150 shadow-2xs hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          title="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Custom App-like Page Jump Modal (Portaled to document.body for true center) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isJumpModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsJumpModalOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                className="w-full max-w-xs bg-white rounded-3xl shadow-2xl relative z-10 p-5 border border-slate-100 text-left flex flex-col gap-4 mx-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">
                      Chuyển Đến Trang
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Tổng cộng có {totalPages} trang (1 - {totalPages})
                    </p>
                  </div>
                  <button
                    onClick={() => setIsJumpModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Form Input */}
                <form onSubmit={handleJumpSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={targetPageInput}
                      onChange={(e) => setTargetPageInput(e.target.value)}
                      autoFocus
                      placeholder="Nhập số trang..."
                      className="w-full h-12 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 text-lg font-black text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  {/* Quick Jump Shortcuts */}
                  {totalPages > 2 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetPageInput('1')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Trang 1
                      </button>
                      {totalPages > 4 && (
                        <button
                          type="button"
                          onClick={() => setTargetPageInput(String(Math.ceil(totalPages / 2)))}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Trang {Math.ceil(totalPages / 2)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTargetPageInput(String(totalPages))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Trang {totalPages}
                      </button>
                    </div>
                  )}

                  {/* Action Submit */}
                  <button
                    type="submit"
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs shadow-xs shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Chuyển Trang</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default DeckPagination
