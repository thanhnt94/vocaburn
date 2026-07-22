import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass, Target, Flame, Brain, ArrowRight, Play, CheckCircle2, Circle, Clock, Sparkles, BookOpen, Layers, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

export default function RoadmapHub() {
  const navigate = useNavigate()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['roadmap-global-decks'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/roadmap/decks')
      return res.data
    }
  })

  const decks: any[] = data?.decks || []
  const completedTodayCount = decks.filter(d => d.status?.stage_3_done).length
  const nextIncompleteDeck = decks.find(d => !d.status?.stage_3_done)

  const handleQuickContinue = () => {
    if (nextIncompleteDeck && nextIncompleteDeck.status?.next_action_url) {
      navigate(nextIncompleteDeck.status.next_action_url)
    } else if (decks.length > 0) {
      navigate(`/flashcard/${decks[0].deck_id}/roadmap`)
    } else {
      navigate('/library')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-6 pb-28 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Roadmap Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Lộ Trình Học Tập Hàng Ngày 🗺️
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Theo dõi tiến độ, hoàn thành bài kiểm tra và duy trì chuỗi Streak học tập mỗi ngày.
          </p>
        </div>

        {/* Quick Action Button */}
        {decks.length > 0 && (
          <button
            onClick={handleQuickContinue}
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Tiếp Tục Lộ Trình Nhanh 🚀</span>
          </button>
        )}
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block mb-1">Tiến Độ Hôm Nay</span>
            <div className="text-3xl font-black">{completedTodayCount} / {decks.length}</div>
            <p className="text-[11px] font-medium text-indigo-100 mt-1">
              {completedTodayCount === decks.length && decks.length > 0 ? '🎉 Hoàn thành xuất sắc tất cả!' : 'Đã đạt chỉ tiêu bài test hôm nay'}
            </p>
          </div>
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl font-black border border-white/20">
            🎯
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Khả Năng Ghi Nhớ Trung Bình</span>
            <div className="text-3xl font-black text-slate-800">
              {decks.length > 0
                ? `${Math.round(decks.reduce((acc, d) => acc + (d.status?.retention_rate || 0), 0) / decks.length)}%`
                : '—'}
            </div>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">
              🧠 Retention Rate tổng hợp
            </p>
          </div>
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Brain className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Chuỗi Streak Cao Nhất</span>
            <div className="text-3xl font-black text-orange-600 flex items-center gap-1">
              🔥 {Math.max(0, ...decks.map(d => d.status?.streak || 0))}d
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Duy trì đỗ bài test hàng ngày
            </p>
          </div>
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
            <Flame className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Main Roadmap Decks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Danh Sách Bộ Thẻ Đang Theo Lộ Trình ({decks.length})
          </h2>
          <Link to="/library" className="text-xs font-bold text-indigo-600 hover:underline">
            + Thêm lộ trình bộ thẻ mới
          </Link>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400">Đang tải trung tâm lộ trình...</p>
          </div>
        ) : decks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Chưa Có Lộ Trình Nào Đưa Vào</h3>
            <p className="text-slate-500 font-medium text-xs max-w-md mx-auto mb-6 leading-relaxed">
              Bạn chưa kích hoạt Lộ Trình cho bộ thẻ nào. Hãy chọn bộ thẻ từ thư viện để bắt đầu hành trình học 3 bước thông minh.
            </p>
            <Link
              to="/library"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-200 transition-all inline-block"
            >
              Vào Thư Viện Chọn Bộ Thẻ 📚
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {decks.map((item) => {
              const s = item.status || {}
              const isAllDone = s.stage_2_done

              return (
                <motion.div
                  key={item.deck_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Cover image or fallback */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.cover_image ? (
                        <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-7 h-7 text-indigo-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-slate-900 truncate tracking-tight">{item.title}</h3>
                        {isAllDone ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider flex-shrink-0 border border-emerald-100">
                            ✓ Hoàn thành hôm nay
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-wider flex-shrink-0 border border-amber-100">
                            Chưa hoàn thành
                          </span>
                        )}
                      </div>

                      {/* 2-Stage Progress Pills */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className={cn("px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border", s.stage_1_done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                          {s.stage_1_done ? '✓' : '1.'} Học từ mới ({s.new_learned_today}/{s.new_target_today})
                        </div>
                        <div className={cn("px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border", s.stage_2_done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200")}>
                          {s.stage_2_done ? '✓' : '2.'} Bài Test Roadmap (≥{s.roadmap_pass_threshold || 80}%)
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400">
                        <span>🔥 Streak: <strong className="text-orange-600">{s.streak || 0}d</strong></span>
                        <span>🧠 Retention: <strong className="text-indigo-600">{s.retention_rate || 0}%</strong></span>
                        <span>📅 Dự kiến xong: <strong className="text-slate-600">{s.estimated_completion_date || '—'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <Link
                      to={`/flashcard/${item.deck_id}/roadmap`}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                    >
                      Trang Lộ Trình 🗺️
                    </Link>

                    <button
                      onClick={() => navigate(s.next_action_url || `/flashcard/${item.deck_id}/roadmap`)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer",
                        isAllDone
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                      )}
                    >
                      <span>{s.next_action_label || 'Tiếp Tục'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
