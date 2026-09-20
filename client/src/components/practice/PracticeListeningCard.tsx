import React, { useEffect, useState, useRef } from 'react'
import { Sparkles, Bookmark, Play, Volume2, RotateCcw, Check, X, ArrowRight, CornerDownLeft, Volume1 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeListeningCardProps {
  currentIndex: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  // Submode: 'typing' (default) or 'mcq'
  listeningType?: 'typing' | 'mcq'
  // Typing mode props
  typingInput?: string
  setTypingInput?: (val: string) => void
  typingFeedback?: { checked: boolean; isCorrect: boolean } | null
  onCheckTyping?: () => void
  // MCQ mode props
  selectedOption?: number | null
  onSelectOption?: (index: number) => void
  onPreviewInsight?: (card: any) => void
  sessionQuestions?: Question[]
  // General props
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onPlayAudio: (face?: string, rate?: number) => void
}

export const PracticeListeningCard: React.FC<PracticeListeningCardProps> = ({
  currentIndex,
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
  onPlayAudio
}) => {
  const { question, correct_answer, choices, correct_index, question_key, choice_item_ids } = practiceData
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isMcq = listeningType === 'mcq' || (Boolean(choices && choices.length > 0) && listeningType !== 'typing')

  // Auto-play audio when card loads or question changes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (currentQuestion) {
      setIsPlaying(true)
      onPlayAudio(question_key || 'front', playbackSpeed)
      timer = setTimeout(() => setIsPlaying(false), 2000)
    }
    return () => clearTimeout(timer)
  }, [currentIndex, currentQuestion?.id, question_key])

  // Focus input automatically on unanswered state for typing mode
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (!answered && typingInput.trim() && onCheckTyping) {
        onCheckTyping()
      }
    }
  }

  // Extract all acceptable answers with '|' delimiter support
  const rawAcceptable = practiceData.acceptable_answers && practiceData.acceptable_answers.length > 0
    ? practiceData.acceptable_answers
    : [correct_answer || '']
  const acceptableAnswers: string[] = []
  rawAcceptable.forEach(ans => {
    if (!ans) return
    if (ans.includes('|')) {
      ans.split('|').forEach(p => {
        const c = p.trim()
        if (c && !acceptableAnswers.includes(c)) acceptableAnswers.push(c)
      })
    } else if (ans.trim() && !acceptableAnswers.includes(ans.trim())) {
      acceptableAnswers.push(ans.trim())
    }
  })

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-sky-50/15 to-slate-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 md:rounded-[2.5rem] rounded-[1.5rem] border border-slate-100/80 dark:border-slate-800 md:p-6 p-3 flex flex-col justify-between gap-3 md:gap-5 shadow-2xl shadow-sky-100/20 dark:shadow-none min-h-0 overflow-y-auto custom-scrollbar">
      {/* ── Top Audio Listening Card ── */}
      <div className="w-full max-w-2xl mx-auto shrink-0">
        <div className="w-full bg-gradient-to-b from-sky-50/90 via-indigo-50/40 to-white/95 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-900/95 backdrop-blur-xl rounded-[2rem] p-5 md:p-7 shadow-[0_12px_36px_rgba(14,165,233,0.08)] dark:shadow-none border border-sky-100/80 dark:border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-200/25 dark:bg-sky-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-100/35 dark:bg-indigo-500/10 blur-2xl pointer-events-none" />

          {/* Card Header Tag & Bookmark */}
          <div className="w-full flex items-center justify-between mb-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100/90 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 font-black text-xs shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 fill-sky-300" />
              <span>{isMcq ? 'Listening MCQ' : 'Listening Typing'} #{currentIndex + 1}</span>
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (currentQuestion?.id) {
                  onToggleStar(currentQuestion.id)
                }
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sky-400 hover:text-sky-600 dark:text-sky-400/80 dark:hover:text-sky-300 hover:bg-sky-50/80 dark:hover:bg-sky-950/40 transition-all active:scale-90 cursor-pointer touch-manipulation"
              title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Remove bookmark" : "Bookmark question"}
            >
              <Bookmark className={cn("w-5 h-5 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-sky-500 text-sky-500" : "text-sky-400")} />
            </button>
          </div>

          {/* Central Audio Waves & Big Play Button */}
          <div className="flex flex-col items-center gap-3 my-2 relative z-10">
            <div className="relative flex items-center justify-center">
              {/* Outer Pulsing Waves */}
              {isPlaying && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-sky-400/20 animate-ping" />
                  <div className="absolute -inset-2 rounded-full bg-sky-300/30 animate-pulse" />
                </>
              )}

              <button
                type="button"
                onClick={() => handlePlayAudioWithSpeed(playbackSpeed)}
                className={cn(
                  "relative w-20 h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-xl shadow-sky-300/40 dark:shadow-none hover:shadow-sky-400/60 active:scale-95 transition-all cursor-pointer group border-4 border-white/80 dark:border-slate-800",
                  isPlaying && "ring-4 ring-sky-300 dark:ring-sky-500/50 ring-offset-2"
                )}
                title="Tap to play audio"
              >
                {isPlaying ? (
                  <Volume2 className="w-9 h-9 text-white animate-bounce" />
                ) : (
                  <Play className="w-9 h-9 text-white fill-white ml-1 group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>

            {/* Speed Control Pills */}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setPlaybackSpeed(1.0)
                  handlePlayAudioWithSpeed(1.0)
                }}
                className={cn(
                  "px-3 py-1 rounded-xl text-[11px] font-black transition-all border flex items-center gap-1 cursor-pointer",
                  playbackSpeed === 1.0
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
                title="Normal speed 1.0x"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>1.0x Normal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlaybackSpeed(0.8)
                  handlePlayAudioWithSpeed(0.8)
                }}
                className={cn(
                  "px-3 py-1 rounded-xl text-[11px] font-black transition-all border flex items-center gap-1 cursor-pointer",
                  playbackSpeed === 0.8
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
                title="Slow speed 0.8x to hear phonetics"
              >
                <Volume1 className="w-3.5 h-3.5" />
                <span>0.8x Slow</span>
              </button>
            </div>

            {/* Instruction or Revealed Question Text */}
            {!answered ? (
              <div className="space-y-1 mt-1">
                <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  {isMcq ? 'Listen carefully and select the matching answer' : 'Listen carefully and type the word you hear'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  (Text prompt is hidden to test auditory recall)
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 mt-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Original Audio Prompt
                </div>
                <div
                  className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100"
                  dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: MCQ Choices OR Typing Input ── */}
      <div className="w-full max-w-2xl mx-auto my-auto shrink-0 space-y-3">
        {isMcq ? (
          /* MCQ Choices Grid */
          <div className="w-full max-w-2xl mx-auto shrink-0">
            {choices && choices.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 md:gap-3 mb-1 md:mb-2">
                {choices.map((choice: string, idx: number) => {
                  const isSelected = selectedOption === idx
                  const isCorrectChoice = idx === correct_index
                  const letter = String.fromCharCode(65 + idx) // A, B, C, D

                  let cardStyle = "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500/50 hover:shadow-md text-slate-800 dark:text-slate-100"
                  let badgeStyle = "bg-sky-50/90 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60"

                  if (answered) {
                    if (isCorrectChoice) {
                      cardStyle = "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 shadow-md shadow-emerald-100/50 dark:shadow-none scale-[1.01]"
                      badgeStyle = "bg-emerald-500 text-white border-emerald-500"
                    } else if (isSelected) {
                      cardStyle = "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 shadow-md shadow-rose-100/50 dark:shadow-none"
                      badgeStyle = "bg-rose-500 text-white border-rose-500"
                    } else {
                      cardStyle = "bg-slate-50/60 dark:bg-slate-850/60 border-slate-100/60 dark:border-slate-800/60 opacity-50 text-slate-400 dark:text-slate-500"
                      badgeStyle = "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!answered && onSelectOption) {
                          onSelectOption(idx)
                        } else if (answered && onPreviewInsight) {
                          let choiceObj: any = null
                          if (practiceData.choices_data && practiceData.choices_data[idx]) {
                            choiceObj = practiceData.choices_data[idx]
                          }
                          const choiceId = choice_item_ids?.[idx] || choiceObj?.id
                          const targetCard = sessionQuestions.find(q => String(q.id) === String(choiceId)) || choiceObj
                          if (targetCard) onPreviewInsight(targetCard)
                        }
                      }}
                      className={cn(
                        "group w-full p-3.5 md:p-4 rounded-2xl md:rounded-[1.25rem] border text-left font-bold text-sm md:text-base transition-all duration-200 flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] cursor-pointer touch-manipulation",
                        cardStyle
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn(
                            "w-8.5 h-8.5 md:w-9.5 md:h-9.5 rounded-full flex items-center justify-center text-xs md:text-sm font-black border flex-shrink-0 transition-colors shadow-sm",
                            badgeStyle
                          )}>
                            {letter}
                          </span>
                        </div>
                        <span
                          className="break-words font-black text-slate-800 dark:text-slate-100 text-sm md:text-base leading-snug tracking-tight"
                          dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice || '') }}
                        />
                      </div>

                      {answered && (
                        <div className="flex items-center gap-2 shrink-0">
                          {isCorrectChoice && (
                            <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </span>
                          )}
                          {isSelected && !isCorrectChoice && (
                            <span className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                              <X className="w-4 h-4 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Typing Input Section */
          !answered ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (typingInput.trim() && onCheckTyping) {
                  onCheckTyping()
                }
              }}
              className="w-full bg-white/95 dark:bg-slate-900/95 rounded-[1.75rem] p-4 md:p-5 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-100 dark:shadow-none flex flex-col gap-3"
            >
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Type the word you hear:</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold lowercase">press enter to check ↵</span>
              </label>

              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={typingInput}
                  onChange={(e) => setTypingInput && setTypingInput(e.target.value)}
                  onFocus={(e) => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type what you hear..."
                  enterKeyHint="go"
                  className="w-full h-14 pl-4 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-inner"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />

                <button
                  type="submit"
                  disabled={!typingInput.trim()}
                  className={cn(
                    "absolute right-2.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm touch-manipulation",
                    typingInput.trim()
                      ? "bg-sky-600 text-white hover:bg-sky-700 active:scale-95 shadow-sky-200"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  )}
                  title="Check answer"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* User Answer Comparison Box */}
              <div className={cn(
                "w-full rounded-[1.75rem] p-4 md:p-5 border flex items-start gap-3 shadow-md",
                typingFeedback?.isCorrect
                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-emerald-100/50 dark:shadow-none"
                  : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-rose-100/50 dark:shadow-none"
              )}>
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                  typingFeedback?.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                )}>
                  {typingFeedback?.isCorrect ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-5 h-5 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-70">
                    Your typed answer
                  </div>
                  <div className="text-base md:text-lg font-black break-words mt-0.5">
                    {typingInput || <span className="italic text-slate-400 dark:text-slate-500">(Empty)</span>}
                  </div>
                </div>
              </div>

              {/* Acceptable Answers Box */}
              <div className="w-full bg-white/95 dark:bg-slate-900/95 rounded-[1.75rem] p-4 md:p-5 border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col gap-2.5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Accepted correct answers
                </span>

                <div className="flex flex-wrap gap-2">
                  {acceptableAnswers.map((ans, aIdx) => (
                    <span
                      key={aIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs md:text-sm font-black shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(ans) }} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default PracticeListeningCard
