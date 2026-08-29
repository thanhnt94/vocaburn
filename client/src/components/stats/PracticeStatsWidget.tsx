import { BookOpen, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface PracticeStatsWidgetProps {
  practiceStats: {
    mcq: { correct: number, wrong: number, time_spent: number }
    typing: { correct: number, wrong: number, time_spent: number }
    listening?: { correct: number, wrong: number, time_spent: number }
  } | undefined
}

export default function PracticeStatsWidget({ practiceStats }: PracticeStatsWidgetProps) {
  if (!practiceStats) return null

  const modes = [
    {
      id: 'mcq',
      title: 'Trắc Nghiệm (MCQ)',
      subtitle: '4 đáp án phản xạ',
      icon: '🎯',
      color: 'from-blue-500 to-indigo-600',
      data: practiceStats.mcq
    },
    {
      id: 'typing',
      title: 'Gõ Từ Vựng (Typing)',
      subtitle: 'Luyện nhớ mặt chữ & chính tả',
      icon: '⌨️',
      color: 'from-purple-500 to-violet-600',
      data: practiceStats.typing
    },
    {
      id: 'listening',
      title: 'Luyện Nghe (Listening)',
      subtitle: 'Nghe phát âm chuẩn TTS',
      icon: '🎧',
      color: 'from-sky-500 to-teal-600',
      data: practiceStats.listening || { correct: 0, wrong: 0, time_spent: 0 }
    }
  ]

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm text-left relative overflow-hidden">
      <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
          <BookOpen className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Thống Kê Chế Độ Luyện Tập</h3>
          <p className="text-[9px] font-bold text-slate-400 mt-1">Kết quả tích lũy theo từng phương thức rèn luyện</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map(mode => {
          const total = mode.data.correct + mode.data.wrong
          const acc = total > 0 ? Math.round((mode.data.correct / total) * 100) : 0
          const timeMin = Math.round(mode.data.time_spent / 60)

          return (
            <div 
              key={mode.id}
              className="p-5 bg-slate-50/70 border border-slate-200/70 rounded-2xl flex flex-col justify-between hover:border-indigo-200 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{mode.icon}</span>
                  <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    {acc}% đúng
                  </span>
                </div>

                <h4 className="text-xs font-black text-slate-900 uppercase">{mode.title}</h4>
                <p className="text-[8.5px] font-medium text-slate-400 mt-0.5">{mode.subtitle}</p>

                <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-slate-500">Tổng lượt làm:</span>
                    <span className="font-black text-slate-800">{total} lượt</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Chính xác:
                    </span>
                    <span className="font-black text-emerald-600">{mode.data.correct}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-rose-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Chưa đúng:
                    </span>
                    <span className="font-black text-rose-500">{mode.data.wrong}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Thời gian:
                </span>
                <span className="text-slate-700 font-extrabold">{timeMin} phút</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
