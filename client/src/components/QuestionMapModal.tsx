import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { QuestionMapGrid } from '@/components/QuestionMapGrid'
import { getMapTitleInfo } from '@/lib/flashcard-utils'
import type { FilterMapMode } from '@/types/flashcard'

export interface QuestionMapModalProps {
  isOpen: boolean
  onClose: () => void
  questions: any[]
  mainTab: any
  practiceAnswers?: Record<number, any>
  sessionAnswers?: Record<number, any>
  currentIndex: number
  navigateToQuestion: (idx: number) => void
  filterMode: FilterMapMode | any
  setFilterMode: (mode: any) => void
  getFilteredCount: (mode: any) => number
  subLessonGrouping?: { enabled?: boolean; column?: string; hide_uncategorized?: boolean } | any
  onSwitchGroup?: (col: string | null, val: string | null) => void
}

export const QuestionMapModal: React.FC<QuestionMapModalProps> = ({
  isOpen,
  onClose,
  questions,
  mainTab,
  practiceAnswers = {},
  sessionAnswers = {},
  currentIndex,
  navigateToQuestion,
  filterMode,
  setFilterMode,
  getFilteredCount,
  subLessonGrouping,
  onSwitchGroup
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed inset-x-0 top-0 bottom-12 z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
        >
          {/* Header */}
          <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-2 flex items-center justify-between shadow-[0_1px_20px_rgba(99,102,241,0.04)]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-8.5 h-8.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all flex-shrink-0 cursor-pointer"
                title="Back to Study"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              {(() => {
                const info = getMapTitleInfo(filterMode)
                const count = getFilteredCount(filterMode)
                return (
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight leading-snug">
                      {info.title} ({count})
                    </h2>
                    <p className="text-[9px] text-slate-400 font-bold">
                      {info.subtitle}
                    </p>
                  </div>
                )
              })()}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer text-xs font-bold"
              title="Close"
            >
              ✕
            </button>
          </header>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
            <QuestionMapGrid
              questions={questions}
              mainTab={mainTab}
              practiceAnswers={practiceAnswers}
              sessionAnswers={sessionAnswers}
              currentIndex={currentIndex}
              navigateToQuestion={navigateToQuestion}
              setIsMapOpen={(val) => {
                if (!val) onClose()
              }}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              showFiltersInline={true}
              subLessonGrouping={subLessonGrouping}
              onSwitchGroup={onSwitchGroup}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default QuestionMapModal
