import React from 'react'
import type { Question } from '@/types/flashcard'
import { PracticeTypingInput } from './PracticeTypingInput'
import { PracticeActionControls } from './PracticeActionControls'

export interface MemriseBottomBarProps {
  baseMode: 'mcq' | 'typing' | 'listening' | 'flashcard'
  typingInput?: string
  setTypingInput?: (val: string) => void
  onCheckTyping?: () => void
  currentIndex: number
  hasAnswered: boolean
  currentQuestion: Question | null
  isFlipped: boolean
  justAnswered: boolean
  onOpenSettings: () => void
  onPlayAudio: () => void
  onOpenFeedback: () => void
  onNext: () => void
  onFlip: () => void
}

export const MemriseBottomBar: React.FC<MemriseBottomBarProps> = ({
  baseMode,
  typingInput,
  setTypingInput,
  onCheckTyping,
  currentIndex,
  hasAnswered,
  currentQuestion,
  isFlipped,
  justAnswered,
  onOpenSettings,
  onPlayAudio,
  onOpenFeedback,
  onNext,
  onFlip
}) => {
  const isTypingMode = baseMode === 'typing'

  // ── TYPING MODE SINGLE-ROW BAR ──
  if (isTypingMode) {
    return (
      <PracticeTypingInput
        typingInput={typingInput || ''}
        setTypingInput={setTypingInput!}
        onCheckTyping={onCheckTyping!}
        hasAnsweredPractice={hasAnswered}
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

  // ── MCQ & LISTENING MULTI-ROW BAR (Without Tabs) ──
  return (
    <footer className="relative w-full flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 px-0 pt-0 pb-safe z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
      <div className="max-w-2xl mx-auto w-full flex flex-col pt-1.5 pb-2.5">
        <PracticeActionControls
          mainTab={baseMode === 'flashcard' ? 'fsrs' : 'practice'}
          hasAnsweredPractice={hasAnswered}
          currentQuestion={currentQuestion}
          isFlipped={isFlipped}
          showFeedback={hasAnswered}
          justAnswered={justAnswered}
          hasRated={hasAnswered}
          isRoadmapTestMode={true}
          onOpenSettings={onOpenSettings}
          onPlayAudio={onPlayAudio}
          onOpenFeedback={onOpenFeedback}
          onNext={onNext}
          onFlip={onFlip}
        />
      </div>
    </footer>
  )
}

export default MemriseBottomBar
