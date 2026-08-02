import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ChevronLeft, Compass, Target, Flame, Brain, Play, CheckCircle2, Circle, Clock, 
  ArrowRight, Settings, RotateCcw, Sparkles, BookOpen, Layers, Lock, ShieldCheck,
  Plus, Trash2, ArrowUp, ArrowDown, Check, Trophy, Calendar, BarChart3, History,
  Zap, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight, Star
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
      const originalPipeline = (status?.pipeline || []).map((st: any) => ({
        type: st.type,
        daily_count: st.daily_count,
        overdue_hours: st.overdue_hours,
        question_count: st.question_count,
        pass_threshold: st.pass_threshold,
        target_minutes: st.target_minutes
      }))

      const hasChanged = JSON.stringify(pipeline) !== JSON.stringify(originalPipeline)
      if (hasChanged) {
        // Smart diff check
        const changeType = detectChangeType(originalPipeline, pipeline)
        if (changeType === 'downgrade') {
          if (!window.confirm("⚠️ Hạ cấp Pipeline!\n\nBạn đang giảm mục tiêu hoặc xóa bước. Tiến độ lộ trình hôm nay sẽ được RESET.\n\nBạn có chắc chắn muốn lưu không?")) {
            return
          }
        } else if (changeType === 'upgrade') {
          if (!window.confirm("✅ Nâng cấp Pipeline!\n\nBạn đang thêm bước hoặc tăng mục tiêu. Tiến độ hiện tại được GIỮ NGUYÊN, pipeline mới áp dụng từ ngày mai.\n\nBạn có muốn lưu không?")) {
            return
          }
        }
      }

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
    } catch (e) {
      console.error('Failed to save pipeline settings:', e)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const detectChangeType = (oldP: PipelineStep[], newP: PipelineStep[]): string => {
    if (!oldP || oldP.length === 0) return 'initial'
    const oldTypes = oldP.map(s => s.type)
    const newTypes = newP.map(s => s.type)
    
    // Check removals
    const oldCounts: Record<string, number> = {}
    oldTypes.forEach(t => oldCounts[t] = (oldCounts[t] || 0) + 1)
    const newCounts: Record<string, number> = {}
    newTypes.forEach(t => newCounts[t] = (newCounts[t] || 0) + 1)
    
    for (const [t, c] of Object.entries(oldCounts)) {
      if ((newCounts[t] || 0) < c) return 'downgrade'
    }
    
    const fields = ['daily_count', 'question_count', 'pass_threshold', 'target_minutes', 'overdue_hours'] as const
    for (const os of oldP) {
      const ns = newP.find(s => s.type === os.type)
      if (!ns) return 'downgrade'
      for (const f of fields) {
        const ov = os[f as keyof PipelineStep] as number | undefined
        const nv = ns[f as keyof PipelineStep] as number | undefined
        if (ov != null && nv != null && nv < ov) return 'downgrade'
      }
    }
    
    for (const [t, c] of Object.entries(newCounts)) {
      if (c > (oldCounts[t] || 0)) return 'upgrade'
    }
    for (const ns of newP) {
      const os = oldP.find(s => s.type === ns.type)
      if (!os) return 'upgrade'
      for (const f of fields) {
        const ov = os[f as keyof PipelineStep] as number | undefined
        const nv = ns[f as keyof PipelineStep] as number | undefined
        if (ov != null && nv != null && nv > ov) return 'upgrade'
      }
    }
    
    return 'reorder'
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
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-slate-400">Đang tải lộ trình bộ thẻ...</p>
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
    <div className="min-h-screen bg-[#0B0F1A] pb-28">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 px-4 md:px-8 pt-6 pb-8 max-w-6xl mx-auto">
          {/* Top Nav */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(`/flashcard/${id}`)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 backdrop-blur border border-white/10 px-3.5 py-2 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Về Bộ Thẻ</span>
            </button>

            <Link
              to="/roadmap"
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Tất Cả Lộ Trình</span>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer active:scale-95 bg-slate-700/40 text-slate-400 border-slate-500/30 hover:bg-slate-700/60"
                  >
                    🚫 Đã Tắt
                  </button>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
                {status?.deck_title || deckTitle}
              </h1>
              <p className="text-slate-400 text-xs font-medium max-w-xl leading-relaxed mb-4">
                Dây chuyền luyện tập tuần tự — tự động theo dõi và đánh giá tiến độ mỗi ngày.
              </p>

              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Chuỗi Streak</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span className="text-orange-500">🔥</span>
                    {s.streak || 0} ngày
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Tiến độ thẻ</div>
                  <div className="text-sm font-black text-white">
                    <span className="text-indigo-400">{s.learned_cards || 0}</span> <span className="text-slate-500">/ {s.total_cards || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Ring + Action Button */}
            <div className="flex items-center gap-5">
              {/* Progress Ring */}
              <div className="relative w-20 h-20 hidden md:flex">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
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
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#a78bfa" />
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
                  className="px-6 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{s.next_action_label || 'Bắt Đầu Học'} 🚀</span>
                </button>
              )}

              {s.roadmap_active && s.all_done && (
                <div className="px-6 py-4 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Đã Hoàn Thành 🎉</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TAB BAR ═══════════ */}
      <div className="sticky top-0 z-30 bg-[#0B0F1A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap gap-2 py-3">
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
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-400/30"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ TAB CONTENT ═══════════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
        <AnimatePresence mode="wait">
          {/* ─── TAB 1: HÔM NAY ─── */}
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Historical Date Notice */}
              {selectedDate && selectedDate !== new Date().toISOString().split('T')[0] && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-500">Dữ liệu quá khứ</h3>
                      <p className="text-xs text-amber-500/80">Bạn đang xem tiến độ của ngày <strong>{selectedDate}</strong>.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-xs font-black transition"
                  >
                    Về hôm nay
                  </button>
                </div>
              )}

              {/* Completion Banner */}
              {s.roadmap_active && s.all_done && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl">
                      🏆
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-emerald-300">Chúc mừng! Lộ trình hôm nay đã hoàn thành!</h3>
                      <p className="text-xs text-emerald-400/70 font-medium">
                        Tất cả các bước đã được hoàn thành xuất sắc
                        {s.completion_time_today && ` vào lúc ${s.completion_time_today}`}.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-xl border border-emerald-400/20">
                    🔥 Streak: {s.streak || 1} ngày
                  </span>
                </motion.div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-2xl p-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tiến độ</div>
                  <div className="text-2xl font-black text-white">{completedSteps}/{totalSteps}</div>
                  <div className="text-[10px] font-medium text-slate-500">bước hoàn thành</div>
                </div>
                <div className="bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-2xl p-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Thời gian</div>
                  <div className="text-2xl font-black text-white">{s.today_total_study_minutes || 0}<span className="text-sm text-slate-500 ml-1">phút</span></div>
                  <div className="text-[10px] font-medium text-slate-500">học thực tế hôm nay</div>
                </div>
                <div className="bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-2xl p-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Streak</div>
                  <div className="text-2xl font-black text-orange-400">🔥 {s.streak || 0}</div>
                  <div className="text-[10px] font-medium text-slate-500">ngày liên tiếp</div>
                </div>
                <div className="bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-2xl p-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Từ mới</div>
                  <div className="text-2xl font-black text-white">{s.today_activity?.new_learned || 0}</div>
                  <div className="text-[10px] font-medium text-slate-500">từ nạp hôm nay</div>
                </div>
              </div>

              {/* Pipeline Timeline */}
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-indigo-400" />
                Pipeline Hôm Nay
              </h2>

              {processedPipeline.length === 0 ? (
                <div className="bg-white/[0.03] rounded-2xl p-8 border border-white/[0.06] text-center">
                  <p className="text-xs font-bold text-slate-500 mb-3">Chưa có bước nào trong pipeline.</p>
                  <button
                    onClick={() => setActiveTab('config')}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer"
                  >
                    Thiết Lập Pipeline ➕
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {processedPipeline.map((step: any, idx: number) => {
                    const meta = STEP_META[step.type as StepType] || STEP_META.new_cards
                    const isCurrent = s.roadmap_active && idx === s.current_step_index && !s.all_done
                    const isDone = step.done
                    const isLocked = s.roadmap_active && idx > s.current_step_index && !s.all_done

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={cn(
                          "bg-white/[0.03] backdrop-blur rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4",
                          isDone ? "border-emerald-500/20" :
                          isCurrent ? "border-indigo-500/40 ring-2 ring-indigo-500/10" :
                          isLocked ? "border-white/[0.04] opacity-50" : "border-white/[0.06]"
                        )}
                      >
                        {/* Left glow for current */}
                        {isCurrent && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full" />
                        )}
                        {isDone && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
                        )}

                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black shrink-0",
                            isDone ? "bg-emerald-500/15" :
                            isCurrent ? `bg-gradient-to-br ${meta.gradient} shadow-lg` :
                            "bg-white/[0.06]"
                          )}>
                            {isDone ? <Check className="w-5 h-5 text-emerald-400" /> : <span>{meta.icon}</span>}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Bước {idx + 1}
                              </span>
                              {isDone && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-black">✓ Hoàn thành</span>}
                              {isCurrent && <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black animate-pulse">▶ Đang thực hiện</span>}
                              {isLocked && <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-500 text-[9px] font-black">🔒 Chưa mở</span>}
                            </div>
                            <h3 className="text-sm font-black text-white">{meta.title}</h3>
                            <p className="text-xs text-slate-500 font-medium">{meta.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                          <div className="text-right">
                            {step.type === 'new_cards' && (
                              <div className="text-xs font-black text-slate-300">
                                {step.progress?.learned || 0} / {step.daily_count || 10} <span className="text-slate-500">từ mới</span>
                              </div>
                            )}
                            {step.type === 'fsrs_review' && (
                              <div className="text-xs font-black text-slate-300">
                                {step.done ? (
                                  <>Đã ôn: <span className="text-emerald-400">{step.progress?.reviewed_today || 0}</span> <span className="text-slate-500">thẻ</span></>
                                ) : (
                                  <>Còn: {step.progress?.due_count || 0} <span className="text-slate-500">thẻ (đã ôn {step.progress?.reviewed_today || 0})</span></>
                                )}
                              </div>
                            )}
                            {(step.type === 'mcq' || step.type === 'typing') && (
                              <div className="text-xs font-black text-slate-300">
                                Điểm: <span className={isDone ? "text-emerald-400" : "text-amber-400"}>{step.progress?.best_score || 0}%</span> / {step.pass_threshold}%
                              </div>
                            )}
                            {step.type === 'study_time' && (
                              <div className="text-xs font-black text-slate-300">
                                <span className={isDone ? "text-emerald-400" : "text-blue-400"}>{step.progress?.studied_minutes || 0}</span> / {step.target_minutes || 10} <span className="text-slate-500">phút</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => navigate(step.url)}
                            disabled={isLocked}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                              isDone ? "bg-white/[0.06] text-slate-400 hover:bg-white/10" :
                              isCurrent ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20" :
                              "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                            )}
                          >
                            {isDone ? 'Luyện Lại' : isCurrent ? 'Thực Hiện 🚀' : 'Khóa 🔒'}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── TAB 2: LỊCH SỬ ─── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Calendar Heatmap */}
              <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/[0.06] mb-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Lịch Hoạt Động
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-300 min-w-[120px] text-center capitalize">{calendarMonthLabel}</span>
                    <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day of week headers */}
                <div className="max-w-md mx-auto">
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                      <div key={d} className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Empty cells for offset */}
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
                              ? day.completion_percent >= 150
                                ? "bg-emerald-600/70 text-emerald-200 hover:bg-emerald-600/80 shadow-[0_0_8px_rgba(5,150,105,0.3)] ring-1 ring-emerald-500/50"
                                : day.completion_percent >= 100
                                  ? "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40"
                                  : day.completion_percent >= 50
                                    ? "bg-indigo-500/25 text-indigo-300 hover:bg-indigo-500/35"
                                    : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                              : "bg-white/[0.02] text-slate-600 hover:bg-white/[0.06]",
                            isSelected && "ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#0B0F1A]",
                            isToday && "border border-indigo-500/40"
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
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-white/[0.02] border border-white/5" />
                    <span className="text-[9px] font-bold text-slate-600">Nghỉ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-indigo-500/10" />
                    <span className="text-[9px] font-bold text-slate-600">Ít</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-indigo-500/25" />
                    <span className="text-[9px] font-bold text-slate-600">Trung bình</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/30" />
                    <span className="text-[9px] font-bold text-slate-600">Hoàn thành</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-600/70 ring-1 ring-emerald-500/50" />
                    <span className="text-[9px] font-bold text-emerald-600/80">Vượt chỉ tiêu</span>
                  </div>
                  {calendarData && (
                    <span className="text-[10px] font-bold text-slate-500 ml-2">
                      {calendarData.total_active_days} ngày · {calendarData.total_study_minutes} phút
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline Changelog */}
              <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/[0.06]">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-5">
                  <History className="w-4 h-4 text-purple-400" />
                  Lịch Sử Thay Đổi Pipeline
                </h3>

                {pipelineHistory.length === 0 ? (
                  <p className="text-xs font-medium text-slate-500 text-center py-6">Chưa có lịch sử thay đổi pipeline nào.</p>
                ) : (
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[18px] top-3 bottom-3 w-px bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-transparent" />
                    
                    <div className="space-y-4">
                      {pipelineHistory.map((item: any, idx: number) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative pl-10"
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute left-2.5 top-3 w-3.5 h-3.5 rounded-full border-2 z-10",
                            item.change_type === 'upgrade' ? "bg-emerald-500/30 border-emerald-500" :
                            item.change_type === 'downgrade' ? "bg-rose-500/30 border-rose-500" :
                            item.change_type === 'initial' ? "bg-indigo-500/30 border-indigo-500" :
                            "bg-amber-500/30 border-amber-500"
                          )} />
                          
                          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                                item.change_type === 'upgrade' ? "bg-emerald-500/15 text-emerald-400" :
                                item.change_type === 'downgrade' ? "bg-rose-500/15 text-rose-400" :
                                item.change_type === 'initial' ? "bg-indigo-500/15 text-indigo-400" :
                                "bg-amber-500/15 text-amber-400"
                              )}>
                                {item.change_type === 'upgrade' ? '↑ Nâng cấp' :
                                 item.change_type === 'downgrade' ? '↓ Hạ cấp' :
                                 item.change_type === 'initial' ? '★ Khởi tạo' :
                                 '↔ Sắp xếp'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500">
                                {item.changed_at ? new Date(item.changed_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-400 mb-1">{item.change_summary}</p>
                            <div className="text-[10px] font-bold text-slate-600">
                              📅 {item.effective_from} → {item.effective_until || 'Đang áp dụng'}
                            </div>
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-400" />
                      Trình Tùy Chỉnh Pipeline
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Thêm, xóa và sắp xếp thứ tự các bước theo phong cách học cá nhân.</p>
                  </div>

                  <button
                    onClick={() => handleSavePipeline(true)}
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer transition-all active:scale-95"
                  >
                    {isSavingSettings ? 'Đang Lưu...' : 'Lưu Pipeline 💾'}
                  </button>
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-6">
                  {pipeline.map((st, idx) => {
                    const meta = STEP_META[st.type] || STEP_META.new_cards
                    return (
                      <div key={idx} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-300 text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-lg">{meta.icon}</span>
                          <span className="text-xs font-black text-white">{meta.title}</span>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          {st.type === 'new_cards' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500">Từ mới/ngày:</span>
                              <input
                                type="number" min="5" max="100" step="5"
                                value={st.daily_count || 10}
                                onChange={(e) => updateStepConfig(idx, 'daily_count', parseInt(e.target.value) || 10)}
                                className="w-16 px-2 py-1 bg-white/[0.06] border border-white/10 rounded-lg text-xs font-black text-white text-center focus:ring-2 focus:ring-indigo-500/30 outline-none"
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
                                className="w-16 px-2 py-1 bg-white/[0.06] border border-white/10 rounded-lg text-xs font-black text-white text-center focus:ring-2 focus:ring-indigo-500/30 outline-none"
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
                                className="w-16 px-2 py-1 bg-white/[0.06] border border-white/10 rounded-lg text-xs font-black text-white text-center focus:ring-2 focus:ring-indigo-500/30 outline-none"
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
                                  className="w-14 px-2 py-1 bg-white/[0.06] border border-white/10 rounded-lg text-xs font-black text-white text-center focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-500">Ngưỡng:</span>
                                <input
                                  type="number" min="50" max="100" step="5"
                                  value={st.pass_threshold || 80}
                                  onChange={(e) => updateStepConfig(idx, 'pass_threshold', parseInt(e.target.value) || 80)}
                                  className="w-14 px-2 py-1 bg-white/[0.06] border border-white/10 rounded-lg text-xs font-black text-white text-center focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                />
                                <span className="text-xs font-black text-slate-500">%</span>
                              </div>
                            </div>
                          )}

                          {/* Move & Delete */}
                          <div className="flex items-center gap-1 border-l border-white/[0.06] pl-3">
                            <button
                              onClick={() => moveStep(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer transition"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveStep(idx, 'down')}
                              disabled={idx === pipeline.length - 1}
                              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer transition"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeStep(idx)}
                              className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Step */}
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Thêm Bước Mới</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { type: 'new_cards' as StepType, emoji: '🎴', label: 'Học Từ Mới', color: 'orange' },
                      { type: 'fsrs_review' as StepType, emoji: '🔄', label: 'Ôn Tập FSRS', color: 'indigo' },
                      { type: 'study_time' as StepType, emoji: '⏱️', label: 'Thời Gian Học', color: 'blue' },
                    ].map(item => (
                      <button
                        key={item.type}
                        onClick={() => addStep(item.type)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]",
                          `bg-${item.color}-500/10 text-${item.color}-400 border-${item.color}-500/20 hover:bg-${item.color}-500/20`
                        )}
                        style={{
                          background: `rgba(var(--color-${item.color}), 0.1)`,
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{item.emoji} {item.label}</span>
                      </button>
                    ))}

                    {enabledModes.includes('mcq') && (
                      <button
                        onClick={() => addStep('mcq')}
                        className="px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-black flex items-center gap-1.5 hover:bg-purple-500/20 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>🎯 Trắc Nghiệm MCQ</span>
                      </button>
                    )}

                    {enabledModes.includes('typing') && (
                      <button
                        onClick={() => addStep('typing')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black flex items-center gap-1.5 hover:bg-emerald-500/20 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>⌨️ Gõ Từ Vựng</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── TAB 4: THỐNG KÊ ─── */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Retention Rate */}
                <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/[0.06]">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Brain className="w-4 h-4 text-emerald-400" />
                    Chỉ Số Ghi Nhớ
                  </h3>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
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
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#2dd4bf" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-white">{s.retention_rate || 0}%</span>
                        <span className="text-[9px] font-bold text-slate-500">Retention</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 text-center">Tỷ lệ đúng trung bình từ 10 bài test gần nhất</p>
                </div>

                {/* Streak & Progress */}
                <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/[0.06]">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Chuỗi & Tiến Độ
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] text-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Streak</span>
                      <span className="text-3xl font-black text-orange-400">🔥 {s.streak || 0}</span>
                      <span className="text-[9px] font-bold text-slate-500 block mt-1">ngày liên tiếp</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] text-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Đã học</span>
                      <span className="text-3xl font-black text-indigo-400">{s.learned_cards || 0}</span>
                      <span className="text-[9px] font-bold text-slate-500 block mt-1">/ {s.total_cards || 0} thẻ</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tiến độ bộ thẻ</span>
                      <span className="text-xs font-black text-slate-300">
                        {s.total_cards ? Math.round(((s.learned_cards || 0) / s.total_cards) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.total_cards ? Math.round(((s.learned_cards || 0) / s.total_cards) * 100) : 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Estimated completion */}
                  <div className="p-4 bg-indigo-500/[0.06] rounded-xl border border-indigo-500/10">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Dự kiến hoàn thành</div>
                    <div className="text-sm font-black text-white">
                      📅 {s.estimated_completion_date || 'Đã hoàn thành!'}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                      Còn ~{s.days_left || 0} ngày cho {s.unlearned_cards || 0} thẻ chưa học
                    </div>
                  </div>
                </div>

                {/* Today's Activity Detail */}
                <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/[0.06] md:col-span-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-blue-400" />
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
                      <div key={item.label} className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] text-center">
                        <div className="text-lg mb-1">{item.emoji}</div>
                        <div className="text-xl font-black text-white">{item.value}</div>
                        <div className="text-[9px] font-bold text-slate-500">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
