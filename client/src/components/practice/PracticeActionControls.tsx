import React from 'react';
import { Volume2, Lightbulb, ChevronRight, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/flashcard';

export interface PracticeActionControlsProps {
  mainTab: 'practice' | 'fsrs';
  hasAnsweredPractice: boolean;
  currentQuestion: Question | null;
  isFlipped: boolean;
  showFeedback: boolean;
  justAnswered: boolean;
  hasRated: boolean;
  onOpenSettings: () => void;
  onPlayAudio: () => void;
  onOpenFeedback: () => void;
  onNext: () => void;
  onFlip: () => void;
  isTypingMode?: boolean;
  typingInput?: string;
  onCheckTyping?: () => void;
}

export const PracticeActionControls: React.FC<PracticeActionControlsProps> = ({
  mainTab,
  hasAnsweredPractice,
  currentQuestion,
  isFlipped,
  showFeedback,
  justAnswered,
  hasRated,
  onOpenSettings,
  onPlayAudio,
  onOpenFeedback,
  onNext,
  onFlip,
  isTypingMode = false,
  typingInput = '',
  onCheckTyping
}) => {
  return (
    <div className="w-full flex items-center gap-1.5 sm:gap-3 px-3 sm:px-4 pt-1 pb-2">
      {/* Audio Button */}
      {currentQuestion && (mainTab !== 'practice' || hasAnsweredPractice) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayAudio();
          }}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm active:scale-95 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
          title="Pronounce"
        >
          <Volume2 className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
        </button>
      )}

      {/* Explanation / Lightbulb Button */}
      {((mainTab === 'practice' ? hasAnsweredPractice : (isFlipped || showFeedback))) && (
        <button
          onClick={() => onOpenFeedback()}
          className={cn(
            "xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm active:scale-95 transition-all relative cursor-pointer",
            justAnswered
              ? "bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 dark:ring-indigo-500/50 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
              : "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
          )}
          title="Explanation & Guide"
        >
          <Lightbulb className="w-5.5 h-5.5" />
          {justAnswered && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      )}

      {/* Main Action Buttons */}
      {mainTab === 'practice' ? (
        hasAnsweredPractice ? (
          <button
            onClick={() => onNext()}
            className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 dark:shadow-none flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
          >
            <span>Continue</span>
            <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : isTypingMode ? (
          <div className="flex-1 flex gap-2 h-12">
            <button
              onClick={() => onNext()}
              className="w-24 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 font-black text-xs rounded-2xl flex items-center justify-center gap-1 uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={() => {
                if (typingInput && typingInput.trim() && onCheckTyping) {
                  onCheckTyping()
                }
              }}
              disabled={!typingInput || !typingInput.trim()}
              className={cn(
                "flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all",
                typingInput && typingInput.trim()
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-95 cursor-pointer"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-750 cursor-not-allowed opacity-60"
              )}
            >
              <span>Submit Answer</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex gap-2 h-12">
            <button
              onClick={() => onNext()}
              className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
            >
              Skip <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex-[2] h-12 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-extrabold text-xs rounded-2xl flex items-center justify-center uppercase tracking-widest pointer-events-none select-none">
              Waiting...
            </div>
          </div>
        )
      ) : (
        !hasRated ? (
          <button
            onClick={() => onFlip()}
            className="flex-1 h-12 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 dark:shadow-none flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-indigo-400/60 hover:shadow-xl cursor-pointer"
          >
              {isFlipped ? (
                <>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>FLIP BACK</span>
                  <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                </>
              ) : (
                <>
                  <span>FLIP CARD</span>
                  <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </>
              )}
            </button>
        ) : (
          <div className="flex-1 flex gap-3 h-12">
            <button
              onClick={() => onFlip()}
              className="w-12 h-12 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-indigo-100/80 dark:from-indigo-950/60 dark:to-indigo-900/60 hover:from-indigo-100 hover:to-indigo-200 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/60 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              title={isFlipped ? "Flip to Front" : "Flip to Back"}
            >
              <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-300 animate-[spin_4s_linear_infinite]" />
            </button>
            <button
              onClick={() => onNext()}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 dark:shadow-none flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
            >
              <span>NEXT CARD</span>
              <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )
      )}
    </div>
  );
};
