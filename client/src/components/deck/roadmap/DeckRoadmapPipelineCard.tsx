import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowRight, Zap, Target, Sparkles, Clock, Flame } from 'lucide-react'

export interface PipelineStepItem {
  type: string
  label: string
  done: boolean
  url: string
  daily_count?: number
  question_count?: number
  pass_threshold?: number
}

export interface DeckRoadmapPipelineCardProps {
  deckId: string | number
  status: any
  isLoading?: boolean
}

export function DeckRoadmapPipelineCard({
  deckId,
  status,
  isLoading
}: DeckRoadmapPipelineCardProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
        <div className="h-6 bg-slate-100 rounded w-1/3" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  const pipeline: PipelineStepItem[] = status?.pipeline || []
  const allDone = status?.all_done
  const streak = status?.streak ?? 0
  const newLearned = status?.new_learned_today ?? 0
  const newTarget = status?.new_target_today ?? status?.roadmap_daily_new ?? 10
  const reviewDone = status?.review_completed_today ?? 0
  const reviewDue = status?.review_due_today ?? 0

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'new_cards': return '🎴'
      case 'mcq': return '🎯'
      case 'typing': return '⌨️'
      case 'fsrs_review': return '🔄'
      default: return '⚡'
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 rounded-2xl border border-indigo-100/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-indigo-100 flex items-center justify-center text-2xl shrink-0">
            {allDone ? '🎉' : '🗺️'}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {allDone ? 'Mục Tiêu Hôm Nay Đã Hoàn Thành!' : 'Chặng Học Hôm Nay'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {allDone
                ? 'Bạn đã hoàn tất tất cả các chặng trong lộ trình. Hãy giữ vững phong độ!'
                : 'Hoàn thành từng bước để ghi nhận chuỗi ngày streak'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-black flex items-center gap-1.5">
            <Flame className="w-4 h-4 fill-current text-orange-500 animate-pulse" />
            <span>{streak} ngày streak</span>
          </div>
        </div>
      </div>

      {/* Progress Metric summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Từ mới hôm nay</span>
          <span className="text-sm sm:text-base font-black text-indigo-600 block mt-0.5">
            {newLearned} / {newTarget}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Đã ôn tập FSRS</span>
          <span className="text-sm sm:text-base font-black text-emerald-600 block mt-0.5">
            {reviewDone} thẻ
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tổng thẻ đã học</span>
          <span className="text-sm sm:text-base font-black text-slate-800 block mt-0.5">
            {status?.learned_cards ?? 0} / {status?.total_cards ?? 0}
          </span>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dự kiến hoàn thành</span>
          <span className="text-xs sm:text-sm font-black text-purple-600 block mt-1 truncate">
            {status?.estimated_completion_date || 'Đang tính...'}
          </span>
        </div>
      </div>

      {/* Steps Pipeline List */}
      <div className="space-y-2.5 pt-2">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Danh sách các chặng ({pipeline.filter(p => p.done).length}/{pipeline.length})
        </h4>

        {pipeline.map((step, idx) => {
          const isDone = step.done
          return (
            <div
              key={idx}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isDone
                  ? 'bg-emerald-50/40 border-emerald-200/70 text-slate-700'
                  : 'bg-white border-slate-200/80 hover:border-indigo-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : getStepIcon(step.type)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      Chặng {idx + 1}: {step.label}
                    </span>
                    {isDone && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                        Đã xong ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                    {step.type === 'new_cards' && `Học ${step.daily_count || 10} từ mới qua Flashcard`}
                    {step.type === 'mcq' && `Làm bài test trắc nghiệm (Đạt >= ${step.pass_threshold || 80}%)`}
                    {step.type === 'typing' && `Gõ chính xác từ vựng (Đạt >= ${step.pass_threshold || 80}%)`}
                    {step.type === 'fsrs_review' && `Ôn tập thẻ đến hạn theo FSRS v6`}
                  </span>
                </div>
              </div>

              {/* Action Link */}
              {!isDone ? (
                <Link
                  to={step.url || `/flashcard/${deckId}/play?mode=roadmap`}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                >
                  <span>Học ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  to={step.url || `/flashcard/${deckId}/play?mode=roadmap`}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shrink-0"
                >
                  Luyện lại
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DeckRoadmapPipelineCard
