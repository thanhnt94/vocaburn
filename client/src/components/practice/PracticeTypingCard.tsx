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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !answered && typingInput.trim()) {
      onCheckTyping()
    }
  }

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

      {/* ── Typing Input Section ── */}
      <div className="w-full max-w-2xl mx-auto shrink-0 space-y-4 mb-4">
        {!answered ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={typingInput}
              onChange={(e) => setTypingInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Gõ từ vựng..."
              autoFocus
              className="flex-1 bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all shadow-sm"
            />
            <button
              onClick={onCheckTyping}
              disabled={!typingInput.trim()}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs uppercase hover:shadow-lg hover:shadow-amber-100 active:scale-95 transition-all cursor-pointer"
            >
              Kiểm tra
            </button>
          </div>
        ) : typingFeedback && (
          <div className="space-y-3">
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
                <p className="font-black uppercase tracking-wider text-[9px] opacity-60">Đáp án chính xác</p>
                <p className="font-bold text-sm mt-0.5" dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
