import React from 'react'
import { Sparkles, Bookmark, Play, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'
import { PracticeMcqCard } from './PracticeMcqCard'

export interface PracticeListeningCardProps {
  currentIndex: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  selectedOption: number | null
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onSelectOption: (index: number) => void
  onPreviewInsight: (card: any) => void
  onPlayAudio: (face: string) => void
  sessionQuestions?: Question[]
}

export const PracticeListeningCard: React.FC<PracticeListeningCardProps> = ({
  currentIndex,
  currentQuestion,
  practiceData,
  answered,
  selectedOption,
  starredCards,
  onToggleStar,
  onSelectOption,
  onPreviewInsight,
  onPlayAudio,
  sessionQuestions = []
}) => {
  const { question_key, choices } = practiceData

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-sky-50/15 to-slate-50 md:rounded-[2.5rem] rounded-[1.5rem] border border-slate-100/80 md:p-6 p-3 flex flex-col justify-between gap-3 md:gap-5 shadow-2xl shadow-sky-100/20 min-h-0 overflow-y-auto custom-scrollbar">
      {/* ── Top Listening Audio Card ── */}
      <div className="w-full max-w-2xl mx-auto my-auto animate-in fade-in slide-in-from-top-3 duration-500 shrink-0">
        <div className="w-full bg-gradient-to-b from-sky-50/80 via-indigo-50/30 to-white/95 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-[0_12px_36px_rgba(14,165,233,0.08)] border border-sky-100/80 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-200/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-100/35 blur-2xl pointer-events-none" />

          <div className="w-full flex items-center justify-between mb-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100/80 border border-sky-200/70 text-sky-800 font-black text-xs shadow-sm">
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

          {/* Audio Pulsing Button */}
          <div className="flex flex-col items-center gap-3 my-3">
            <div
              onClick={() => onPlayAudio(question_key || 'front')}
              className="relative w-20 h-20 rounded-full bg-white border border-sky-200 flex items-center justify-center shadow-lg shadow-sky-100/50 hover:bg-sky-50 active:scale-95 transition-all cursor-pointer group"
              title="Nhấn để nghe lại"
            >
              <div className="absolute inset-0 rounded-full bg-sky-400/10 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-sky-300/20 animate-pulse" />
              <Play className="w-7 h-7 text-sky-600 fill-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[10px] font-black text-sky-600 tracking-widest uppercase mt-1">NHẤN ĐỂ NGHE PHÁT ÂM</span>
          </div>
        </div>
      </div>

      {/* ── MCQ Choices for Listening Mode ── */}
      <div className="w-full max-w-2xl mx-auto shrink-0">
        <PracticeMcqCard
          currentIndex={currentIndex}
          currentQuestion={currentQuestion}
          practiceData={practiceData}
          answered={answered}
          selectedOption={selectedOption}
          starredCards={starredCards}
          onToggleStar={onToggleStar}
          onSelectOption={onSelectOption}
          onPreviewInsight={onPreviewInsight}
          sessionQuestions={sessionQuestions}
        />
      </div>
    </div>
  )
}
