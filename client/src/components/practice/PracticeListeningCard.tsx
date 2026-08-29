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
  typingInput: string
  setTypingInput: (val: string) => void
  typingFeedback: { checked: boolean; isCorrect: boolean } | null
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onCheckTyping: () => void
  onPlayAudio: (face?: string, rate?: number) => void
}

export const PracticeListeningCard: React.FC<PracticeListeningCardProps> = ({
  currentIndex,
  currentQuestion,
  practiceData,
  answered,
  typingInput,
  setTypingInput,
  typingFeedback,
  starredCards,
  onToggleStar,
  onCheckTyping,
  onPlayAudio
}) => {
  const { question, correct_answer, question_key } = practiceData
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Focus input automatically on unanswered state
  useEffect(() => {
    if (!answered && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, answered])

  const handlePlayAudioWithSpeed = (speed: number = playbackSpeed) => {
    setIsPlaying(true)
    onPlayAudio(question_key || 'front', speed)
    setTimeout(() => setIsPlaying(false), 2200)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (!answered && typingInput.trim()) {
        onCheckTyping()
      }
    }
  }

  // Extract all acceptable answers
  const rawAcceptable = practiceData.acceptable_answers && practiceData.acceptable_answers.length > 0
    ? practiceData.acceptable_answers
    : [correct_answer || '']
  const acceptableAnswers = Array.from(new Set(rawAcceptable.map(a => a.trim()).filter(Boolean)))

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-sky-50/15 to-slate-50 md:rounded-[2.5rem] rounded-[1.5rem] border border-slate-100/80 md:p-6 p-3 flex flex-col justify-between gap-3 md:gap-5 shadow-2xl shadow-sky-100/20 min-h-0 overflow-y-auto custom-scrollbar">
      {/* ── Top Audio Listening Card ── */}
      <div className="w-full max-w-2xl mx-auto shrink-0">
        <div className="w-full bg-gradient-to-b from-sky-50/90 via-indigo-50/40 to-white/95 backdrop-blur-xl rounded-[2rem] p-5 md:p-7 shadow-[0_12px_36px_rgba(14,165,233,0.08)] border border-sky-100/80 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-200/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-100/35 blur-2xl pointer-events-none" />

          {/* Card Header Tag & Bookmark */}
          <div className="w-full flex items-center justify-between mb-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100/90 border border-sky-200 text-sky-800 font-black text-xs shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 fill-sky-300" />
              <span>Luyện nghe #{currentIndex + 1}</span>
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (currentQuestion?.id) {
                  onToggleStar(currentQuestion.id)
                }
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-sky-50/80 transition-all active:scale-90 cursor-pointer"
              title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Bỏ đánh dấu" : "Đánh dấu câu hỏi"}
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
                  "relative w-20 h-20 md:w-22 md:h-22 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-xl shadow-sky-300/40 hover:shadow-sky-400/60 active:scale-95 transition-all cursor-pointer group border-4 border-white/80",
                  isPlaying && "ring-4 ring-sky-300 ring-offset-2"
                )}
                title="Nhấn để nghe phát âm"
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
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                title="Tốc độ chuẩn 1.0x"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>1.0x Chuẩn</span>
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
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                title="Tốc độ chậm 0.8x để nghe rõ từng âm"
              >
                <Volume1 className="w-3.5 h-3.5" />
                <span>0.8x Chậm</span>
              </button>
            </div>

            {/* Instruction or Revealed Question Text */}
            {!answered ? (
              <div className="space-y-1 mt-1">
                <p className="text-xs font-bold text-sky-900">
                  Lắng nghe phát âm và gõ lại từ vựng bạn nghe được
                </p>
                <p className="text-[10px] text-slate-400">
                  (Đề bài văn bản được ẩn để kiểm tra khả năng nghe và nhớ từ)
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 mt-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Nội dung phát âm gốc
                </div>
                <div
                  className="text-xl md:text-2xl font-black text-slate-900"
                  dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Typing Input & Feedback Area ── */}
      <div className="w-full max-w-2xl mx-auto my-auto shrink-0 space-y-3">
        {!answered ? (
          <div className="w-full bg-white/95 rounded-[1.75rem] p-4 md:p-5 border border-slate-200/80 shadow-lg shadow-slate-100 flex flex-col gap-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Nhập từ bạn nghe được:</span>
              <span className="text-[10px] text-slate-400 font-bold lowercase">nhấn enter để kiểm tra ↵</span>
            </label>

            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Gõ từ vựng bạn vừa nghe..."
                className="w-full h-14 pl-4 pr-12 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:bg-white focus:outline-none text-base md:text-lg font-bold text-slate-900 placeholder:text-slate-400 transition-all shadow-inner"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />

              <button
                type="button"
                onClick={() => {
                  if (typingInput.trim()) {
                    onCheckTyping()
                  }
                }}
                disabled={!typingInput.trim()}
                className={cn(
                  "absolute right-2.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm",
                  typingInput.trim()
                    ? "bg-sky-600 text-white hover:bg-sky-700 active:scale-95 shadow-sky-200"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
                title="Kiểm tra đáp án"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* User Answer Comparison Box */}
            <div className={cn(
              "w-full rounded-[1.75rem] p-4 md:p-5 border flex items-start gap-3 shadow-md",
              typingFeedback?.isCorrect
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-emerald-100/50"
                : "bg-rose-50/80 border-rose-200 text-rose-900 shadow-rose-100/50"
            )}>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                typingFeedback?.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              )}>
                {typingFeedback?.isCorrect ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-5 h-5 stroke-[3]" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider opacity-70">
                  Đáp án bạn đã gõ
                </div>
                <div className="text-base md:text-lg font-black break-words mt-0.5">
                  {typingInput || <span className="italic text-slate-400">(Trống)</span>}
                </div>
              </div>
            </div>

            {/* Acceptable Answers Box */}
            <div className="w-full bg-white/95 rounded-[1.75rem] p-4 md:p-5 border border-slate-200/80 shadow-md flex flex-col gap-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Các đáp án chính xác được chấp nhận
              </span>

              <div className="flex flex-wrap gap-2">
                {acceptableAnswers.map((ans, aIdx) => (
                  <span
                    key={aIdx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-black shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(ans) }} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
