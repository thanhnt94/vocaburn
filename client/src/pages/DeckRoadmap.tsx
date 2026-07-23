import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Compass, Target, Flame, Brain, Play, CheckCircle2, Circle, Clock, ArrowRight, Settings, RotateCcw, Sparkles, BookOpen, Layers, Lock, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

export default function DeckRoadmap() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [dailyNewInput, setDailyNewInput] = useState(10)
  const [passThresholdInput, setPassThresholdInput] = useState(80)
  const [roadmapTypeInput, setRoadmapTypeInput] = useState<'completion' | 'accumulation'>('completion')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Fetch deck roadmap status
  const { data: status, isLoading: isStatusLoading, refetch } = useQuery({
    queryKey: ['deck-roadmap-status', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-status`)
      return res.data
    },
    enabled: Boolean(id)
  })

  // Fetch deck basic details
  const { data: deckData } = useQuery({
    queryKey: ['deck-detail-basic', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/session`)
      return res.data
    },
    enabled: Boolean(id)
  })

  useEffect(() => {
    if (status) {
      setDailyNewInput(status.roadmap_daily_new || 10)
      setPassThresholdInput(status.roadmap_pass_threshold || 80)
      setRoadmapTypeInput(status.roadmap_type || 'completion')
    }
  }, [status])

  const queryClient = useQueryClient()
  const handleSaveRoadmapSettings = async (active = true, overrideType?: 'completion' | 'accumulation') => {
    try {
      setIsSavingSettings(true)
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        settings: {
          roadmap_active: active,
          roadmap_type: overrideType || roadmapTypeInput,
          roadmap_daily_new: dailyNewInput,
          roadmap_pass_threshold: passThresholdInput
        },
        is_creator: false
      })
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['roadmapDecks'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })
    } catch (e) {
      console.error("Failed to save roadmap settings:", e)
    } finally {
      setIsSavingSettings(false)
    }
  }

  if (isStatusLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">Đang tải trung tâm lộ trình bộ thẻ...</p>
        </div>
      </div>
    )
  }

  const s = status || {}
  const deckTitle = deckData?.title || `Bộ Thẻ #${id}`

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-6 pb-28 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(`/flashcard/${id}`)}
          className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-white border border-slate-200/70 px-3.5 py-2 rounded-xl shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Về Màn Chi Tiết Bộ Thẻ</span>
        </button>

        <Link
          to="/roadmap"
          className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:underline"
        >
          <Compass className="w-4 h-4" />
          <span>Tất Cả Lộ Trình</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-widest border border-indigo-400/30">
                Lộ Trình Học Tập Cá Nhân
              </span>
              <button
                onClick={() => handleSaveRoadmapSettings(!s.roadmap_active)}
                disabled={isSavingSettings}
                className={cn(
                  "px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer shadow-sm active:scale-95",
                  s.roadmap_active
                    ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/50"
                    : "bg-slate-700/60 text-slate-300 border-slate-500/50 hover:bg-slate-700"
                )}
                title="Bấm để bật/tắt Lộ trình cho bộ thẻ này"
              >
                {s.roadmap_active ? "✓ Đã Kích Hoạt (Bấm để Tắt)" : "🚫 Đã Tắt Lộ Trình (Bấm để Bật)"}
              </button>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              {deckTitle}
            </h1>
            <p className="text-slate-300 text-xs font-semibold max-w-xl leading-relaxed">
              Hành trình 2 bước thông minh giúp bạn tiếp thu từ mới nhanh chóng, ôn tập ngắt quãng FSRS và đánh giá khả năng ghi nhớ dài hạn.
            </p>
          </div>

          {/* Header Action Button */}
          {s.roadmap_active && (
            <button
              onClick={() => navigate(s.next_action_url || `/flashcard/${id}/play?mode=roadmap`)}
              className="px-6 py-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{s.next_action_label || 'Học Bước Tiếp Theo'} 🚀</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3-Stage Visual Journey ── */}
      <div className="mb-8">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Hành Trình Học Tập 2 Bước Hôm Nay
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stage 1: Flashcard Learn */}
          <div className={cn("bg-white rounded-3xl p-6 border shadow-sm relative overflow-hidden transition-all", s.stage_1_done ? "border-emerald-200" : (s.current_stage === 1 ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-slate-100"))}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bước 1</span>
              {s.stage_1_done ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">✓ Đã Hoàn Thành</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">Cần Thực Hiện</span>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl font-black mb-3">
              🎴
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">1. Học Từ Mới</h3>
            <p className="text-xs font-semibold text-slate-500 mb-4">Lật thẻ Flashcard để tiếp thu đủ chỉ tiêu số từ mới trong ngày.</p>
            <div className="flex items-center justify-between text-xs font-black pt-3 border-t border-slate-100">
              <span className="text-slate-400">Tiến độ hôm nay:</span>
              <span className="text-orange-600">{s.new_learned_today || 0} / {s.new_target_today || 10} từ</span>
            </div>
            <button
              onClick={() => navigate(`/flashcard/${id}/play?mode=roadmap`)}
              className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Vào Học Từ Mới 🚀
            </button>
          </div>

          {/* Stage 2: Roadmap Mixed Test (Only if MCQ is enabled and setup for deck) */}
          {s.has_mcq_setup !== false ? (
            <div className={cn("bg-white rounded-3xl p-6 border shadow-sm relative overflow-hidden transition-all", s.stage_2_done ? "border-emerald-200" : (s.current_stage === 2 ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-slate-100"))}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bước 2</span>
                {s.stage_2_done ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">🏆 Đã Đạt Streak</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase">Bài Test Ôn Tập & Đánh Giá</span>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-black mb-3">
                🎯
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">2. Bài Kiểm Tra Roadmap</h3>
              <p className="text-xs font-semibold text-slate-500 mb-4">Ôn tập từ mới hôm nay + từ cũ + từ quá hạn &gt;1 ngày. Đạt ≥{s.roadmap_pass_threshold || 80}% để giữ Streak.</p>
              <div className="flex items-center justify-between text-xs font-black pt-3 border-t border-slate-100">
                <span className="text-slate-400">Ngưỡng đỗ bài test:</span>
                <span className="text-emerald-600">≥ {s.roadmap_pass_threshold || 80}%</span>
              </div>
              <button
                onClick={() => {
                  if (!s.stage_1_done) {
                    alert("Bạn chưa hoàn thành Bước 1 (Học từ mới)! Vui lòng lật thẻ học hết số từ chỉ tiêu hôm nay trước khi vào làm Bài kiểm tra Roadmap.");
                    return;
                  }
                  navigate(`/practice/${id}/roadmap_test`);
                }}
                disabled={!s.stage_1_done}
                className={cn(
                  "w-full mt-4 py-3 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer",
                  s.stage_1_done
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-70"
                )}
                title={!s.stage_1_done ? "Hoàn thành Bước 1 để mở khóa Bài kiểm tra" : "Vào làm bài kiểm tra"}
              >
                {!s.stage_1_done ? "🔒 Cần Hoàn Thành Bước 1 Trực Tiếp" : "Vào Làm Bài Test 🎯"}
              </button>
            </div>
          ) : (
            <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chưa Bật Trắc Nghiệm</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black uppercase">Chưa Setup</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-200/60 text-slate-400 flex items-center justify-center text-xl font-black mb-3">
                  🔒
                </div>
                <h3 className="text-base font-black text-slate-700 mb-1">2. Bài Kiểm Tra MCQ (Tắt)</h3>
                <p className="text-xs font-semibold text-slate-400 mb-4">Tác giả bộ thẻ chưa cấu hình/bật chế độ trắc nghiệm (MCQ). Lộ trình hiện tại hoàn tất ngay sau khi bạn hoàn thành 100% mục tiêu Học từ mới Flashcard.</p>
              </div>
              <div className="pt-3 border-t border-slate-200/40">
                <span className="text-[11px] font-bold text-slate-400 italic">Lộ trình 1 bước duy nhất: Học từ mới</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Settings & Retention Analytics Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              Cài Đặt Mục Tiêu Lộ Trình
            </h3>
            <button
              onClick={() => handleSaveRoadmapSettings(!s.roadmap_active)}
              disabled={isSavingSettings}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm border active:scale-95",
                s.roadmap_active
                  ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              {s.roadmap_active ? '🚫 Tắt Lộ Trình Này' : '⚡ Kích Hoạt Lộ Trình'}
            </button>
          </div>

          <div className="space-y-6">
            {/* Roadmap Type Selector */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Loại Lộ Trình Học</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRoadmapTypeInput('completion')}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                    roadmapTypeInput === 'completion'
                      ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <span className="text-xs font-black block">📘 Hoàn Thành</span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block leading-tight">Có số thẻ cố định, dự tính ngày hoàn thành.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoadmapTypeInput('accumulation')}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                    roadmapTypeInput === 'accumulation'
                      ? "bg-amber-50/80 border-amber-300 text-amber-950 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <span className="text-xs font-black block">📈 Tích Lũy</span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block leading-tight">Nhập thêm thẻ mỗi ngày, không ngày kết thúc.</span>
                </button>
              </div>
            </div>

            {/* Target New Cards Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số thẻ mới mỗi ngày</label>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-full">{dailyNewInput} thẻ/ngày</span>
              </div>
              <input
                type="range" min="5" max="100" step="5"
                value={dailyNewInput}
                onChange={(e) => setDailyNewInput(parseInt(e.target.value) || 10)}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg mb-2"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 30, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDailyNewInput(val)}
                    className={cn("px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer border", dailyNewInput === val ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200")}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Pass Threshold Input */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngưỡng điểm đỗ bài test</label>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full">≥ {passThresholdInput}%</span>
              </div>
              <input
                type="range" min="50" max="100" step="5"
                value={passThresholdInput}
                onChange={(e) => setPassThresholdInput(parseInt(e.target.value) || 80)}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-100 rounded-lg mb-2"
              />
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                Cần đạt tối thiểu {passThresholdInput}% điểm bài test để tính Streak hôm nay.
              </p>
            </div>

            {/* Completion estimate */}
            {s.roadmap_type === 'accumulation' ? (
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60">
                <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">📈 Lộ Trình Tích Lũy Vô Tận</div>
                <div className="text-sm font-black text-amber-950">
                  Đã tích lũy: {s.total_cards || 0} thẻ vựng trong bộ
                </div>
                <div className="text-[10px] font-semibold text-amber-700/80 mt-0.5">
                  Mỗi ngày nhập thêm chỉ tiêu {s.roadmap_daily_new} từ mới để duy trì Streak.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Dự kiến hoàn thành toàn bộ</div>
                <div className="text-base font-black text-indigo-950">
                  📅 {s.estimated_completion_date || 'Hoàn thành hôm nay!'}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  Còn khoảng ~{s.days_left || 0} ngày nữa cho {s.unlearned_cards || 0} thẻ chưa học
                </div>
              </div>
            )}

            <button
              onClick={() => handleSaveRoadmapSettings(s.roadmap_active !== false)}
              disabled={isSavingSettings}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-200 transition-all cursor-pointer"
            >
              {isSavingSettings ? 'Đang Lưu...' : 'Lưu Thay Đổi Cài Đặt 💾'}
            </button>
          </div>
        </div>

        {/* Retention Analytics Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Brain className="w-4 h-4 text-emerald-600" />
              Chỉ Số Khả Năng Ghi Nhớ (Retention Rate)
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tỷ Lệ Đúng Trung Bình</span>
                <span className="text-3xl font-black text-indigo-600">{s.retention_rate || 0}%</span>
                <span className="text-[9px] font-bold text-slate-400 block mt-1">10 bài test gần nhất</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Chuỗi Streak</span>
                <span className="text-3xl font-black text-orange-600">🔥 {s.streak || 0}d</span>
                <span className="text-[9px] font-bold text-slate-400 block mt-1">Đã đỗ bài test</span>
              </div>
            </div>

            {/* 7-Day activity heatmap */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Lịch Hoạt Động 7 Ngày Qua</span>
              <div className="grid grid-cols-7 gap-2">
                {s.seven_days?.map((day: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all", day.active ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-200 text-slate-400")}>
                      {day.active ? '✓' : '•'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{day.day_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to={`/flashcard/${id}`}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Về Trang Chi Tiết Bộ Thẻ 📚
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
