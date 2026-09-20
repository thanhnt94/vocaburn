import React from 'react'
import { Settings, Volume2, ChevronRight, RotateCcw } from 'lucide-react'
import type { Question } from '@/types/flashcard'
import { PracticeTypingInput } from './PracticeTypingInput'

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

  // ── MCQ & LISTENING BAR ──
  if (baseMode === 'mcq' || baseMode === 'listening') {
    return (
      <footer className="relative w-full flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 px-0 pt-0 pb-safe z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-2 px-3 sm:px-4 py-2">
          {/* Settings Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm active:scale-95 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5.5 h-5.5" />
          </button>

          {/* Audio Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio();
            }}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm active:scale-95 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
            title="Play Audio"
          >
            <Volume2 className="w-5.5 h-5.5" />
          </button>

          {/* Next Button when answered, or hint when unanswered */}
          {hasAnswered ? (
            <button
              type="button"
              onClick={() => onNext()}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 dark:shadow-none flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
            >
              <span>NEXT CARD</span>
              <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex-1 h-12 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 italic">
              {baseMode === 'listening' ? 'Type what you hear and press ↵' : 'Select an answer above'}
            </div>
          )}
        </div>
      </footer>
    )
  }

  // ── MEMRISE FLASHCARD BAR (STAGE 1 & 6) ──
  return (
    <footer className="relative w-full flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 px-0 pt-0 pb-safe z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
      <div className="max-w-2xl mx-auto w-full flex items-center gap-2 px-3 sm:px-4 py-2">
        {/* Settings Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm active:scale-95 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer"
          title="Settings"
        >
          <Settings className="w-5.5 h-5.5" />
        </button>

        {/* Audio Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayAudio();
          }}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm active:scale-95 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
          title="Play Audio"
        >
          <Volume2 className="w-5.5 h-5.5" />
        </button>

        {/* Action Controls */}
        {!isFlipped ? (
          <div className="flex-1 flex items-center gap-2 h-12">
            <button
              type="button"
              onClick={() => onFlip()}
              className="flex-1 h-12 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 dark:shadow-none flex items-center justify-center gap-2 uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>LẬT MẶT SAU</span>
              <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
            </button>
            <button
              type="button"
              onClick={() => onNext()}
              className="px-3.5 h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
              title="Tôi đã thuộc từ này, chuyển bước tiếp theo"
            >
              <span>ĐÃ BIẾT</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 h-12">
            <button
              type="button"
              onClick={() => onFlip()}
              className="w-12 h-12 flex-shrink-0 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              title="Lật lại mặt trước"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNext()}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 dark:shadow-none flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
            >
              <span>TIẾP TỤC (NEXT)</span>
              <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}

export default MemriseBottomBar
