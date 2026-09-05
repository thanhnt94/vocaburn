import React, { useState, useMemo } from 'react'
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

  // Generate numbered pages list: e.g. [1, 2, 3, 4] or [1, 2, 3, '...', 10]
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  return (
    <>
      {/* Mobile Compact Stepper (< 1 / 5 >) */}
      <div className={cn("flex sm:hidden items-center gap-1.5 shrink-0 select-none", className)}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 disabled:border-slate-150 shadow-2xs hover:border-orange-300 hover:text-orange-600 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleOpenJump}
          className="px-3 h-8 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 hover:border-orange-400 hover:shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
          title="Jump to page"
        >
          <span className="text-[11px] font-black text-slate-800 group-hover:text-orange-600 tracking-wider">
            {currentPage}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">/</span>
          <span className="text-[11px] font-bold text-slate-500">
            {Math.max(1, totalPages)}
          </span>
        </button>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 disabled:border-slate-150 shadow-2xs hover:border-orange-300 hover:text-orange-600 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop & Tablet Full Numbered Pagination (< 1 2 3 4 ... >) */}
      <div className={cn("hidden sm:flex items-center gap-1.5 shrink-0 select-none", className)}>
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 disabled:border-slate-150 shadow-2xs hover:border-orange-300 hover:text-orange-600 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Number Buttons & Ellipsis */}
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <button
                key={`ellipsis-${idx}`}
                onClick={handleOpenJump}
                className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50/60 font-black text-xs transition-all cursor-pointer select-none"
                title="Jump to page"
              >
                ...
              </button>
            )
          }

          const pageNum = p as number
          const isCurrent = pageNum === currentPage

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "min-w-[34px] h-8.5 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center",
                isCurrent
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs shadow-orange-500/25"
                  : "bg-white border border-slate-200/80 text-slate-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/30 shadow-2xs"
              )}
            >
              {pageNum}
            </button>
          )
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 disabled:border-slate-150 shadow-2xs hover:border-orange-300 hover:text-orange-600 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Custom App-like Page Jump Modal */}
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
                      Jump to Page
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Total {totalPages} pages (1 - {totalPages})
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
                      placeholder="Enter page number..."
                      className="w-full h-12 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 text-lg font-black text-center text-orange-600 focus:border-orange-500 focus:bg-white outline-none transition-all"
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
                        Page 1
                      </button>
                      {totalPages > 4 && (
                        <button
                          type="button"
                          onClick={() => setTargetPageInput(String(Math.ceil(totalPages / 2)))}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Page {Math.ceil(totalPages / 2)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTargetPageInput(String(totalPages))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Page {totalPages}
                      </button>
                    </div>
                  )}

                  {/* Action Submit */}
                  <button
                    type="submit"
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs shadow-xs shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Go to Page</span>
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
