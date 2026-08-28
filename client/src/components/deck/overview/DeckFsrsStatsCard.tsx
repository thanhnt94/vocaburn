import React from 'react'
import { Award, Brain, Clock, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

export interface FsrsMasteryStats {
  total: number
  new_count?: number
  learning_count?: number
  review_count?: number
  mastered_count?: number
  due_count?: number
  avg_stability?: number
  avg_difficulty?: number
  retention_rate?: number
}

export interface DeckFsrsStatsCardProps {
  stats: FsrsMasteryStats | null
  isLoading?: boolean
  totalCards: number
}

export function DeckFsrsStatsCard({ stats, isLoading, totalCards }: DeckFsrsStatsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-4">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-8 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  const total = totalCards || stats?.total || 0
  const due = stats?.due_count ?? 0
  const learning = stats?.learning_count ?? 0
  const mastered = stats?.mastered_count ?? 0
  const newCount = stats?.new_count ?? Math.max(0, total - (learning + mastered))
  
  const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0
  const learningPct = total > 0 ? Math.round((learning / total) * 100) : 0
  const newPct = total > 0 ? Math.max(0, 100 - (masteredPct + learningPct)) : 100

  const retention = stats?.retention_rate ? Math.round(stats.retention_rate * 100) : null
  const stability = stats?.avg_stability ? stats.avg_stability.toFixed(1) : null

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
              Chỉ Số Trí Nhớ FSRS v6
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Phân bố trạng thái ghi nhớ bộ thẻ
            </p>
          </div>
        </div>

        {due > 0 ? (
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-black flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>{due} thẻ cần ôn</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-black flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã ôn hết</span>
          </span>
        )}
      </div>

      {/* Progress Multi-Bar */}
      <div className="mb-4">
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${masteredPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Đã thuộc: ${mastered} (${masteredPct}%)`}
          />
          <div
            style={{ width: `${learningPct}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Đang học: ${learning} (${learningPct}%)`}
          />
          <div
            style={{ width: `${newPct}%` }}
            className="bg-slate-200 h-full transition-all duration-500"
            title={`Chưa học: ${newCount} (${newPct}%)`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-2 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Đã thuộc: <strong className="text-slate-800">{mastered}</strong> ({masteredPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Đang học: <strong className="text-slate-800">{learning}</strong> ({learningPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Mới: <strong className="text-slate-800">{newCount}</strong>
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Cần Ôn Tập
          </span>
          <span className="text-lg font-black text-amber-600 block mt-0.5">
            {due} <span className="text-xs text-slate-400 font-bold">thẻ</span>
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Độ Ổn Định
          </span>
          <span className="text-lg font-black text-indigo-600 block mt-0.5">
            {stability ? `${stability}d` : '--'}
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Tỷ Lệ Giữ Nhớ
          </span>
          <span className="text-lg font-black text-emerald-600 block mt-0.5">
            {retention !== null ? `${retention}%` : '--'}
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Tổng Thẻ
          </span>
          <span className="text-lg font-black text-slate-800 block mt-0.5">
            {total} <span className="text-xs text-slate-400 font-bold">thẻ</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default DeckFsrsStatsCard
