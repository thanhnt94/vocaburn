import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Sparkles, Volume2, Check, X, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml, isJapanese } from '@/lib/text'
import { CardImageGallery } from '@/components/common/CardImageGallery'
import { extractCardImages } from '@/lib/image-utils'
import { PracticeCardShell } from './PracticeCardShell'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeListeningCardProps {
  currentIndex: number
  totalCards?: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  listeningType?: 'typing' | 'mcq'
  typingInput?: string
  setTypingInput?: (val: string) => void
  typingFeedback?: { checked: boolean; isCorrect: boolean } | null
  onCheckTyping?: () => void
  selectedOption?: number | null
  onSelectOption?: (index: number) => void
  onPreviewInsight?: (card: any) => void
  sessionQuestions?: Question[]
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onPlayAudio: (face?: string, rate?: number) => void
  onNext?: () => void
  onZoomImage?: (url: string) => void
  frontFontSize?: string
  hideHeaderActions?: boolean
  hideInlineSubmit?: boolean
  autoFocus?: boolean
}

const getVal = (card: any, key: string) => {
  if (!card) return ''
  return card[key] || card.others?.[key] || ''
}

export const PracticeListeningCard: React.FC<PracticeListeningCardProps> = ({
  currentIndex,
  totalCards,
  currentQuestion,
  practiceData,
  answered,
  listeningType = 'typing',
  typingInput = '',
  setTypingInput,
  typingFeedback,
  onCheckTyping,
  selectedOption = null,
  onSelectOption,
  onPreviewInsight,
  sessionQuestions = [],
  starredCards,
  onToggleStar,
  onPlayAudio,
  onNext,
  onZoomImage,
  frontFontSize = 'M',
  hideHeaderActions = false,
  hideInlineSubmit = false,
  autoFocus = false
}) => {
  const { question, correct_answer, choices, correct_index, question_key, answer_key, choice_item_ids } = practiceData
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const inputRef = useRef<HTMLInputElement>(null)

  const imageSettings = (currentQuestion as any)?.deck_image_configs
  const answerImages = useMemo(() => {
    return extractCardImages(currentQuestion, 'back', imageSettings)
  }, [currentQuestion, imageSettings])

  const isMcq = listeningType === 'mcq' || (Boolean(choices && choices.length > 0) && listeningType !== 'typing')

  // Auto-play audio when card loads
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (currentQuestion) {
      setIsPlaying(true)
      onPlayAudio(question_key || 'front', playbackSpeed)
      timer = setTimeout(() => setIsPlaying(false), 2000)
    }
    return () => clearTimeout(timer)
  }, [currentIndex, currentQuestion?.id, question_key])

  // Focus input automatically for typing mode
  useEffect(() => {
    if (!isMcq && !answered && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, answered, isMcq])

  const handlePlayAudioWithSpeed = (speed: number = playbackSpeed) => {
    setIsPlaying(true)
    onPlayAudio(question_key || 'front', speed)
    setTimeout(() => setIsPlaying(false), 2200)
  }

  // Extract all acceptable answers
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

  return (
    <PracticeCardShell
      badgeLabel={isMcq ? 'Audio MCQ' : 'Audio Dictation'}
      badgeIcon={<Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 fill-cyan-300" />}
      badgeColorClass="bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200/80 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300"
      currentIndex={currentIndex}
      totalCards={totalCards}
      currentQuestion={currentQuestion}
      promptLabel={isMcq ? 'LISTEN & SELECT ANSWER' : 'LISTEN & TYPE WHAT YOU HEAR'}
      frontFontSize={frontFontSize}
      starredCards={starredCards}
      onToggleStar={onToggleStar}
      onPlayAudio={undefined}
      onZoomImage={onZoomImage}
      hideHeaderActions={hideHeaderActions}
      answerImages={answerImages}
      answered={answered}
      glowColor="cyan"
      customCenterStage={
        /* ── Hero Audio Player Disc (Center Stage) ── */
        <div className="my-auto py-5 sm:py-8 flex flex-col items-center justify-center text-center relative z-10 max-w-xl mx-auto w-full">
          {/* Pulsing Audio Ring Button */}
          <div className="relative mb-5">
            {isPlaying && (
              <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping duration-1000" />
            )}
            <button
              type="button"
              onClick={() => handlePlayAudioWithSpeed(playbackSpeed)}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 shadow-xl shadow-cyan-500/25 flex items-center justify-center text-white active:scale-95 hover:scale-105 transition-all cursor-pointer relative z-10 group"
              title="Play pronunciation"
            >
              <Volume2 className={cn("w-10 h-10 sm:w-12 sm:h-12 transition-transform", isPlaying && "scale-110 animate-pulse")} />
            </button>
          </div>

          {/* Speed Toggles */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setPlaybackSpeed(1.0)
                handlePlayAudioWithSpeed(1.0)
              }}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-black transition-all border cursor-pointer",
                playbackSpeed === 1.0
                  ? "bg-cyan-500 text-white border-cyan-600 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              )}
            >
              1.0x Normal
            </button>

            <button
              type="button"
              onClick={() => {
                setPlaybackSpeed(0.8)
                handlePlayAudioWithSpeed(0.8)
              }}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-black transition-all border cursor-pointer",
                playbackSpeed === 0.8
                  ? "bg-cyan-500 text-white border-cyan-600 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              )}
            >
              0.8x Slow 🐢
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-400">
            Click audio icon or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">Space</kbd> to listen again
          </span>

          {/* Supplementary Question Info / Subtext / Hint */}
          {practiceData.question_subtext && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/80 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200 text-xs font-bold shadow-2xs max-w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600/80 dark:text-cyan-400">
                {practiceData.hint_col ? `${String(practiceData.hint_col).replace(/_/g, ' ')}:` : 'HINT:'}
              </span>
              <span className="truncate">{practiceData.question_subtext}</span>
            </div>
          )}
        </div>
      }
    >
      {/* ── Bottom Interaction Stage (Typing or MCQ) ── */}
      <div className="w-full max-w-2xl mx-auto relative z-10 pt-2 shrink-0">
        {isMcq ? (
          /* MCQ Choices */
          <div className="space-y-3">
            {choices && choices.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {choices.map((choice: string, idx: number) => {
                  const isSelected = selectedOption === idx
                  const isCorrectChoice = idx === correct_index
                  const letter = String.fromCharCode(65 + idx)

                  const choiceData = practiceData.choices_data && practiceData.choices_data[idx]
                  const choiceIds = choice_item_ids || practiceData.choice_item_ids || currentQuestion?.practice?.choice_item_ids
                  let targetCard: any = null
                  if (choiceData?.card) {
                    targetCard = choiceData.card
                  }
                  if (!targetCard && choiceIds && choiceIds[idx] !== undefined) {
                    targetCard = sessionQuestions.find((q: any) => String(q.id) === String(choiceIds[idx]))
                  }
                  if (!targetCard && choiceIds && (currentQuestion as any)?.distractor_pool) {
                    targetCard = (currentQuestion as any).distractor_pool.find((q: any) => String(q.id) === String(choiceIds[idx]))
                  }
                  if (!targetCard) {
                    targetCard = sessionQuestions.find((q: any) =>
                      getVal(q, 'front') === choice ||
                      getVal(q, 'mẫu_ngữ_pháp') === choice ||
                      getVal(q, 'content') === choice ||
                      getVal(q, 'nghĩa') === choice
                    )
                  }

                  let subtext = choiceData?.subtext || ''
                  if (!subtext && targetCard) {
                    const configuredSubtextCol = practiceData.subtext_col
                    if (configuredSubtextCol) {
                      subtext = getVal(targetCard, configuredSubtextCol)
                    }
                    if (!subtext) {
                      const isJpChoice = isJapanese(choice) || (answer_key && (String(answer_key).includes('mẫu') || String(answer_key).includes('front') || String(answer_key).includes('kanji')))
                      if (isJpChoice) {
                        subtext = getVal(targetCard, 'nghĩa') || getVal(targetCard, 'meaning') || getVal(targetCard, 'dịch_nghĩa') || getVal(targetCard, 'back') || ''
                        if (!subtext && targetCard.explanation) {
                          subtext = targetCard.explanation.split('\n')[0].replace(/^[#*-\s]+/, '').slice(0, 80)
                        }
                      } else {
                        subtext = getVal(targetCard, 'mẫu_ngữ_pháp') || getVal(targetCard, 'front') || getVal(targetCard, 'từ_vựng') || getVal(targetCard, 'kanji') || targetCard.content || ''
                      }
                    }
                  }
                  if (!subtext && choiceData?.q_text && choiceData.q_text !== choice) {
                    subtext = choiceData.q_text
                  }

                  let cardStyle = "bg-slate-50/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 text-slate-800 dark:text-slate-100 hover:shadow-md"
                  let badgeStyle = "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"

                  if (answered) {
                    if (isCorrectChoice) {
                      cardStyle = "bg-emerald-700 dark:bg-emerald-800 border-emerald-800 dark:border-emerald-600 text-white shadow-lg shadow-emerald-700/30 scale-[1.01]"
                      badgeStyle = "bg-emerald-800 dark:bg-emerald-900 text-white border-emerald-600 dark:border-emerald-500 shadow-xs"
                    } else if (isSelected) {
                      cardStyle = "bg-rose-600 dark:bg-rose-700 border-rose-700 dark:border-rose-600 text-white shadow-lg shadow-rose-600/30"
                      badgeStyle = "bg-rose-700 dark:bg-rose-800 text-white border-rose-500 shadow-xs"
                    } else {
                      cardStyle = "bg-white/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-cyan-300 dark:hover:border-cyan-500 hover:bg-slate-50 dark:hover:bg-slate-750"
                      badgeStyle = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                    }
                  }

                  const hasSubtext = Boolean(answered && subtext)

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!answered && onSelectOption) {
                          onSelectOption(idx)
                        } else if (onPreviewInsight && targetCard) {
                          onPreviewInsight(targetCard)
                        }
                      }}
                      className={cn(
                        "w-full min-h-[58px] sm:min-h-[64px] h-auto p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex gap-3 text-left relative cursor-pointer select-none active:scale-[0.98]",
                        hasSubtext ? "items-start" : "items-center",
                        cardStyle
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0 transition-colors",
                        hasSubtext ? "self-start mt-0.5" : "",
                        badgeStyle
                      )}>
                        {answered && isCorrectChoice ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : answered && isSelected ? (
                          <X className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <span>{letter}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <span
                          className={cn(
                            "font-bold text-sm sm:text-base leading-snug block whitespace-normal break-words",
                            answered && (isCorrectChoice || isSelected) ? "text-white" : "text-slate-800 dark:text-slate-100"
                          )}
                          dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice || '') }}
                        />
                        {hasSubtext && (
                          <div className={cn(
                            "text-xs mt-1.5 font-medium leading-relaxed transition-all duration-200 whitespace-normal break-words",
                            isCorrectChoice
                              ? "inline-block px-2.5 py-1 rounded-xl bg-emerald-800/80 dark:bg-emerald-950/80 border border-emerald-600/50 text-emerald-50 font-semibold shadow-2xs"
                              : isSelected
                                ? "inline-block px-2.5 py-1 rounded-xl bg-rose-700/80 dark:bg-rose-950/80 border border-rose-500/50 text-rose-50 font-semibold shadow-2xs"
                                : "text-slate-500 dark:text-slate-400"
                          )}>
                            <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(subtext) }} />
                          </div>
                        )}
                      </div>

                      {!answered && (
                        <span className="hidden sm:inline-flex items-center justify-center text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 shrink-0 ml-auto">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Typing Dictation */
          <div className="space-y-4">
            {!answered ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (onCheckTyping && typingInput && typingInput.trim()) {
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
                    onChange={(e) => setTypingInput && setTypingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onCheckTyping && typingInput && typingInput.trim()) {
                          onCheckTyping()
                        }
                      }
                    }}
                    placeholder="Type what you hear..."
                    enterKeyHint="go"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={cn(
                      "h-12 sm:h-14 px-4 sm:px-5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-cyan-200/50 dark:focus:ring-cyan-500/20 text-base sm:text-lg font-bold text-slate-900 dark:text-white outline-none transition-all shadow-xs placeholder:text-slate-400 placeholder:font-normal min-w-0",
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
                          ? "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white shadow-cyan-500/25 active:scale-95"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed opacity-60"
                      )}
                    >
                      <span>Check</span>
                      <CornerDownLeft className="w-4 h-4 hidden sm:inline-block" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 select-none">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">Enter ↵</kbd> to submit</span>
                  {acceptableAnswers.length > 1 && (
                    <span className="text-cyan-600 dark:text-cyan-400">{acceptableAnswers.length} accepted spellings</span>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                            {typingFeedback.isCorrect ? "Spot on! 🎯" : "Listen carefully again!"}
                          </span>
                          <span className="text-[11px] font-semibold opacity-75">
                            You typed: <strong className="font-mono">{typingInput || "(Empty)"}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlayAudioWithSpeed(playbackSpeed)}
                        className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xs"
                        title="Replay audio"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    {!typingFeedback.isCorrect && (
                      <div className="mt-1 pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Target Word:
                        </span>
                        <div className="px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-black text-lg">
                          <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
                        </div>
                      </div>
                    )}

                    {acceptableAnswers.length > 1 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-bold opacity-70">Accepted spellings:</span>
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
