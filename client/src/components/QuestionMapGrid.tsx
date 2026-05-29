import React from 'react'
import { cn } from '@/lib/utils'

interface Question {
  stats?: {
    total?: number
    again_count?: number
    hard_count?: number
    good_count?: number
    easy_count?: number
  }
  box_level?: number
  practice?: {
    correct_index?: number
  }
}

interface QuestionMapGridProps {
  questions: Question[]
  mainTab: 'fsrs' | 'practice'
  practiceAnswers: Record<number, number>
  sessionAnswers: Record<number, number | number[]>
  currentIndex: number
  navigateToQuestion: (index: number) => void
  setIsMapOpen: (open: boolean) => void
}

export const QuestionMapGrid: React.FC<QuestionMapGridProps> = ({
  questions,
  mainTab,
  practiceAnswers,
  sessionAnswers,
  currentIndex,
  navigateToQuestion,
  setIsMapOpen,
}) => {
  const isPractice = mainTab === 'practice'

  return (
    <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-3 p-1 pb-4">
      {questions?.map((q, i) => {
        const hasAttemptedThisSession = isPractice
          ? practiceAnswers[i] !== undefined
          : sessionAnswers[i] !== undefined

        const selectedOptIdx = isPractice
          ? practiceAnswers[i]
          : (() => {
              const attemptedRatings = Array.isArray(sessionAnswers[i])
                ? (sessionAnswers[i] as number[])
                : (typeof sessionAnswers[i] === 'number' ? [sessionAnswers[i] as number] : [])
              return attemptedRatings.length > 0 ? attemptedRatings[attemptedRatings.length - 1] : null
            })()

        const isActive = currentIndex === i

        let fsrsClass = "border-slate-100 hover:border-indigo-200 bg-white text-slate-500 hover:bg-slate-50/50 font-bold"
        let fsrsStyle: any = {}

        const stats = q.stats || { total: 0, again_count: 0, hard_count: 0, good_count: 0, easy_count: 0 }
        const totalReviews = stats.total || 0

        if (totalReviews > 0) {
          const again = stats.again_count || 0
          const hard = stats.hard_count || 0
          const good = stats.good_count || 0
          const easy = stats.easy_count || 0
          const total = again + hard + good + easy

          if (total > 0) {
            const segments: string[] = []
            let currentPct = 0
            if (again > 0) {
              const nextPct = currentPct + (again / total) * 100
              segments.push(`#ffe4e6 ${currentPct.toFixed(1)}%, #ffe4e6 ${nextPct.toFixed(1)}%`)
              currentPct = nextPct
            }
            if (hard > 0) {
              const nextPct = currentPct + (hard / total) * 100
              segments.push(`#fef3c7 ${currentPct.toFixed(1)}%, #fef3c7 ${nextPct.toFixed(1)}%`)
              currentPct = nextPct
            }
            if (good > 0) {
              const nextPct = currentPct + (good / total) * 100
              segments.push(`#e0e7ff ${currentPct.toFixed(1)}%, #e0e7ff ${nextPct.toFixed(1)}%`)
              currentPct = nextPct
            }
            if (easy > 0) {
              const nextPct = currentPct + (easy / total) * 100
              segments.push(`#d1fae5 ${currentPct.toFixed(1)}%, #d1fae5 ${nextPct.toFixed(1)}%`)
              currentPct = nextPct
            }

            fsrsStyle = {
              background: `linear-gradient(to top, ${segments.join(', ')})`,
              color: '#1e293b',
              borderColor: '#cbd5e1'
            }
            fsrsClass = "shadow-sm animate-in zoom-in-95 duration-200 font-bold text-slate-800 border-slate-300"
          } else {
            const box = q.box_level || 1
            if (box === 5) {
              fsrsClass = "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60"
            } else if (box === 4) {
              fsrsClass = "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60"
            } else if (box === 3 || box === 2) {
              fsrsClass = "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100/60"
            } else {
              fsrsClass = "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/60"
            }
          }
        }

        return (
          <button
            key={i}
            onClick={() => {
              navigateToQuestion(i)
              setIsMapOpen(false)
            }}
            className={cn(
              "relative aspect-square rounded-xl border flex flex-col items-center justify-center font-black text-[11px] transition-all duration-200",
              isActive
                ? "border-indigo-600 ring-4 ring-indigo-500/30 z-10 scale-105 shadow-md"
                : "",
              fsrsClass
            )}
            style={fsrsStyle}
          >
            <span className={cn("relative z-10 text-[12px] text-slate-800")}>{i + 1}</span>
            {hasAttemptedThisSession && (
              <span className={cn(
                "text-[6px] font-black tracking-tighter opacity-90 mt-0.5 uppercase z-10 relative",
                isPractice
                  ? (selectedOptIdx === q.practice?.correct_index ? "text-emerald-600" : "text-rose-600")
                  : (selectedOptIdx === 0 ? "text-rose-600" :
                     selectedOptIdx === 1 ? "text-amber-600" :
                     selectedOptIdx === 2 ? "text-indigo-600" :
                     "text-emerald-600")
              )}>
                {isPractice
                  ? (selectedOptIdx === q.practice?.correct_index ? "CORRECT" : "WRONG")
                  : (selectedOptIdx === 0 ? "AGAIN" : selectedOptIdx === 1 ? "HARD" : selectedOptIdx === 2 ? "GOOD" : "EASY")}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
