import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Sparkles, Check, X, Volume2, CornerDownLeft, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import { CardImageGallery } from '@/components/common/CardImageGallery'
import { extractCardImages, splitImageUrls } from '@/lib/image-utils'
import { getBackFontSizeStyle, getSubtextFontSizeStyle } from '@/components/common/study'
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
  onPlayAudio?: (face?: string, rate?: number, explicitText?: string) => void | Promise<any>
  onZoomImage?: (url: string) => void
  frontFontSize?: string
  backFontSize?: string
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
  backFontSize = '100%',
  showImages = 'always',
  autoFocus = false,
  hideInlineSubmit = false,
  hideHeaderActions = false
}) => {
  const { question, correct_answer, question_key, answer_key } = practiceData
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 3-Tier Progressive Hint State ──
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0)
  const [revealedCharIndices, setRevealedCharIndices] = useState<number[]>([])

  // Reset hint state when switching cards
  useEffect(() => {
    setHintTier(0)
    setRevealedCharIndices([])
  }, [currentIndex, currentQuestion?.id])

  // Scoring: 10 pts initially, 8 pts after tier 1, 5 pts after tier 2, 2 pts after tier 3
  const currentPoints = useMemo(() => {
    if (hintTier === 0) return 10
    if (hintTier === 1) return 8
    if (hintTier === 2) return 5
    return 2
  }, [hintTier])

  // Tier 1 Hint: Extra Column value (e.g. Hán Việt)
  const { progressiveHintVal, progressiveHintLabel } = useMemo(() => {
    let val = practiceData.progressive_hint_value
    let col = practiceData.progressive_hint_col

    if (!val && currentQuestion) {
      if (col) {
        val = (currentQuestion as any)[col] ?? (currentQuestion as any)?.others?.[col]
      }
      if (!val) {
        const qOthers = (currentQuestion as any)?.others || {}
        const possible = ['hán việt', 'han_viet', 'hanviet', 'sino_vietnamese', 'hv']
        for (const k of possible) {
          const found = (currentQuestion as any)[k] ?? qOthers[k] ?? qOthers['Hán Việt'] ?? qOthers['hán việt']
          if (found) {
            val = String(found)
            col = 'Hán Việt'
            break
          }
        }
      }
    }
    return {
      progressiveHintVal: val ? String(val) : '',
      progressiveHintLabel: col ? String(col).replace(/_/g, ' ') : 'Hán Việt'
    }
  }, [practiceData, currentQuestion])

  // Tier 2 & 3 Target String for Character Reveals
  const { targetCharStr, charHintLabel } = useMemo(() => {
    let str = practiceData.char_hint_value
    let col = practiceData.char_hint_col

    if (!str && col && currentQuestion) {
      str = (currentQuestion as any)[col] ?? (currentQuestion as any)?.others?.[col]
    }
    if (!str) {
      str = practiceData.correct_answer || ''
      col = 'Đáp án'
    }
    const cleanStr = String(str)
      .replace(/<rt>.*?<\/rt>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[\/?(b|i|u|s|color|size|highlight|align).*?\]/gi, '')
      .replace(/\[.*?\|(.*?)\]/g, '$1')
      .trim()

    return {
      targetCharStr: cleanStr,
      charHintLabel: col ? String(col).replace(/_/g, ' ') : 'Ký tự'
    }
  }, [practiceData, currentQuestion])

  const handleRequestHint = () => {
    if (answered || hintTier >= 3) return

    if (hintTier === 0) {
      setHintTier(1)
      return
    }

    const chars = Array.from(targetCharStr)
    const validIndices: number[] = []
    chars.forEach((ch, idx) => {
      if (ch.trim() && !/[.,/#!$%^&*;:{}=\-_`~()]/g.test(ch)) {
        validIndices.push(idx)
      }
    })

    const availableIndices = validIndices.filter(i => !revealedCharIndices.includes(i))
    if (availableIndices.length > 0) {
      const randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)]
      setRevealedCharIndices(prev => [...prev, randomIdx])
    }
    setHintTier(prev => (prev === 1 ? 2 : 3))
  }

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

  const isImageVisible = showImages !== 'off' && showImages !== 'none' && showImages !== false && showImages !== 'false' && (practiceData as any)?.img_col !== 'none'
  const imageSettings = (currentQuestion as any)?.deck_image_configs
  const questionImages = useMemo(() => {
    if (!isImageVisible) return []
    const imgCol = (practiceData as any)?.img_col
    if (imgCol && imgCol !== 'auto' && imgCol !== 'none') {
      const qAny = currentQuestion as any
      const val = qAny?.[imgCol] ?? qAny?.others?.[imgCol] ?? ''
      if (val) {
        return splitImageUrls(String(val))
      }
      return []
    }
    return extractCardImages(currentQuestion, 'front', imageSettings)
  }, [currentQuestion, isImageVisible, imageSettings, (practiceData as any)?.img_col])

  const answerImages = useMemo(() => {
    if (!isImageVisible) return []
    if ((practiceData as any)?.img_col === 'none') return []
    const backImgs = extractCardImages(currentQuestion, 'back', imageSettings)
    const questionUrls = new Set(questionImages)
    return backImgs.filter(url => !questionUrls.has(url))
  }, [currentQuestion, isImageVisible, imageSettings, questionImages, (practiceData as any)?.img_col])

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
      onPlayAudio={onPlayAudio ? () => onPlayAudio(question_key || 'front', 1.0, question) : undefined}
      onZoomImage={onZoomImage}
      hideHeaderActions={hideHeaderActions}
      answerImages={[]}
      answered={false}
      glowColor="purple"
    >
      {/* ── Active Interactive Typing & Result Section ── */}
      <div className="w-full max-w-xl mx-auto relative z-10 pt-2 shrink-0">
        {/* ── 3-Tier Progressive Hint Bar & Score Badge ── */}
        <div className="flex items-center justify-between gap-2 mb-2 select-none">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-black tracking-wider uppercase border shadow-2xs transition-all flex items-center gap-1.5",
                hintTier === 0
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                  : hintTier === 1
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                  : hintTier === 2
                  ? "bg-orange-50 dark:bg-orange-950/60 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300"
                  : "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300"
              )}
            >
              <span>🎯</span>
              <span>{currentPoints} PTS</span>
            </span>

            {hintTier > 0 && (
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                (Bậc {hintTier}/3)
              </span>
            )}
          </div>

          {!answered && hintTier < 3 && (
            <button
              type="button"
              onClick={handleRequestHint}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-300/80 dark:border-amber-700/80 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {hintTier === 0
                  ? 'Trợ giúp (-2đ)'
                  : hintTier === 1
                  ? 'Mở 1 chữ (-3đ)'
                  : 'Mở thêm 1 chữ (-3đ)'}
              </span>
            </button>
          )}
        </div>

        {/* ── Progressive Hint Container (Dedicated Outside Area) ── */}
        {hintTier > 0 && (
          <div className="mb-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/90 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/40 border border-amber-300/80 dark:border-amber-800/80 shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Tier 1: Extra Column Content */}
            {progressiveHintVal && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/80 border border-amber-400/80 dark:border-amber-700 text-[10px] font-black uppercase text-amber-950 dark:text-amber-200 tracking-wider">
                  💡 {progressiveHintLabel}
                </span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                  {progressiveHintVal}
                </span>
              </div>
            )}

            {/* Tier 2 & 3: Character Reveal Slots */}
            {hintTier >= 2 && targetCharStr && (
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                  Gợi ý ký tự ({charHintLabel}):
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from(targetCharStr).map((ch, idx) => {
                    const isRevealed = revealedCharIndices.includes(idx)
                    const isPunctuation = !ch.trim() || /[.,/#!$%^&*;:{}=\-_`~()]/g.test(ch)

                    if (isRevealed) {
                      return (
                        <span
                          key={idx}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 font-black text-sm sm:text-base flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-200"
                        >
                          {ch}
                        </span>
                      )
                    }
                    if (isPunctuation) {
                      return (
                        <span key={idx} className="px-1 text-slate-400 font-bold self-center">
                          {ch}
                        </span>
                      )
                    }
                    return (
                      <span
                        key={idx}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800/90 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-mono text-xs flex items-center justify-center"
                      >
                        _
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
                        {typingFeedback.isCorrect ? `Excellent! 🎯 (+${currentPoints} PTS)` : "Not quite right! (0 PTS)"}
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
                    <div
                      className="px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-black text-lg"
                      style={{ fontSize: getBackFontSizeStyle(backFontSize) }}
                    >
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
                      <span
                        className="font-bold text-slate-800 dark:text-slate-100"
                        style={{ fontSize: getSubtextFontSizeStyle(backFontSize) }}
                      >
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
