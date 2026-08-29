import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StudyHeaderTracker } from '@/components/StudyHeaderTracker'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

export interface FlashcardHeaderProps {
  isHeaderSurging: boolean
  activeMode: string
  activePercent: number
  pipeline: PipelineStepStatus[]
  displayStepIdx: number
  allDone: boolean
  deckId: string | number
  deckTitle?: string
  subCurr: number
  subTotal: number
  progressPillText?: string
  streakCount: number
  modeBadge?: { emoji: string; label: string; short: string; style: string }
  onSurgeChange: (isSurging: boolean) => void
  onViewModeChange?: (viewMode: 0 | 1) => void
  onExit: () => void
  timeMode?: 'card' | 'today' | 'all'
  onToggleTimeMode?: () => void
  initialTodayTime?: number
  initialAllTimeTime?: number
  showFeedback?: boolean
  hasRated?: boolean
  currentIndex?: number
  timeLeftRef?: React.MutableRefObject<number>
  sessionStudyTimeRef?: React.MutableRefObject<number>
  formatHeaderTime?: (secs: number) => string
  scoreMode?: 'today' | 'all'
  onToggleScoreMode?: () => void
  xp?: number
  todayXP?: number
  sessionXP?: number
  answeredCount?: number
  correctCount?: number
  totalCards?: number
  cardsRemaining?: number
  onCreateNewCard?: () => void
  rightAction?: React.ReactNode
}

export const FlashcardHeader: React.FC<FlashcardHeaderProps> = ({
  isHeaderSurging,
  activeMode,
  activePercent,
  pipeline,
  displayStepIdx,
  allDone,
  deckId,
  deckTitle,
  subCurr,
  subTotal,
  progressPillText,
  streakCount,
  modeBadge,
  onSurgeChange,
  onViewModeChange,
  onExit,
  timeMode,
  onToggleTimeMode,
  initialTodayTime,
  initialAllTimeTime,
  showFeedback,
  hasRated,
  currentIndex,
  timeLeftRef,
  sessionStudyTimeRef,
  formatHeaderTime,
  scoreMode,
  onToggleScoreMode,
  xp,
  todayXP,
  sessionXP,
  answeredCount,
  correctCount,
  totalCards,
  cardsRemaining,
  onCreateNewCard,
  rightAction
}) => {
  return (
    <header className="sticky top-0 flex-shrink-0 z-[120] backdrop-blur-2xl px-2.5 md:px-4 py-1.5 flex items-center justify-between gap-2.5 transition-colors duration-300 relative overflow-hidden bg-slate-950/90 border-b border-slate-800/80 text-white shadow-xl">
      {/* Sleek Underline Progress Bar at the Bottom Edge of Header */}
      <AnimatePresence>
        {!isHeaderSurging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-800/60 pointer-events-none z-[125]"
          >
            <motion.div 
              className="h-full rounded-r-full transition-all duration-500 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${activePercent}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 relative z-[140] flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <StudyHeaderTracker
            pipeline={pipeline}
            currentStepIndex={displayStepIdx}
            allDone={allDone}
            deckId={deckId}
            deckTitle={deckTitle}
            subProgressCurr={subCurr}
            subProgressTotal={subTotal}
            progressPillText={progressPillText}
            streakCount={streakCount}
            activeMode={activeMode}
            modeBadge={modeBadge}
            onSurgeChange={onSurgeChange}
            onViewModeChange={onViewModeChange}
            onExit={onExit}
            timeMode={timeMode}
            onToggleTimeMode={onToggleTimeMode}
            initialTodayTime={initialTodayTime}
            initialAllTimeTime={initialAllTimeTime}
            showFeedback={showFeedback}
            hasRated={hasRated}
            currentIndex={currentIndex}
            timeLeftRef={timeLeftRef}
            sessionStudyTimeRef={sessionStudyTimeRef}
            formatHeaderTime={formatHeaderTime}
            scoreMode={scoreMode}
            onToggleScoreMode={onToggleScoreMode}
            xp={xp}
            todayXP={todayXP}
            sessionXP={sessionXP}
            answeredCount={answeredCount}
            correctCount={correctCount}
            totalCards={totalCards}
            cardsRemaining={cardsRemaining}
          />
        </div>

        {onCreateNewCard && (
          <button
            onClick={onCreateNewCard}
            className="w-8.5 h-8.5 ml-1 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md active:scale-90 transition-all flex-shrink-0 cursor-pointer"
            title="Thêm thẻ nhanh"
          >
            <span className="text-lg font-bold leading-none">+</span>
          </button>
        )}

        {rightAction}
      </div>
    </header>
  )
}
