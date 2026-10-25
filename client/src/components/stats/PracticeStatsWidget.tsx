import { BookOpen, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PracticeStatsWidgetProps {
  practiceStats: {
    mcq: { correct: number, wrong: number, time_spent: number }
    typing: { correct: number, wrong: number, time_spent: number }
    listening?: { correct: number, wrong: number, time_spent: number }
  } | undefined
  embedded?: boolean
}

export default function PracticeStatsWidget({ practiceStats, embedded = false }: PracticeStatsWidgetProps) {
  if (!practiceStats) return null

  const modes = [
    {
      id: 'mcq',
      title: 'Multiple Choice (MCQ)',
      subtitle: '4-option rapid recall drill',
      icon: '🎯',
      color: 'from-blue-500 to-indigo-600',
      data: practiceStats.mcq
    },
    {
      id: 'typing',
      title: 'Typing Recall',
      subtitle: 'Spelling & active production',
      icon: '⌨️',
      color: 'from-purple-500 to-violet-600',
      data: practiceStats.typing
    },
    {
      id: 'listening',
      title: 'Listening Drill',
      subtitle: 'Audio recognition & comprehension',
      icon: '🎧',
      color: 'from-sky-500 to-teal-600',
      data: practiceStats.listening || { correct: 0, wrong: 0, time_spent: 0 }
    }
  ]

  const content = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {modes.map(mode => {
        const total = mode.data.correct + mode.data.wrong
        const acc = total > 0 ? Math.round((mode.data.correct / total) * 100) : 0
        const timeMin = Math.round(mode.data.time_spent / 60)

        return (
          <div 
            key={mode.id}
            className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-2xl group-hover:scale-105 transition-transform">{mode.icon}</span>
                <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                  {acc}% acc
                </span>
              </div>

              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">{mode.title}</h4>
              <p className="text-[8.5px] font-medium text-slate-400 mt-0.5">{mode.subtitle}</p>

              <div className="mt-3.5 pt-2.5 border-t border-slate-200/50 space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-medium text-slate-500">Total Trials:</span>
                  <span className="font-black text-slate-800">{total}</span>
                </div>
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Correct:
                  </span>
                  <span className="font-black text-emerald-600">{mode.data.correct}</span>
                </div>
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-medium text-rose-500 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Incorrect:
                  </span>
                  <span className="font-black text-rose-500">{mode.data.wrong}</span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[8.5px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Focus Time:
              </span>
              <span className="text-slate-700 font-extrabold">{timeMin} mins</span>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm text-left relative overflow-hidden">
      <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
            Practice Modes Performance
          </h3>
          <p className="text-[9px] font-bold text-slate-400 mt-1">
            Cumulative retention by practice format
          </p>
        </div>
      </div>
      {content}
    </div>
  )
}
