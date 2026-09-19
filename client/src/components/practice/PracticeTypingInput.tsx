import React, { useRef, useEffect } from 'react';
import { Settings, Volume2, Lightbulb, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/flashcard';

export interface PracticeTypingInputProps {
  typingInput: string;
  setTypingInput: (val: string) => void;
  onCheckTyping: () => void;
  hasAnsweredPractice: boolean;
  currentIndex: number;
  isTypingMode: boolean;
  currentQuestion: Question | null;
  justAnswered: boolean;
  onOpenSettings: () => void;
  onPlayAudio: () => void;
  onOpenFeedback: () => void;
  onNext: () => void;
}

export const PracticeTypingInput: React.FC<PracticeTypingInputProps> = ({
  typingInput,
  setTypingInput,
  onCheckTyping,
  hasAnsweredPractice,
  currentIndex,
  isTypingMode,
  currentQuestion,
  justAnswered,
  onOpenSettings,
  onPlayAudio,
  onOpenFeedback,
  onNext
}) => {
  const typingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isTypingMode && !hasAnsweredPractice) {
      const timer = setTimeout(() => {
        typingInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, hasAnsweredPractice, isTypingMode]);

  return (
    <footer className="relative w-full flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 px-0 pt-0 pb-safe z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (typingInput && typingInput.trim()) {
              onCheckTyping();
            }
          }}
          className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5"
        >
          {/* Settings Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-xs active:scale-95 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer"
            title="Practice settings"
          >
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>

          {!hasAnsweredPractice ? (
            <>
              {/* Virtual Keyboard-Friendly Typing Input */}
              <input
                ref={typingInputRef}
                type="text"
                value={typingInput || ''}
                onChange={(e) => setTypingInput(e.target.value)}
                onFocus={(e) => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typingInput && typingInput.trim()) {
                      onCheckTyping();
                    }
                  }
                }}
                placeholder="Type answer..."
                enterKeyHint="go"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="flex-1 min-w-0 h-11 bg-slate-50/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 dark:focus:ring-amber-500/30 rounded-2xl px-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none transition-all shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium"
              />

              {/* Check Submit Button */}
              <button
                type="submit"
                disabled={!typingInput || !typingInput.trim()}
                className={cn(
                  "h-11 px-3.5 sm:px-4 flex-shrink-0 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-xs",
                  typingInput && typingInput.trim()
                    ? "bg-amber-500 hover:bg-amber-600 text-white active:scale-95 shadow-amber-200/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-750 cursor-not-allowed opacity-60"
                )}
              >
                <span>Check</span>
              </button>
            </>
          ) : (
            <>
              {/* Audio Button */}
              {currentQuestion && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAudio();
                  }}
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-xs active:scale-95 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
                  title="Pronounce"
                >
                  <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </button>
              )}

              {/* Explanation / Lightbulb Button */}
              <button
                type="button"
                onClick={() => onOpenFeedback()}
                className={cn(
                  "xl:hidden w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-xs active:scale-95 transition-all relative cursor-pointer",
                  justAnswered
                    ? "bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 dark:ring-indigo-500/50 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                    : "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                )}
                title="Explanation & Guide"
              >
                <Lightbulb className="w-5 h-5" />
                {justAnswered && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Continue Button */}
              <button
                type="button"
                onClick={() => onNext()}
                className="flex-1 h-11 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-300/50 dark:shadow-none flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
              >
                <span>Continue</span>
                <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </form>
      </div>
    </footer>
  );
};
