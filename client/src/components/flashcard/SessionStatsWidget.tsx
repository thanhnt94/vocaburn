import React from 'react'
import { Target, BookOpen } from 'lucide-react'

export interface SessionStatsWidgetProps {
  isPractice: boolean
  practiceAnswers: Record<number, any>
  sessionAnswers: Record<number, any>
  session: any
  practiceSubMode?: string
}

export const SessionStatsWidget: React.FC<SessionStatsWidgetProps> = ({
  isPractice,
  practiceAnswers,
  sessionAnswers,
  session,
  practiceSubMode
}) => {
  if (isPractice) {
    const answeredCount = Object.keys(practiceAnswers).length
    const correctCount = Object.entries(practiceAnswers).filter(([idx, ansIdx]) => {
      const q = session?.questions?.[Number(idx)]
      if (!q || !q.practice) return false
      if (practiceSubMode === 'typing') {
        return ansIdx === 3
      }
      return ansIdx === q.practice.correct_index
    }).length
    const wrongCount = answeredCount - correctCount
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    return (
      <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PRACTICE SUMMARY</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
            <Target className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">ACCURACY: {accuracy}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-slate-100/50 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">QUESTIONS DONE</span>
          </div>
          <span className="text-lg font-black text-slate-700">{answeredCount}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-100/40">
            <span className="text-[14px] font-black text-emerald-600">{correctCount}</span>
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">CORRECT</span>
          </div>
          <div className="flex flex-col items-center p-2.5 bg-rose-50 rounded-xl border border-rose-100/40">
            <span className="text-[14px] font-black text-rose-600">{wrongCount}</span>
            <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">WRONG</span>
          </div>
        </div>
      </div>
    )
  }

  const answeredCount = Object.keys(sessionAnswers).length
  const finalRatings = Object.values(sessionAnswers).map(val => (Array.isArray(val) ? val[val.length - 1] : val))
  const againCount = finalRatings.filter(val => val === 0).length
  const hardCount = finalRatings.filter(val => val === 1).length
  const goodCount = finalRatings.filter(val => val === 2).length
  const easyCount = finalRatings.filter(val => val === 3).length
  const flipCount = finalRatings.filter(val => val === -2).length

  const correctCount = hardCount + goodCount + easyCount
  const evaluatedCount = answeredCount - flipCount
  const accuracy = evaluatedCount > 0 ? Math.round((correctCount / evaluatedCount) * 100) : 0

  return (
    <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SESSION SUMMARY</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
          <Target className="w-2.5 h-2.5" />
          <span className="text-[9px] font-black">RETENTION: {accuracy}%</span>
        </div>
      </div>

      {/* Total Reviewed */}
      <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-slate-100/50 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">CARDS REVIEWED</span>
        </div>
        <span className="text-lg font-black text-slate-700">{answeredCount}</span>
      </div>

      {/* 4 FSRS Stats Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="flex flex-col items-center p-2 bg-rose-50 rounded-xl border border-rose-100/40">
          <span className="text-[13px] font-black text-rose-600">{againCount}</span>
          <span className="text-[7px] font-black text-rose-400 uppercase tracking-wider">AGAIN</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-amber-50 rounded-xl border border-amber-100/40">
          <span className="text-[13px] font-black text-amber-600">{hardCount}</span>
          <span className="text-[7px] font-black text-amber-400 uppercase tracking-wider">HARD</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-indigo-50 rounded-xl border border-indigo-100/40">
          <span className="text-[13px] font-black text-indigo-600">{goodCount}</span>
          <span className="text-[7px] font-black text-indigo-400 uppercase tracking-wider">GOOD</span>
        </div>
        <div className="flex flex-col items-center p-2 bg-emerald-50 rounded-xl border border-emerald-100/40">
          <span className="text-[13px] font-black text-emerald-600">{easyCount}</span>
          <span className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">EASY</span>
        </div>
      </div>
    </div>
  )
}
