import React, { useMemo, useRef, useEffect } from 'react'
import { Sparkles, Check, X, Volume2, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import { CardImageGallery } from '@/components/common/CardImageGallery'
import { extractCardImages } from '@/lib/image-utils'
import { PracticeCardShell } from './PracticeCardShell'
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
  onPreviewInsight?: (card: Question) => void
  onNext?: () => void
  onPlayAudio?: (face?: string, rate?: number) => void
  onZoomImage?: (url: string) => void
  frontFontSize?: string
  showImages?: string | boolean
  autoFocus?: boolean
  hideInlineSubmit?: boolean
  hideHeaderActions?: boolean
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
  onPreviewInsight,
  onNext,
  onPlayAudio,
  onZoomImage,
  frontFontSize = 'M',
  showImages = 'always',
  autoFocus = false,
  hideInlineSubmit = false,
  hideHeaderActions = false
}) => {
  const { question, correct_answer, question_key, answer_key } = practiceData
  const inputRef = useRef<HTMLInputElement>(null)

  // Only auto-focus if explicitly requested and NOT on touch devices (to avoid popping up mobile keyboard)
  useEffect(() => {
    if (autoFocus && !answered) {
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
      if (!isTouch) {
        const timer = setTimeout(() => {
          inputRef.current?.focus()
        }, 50)
        return () => clearTimeout(timer)
      }
    }
  }, [currentIndex, answered, autoFocus])

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

  const isImageVisible = showImages !== 'off' && showImages !== 'none' && showImages !== false && showImages !== 'false'
  const imageSettings = (currentQuestion as any)?.deck_image_configs
  const questionImages = useMemo(() => {
    if (!isImageVisible) return []
    return extractCardImages(currentQuestion, 'front', imageSettings)
  }, [currentQuestion, isImageVisible, imageSettings])

  const answerImages = useMemo(() => {
    if (!isImageVisible) return []
    const backImgs = extractCardImages(currentQuestion, 'back', imageSettings)
    const questionUrls = new Set(questionImages)
    return backImgs.filter(url => !questionUrls.has(url))
  }, [currentQuestion, isImageVisible, imageSettings, questionImages])

  const promptLabel = useMemo(() => {
    const qk = String(question_key || 'front').toLowerCase()
    if (qk.includes('nghĩa') || qk.includes('meaning') || qk.includes('vi')) {
      return 'TRANSLATE TO JAPANESE TERM'
    }
    if (qk.includes('front') || qk.includes('word') || qk.includes('kanji')) {
      return 'TYPE MEANING OR READING'
    }
    return 'TYPE THE EXACT ANSWER'
  }, [question_key])

  return (
    <PracticeCardShell
      badgeLabel="Spelling Recall"
      badgeIcon={<Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-300" />}
      badgeColorClass="bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300"
      currentIndex={currentIndex}
      totalCards={totalCards}
      currentQuestion={currentQuestion}
      promptLabel={promptLabel}
      questionText={question}
      questionImages={questionImages}
      questionSubtext={practiceData.question_subtext}
      questionSubtextLabel={practiceData.hint_col ? `${String(practiceData.hint_col).replace(/_/g, ' ')}:` : 'HINT:'}
      frontFontSize={frontFontSize}
      starredCards={starredCards}
      onToggleStar={onToggleStar}
      onPlayAudio={onPlayAudio ? () => onPlayAudio(question_key || 'front') : undefined}
      onZoomImage={onZoomImage}
      hideHeaderActions={hideHeaderActions}
      answerImages={[]}
      answered={false}
      glowColor="purple"
    >
      {/* ── Active Interactive Typing & Result Section ── */}
      <div className="w-full max-w-xl mx-auto relative z-10 pt-2 shrink-0">
        {!answered ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (typingInput && typingInput.trim()) {
                onCheckTyping()
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 w-full min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    if (typingInput && typingInput.trim()) {
                      onCheckTyping()
                    }
                  }
                }}
                placeholder="Type your answer..."
                enterKeyHint="go"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className={cn(
                  "h-12 sm:h-14 px-4 sm:px-5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-amber-200/50 dark:focus:ring-amber-500/20 text-base sm:text-lg font-bold text-slate-900 dark:white outline-none transition-all shadow-xs placeholder:text-slate-400 placeholder:font-normal min-w-0",
                  hideInlineSubmit ? "w-full" : "flex-1"
                )}
              />

              {!hideInlineSubmit && (
                <button
                  type="submit"
                  disabled={!typingInput || !typingInput.trim()}
                  className={cn(
                    "h-12 sm:h-14 px-4 sm:px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md select-none shrink-0",
                    typingInput && typingInput.trim()
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25 active:scale-95"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed opacity-60"
                  )}
                >
                  <span>Check</span>
                  <CornerDownLeft className="w-4 h-4 hidden sm:inline-block" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 select-none">
              <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">Enter ↵</kbd> to submit</span>
              {acceptableAnswers.length > 1 && (
                <span className="text-amber-600 dark:text-amber-400">{acceptableAnswers.length} accepted answers</span>
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
                        {typingFeedback.isCorrect ? "Excellent! 🎯" : "Not quite right!"}
                      </span>
                      <span className="text-[11px] font-semibold opacity-75">
                        You typed: <strong className="font-mono">{typingInput || "(Empty)"}</strong>
                      </span>
                    </div>
                  </div>

                  {onPlayAudio && (
                    <button
                      type="button"
                      onClick={() => onPlayAudio(Array.isArray(answer_key) ? answer_key[0] : (answer_key || 'back'))}
                      className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xs"
                      title="Pronounce audio"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Show Correct Answer prominently if user was wrong */}
                {!typingFeedback.isCorrect && (
                  <div className="mt-1 pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Correct Answer:
                    </span>
                    <div className="px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-black text-lg">
                      <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
                    </div>
                  </div>
                )}

                {/* Other Accepted Answers */}
                {acceptableAnswers.length > 1 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold opacity-70">Other accepted answers:</span>
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

                {/* Result Subtext / Extra Information (Song song cùng kết quả) */}
                {practiceData.result_subtext && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                        {practiceData.subtext_col ? `${String(practiceData.subtext_col).replace(/_/g, ' ')}:` : 'Chi tiết:'}
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(practiceData.result_subtext) }} />
                      </span>
                    </div>
                  </div>
                )}

                {/* Answer Explanation Images (Revealed upon answering) */}
                {answerImages.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Answer illustration:
                    </span>
                    <CardImageGallery
                      images={answerImages}
                      onZoom={onZoomImage}
                      maxHeight="max-h-28 sm:max-h-36"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PracticeCardShell>
  )
}

export default PracticeTypingCard
