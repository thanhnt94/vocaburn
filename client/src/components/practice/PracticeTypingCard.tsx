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
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-amber-50/15 to-slate-50 md:rounded-[2.5rem] rounded-[1.5rem] border border-slate-100/80 md:p-6 p-3 flex flex-col justify-between gap-3 md:gap-5 shadow-2xl shadow-amber-100/20 min-h-0 overflow-y-auto custom-scrollbar">
      {/* ── Top Question Card ── */}
      <div className="w-full max-w-2xl mx-auto my-auto animate-in fade-in slide-in-from-top-3 duration-500 shrink-0">
        <div className="w-full bg-gradient-to-b from-amber-50/80 via-orange-50/30 to-white/95 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-[0_12px_36px_rgba(245,158,11,0.08)] border border-amber-100/80 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-200/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-orange-100/35 blur-2xl pointer-events-none" />

          <div className="w-full flex items-center justify-between mb-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/80 border border-amber-200/70 text-amber-800 font-black text-xs shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
              <span>Câu hỏi {currentIndex + 1}</span>
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (currentQuestion?.id) {
                  onToggleStar(currentQuestion.id)
                }
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-400 hover:text-amber-600 hover:bg-amber-50/80 transition-all active:scale-90 cursor-pointer"
              title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Bỏ đánh dấu" : "Đánh dấu câu hỏi"}
            >
              <Bookmark className={cn("w-5 h-5 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-amber-500 text-amber-500" : "text-amber-400")} />
            </button>
          </div>

          <div className="my-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-wide font-sans px-2">
              <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }} />
            </h2>
          </div>
        </div>
      </div>

      {/* ── Typing Feedback Section (Hiển thị kết quả sau khi kiểm tra) ── */}
      {answered && typingFeedback && (
        <div className="w-full max-w-2xl mx-auto shrink-0 space-y-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border",
            typingFeedback.isCorrect
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-sm"
              : "bg-rose-50/80 border-rose-200 text-rose-800 shadow-sm"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm",
              typingFeedback.isCorrect ? "bg-emerald-500" : "bg-rose-500"
            )}>
              {typingFeedback.isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
            </div>
            <div className="text-xs">
              <p className="font-black uppercase tracking-wider text-[9px] opacity-60">Đáp án của bạn</p>
              <p className="font-bold text-sm">{typingInput || "(Trống)"}</p>
            </div>
          </div>

          {!typingFeedback.isCorrect && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-800 text-xs shadow-sm">
              <p className="font-black uppercase tracking-wider text-[9px] opacity-60 mb-1">
                {practiceData.acceptable_answers && practiceData.acceptable_answers.length > 1
                  ? "Các đáp án chính xác được chấp nhận"
                  : "Đáp án chính xác"}
              </p>
              {practiceData.acceptable_answers && practiceData.acceptable_answers.length > 1 ? (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {practiceData.acceptable_answers.map((ans, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white/90 border border-emerald-300 rounded-xl font-bold text-sm text-emerald-900 shadow-2xs inline-flex items-center gap-1.5"
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
            const cleanInput = typingInput.trim().toLowerCase();
            const otherAnswers = practiceData.acceptable_answers.filter(
              a => a.replace(/<[^<]+?>/g, '').trim().toLowerCase() !== cleanInput
            );
            if (otherAnswers.length === 0) return null;
            return (
              <div className="px-3 py-2 bg-emerald-50/50 border border-emerald-100/80 rounded-xl text-[11px] text-emerald-700/90 font-medium">
                <span className="font-bold opacity-75">Cách trả lời hợp lệ khác: </span>
                {otherAnswers.map((ans, idx) => (
                  <span key={idx} className="font-bold">
                    {idx > 0 && " • "}
                    <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(ans || '') }} />
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )
}
