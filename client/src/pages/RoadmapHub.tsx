import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass, Target, Flame, Brain, ArrowRight, Play, CheckCircle2, Circle, Clock, Sparkles, BookOpen, Layers, RotateCcw, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { TelegramRoadmapReminderToggle } from '@/components/TelegramRoadmapReminderToggle'

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
  const completedTodayCount = decks.filter(d => d.status?.all_done).length
  const nextIncompleteDeck = decks.find(d => !d.status?.all_done)

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
    <>
      {/* 📱 MOBILE-FIRST APP LAYOUT (< md) */}
      <div className="md:hidden fixed inset-0 top-0 bottom-[60px] flex flex-col bg-slate-100/70 overflow-hidden z-[90]">
        
        {/* ═══════════ STICKY TOP CONTAINER (Header + Stats Grid) ═══════════ */}
        <div className="bg-white border-b border-slate-200/80 shrink-0 z-30 shadow-xs">
          {/* Top Header */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-orange-500 flex items-center justify-center text-white shadow-sm">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 leading-none">Trung Tâm Lộ Trình 🗺️</h1>
                <span className="text-[9px] font-bold text-slate-400">Pipeline luyện tập hàng ngày</span>
              </div>
            </div>

            <Link
              to="/library"
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-[11px] flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
              title="Thêm lộ trình bộ thẻ mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm bộ thẻ</span>
            </Link>
          </div>

          {/* Fixed 3-Column Vibrant Stats Cards */}
          <div className="px-3.5 pb-3 pt-1">
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Today Progress Card */}
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-2xl p-2.5 shadow-sm shadow-indigo-500/20 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest block mb-0.5">Tiến độ</span>
                <span className="text-base font-black text-white leading-none">{completedTodayCount}/{decks.length}</span>
                <span className="text-[8px] font-bold text-indigo-200 block mt-0.5">hôm nay</span>
              </div>

              {/* Retention Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-2.5 shadow-sm shadow-emerald-500/20 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-emerald-200 uppercase tracking-widest block mb-0.5">Ghi nhớ</span>
                <span className="text-base font-black text-white leading-none">
                  {decks.length > 0
                    ? `${Math.round(decks.reduce((acc, d) => acc + (d.status?.retention_rate || 0), 0) / decks.length)}%`
                    : '—'}
                </span>
                <span className="text-[8px] font-bold text-emerald-200 block mt-0.5">Retention</span>
              </div>

              {/* Streak Card */}
              <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white rounded-2xl p-2.5 shadow-sm shadow-orange-500/20 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-orange-100 uppercase tracking-widest block mb-0.5">Streak</span>
                <span className="text-base font-black text-white leading-none flex items-center gap-0.5">
                  🔥 {Math.max(0, ...decks.map(d => d.status?.streak || 0))}d
                </span>
                <span className="text-[8px] font-bold text-orange-100 block mt-0.5">cao nhất</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ SCROLLABLE DECKS LIST ═══════════ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Lộ Trình Của Bạn ({decks.length})
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Đang tải Lộ Trình...</p>
            </div>
          ) : decks.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 text-center border border-slate-200 shadow-2xs">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800 mb-1">Chưa Kích Hoạt Lộ Trình</h3>
              <p className="text-slate-500 font-medium text-[11px] mb-4 leading-relaxed">
                Chọn bộ thẻ từ thư viện để thiết lập pipeline luyện tập hàng ngày.
              </p>
              <Link
                to="/library"
                className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm inline-block"
              >
                Vào Thư Viện 📚
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {decks.map(item => {
                const s = item.status || {}
                const isAllDone = s.all_done
                const pipeline: any[] = s.pipeline || []

                return (
                  <div
                    key={item.deck_id}
                    className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className={cn(
                      "h-1 absolute top-0 inset-x-0",
                      isAllDone ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500"
                    )} />

                    {/* Header: Cover + Title + Badge */}
                    <div className="flex items-start gap-3 pt-0.5">
                      <div className="w-13 h-13 rounded-2xl border bg-gradient-to-br from-indigo-50 via-purple-50 to-orange-50 border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-indigo-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <h3 className="text-xs font-black text-slate-900 truncate tracking-tight">{item.title}</h3>
                          {isAllDone ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider shrink-0 border border-emerald-300 shadow-2xs">
                              ✓ Xong
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-wider shrink-0 border border-rose-300 shadow-2xs">
                              B{s.current_step_index + 1}/{pipeline.length}
                            </span>
                          )}
                        </div>

                        {/* Pipeline Step Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pipeline.map((st: any, idx: number) => {
                            const isCurrent = idx === s.current_step_index && !isAllDone
                            const isDone = st.done
                            return (
                              <span
                                key={idx}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all border",
                                  isDone
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                                    : isCurrent
                                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-xs animate-pulse"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                )}
                              >
                                {isDone ? '✓' : `${idx + 1}.`} {st.label}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Action Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-[9px] font-black shadow-2xs">
                          🔥 {s.streak || 0}d
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[9px] font-black shadow-2xs">
                          🧠 {s.retention_rate || 0}%
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[9px] font-black shadow-2xs">
                          📚 Còn {s.unlearned_cards || 0} thẻ
                        </span>
                      </div>

                      <Link
                        to={`/flashcard/${item.deck_id}/roadmap`}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0"
                      >
                        <span>LỘ TRÌNH</span>
                        <Compass className="w-3 h-3 text-amber-400" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        {decks.length > 0 && (
          <div className="p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shrink-0 z-30 shadow-lg">
            <button
              onClick={handleQuickContinue}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-200 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Tiếp Tục Lộ Trình Nhanh 🚀</span>
            </button>
          </div>
        )}
      </div>

      {/* 💻 DESKTOP LAYOUT (>= md) */}
      <div className="hidden md:block min-h-screen bg-[#F8FAFC] pt-6 pb-28 px-4 md:px-8 max-w-6xl mx-auto">
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
              Theo dõi tiến độ pipeline tùy biến, hoàn thành bài kiểm tra và duy trì chuỗi Streak mỗi ngày.
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
                {completedTodayCount === decks.length && decks.length > 0 ? '🎉 Hoàn thành xuất sắc tất cả!' : 'Đã đạt chỉ tiêu pipeline hôm nay'}
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
                Duy trì bài test hàng ngày
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
                Bạn chưa kích hoạt Lộ Trình cho bộ thẻ nào. Hãy chọn bộ thẻ từ thư viện để thiết lập pipeline luyện tập tự động.
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
                const isAllDone = s.all_done
                const pipeline: any[] = s.pipeline || []

                return (
                  <motion.div
                    key={item.deck_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 rounded-2xl border bg-gradient-to-br from-indigo-50 to-purple-50 border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-7 h-7 text-indigo-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-black text-slate-900 truncate tracking-tight">{item.title}</h3>
                          
                          {/* Status Badge */}
                          {isAllDone ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider flex-shrink-0 border border-emerald-100">
                              ✓ Xong hôm nay
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-wider flex-shrink-0 border border-rose-100">
                              Bước {s.current_step_index + 1}/{pipeline.length}
                            </span>
                          )}
                        </div>

                        {/* Pipeline Progress Steps */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {pipeline.map((step: any, idx: number) => (
                            <div
                              key={idx}
                              className={cn(
                                "px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border",
                                step.done ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                idx === s.current_step_index ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse" :
                                "bg-slate-50 text-slate-400 border-slate-200"
                              )}
                            >
                              {step.done ? '✓' : `${idx + 1}.`} {step.label}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400 flex-wrap">
                          <span title="Chuỗi ngày hoàn thành 100% nhiệm vụ bộ thẻ">🎯 Streak bộ thẻ: <strong className="text-orange-600">{s.streak || 0}d</strong></span>
                          <span>🧠 Retention: <strong className="text-indigo-600">{s.retention_rate || 0}%</strong></span>
                          <span>📅 Dự kiến xong: <strong className="text-slate-600">{s.estimated_completion_date || '—'}</strong></span>
                          <span>📚 Còn lại: <strong className="text-slate-600">{s.unlearned_cards || 0} thẻ</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <Link
                        to={`/flashcard/${item.deck_id}/roadmap`}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                      >
                        Cài Đặt 🗺️
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
    </>
  )
}
