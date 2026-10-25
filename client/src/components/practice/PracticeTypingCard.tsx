import React, { useMemo, useRef, useEffect } from 'react'
import { Sparkles, Bookmark, Check, X, Volume2, ArrowRight, CornerDownLeft, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeTypingCardProps {
  currentIndex: number
  totalCards?: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  typingInput: string
  setTypingInput: (val: string) => void
  typingFeedback: { isCorrect: boolean } | null
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onCheckTyping: () => void
  onNext?: () => void
  onPlayAudio?: (face?: string, rate?: number) => void
  onZoomImage?: (url: string) => void
  frontFontSize?: string
}

export const PracticeTypingCard: React.FC<PracticeTypingCardProps> = ({
  currentIndex,
  totalCards,
  currentQuestion,
  practiceData,
  answered,
  typingInput,
  setTypingInput,
  typingFeedback,
  starredCards,
  onToggleStar,
  onCheckTyping,
  onNext,
  onPlayAudio,
  onZoomImage,
  frontFontSize = 'M'
}) => {
  const { question, correct_answer, question_key, answer_key } = practiceData
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input automatically when ready to type
  useEffect(() => {
    if (!answered) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, answered])

  const acceptableAnswers = useMemo(() => {
    const raw = practiceData.acceptable_answers && practiceData.acceptable_answers.length > 0
      ? practiceData.acceptable_answers
      : [correct_answer || '']
    const list: string[] = []
    raw.forEach(ans => {
      if (!ans) return
      if (ans.includes('|')) {
        ans.split('|').forEach(p => {
          const c = p.trim()
          if (c && !list.includes(c)) list.push(c)
        })
      } else if (ans.trim() && !list.includes(ans.trim())) {
        list.push(ans.trim())
      }
    })
    return list
  }, [practiceData.acceptable_answers, correct_answer])

  const questionImg = currentQuestion?.front_img || currentQuestion?.image || currentQuestion?.others?.front_img
  const resolvedImg = questionImg ? resolveMediaUrl(questionImg) : null

  const getFontSizeClass = () => {
    switch (frontFontSize) {
      case 'S': return 'text-2xl sm:text-3xl'
      case 'L': return 'text-4xl sm:text-5xl lg:text-6xl'
      case 'XL': return 'text-5xl sm:text-6xl lg:text-7xl'
      default: return 'text-3xl sm:text-4xl lg:text-5xl'
    }
  }

  const promptLabel = useMemo(() => {
    const qk = String(question_key || 'front').toLowerCase()
    const ak = String(Array.isArray(answer_key) ? answer_key[0] : (answer_key || 'back')).toLowerCase()
    if (qk.includes('nghĩa') || qk.includes('meaning') || qk.includes('vi')) {
      return 'DỊCH SANG TỪ VỰNG TIẾNG NHẬT'
    }
    if (qk.includes('front') || qk.includes('word') || qk.includes('kanji')) {
      return 'NHẬP Ý NGHĨA HOẶC CÁCH ĐỌC'
    }
    return 'NHẬP CÂU TRẢ LỜI CHÍNH XÁC'
  }, [question_key, answer_key])

  return (
    <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-slate-900 md:rounded-[2rem] rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl shadow-indigo-100/30 dark:shadow-none min-h-0 overflow-y-auto custom-scrollbar relative">
      {/* ── Ambient Soft Glow ── */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-amber-200/20 via-orange-100/10 to-transparent dark:from-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-indigo-100/20 via-slate-100/10 to-transparent dark:from-indigo-500/5 blur-3xl pointer-events-none" />

      {/* ── Top Card Header Bar ── */}
      <div className="w-full flex items-center justify-between gap-2 relative z-10 select-none pb-2 border-b border-slate-100/80 dark:border-slate-800/80">
        {/* Left Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-black text-[11px] uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-300" />
            <span>Typing Recall</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-black text-[11px]">
            #{currentIndex + 1}{totalCards ? ` / ${totalCards}` : ''}
          </span>

          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-400 font-bold text-[10px] tracking-wider uppercase">
            {promptLabel}
          </span>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1">
          {onPlayAudio && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPlayAudio(question_key || 'front')
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-95 cursor-pointer"
              title="Phát âm câu hỏi"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (currentQuestion?.id) onToggleStar(currentQuestion.id)
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-95 cursor-pointer"
            title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Bỏ đánh dấu" : "Đánh dấu câu hỏi"}
          >
            <Bookmark className={cn("w-4 h-4 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-amber-500 text-amber-500" : "text-slate-400")} />
          </button>
        </div>
      </div>

      {/* ── Central Question Stage ── */}
      <div className="my-auto py-6 sm:py-8 flex flex-col items-center justify-center text-center relative z-10 max-w-2xl mx-auto w-full">
        {/* Optional Question Media Image */}
        {resolvedImg && (
          <div className="mb-4 relative group">
            <img
              src={resolvedImg}
              alt="Question illustration"
              onClick={() => onZoomImage && onZoomImage(resolvedImg)}
              className="max-h-36 sm:max-h-44 object-contain rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md bg-slate-50/50 p-1 cursor-zoom-in group-hover:opacity-95 transition-all"
            />
          </div>
        )}

        {/* Context Hint / Prompt */}
        <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-amber-600/90 dark:text-amber-400 mb-2">
          {promptLabel}
        </p>

        {/* Prominent Question Heading */}
        <h2 className={cn(
          "font-black text-slate-900 dark:text-slate-50 leading-tight tracking-tight font-sans px-2 selection:bg-amber-200",
          getFontSizeClass()
        )}>
          <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }} />
        </h2>
      </div>

      {/* ── Active Interactive Typing & Result Section ── */}
      <div className="w-full max-w-xl mx-auto relative z-10 pt-2 shrink-0">
        {!answered ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (typingInput && typingInput.trim()) {
                onCheckTyping()
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (typingInput && typingInput.trim()) {
                      onCheckTyping()
                    }
                  }
                }}
                placeholder="Nhập câu trả lời..."
                enterKeyHint="go"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="flex-1 h-14 sm:h-16 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-amber-200/50 dark:focus:ring-amber-500/20 text-base sm:text-xl font-bold text-slate-900 dark:text-white outline-none transition-all shadow-xs placeholder:text-slate-400 placeholder:font-normal"
              />

              <button
                type="submit"
                disabled={!typingInput || !typingInput.trim()}
                className={cn(
                  "h-14 sm:h-16 px-6 sm:px-8 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none shrink-0",
                  typingInput && typingInput.trim()
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25 active:scale-95"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed opacity-60"
                )}
              >
                <span>Kiểm tra</span>
                <CornerDownLeft className="w-4 h-4 hidden sm:inline-block" />
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 select-none">
              <span>Gợi ý: Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">Enter ↵</kbd> để kiểm tra</span>
              {acceptableAnswers.length > 1 && (
                <span className="text-amber-600 dark:text-amber-400">{acceptableAnswers.length} đáp án hợp lệ</span>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Answer Feedback Banner */}
            {typingFeedback && (
              <div className={cn(
                "p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col gap-2.5",
                typingFeedback.isCorrect
                  ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
                  : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm shrink-0",
                      typingFeedback.isCorrect ? "bg-emerald-500" : "bg-rose-500"
                    )}>
                      {typingFeedback.isCorrect ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-5 h-5 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="font-black text-sm tracking-wide block">
                        {typingFeedback.isCorrect ? "Chính xác tuyệt vời! 🎯" : "Chưa chính xác!"}
                      </span>
                      <span className="text-[11px] font-semibold opacity-75">
                        Bạn đã nhập: <strong className="font-mono">{typingInput || "(Để trống)"}</strong>
                      </span>
                    </div>
                  </div>

                  {onPlayAudio && (
                    <button
                      type="button"
                      onClick={() => onPlayAudio(Array.isArray(answer_key) ? answer_key[0] : (answer_key || 'back'))}
                      className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xs"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Show Correct Answer prominently if user was wrong */}
                {!typingFeedback.isCorrect && (
                  <div className="mt-1 pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Đáp án đúng:
                    </span>
                    <div className="px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-black text-lg">
                      <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
                    </div>
                  </div>
                )}

                {/* Other Accepted Answers */}
                {acceptableAnswers.length > 1 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold opacity-70">Các đáp án hợp lệ khác:</span>
                    {acceptableAnswers.map((ans, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                      >
                        <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(ans || '') }} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next Continue CTA Button */}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="w-full h-13 sm:h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 font-black text-sm uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Tiếp tục câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PracticeTypingCard
