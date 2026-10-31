import React, { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'
import { PracticeTypingInput } from './PracticeTypingInput'
import { PracticeActionControls } from './PracticeActionControls'
import { PracticeMobileTabs } from './PracticeMobileTabs'

export interface PracticeBottomBarProps {
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
  showBottomNavTabs?: boolean
}

export const PracticeBottomBar: React.FC<PracticeBottomBarProps> = ({
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
  isFlipped,
  hasRated,
  justAnswered,
  showFeedback,
  onOpenSettings,
  onPlayAudio,
  onOpenFeedback,
  onNext,
  onFlip,
  onTabChange,
  showBottomNavTabs = false
}) => {
  const hasAnsweredPractice = showFeedback || practiceAnswers[currentIndex] !== undefined
  const isTypingMode = mainTab === 'practice' && baseMode === 'typing'

  const touchStartYRef = useRef<number | null>(null)
  const touchStartXRef = useRef<number | null>(null)

  const handleBarTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX
    touchStartYRef.current = clientY
    touchStartXRef.current = clientX
  }

  const handleBarTouchEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (touchStartYRef.current === null) return
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.PointerEvent).clientY
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.PointerEvent).clientX
    const deltaY = touchStartYRef.current - clientY
    const deltaX = Math.abs(clientX - (touchStartXRef.current || 0))
    touchStartYRef.current = null
    touchStartXRef.current = null

    // Upward swipe threshold: pulled up > 35px, primarily vertical
    if (deltaY > 35 && deltaY > deltaX * 0.8) {
      onOpenSettings?.()
    }
  }

  return (
    <footer 
      onTouchStart={!showBottomNavTabs ? handleBarTouchStart : undefined}
      onTouchEnd={!showBottomNavTabs ? handleBarTouchEnd : undefined}
      onPointerDown={!showBottomNavTabs ? handleBarTouchStart : undefined}
      onPointerUp={!showBottomNavTabs ? handleBarTouchEnd : undefined}
      className="relative w-full flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 px-0 pt-0 pb-0 z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)] touch-pan-x"
      title={!showBottomNavTabs ? "Swipe up for Practice Settings" : undefined}
    >
      {/* Quick Settings Grabber Pill */}
      {onOpenSettings && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className={cn(
            "absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-1.5 rounded-full bg-slate-300/80 hover:bg-slate-400 dark:bg-slate-600 cursor-pointer transition-all active:scale-95 z-30",
            !showBottomNavTabs ? "block" : "hidden md:block"
          )}
          title="Click or swipe up for Practice Settings"
        />
      )}
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        {activeBottomTab === 'flashcard' && (
          <PracticeActionControls
            mainTab={mainTab}
            hasAnsweredPractice={hasAnsweredPractice}
            currentQuestion={currentQuestion}
            isFlipped={isFlipped}
            showFeedback={showFeedback}
            justAnswered={justAnswered}
            hasRated={hasRated}
            onOpenSettings={onOpenSettings}
            onPlayAudio={onPlayAudio}
            onOpenFeedback={onOpenFeedback}
            onNext={onNext}
            onFlip={onFlip}
            isTypingMode={isTypingMode}
            typingInput={typingInput}
            onCheckTyping={onCheckTyping}
          />
        )}

        {showBottomNavTabs && (
          <PracticeMobileTabs
            activeBottomTab={activeBottomTab}
            onTabChange={onTabChange}
            onOpenSettings={onOpenSettings}
          />
        )}
      </div>
    </footer>
  )
}

export default PracticeBottomBar
