import React from 'react'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'
import { PracticeTypingInput } from './PracticeTypingInput'
import { PracticeActionControls } from './PracticeActionControls'
import { PracticeMobileTabs } from './PracticeMobileTabs'

export interface PracticeBottomBarProps {
  isFeedbackOpen: boolean
  activeBottomTab: 'map' | 'flashcard' | 'stats'
  mainTab: 'practice' | 'fsrs'
  baseMode?: string
  typingInput?: string
  setTypingInput?: (val: string) => void
  onCheckTyping?: () => void
  currentIndex: number
  practiceAnswers: Record<number, number>
  sessionAnswers: Record<number, number | number[]>
  currentQuestion: Question | null
  currentPracticeData?: PracticeQuestionData | null
  isRoadmapTestMode: boolean
  isFlipped: boolean
  hasRated: boolean
  justAnswered: boolean
  showFeedback: boolean
  onOpenSettings: () => void
  onPlayAudio: () => void
  onOpenFeedback: () => void
  onNext: () => void
  onFlip: () => void
  onTabChange: (tab: 'map' | 'flashcard' | 'stats') => void
}

export const PracticeBottomBar: React.FC<PracticeBottomBarProps> = ({
  isFeedbackOpen,
  activeBottomTab,
  mainTab,
  baseMode,
  typingInput,
  setTypingInput,
  onCheckTyping,
  currentIndex,
  practiceAnswers,
  sessionAnswers,
  currentQuestion,
  currentPracticeData,
  isRoadmapTestMode,
  isFlipped,
  hasRated,
  justAnswered,
  showFeedback,
  onOpenSettings,
  onPlayAudio,
  onOpenFeedback,
  onNext,
  onFlip,
  onTabChange
}) => {
  const hasAnsweredPractice = showFeedback || practiceAnswers[currentIndex] !== undefined
  const isTypingMode = mainTab === 'practice' && baseMode === 'typing'

  // ── TYPING MODE SINGLE-ROW BAR ──
  if (isTypingMode) {
    return (
      <PracticeTypingInput
        typingInput={typingInput || ''}
        setTypingInput={setTypingInput!}
        onCheckTyping={onCheckTyping!}
        hasAnsweredPractice={hasAnsweredPractice}
        currentIndex={currentIndex}
        isTypingMode={isTypingMode}
        currentQuestion={currentQuestion}
        justAnswered={justAnswered}
        onOpenSettings={onOpenSettings}
        onPlayAudio={onPlayAudio}
        onOpenFeedback={onOpenFeedback}
        onNext={onNext}
      />
    )
  }

  return (
    <footer className="relative w-full flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 px-0 pt-0 pb-0 z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        {activeBottomTab === 'flashcard' && !isFeedbackOpen && (
          <PracticeActionControls
            mainTab={mainTab}
            hasAnsweredPractice={hasAnsweredPractice}
            currentQuestion={currentQuestion}
            isFlipped={isFlipped}
            showFeedback={showFeedback}
            justAnswered={justAnswered}
            hasRated={hasRated}
            isRoadmapTestMode={isRoadmapTestMode}
            onOpenSettings={onOpenSettings}
            onPlayAudio={onPlayAudio}
            onOpenFeedback={onOpenFeedback}
            onNext={onNext}
            onFlip={onFlip}
          />
        )}

        <PracticeMobileTabs
          activeBottomTab={activeBottomTab}
          onTabChange={onTabChange}
        />
      </div>
    </footer>
  )
}

export default PracticeBottomBar
