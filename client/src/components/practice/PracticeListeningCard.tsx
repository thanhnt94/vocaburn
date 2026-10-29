import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Sparkles, Bookmark, Play, Volume2, RotateCcw, Check, X, CornerDownLeft, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import { CardImageGallery } from '@/components/common/CardImageGallery'
import { extractCardImages } from '@/lib/image-utils'
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
  hideHeaderActions = false
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
    <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-slate-900 md:rounded-[2rem] rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl shadow-indigo-100/30 dark:shadow-none min-h-0 overflow-y-auto custom-scrollbar relative">
      {/* ── Ambient Soft Glow ── */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-cyan-200/20 via-sky-100/10 to-transparent dark:from-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-indigo-100/20 via-slate-100/10 to-transparent dark:from-indigo-500/5 blur-3xl pointer-events-none" />

      {/* ── Top Header Bar ── */}
      <div className="w-full flex items-center justify-between gap-2 relative z-10 select-none pb-2 border-b border-slate-100/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/80 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 font-black text-[11px] uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 fill-cyan-300" />
            <span>{isMcq ? 'Audio MCQ' : 'Audio Dictation'}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-black text-[11px]">
            #{currentIndex + 1}{totalCards ? ` / ${totalCards}` : ''}
          </span>

          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-400 font-bold text-[10px] tracking-wider uppercase">
            {isMcq ? 'LISTEN & SELECT ANSWER' : 'LISTEN & TYPE WHAT YOU HEAR'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!hideHeaderActions && onPreviewInsight && currentQuestion && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPreviewInsight(currentQuestion)
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-500 hover:text-amber-600 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/90 border border-amber-200/60 dark:border-amber-800/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Card Insights & Mnemonics (💡)"
            >
              <Lightbulb className="w-4 h-4 fill-amber-400/30" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (currentQuestion?.id) onToggleStar(currentQuestion.id)
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-95 cursor-pointer"
            title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Unstar Card" : "Star Card"}
          >
            <Bookmark className={cn("w-4 h-4 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-amber-500 text-amber-500" : "text-slate-400")} />
          </button>
        </div>
      </div>

      {/* ── Hero Audio Player Disc (Center Stage) ── */}
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
      </div>

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

                  let cardStyle = "bg-slate-50/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-cyan-400 text-slate-800 dark:text-slate-100 hover:shadow-md"
                  let badgeStyle = "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"

                  if (answered) {
                    if (isCorrectChoice) {
                      cardStyle = "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.01]"
                      badgeStyle = "bg-emerald-600 text-white border-emerald-400"
                    } else if (isSelected) {
                      cardStyle = "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/25"
                      badgeStyle = "bg-rose-600 text-white border-rose-400"
                    } else {
                      cardStyle = "bg-slate-100/50 dark:bg-slate-850/40 border-slate-200/50 dark:border-slate-800 opacity-40 text-slate-400"
                      badgeStyle = "bg-slate-200/50 dark:bg-slate-800 text-slate-400"
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!answered && onSelectOption) {
                          onSelectOption(idx)
                        } else if (onPreviewInsight) {
                          const choiceIds = choice_item_ids || practiceData.choice_item_ids || currentQuestion?.practice?.choice_item_ids
                          if (choiceIds && sessionQuestions.length > 0 && choiceIds[idx] !== undefined) {
                            const targetCard = sessionQuestions.find((q: any) => String(q.id) === String(choiceIds[idx]))
                            if (targetCard) onPreviewInsight(targetCard)
                          }
                        }
                      }}
                      className={cn(
                        "w-full min-h-[58px] sm:min-h-[64px] p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center gap-3 text-left relative cursor-pointer select-none active:scale-[0.98]",
                        cardStyle
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0 transition-colors",
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
                          className="font-bold text-sm sm:text-base leading-snug block truncate"
                          dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice || '') }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}


          </div>
        ) : (
          /* Dictation Typing */
          <div className="max-w-xl mx-auto w-full">
            {!answered ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (typingInput && typingInput.trim() && onCheckTyping) {
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
                    onChange={(e) => setTypingInput && setTypingInput(e.target.value)}
                    placeholder="Listen and type the word..."
                    enterKeyHint="go"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="flex-1 h-14 sm:h-16 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-cyan-200/50 text-base sm:text-xl font-bold text-slate-900 dark:text-white outline-none transition-all shadow-xs placeholder:text-slate-400"
                  />

                  <button
                    type="submit"
                    disabled={!typingInput || !typingInput.trim()}
                    className={cn(
                      "h-14 sm:h-16 px-6 sm:px-8 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none shrink-0",
                      typingInput && typingInput.trim()
                        ? "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white shadow-cyan-500/25 active:scale-95"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200/60 cursor-not-allowed opacity-60"
                    )}
                  >
                    <span>Check</span>
                    <CornerDownLeft className="w-4 h-4 hidden sm:inline-block" />
                  </button>
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
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm shrink-0",
                        typingFeedback.isCorrect ? "bg-emerald-500" : "bg-rose-500"
                      )}>
                        {typingFeedback.isCorrect ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-5 h-5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="font-black text-sm tracking-wide block">
                          {typingFeedback.isCorrect ? "Perfect listening! 🎧" : "Not quite right!"}
                        </span>
                        <span className="text-[11px] font-semibold opacity-75">
                          You typed: <strong className="font-mono">{typingInput || "(Empty)"}</strong>
                        </span>
                      </div>
                    </div>

                    {!typingFeedback.isCorrect && (
                      <div className="mt-1 pt-2 border-t border-rose-200/60 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                          Correct answer:
                        </span>
                        <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 text-emerald-900 dark:text-emerald-200 font-black text-lg">
                          <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Answer Explanation Images (Revealed upon answering) */}
                {answerImages.length > 0 && (
                  <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
    </div>
  )
}

export default PracticeListeningCard
