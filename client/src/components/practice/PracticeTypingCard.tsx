import React from 'react'
import { Sparkles, Bookmark, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeTypingCardProps {
  currentIndex: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  typingInput: string
  setTypingInput: (val: string) => void
  typingFeedback: { isCorrect: boolean } | null
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onCheckTyping: () => void
}

export const PracticeTypingCard: React.FC<PracticeTypingCardProps> = ({
  currentIndex,
  currentQuestion,
  practiceData,
  answered,
  typingInput,
  setTypingInput,
  typingFeedback,
  starredCards,
  onToggleStar,
  onCheckTyping
}) => {
  const { question, correct_answer } = practiceData

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-amber-50/15 to-slate-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 md:rounded-[2.5rem] rounded-[1.5rem] border border-slate-100/80 dark:border-slate-800 md:p-6 p-3 flex flex-col justify-between gap-3 md:gap-5 shadow-2xl shadow-amber-100/20 dark:shadow-none min-h-0 overflow-y-auto custom-scrollbar">
      {/* ── Top Question Card ── */}
      <div className="w-full max-w-2xl mx-auto my-auto animate-in fade-in slide-in-from-top-3 duration-500 shrink-0">
        <div className="w-full bg-gradient-to-b from-amber-50/80 via-orange-50/30 to-white/95 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-900/95 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-[0_12px_36px_rgba(245,158,11,0.08)] dark:shadow-none border border-amber-100/80 dark:border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-200/25 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-orange-100/35 dark:bg-orange-500/10 blur-2xl pointer-events-none" />

          <div className="w-full flex items-center justify-between mb-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-black text-xs shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-300" />
              <span>Question {currentIndex + 1}</span>
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (currentQuestion?.id) {
                  onToggleStar(currentQuestion.id)
                }
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-400 hover:text-amber-600 dark:text-amber-400/80 dark:hover:text-amber-300 hover:bg-amber-50/80 dark:hover:bg-amber-950/40 transition-all active:scale-90 cursor-pointer touch-manipulation"
              title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Remove bookmark" : "Bookmark question"}
            >
              <Bookmark className={cn("w-5 h-5 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-amber-500 text-amber-500" : "text-amber-400")} />
            </button>
          </div>

          <div className="my-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 leading-tight tracking-wide font-sans px-2">
              <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }} />
            </h2>
          </div>
        </div>
      </div>

      {/* ── Typing Feedback Section (Revealed after check) ── */}
      {answered && typingFeedback && (
        <div className="w-full max-w-2xl mx-auto shrink-0 space-y-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border",
            typingFeedback.isCorrect
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-sm"
              : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 shadow-sm"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm",
              typingFeedback.isCorrect ? "bg-emerald-500" : "bg-rose-500"
            )}>
              {typingFeedback.isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
            </div>
            <div className="text-xs">
              <p className="font-black uppercase tracking-wider text-[9px] opacity-60">Your Answer</p>
              <p className="font-bold text-sm">{typingInput || "(Empty)"}</p>
            </div>
          </div>

          {!typingFeedback.isCorrect && (
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs shadow-sm">
              <p className="font-black uppercase tracking-wider text-[9px] opacity-60 mb-1">
                {practiceData.acceptable_answers && practiceData.acceptable_answers.length > 1
                  ? "Accepted Correct Answers"
                  : "Correct Answer"}
              </p>
              {practiceData.acceptable_answers && practiceData.acceptable_answers.length > 1 ? (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {practiceData.acceptable_answers.map((ans, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white/90 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-sm text-emerald-900 dark:text-emerald-300 shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(ans || '') }} />
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-bold text-sm mt-0.5" dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
              )}
            </div>
          )}

          {typingFeedback.isCorrect && practiceData.acceptable_answers && practiceData.acceptable_answers.length > 1 && (() => {
            const cleanInput = typingInput.trim().toLowerCase()
            const otherAnswers = practiceData.acceptable_answers.filter(
              a => a.replace(/<[^<]+?>/g, '').trim().toLowerCase() !== cleanInput
            )
            if (otherAnswers.length === 0) return null
            return (
              <div className="px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-900/40 rounded-xl text-[11px] text-emerald-700/90 dark:text-emerald-300 font-medium">
                <span className="font-bold opacity-75">Other valid answers: </span>
                {otherAnswers.map((ans, idx) => (
                  <span key={idx} className="font-bold">
                    {idx > 0 && " • "}
                    <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(ans || '') }} />
                  </span>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default PracticeTypingCard
