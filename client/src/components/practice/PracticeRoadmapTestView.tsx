import React from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PracticeRoadmapTestViewProps {
  session: any
  practiceCorrectCount: number
  roadmapSubmitResult: any
  roadmapStatus: any
  onNavigateHome: () => void
  onNavigateUrl: (url: string) => void
  onResetTest: () => void
}

export const PracticeRoadmapTestView: React.FC<PracticeRoadmapTestViewProps> = ({
  session,
  practiceCorrectCount,
  roadmapSubmitResult,
  roadmapStatus,
  onNavigateHome,
  onNavigateUrl,
  onResetTest
}) => {
  const totalQ = session?.questions?.length || 15
  const correctCount = practiceCorrectCount
  const scorePercent = roadmapSubmitResult?.score !== undefined 
    ? Math.round(roadmapSubmitResult.score)
    : (totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0)
  const isPassed = roadmapSubmitResult?.passed !== undefined ? roadmapSubmitResult.passed : scorePercent >= 80

  const firstUnfinishedStep = roadmapStatus?.pipeline?.find((s: any) => !s.done)
  const isAllDone = Boolean(roadmapStatus?.all_done || !firstUnfinishedStep)
  const targetActionUrl = firstUnfinishedStep?.url || (!isAllDone ? roadmapStatus?.next_action_url : null)
  const targetActionLabel = firstUnfinishedStep?.label || roadmapStatus?.next_action_label || 'Tiếp theo'

  return (
    <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 p-6 md:p-10 flex flex-col items-center justify-center text-center gap-6 shadow-2xl shadow-indigo-100/40 min-h-[480px]">
      {/* Icon Badge */}
      <div className={cn(
        "w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border animate-in zoom-in-75 duration-500",
        isPassed
          ? "bg-gradient-to-tr from-emerald-400 to-teal-500 text-white border-emerald-300 shadow-emerald-200"
          : "bg-gradient-to-tr from-amber-400 to-orange-500 text-white border-amber-300 shadow-amber-200"
      )}>
        {isPassed ? <Trophy className="w-10 h-10 animate-bounce" /> : <RefreshCw className="w-10 h-10 animate-spin" />}
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          {isPassed ? "🎉 XUẤT SẮC! ĐẠT MỤC TIÊU ROADMAP" : "🎯 CHƯA ĐẠT CHỈ TIÊU (80%)"}
        </h2>
        <p className="text-xs md:text-sm font-medium text-slate-500 leading-relaxed">
          {isPassed
            ? "Chúc mừng bạn đã hoàn thành bài kiểm tra với kết quả ấn tượng!"
            : "Bạn đạt kết quả dưới chỉ tiêu 80%. Đừng lo lắng, hãy làm lại bài test khác nhé!"}
        </p>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md my-2">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Điểm số</span>
          <span className={cn(
            "text-2xl font-black block mt-0.5",
            isPassed ? "text-emerald-600" : "text-amber-600"
          )}>
            {scorePercent}%
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số câu đúng</span>
          <span className="text-2xl font-black text-emerald-600 block mt-0.5">
            {correctCount}/{totalQ}
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mục tiêu</span>
          <span className="text-2xl font-black text-indigo-600 block mt-0.5">
            ≥80%
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 pt-2">
        {isPassed ? (
          <>
            {isAllDone || !targetActionUrl ? (
              <button
                onClick={onNavigateHome}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy className="w-5 h-5 fill-current" />
                <span>🎉 HOÀN THÀNH LỘ TRÌNH HÔM NAY ➔ VỀ DASHBOARD</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigateUrl(targetActionUrl)}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{targetActionLabel ? `🚀 SANG BƯỚC: ${targetActionLabel} ➔` : '🚀 SANG BƯỚC TIẾP THEO ➔'}</span>
              </button>
            )}

            <button
              onClick={onResetTest}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              <span>Làm lại bài kiểm tra 🔄</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="w-full py-3 px-4 rounded-xl bg-slate-100/60 hover:bg-slate-100 border border-slate-200/60 text-slate-500 hover:text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
            >
              Về Trang Chủ
            </button>
          </>
        ) : (
          <button
            onClick={onResetTest}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4.5 h-4.5" />
            <span>🔄 Làm lại bài test khác</span>
          </button>
        )}
      </div>
    </div>
  )
}
