import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ChevronLeft, Compass, Target, Flame, Brain, Play, CheckCircle2, Circle, Clock, 
  ArrowRight, Settings, RotateCcw, Sparkles, BookOpen, Layers, Lock, ShieldCheck,
  Plus, Trash2, ArrowUp, ArrowDown, Check, Trophy, Calendar, BarChart3, History,
  Zap, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight, Star, User, Users, Medal, Crown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

export type StepType = 'new_cards' | 'fsrs_review' | 'mcq' | 'typing' | 'study_time'

export interface PipelineStep {
  type: StepType
  daily_count?: number
  overdue_hours?: number
  question_count?: number
  pass_threshold?: number
  target_minutes?: number
}

const STEP_META: Record<StepType, { title: string; icon: string; gradient: string; color: string; desc: string; ring: string }> = {
  new_cards: {
    title: 'Học Từ Mới',
    icon: '🎴',
    gradient: 'from-orange-500 to-amber-500',
    color: 'text-orange-500',
    desc: 'Lật thẻ Flashcard để nạp từ mới',
    ring: 'ring-orange-500/20'
  },
  fsrs_review: {
    title: 'Ôn Tập FSRS',
    icon: '🔄',
    gradient: 'from-indigo-500 to-blue-500',
    color: 'text-indigo-500',
    desc: 'Ôn tập thẻ đến hạn theo thuật toán FSRS v6',
    ring: 'ring-indigo-500/20'
  },
  mcq: {
    title: 'Trắc Nghiệm MCQ',
    icon: '🎯',
    gradient: 'from-purple-500 to-fuchsia-500',
    color: 'text-purple-500',
    desc: 'Bài test trắc nghiệm chọn đáp án đúng',
    ring: 'ring-purple-500/20'
  },
  typing: {
    title: 'Gõ Từ Vựng',
    icon: '⌨️',
    gradient: 'from-emerald-500 to-teal-500',
    color: 'text-emerald-500',
    desc: 'Bài test gõ chính xác từ vựng',
    ring: 'ring-emerald-500/20'
  },
  study_time: {
    title: 'Thời Gian Học',
    icon: '⏱️',
    gradient: 'from-blue-500 to-cyan-500',
    color: 'text-blue-500',
    desc: 'Tích lũy tổng thời gian học trong ngày',
    ring: 'ring-blue-500/20'
  }
}

const TABS = [
  { id: 'today', label: 'Hôm Nay', icon: Zap },
  { id: 'history', label: 'Lịch Sử', icon: History },
  { id: 'config', label: 'Cấu Hình', icon: Settings },
  { id: 'stats', label: 'Thống Kê', icon: BarChart3 },
] as const

type TabId = typeof TABS[number]['id']

