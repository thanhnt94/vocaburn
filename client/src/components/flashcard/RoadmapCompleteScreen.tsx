import React from 'react'
import { Trophy, Target, Sparkles, Brain, ChevronRight } from 'lucide-react'

export interface RoadmapCompleteScreenProps {
  roadmapStatus: any
  nextActionUrl: string | null
  nextActionLabel: string | null
  onNavigate: (url: string) => void
  onLearnMoreNew: () => void
  onOpenStudyConsole: () => void
}

export const RoadmapCompleteScreen: React.FC<RoadmapCompleteScreenProps> = ({
  roadmapStatus,
  nextActionUrl,
  nextActionLabel,
  onNavigate,
  onLearnMoreNew,
  onOpenStudyConsole
}) => {
  const firstUnfinishedStep = roadmapStatus?.pipeline?.find((s: any) => !s.done)
  const isAllDone = Boolean(roadmapStatus?.all_done || !firstUnfinishedStep)
  const newTarget = roadmapStatus?.new_target_today ?? 20
  const newLearned = Math.min(newTarget, roadmapStatus?.new_learned_today ?? 0)

  const targetActionUrl = firstUnfinishedStep?.url || (!isAllDone ? nextActionUrl : null)
  const targetActionLabel = firstUnfinishedStep?.label || nextActionLabel || 'Tiếp theo'

  const subtitleText = isAllDone
    ? "Chúc mừng bạn đã hoàn thành tất cả các bước trong lộ trình ngày hôm nay!"
    : firstUnfinishedStep?.type === 'mcq' || firstUnfinishedStep?.type === 'typing'
      ? "Xuất sắc! Hãy thực hiện bài kiểm tra để đánh giá khả năng ghi nhớ & giữ Streak ngày!"
      : firstUnfinishedStep?.type === 'fsrs_review'
        ? "Xuất sắc! Tiếp tục với bước Ôn tập FSRS để củng cố khả năng ghi nhớ dài hạn!"
        : "Chúc mừng bạn đã hoàn thành việc học từ mới của lộ trình hôm nay!"

  return (
    <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 p-6 md:p-10 flex flex-col items-center justify-center text-center gap-6 shadow-2xl shadow-indigo-100/40 min-h-[480px] w-full max-w-xl mx-auto my-auto">
      {/* Icon Badge */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border animate-in zoom-in-75 duration-500 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white border-emerald-300 shadow-emerald-200">
        <Trophy className="w-10 h-10 animate-bounce" />
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          {isAllDone ? "🎉 XUẤT SẮC! HOÀN THÀNH LỘ TRÌNH" : "🎉 XUẤT SẮC! ĐÃ HỌC XONG TỪ MỚI"}
        </h2>
        <p className="text-xs md:text-sm font-medium text-slate-500 leading-relaxed">
          {subtitleText}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md my-2">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Đã học</span>
          <span className="text-2xl font-black text-emerald-600 block mt-0.5">
            {newLearned}/{newTarget}
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hoàn thành</span>
          <span className="text-2xl font-black text-emerald-600 block mt-0.5">
            {newTarget > 0 ? Math.min(100, Math.round((newLearned / newTarget) * 100)) : 100}%
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mục tiêu</span>
          <span className="text-2xl font-black text-indigo-600 block mt-0.5">
            100%
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 pt-2">
        {!isAllDone && targetActionUrl && (
          <button
            onClick={() => onNavigate(targetActionUrl)}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>
              {firstUnfinishedStep?.type === 'mcq' || firstUnfinishedStep?.type === 'typing'
                ? '🎯 BẮT ĐẦU BÀI KIỂM TRA ➔'
                : `🚀 SANG BƯỚC: ${targetActionLabel} ➔`}
            </span>
          </button>
        )}

        {isAllDone && (
          <button
            onClick={() => onNavigate('/')}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-5 h-5 fill-current" />
            <span>🎉 HOÀN THÀNH LỘ TRÌNH HÔM NAY ➔ VỀ DASHBOARD</span>
          </button>
        )}

        <button
          onClick={onLearnMoreNew}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span>Học tiếp từ mới 🚀</span>
        </button>

        <button
          onClick={onOpenStudyConsole}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-between shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            <span>Vẫn muốn học Flashcard? Đổi chế độ</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => onNavigate('/')}
          className="w-full py-3 px-4 rounded-xl bg-slate-100/60 hover:bg-slate-100 border border-slate-200/60 text-slate-500 hover:text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
        >
          Về Trang Chủ
        </button>
      </div>
    </div>
  )
}