export default function DeckRoadmap() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = (searchParams.get('tab') as TabId) || 'today'
  const setActiveTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: true })
  }

  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    { type: 'new_cards', daily_count: 10 },
    { type: 'mcq', question_count: 15, pass_threshold: 80 },
    { type: 'fsrs_review', overdue_hours: 24 },
    { type: 'study_time', target_minutes: 10 }
  ])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Fetch deck roadmap status
  const { data: status, isLoading: isStatusLoading, refetch } = useQuery({
    queryKey: ['deck-roadmap-status', id, selectedDate || 'today'],
    queryFn: async () => {
      const url = selectedDate 
        ? `/api/v1/deck/${id}/roadmap-status?target_date=${selectedDate}`
        : `/api/v1/deck/${id}/roadmap-status`
      const res = await axios.get(url)
      return res.data
    },
    enabled: Boolean(id)
  })

  // Fetch deck session & enabled practice modes
  const { data: deckData } = useQuery({
    queryKey: ['deck-detail-basic', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/session`)
      return res.data
    },
    enabled: Boolean(id)
  })

  // Fetch calendar heatmap
  const { data: calendarData } = useQuery({
    queryKey: ['deck-roadmap-calendar', id, calendarMonth],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-calendar?month=${calendarMonth}`)
      return res.data
    },
    enabled: Boolean(id) && activeTab === 'history'
  })

  // Fetch pipeline history
  const { data: historyData } = useQuery({
    queryKey: ['deck-roadmap-pipeline-history', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-pipeline-history`)
      return res.data
    },
    enabled: Boolean(id) && activeTab === 'history'
  })

  // Fetch deck leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ['deck-leaderboard', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/leaderboard`)
      return res.data?.leaderboard || []
    },
    enabled: Boolean(id) && activeTab === 'stats'
  })

  useEffect(() => {
    if (status && Array.isArray(status.pipeline) && status.pipeline.length > 0) {
      setPipeline(
        status.pipeline.map((st: any) => ({
          type: st.type,
          daily_count: st.daily_count,
          overdue_hours: st.overdue_hours,
          question_count: st.question_count,
          pass_threshold: st.pass_threshold,
          target_minutes: st.target_minutes
        }))
      )
    }
  }, [status])

  const enabledModes: string[] = deckData?.enabled_practice_modes || ['mcq', 'typing']

  const handleSavePipeline = async (active = true) => {
    try {
      setIsSavingSettings(true)
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        settings: {
          roadmap_active: active,
          pipeline: pipeline
        },
        is_creator: false
      })
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['roadmapDecks'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })
      queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status', Number(id)] })
      queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status', id] })
      queryClient.invalidateQueries({ queryKey: ['deck-roadmap-pipeline-history', id] })
    } catch (err) {
      console.error("Failed to save pipeline settings", err)
      alert("⚠️ Không thể lưu cấu hình pipeline. Vui lòng thử lại!")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const addStep = (type: StepType) => {
    let newStep: PipelineStep = { type }
    if (type === 'new_cards') newStep.daily_count = 10
    else if (type === 'fsrs_review') newStep.overdue_hours = 24
    else if (type === 'mcq') { newStep.question_count = 15; newStep.pass_threshold = 80 }
    else if (type === 'typing') { newStep.question_count = 10; newStep.pass_threshold = 70 }
    else if (type === 'study_time') { newStep.target_minutes = 10 }
    setPipeline([...pipeline, newStep])
  }

  const removeStep = (index: number) => {
    setPipeline(pipeline.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= pipeline.length) return
    const updated = [...pipeline]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIdx, 0, moved)
    setPipeline(updated)
  }

  const updateStepConfig = (index: number, field: string, value: number) => {
    const updated = [...pipeline]
    updated[index] = { ...updated[index], [field]: value }
    setPipeline(updated)
  }

  if (isStatusLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-slate-500">Đang tải lộ trình bộ thẻ...</p>
        </div>
      </div>
    )
  }

  const s = status || {}
  const deckTitle = deckData?.deck?.title || deckData?.title || `Bộ Thẻ #${id}`
  const processedPipeline = s.pipeline || []

  // Calendar helpers
  const calendarDays = calendarData?.days || []
  const calendarMonthDate = new Date(calendarMonth + '-01')
  const calendarMonthLabel = calendarMonthDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  
  const prevMonth = () => {
    const d = new Date(calendarMonth + '-01')
    d.setMonth(d.getMonth() - 1)
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(calendarMonth + '-01')
    d.setMonth(d.getMonth() + 1)
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const pipelineHistory = historyData?.history || []

  // Progress percentage for the ring
  const completedSteps = processedPipeline.filter((st: any) => st.done).length
  const totalSteps = processedPipeline.length || 1
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 text-slate-900 font-sans">
      
      {/* ═══════════ TOP CONTAINER ═══════════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 sm:pt-6">
        
        {/* Top Nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(`/flashcard/${id}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Về Bộ Thẻ</span>
          </button>

          <Link
            to="/roadmap"
            className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Tất Cả Lộ Trình</span>
          </Link>
        </div>

        {/* ═══════════ HERO HEADER CARD (SLATE LUXURY CARD) ═══════════ */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xl mb-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-70 h-70 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {s.roadmap_active && (
                  <button
                    onClick={() => handleSavePipeline(false)}
                    disabled={isSavingSettings}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer active:scale-95 bg-emerald-500/20 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/30"
                  >
                    ✓ Đang Hoạt Động
                  </button>
                )}
                {!s.roadmap_active && (
                  <button
                    onClick={() => handleSavePipeline(true)}
                    disabled={isSavingSettings}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer active:scale-95 bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    🚫 Đã Tắt
                  </button>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                {status?.deck_title || deckTitle}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-xl leading-relaxed mb-5">
                Dây chuyền luyện tập tuần tự — tự động theo dõi và đánh giá tiến độ mỗi ngày.
              </p>

              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Chuỗi Streak</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span className="text-orange-400">🔥</span>
                    {s.streak || 0} ngày
                  </div>
                </div>
                <div className="w-px h-8 bg-white/15" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Tiến độ thẻ</div>
                  <div className="text-sm font-black text-white">
                    <span className="text-amber-400">{s.learned_cards || 0}</span> <span className="text-slate-400">/ {s.total_cards || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Ring + Action Button */}
            <div className="flex items-center gap-5">
              {/* Progress Ring */}
              <div className="relative w-20 h-20 hidden md:flex">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <circle 
                    cx="40" cy="40" r="34" fill="none" 
                    stroke="url(#progressGrad)" strokeWidth="6" 
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-white">{progressPercent}%</span>
                </div>
              </div>

              {/* CTA Button */}
              {s.roadmap_active && !s.all_done && (
                <button
                  onClick={() => navigate(s.next_action_url || `/flashcard/${id}/play?mode=roadmap`)}
                  className="px-6 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{s.next_action_label || 'HỌC TỪ MỚI'} 🚀</span>
                </button>
              )}

              {s.roadmap_active && s.all_done && (
                <div className="px-6 py-4 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Đã Hoàn Thành 🎉</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ SEGMENTED TAB BAR (STRICT SINGLE ROW, NO WRAP) ═══════════ */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-200/70 backdrop-blur-md rounded-2xl border border-slate-300/50 mb-6 shadow-inner">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'today') {
                    setSelectedDate(null)
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-white text-slate-900 shadow-md border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0", isActive ? "text-orange-500" : "text-slate-400")} />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ═══════════ TAB CONTENT ═══════════ */}
        <AnimatePresence mode="wait">
          
          {/* ─── TAB 1: HÔM NAY ─── */}
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Historical Date Notice */}
              {selectedDate && selectedDate !== new Date().toISOString().split('T')[0] && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">Dữ liệu quá khứ</h3>
                      <p className="text-xs text-amber-700">Bạn đang xem tiến độ của ngày <strong>{selectedDate}</strong>.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-black transition shadow-xs hover:bg-amber-700 cursor-pointer"
                  >
                    Về hôm nay
                  </button>
                </div>
              )}

              {/* Completion Banner */}
              {s.roadmap_active && s.all_done && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl border border-emerald-200/80 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-md">
                      🏆
                    </div>
                    <div>
                      <h3 className="text-base font-black text-emerald-900">Chúc mừng! Lộ trình hôm nay đã hoàn thành!</h3>
                      <p className="text-xs text-emerald-700 font-medium">
                        Tất cả các bước đã được hoàn thành xuất sắc
                        {s.completion_time_today && ` vào lúc ${s.completion_time_today}`}.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-200 shrink-0">
                    🔥 Streak: {s.streak || 1} ngày
                  </span>
                </motion.div>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiến độ</div>
                  <div className="text-2xl font-black text-slate-900">{completedSteps}/{totalSteps}</div>
                  <div className="text-[10px] font-bold text-slate-500">bước hoàn thành</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian</div>
                  <div className="text-2xl font-black text-slate-900">{s.today_total_study_minutes || 0}<span className="text-xs text-slate-400 ml-1">phút</span></div>
                  <div className="text-[10px] font-bold text-slate-500">học thực tế hôm nay</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Streak</div>
                  <div className="text-2xl font-black text-orange-500">🔥 {s.streak || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500">ngày liên tiếp</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Từ mới</div>
                  <div className="text-2xl font-black text-indigo-600">{s.today_activity?.new_learned || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500">từ nạp hôm nay</div>
                </div>
              </div>

              {/* Pipeline Steps List */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-500" />
                  Dây Chuyền Hôm Nay (Pipeline)
                </h3>

                {processedPipeline.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium py-8 text-center">Chưa có bước nào trong pipeline. Hãy sang tab Cấu hình để thiết lập.</p>
                ) : (
                  <div className="space-y-3">
                    {processedPipeline.map((step: any, idx: number) => {
                      const meta = STEP_META[step.type as StepType] || STEP_META.new_cards
                      const isDone = step.done
                      const isCurrent = idx === s.current_step_index && !s.all_done
                      const isLocked = idx > s.current_step_index && !s.all_done

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative",
                            isDone ? "bg-emerald-50/40 border-emerald-200/80" :
                            isCurrent ? "bg-white border-orange-300 ring-2 ring-orange-500/15 shadow-md" :
                            "bg-slate-50 border-slate-200/60 opacity-75"
                          )}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={cn(
                              "w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-2xs",
                              isDone ? "bg-emerald-100 text-emerald-700" :
                              isCurrent ? `bg-gradient-to-br ${meta.gradient} text-white shadow-sm` :
                              "bg-slate-200 text-slate-400"
                            )}>
                              {isDone ? <Check className="w-5 h-5 text-emerald-700 stroke-[3]" /> : <span>{meta.icon}</span>}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  Bước {idx + 1}
                                </span>
                                {isDone && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black">✓ Đã xong</span>}
                                {isCurrent && <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase tracking-wide shadow-2xs">Cần làm</span>}
                                {isLocked && <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-bold">🔒 Khóa</span>}
                              </div>
                              <h4 className="text-sm font-black text-slate-900 truncate">{meta.title}</h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                            <div className="text-right">
                              {step.type === 'new_cards' && (
                                <div className="text-xs font-black text-slate-800">
                                  <span className="text-orange-600">{step.progress?.learned || 0}</span> / {step.daily_count || 10} <span className="text-slate-400 font-semibold text-xs">từ mới</span>
                                </div>
                              )}
                              {step.type === 'fsrs_review' && (
                                <div className="text-xs font-black text-slate-800">
                                  {step.done ? (
                                    <>Đã ôn: <span className="text-emerald-600">{step.progress?.reviewed_today || 0}</span> <span className="text-slate-400 font-semibold text-xs">thẻ</span></>
                                  ) : (
                                    <>Còn: {step.progress?.due_count || 0} <span className="text-slate-400 font-semibold text-xs">thẻ (đã ôn {step.progress?.reviewed_today || 0})</span></>
                                  )}
                                </div>
                              )}
                              {(step.type === 'mcq' || step.type === 'typing') && (
                                <div className="text-xs font-black text-slate-800">
                                  Điểm: <span className={isDone ? "text-emerald-600" : "text-orange-600"}>{step.progress?.best_score || 0}%</span> / {step.pass_threshold}%
                                </div>
                              )}
                              {step.type === 'study_time' && (
                                <div className="text-xs font-black text-slate-800">
                                  <span className={isDone ? "text-emerald-600" : "text-indigo-600"}>{step.progress?.studied_minutes || 0}</span> / {step.target_minutes || 10} <span className="text-slate-400 font-semibold text-xs">phút</span>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => navigate(step.url)}
                              disabled={isLocked}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0",
                                isDone ? "bg-slate-100 text-slate-600 hover:bg-slate-200" :
                                isCurrent ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md hover:from-orange-600 hover:to-amber-600 active:scale-95" :
                                "bg-slate-100 text-slate-400 cursor-not-allowed"
                              )}
                            >
                              {isDone ? 'Luyện Lại' : isCurrent ? 'Thực Hiện 🚀' : 'Khóa 🔒'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── TAB 2: LỊCH SỬ ─── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Calendar Heatmap */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Lịch Hoạt Động
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-800 min-w-[120px] text-center capitalize">{calendarMonthLabel}</span>
                    <button onClick={nextMonth} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-w-md mx-auto">
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                      <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.length > 0 && Array.from({ length: calendarDays[0]?.day_of_week || 0 }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {calendarDays.map((day: any) => {
                      const isSelected = selectedDate === day.date
                      const isToday = day.date === new Date().toISOString().split('T')[0]
                      return (
                        <button
                          key={day.date}
                          onClick={() => {
                            setSelectedDate(day.date)
                            setActiveTab('today')
                          }}
                          className={cn(
                            "aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all cursor-pointer relative",
                            day.active
                              ? day.completion_percent >= 100
                                ? "bg-emerald-500 text-white shadow-xs font-black"
                                : "bg-orange-100 text-orange-800 font-bold"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200",
                            isSelected && "ring-2 ring-orange-500 ring-offset-1",
                            isToday && "border-2 border-indigo-500"
                          )}
                          title={`${day.date}: ${day.study_minutes} phút, ${day.answer_count} câu trả lời`}
                        >
                          {parseInt(day.date.split('-')[2])}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                    <span className="text-[10px] font-bold text-slate-500">Nghỉ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-100" />
                    <span className="text-[10px] font-bold text-slate-500">Đang học</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500">Hoàn thành</span>
                  </div>
                  {calendarData && (
                    <span className="text-[10px] font-black text-slate-600 ml-2">
                      {calendarData.total_active_days} ngày · {calendarData.total_study_minutes} phút
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline Changelog */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-5">
                  <History className="w-4 h-4 text-purple-600" />
                  Lịch Sử Thay Đổi Pipeline
                </h3>

                {pipelineHistory.length === 0 ? (
                  <p className="text-xs font-medium text-slate-500 text-center py-6">Chưa có lịch sử thay đổi pipeline nào.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[18px] top-3 bottom-3 w-px bg-slate-200" />
                    
                    <div className="space-y-4">
                      {pipelineHistory.map((item: any, idx: number) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="relative pl-10"
                        >
                          <div className={cn(
                            "absolute left-2.5 top-3 w-3.5 h-3.5 rounded-full border-2 z-10",
                            item.change_type === 'upgrade' ? "bg-emerald-500 border-emerald-600" :
                            item.change_type === 'downgrade' ? "bg-rose-500 border-rose-600" :
                            "bg-indigo-500 border-indigo-600"
                          )} />
                          
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                                item.change_type === 'upgrade' ? "bg-emerald-100 text-emerald-800" :
                                item.change_type === 'downgrade' ? "bg-rose-100 text-rose-800" :
                                "bg-indigo-100 text-indigo-800"
                              )}>
                                {item.change_type === 'upgrade' ? '↑ Nâng cấp' :
                                 item.change_type === 'downgrade' ? '↓ Hạ cấp' :
                                 '★ Cấu hình'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {item.changed_at ? new Date(item.changed_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 mb-1">{item.change_summary}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── TAB 3: CẤU HÌNH ─── */}
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-600" />
                      Trình Tùy Chỉnh Pipeline
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Thêm, xóa và sắp xếp thứ tự các bước theo phong cách học cá nhân.</p>
                  </div>

                  <button
                    onClick={() => handleSavePipeline(true)}
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    {isSavingSettings ? 'Đang Lưu...' : 'Lưu Pipeline 💾'}
                  </button>
                </div>

                {/* Steps Config List */}
                <div className="space-y-3 mb-6">
                  {pipeline.map((st, idx) => {
                    const meta = STEP_META[st.type] || STEP_META.new_cards
                    return (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-lg">{meta.icon}</span>
                          <span className="text-xs font-black text-slate-900">{meta.title}</span>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          {st.type === 'new_cards' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">Từ mới/ngày:</span>
                              <input
                                type="number" min="5" max="100" step="5"
                                value={st.daily_count || 10}
                                onChange={(e) => updateStepConfig(idx, 'daily_count', parseInt(e.target.value) || 10)}
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </div>
                          )}

                          {st.type === 'fsrs_review' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">Quá hạn (h):</span>
                              <input
                                type="number" min="1" max="168"
                                value={st.overdue_hours || 24}
                                onChange={(e) => updateStepConfig(idx, 'overdue_hours', parseInt(e.target.value) || 24)}
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </div>
                          )}

                          {st.type === 'study_time' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">Mục tiêu (phút):</span>
                              <input
                                type="number" min="1" max="180" step="1"
                                value={st.target_minutes || 10}
                                onChange={(e) => updateStepConfig(idx, 'target_minutes', parseInt(e.target.value) || 10)}
                                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </div>
                          )}

                          {(st.type === 'mcq' || st.type === 'typing') && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-500">Số câu:</span>
                                <input
                                  type="number" min="5" max="50"
                                  value={st.question_count || 15}
                                  onChange={(e) => updateStepConfig(idx, 'question_count', parseInt(e.target.value) || 15)}
                                  className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-500">Ngưỡng:</span>
                                <input
                                  type="number" min="50" max="100" step="5"
                                  value={st.pass_threshold || 80}
                                  onChange={(e) => updateStepConfig(idx, 'pass_threshold', parseInt(e.target.value) || 80)}
                                  className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <span className="text-xs font-black text-slate-500">%</span>
                              </div>
                            </div>
                          )}

                          {/* Move & Delete */}
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                            <button
                              onClick={() => moveStep(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveStep(idx, 'down')}
                              disabled={idx === pipeline.length - 1}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeStep(idx)}
                              className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Step Buttons */}
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Thêm Bước Mới</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { type: 'new_cards' as StepType, emoji: '🎴', label: 'Học Từ Mới', color: 'orange' },
                      { type: 'fsrs_review' as StepType, emoji: '🔄', label: 'Ôn Tập FSRS', color: 'indigo' },
                      { type: 'study_time' as StepType, emoji: '⏱️', label: 'Thời Gian Học', color: 'blue' },
                    ].map(item => (
                      <button
                        key={item.type}
                        onClick={() => addStep(item.type)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Plus className="w-3.5 h-3.5 text-orange-500" />
                        <span>{item.emoji} {item.label}</span>
                      </button>
                    ))}

                    {enabledModes.includes('mcq') && (
                      <button
                        onClick={() => addStep('mcq')}
                        className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-purple-600" />
                        <span>🎯 Trắc Nghiệm MCQ</span>
                      </button>
                    )}

                    {enabledModes.includes('typing') && (
                      <button
                        onClick={() => addStep('typing')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>⌨️ Gõ Từ Vựng</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── TAB 4: THỐNG KÊ & BẢNG XẾP HẠNG ─── */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Top Stats Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Retention Rate */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Brain className="w-4 h-4 text-emerald-600" />
                    Chỉ Số Ghi Nhớ
                  </h3>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <circle 
                          cx="60" cy="60" r="50" fill="none" 
                          stroke="url(#retentionGrad)" strokeWidth="10" 
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - (s.retention_rate || 0) / 100)}`}
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="retentionGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-slate-900">{s.retention_rate || 0}%</span>
                        <span className="text-[9px] font-bold text-slate-400">Retention</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 text-center">Tỷ lệ đúng trung bình từ 10 bài test gần nhất</p>
                </div>

                {/* Streak & Progress */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Chuỗi & Tiến Độ
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Streak</span>
                      <span className="text-3xl font-black text-orange-500">🔥 {s.streak || 0}</span>
                      <span className="text-[9px] font-bold text-slate-500 block mt-1">ngày liên tiếp</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Đã học</span>
                      <span className="text-3xl font-black text-indigo-600">{s.learned_cards || 0}</span>
                      <span className="text-[9px] font-bold text-slate-500 block mt-1">/ {s.total_cards || 0} thẻ</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ bộ thẻ</span>
                      <span className="text-xs font-black text-slate-700">
                        {s.total_cards ? Math.round(((s.learned_cards || 0) / s.total_cards) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.total_cards ? Math.round(((s.learned_cards || 0) / s.total_cards) * 100) : 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Estimated completion */}
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <div className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Dự kiến hoàn thành</div>
                    <div className="text-sm font-black text-orange-950">
                      📅 {s.estimated_completion_date || 'Đã hoàn thành!'}
                    </div>
                    <div className="text-[10px] font-medium text-orange-700 mt-0.5">
                      Còn ~{s.days_left || 0} ngày cho {s.unlearned_cards || 0} thẻ chưa học
                    </div>
                  </div>
                </div>
              </div>

              {/* 🏆 DECK LEADERBOARD (BẢNG XẾP HẠNG NGƯỜI HỌC BỘ THẺ) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Bảng Xếp Hạng Người Học Bộ Thẻ
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Danh sách học viên đang cùng chinh phục bộ thẻ này.</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold shrink-0">
                    Top 20 Học Viên
                  </span>
                </div>

                {!leaderboard || leaderboard.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">Chưa có ai khác học bộ thẻ này.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((item: any) => {
                      const isTop3 = item.rank <= 3
                      return (
                        <div
                          key={item.user_id}
                          className={cn(
                            "p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                            item.is_current_user
                              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20"
                              : "bg-slate-50/80 border-slate-200/60 hover:bg-slate-100/80"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank badge */}
                            <div className={cn(
                              "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs",
                              item.rank === 1 ? "bg-amber-400 text-amber-950" :
                              item.rank === 2 ? "bg-slate-300 text-slate-900" :
                              item.rank === 3 ? "bg-amber-700 text-amber-50" :
                              "bg-slate-200 text-slate-600"
                            )}>
                              {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                            </div>

                            {/* User Avatar & Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                                {item.avatar ? (
                                  <img src={item.avatar} alt={item.username} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{item.username}</span>
                                  {item.is_current_user && (
                                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[9px] font-black rounded-md">Bạn</span>
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">
                                  🔥 {item.streak || 0} ngày streak
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-slate-900">
                              <span className="text-orange-600">{item.learned_cards || 0}</span> <span className="text-slate-400 font-semibold text-[10px]">thẻ đã thuộc</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400">
                              {item.xp || 0} XP tích lũy
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Today's Activity Detail */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Chi Tiết Hoạt Động Hôm Nay
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Từ mới nạp', value: s.today_activity?.new_learned || 0, unit: 'từ', emoji: '🎴' },
                    { label: 'Thẻ ôn tập', value: s.today_activity?.reviewed || 0, unit: 'thẻ', emoji: '🔄' },
                    { label: 'Lượt test MCQ', value: s.today_activity?.mcq_attempts || 0, unit: 'lượt', emoji: '🎯' },
                    { label: 'Lượt gõ từ', value: s.today_activity?.typing_attempts || 0, unit: 'lượt', emoji: '⌨️' },
                    { label: 'Tổng trả lời', value: s.today_activity?.answers_count || 0, unit: 'lượt', emoji: '📝' },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-center">
                      <div className="text-lg mb-1">{item.emoji}</div>
                      <div className="text-xl font-black text-slate-900">{item.value}</div>
                      <div className="text-[9px] font-bold text-slate-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
