import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ChevronLeft, Compass, Target, Flame, Brain, Play, CheckCircle2, Circle, Clock, 
  ArrowRight, Settings, RotateCcw, Sparkles, BookOpen, Layers, Lock, ShieldCheck,
  Plus, Trash2, ArrowUp, ArrowDown, Check, Trophy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

export type StepType = 'new_cards' | 'fsrs_review' | 'mcq' | 'typing'

export interface PipelineStep {
  type: StepType
  daily_count?: number
  overdue_hours?: number
  question_count?: number
  pass_threshold?: number
}

const STEP_META: Record<StepType, { title: string; icon: string; bg: string; color: string; desc: string }> = {
  new_cards: {
    title: 'Học Từ Mới',
    icon: '🎴',
    bg: 'bg-orange-50',
    color: 'text-orange-600',
    desc: 'Lật thẻ Flashcard để nạp từ mới'
  },
  fsrs_review: {
    title: 'Ôn Tập FSRS',
    icon: '🔄',
    bg: 'bg-indigo-50',
    color: 'text-indigo-600',
    desc: 'Ôn tập thẻ đến hạn theo thuật toán FSRS v6'
  },
  mcq: {
    title: 'Trắc Nghiệm MCQ',
    icon: '🎯',
    bg: 'bg-purple-50',
    color: 'text-purple-600',
    desc: 'Bài test trắc nghiệm chọn đáp án đúng'
  },
  typing: {
    title: 'Gõ Từ Vựng',
    icon: '⌨️',
    bg: 'bg-emerald-50',
    color: 'text-emerald-600',
    desc: 'Bài test gõ chính xác từ vựng'
  }
}

export default function DeckRoadmap() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    { type: 'new_cards', daily_count: 10 },
    { type: 'mcq', question_count: 15, pass_threshold: 80 },
    { type: 'fsrs_review', overdue_hours: 24 }
  ])
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isEditingPipeline, setIsEditingPipeline] = useState(false)

  // Fetch deck roadmap status
  const { data: status, isLoading: isStatusLoading, refetch } = useQuery({
    queryKey: ['deck-roadmap-status', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-status`)
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

  useEffect(() => {
    if (status && Array.isArray(status.pipeline) && status.pipeline.length > 0) {
      setPipeline(
        status.pipeline.map((st: any) => ({
          type: st.type,
          daily_count: st.daily_count,
          overdue_hours: st.overdue_hours,
          question_count: st.question_count,
          pass_threshold: st.pass_threshold
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
      setIsEditingPipeline(false)
    } catch (e) {
      console.error('Failed to save pipeline settings:', e)
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">Đang tải lộ trình bộ thẻ...</p>
        </div>
      </div>
    )
  }

  const s = status || {}
  const deckTitle = deckData?.title || `Bộ Thẻ #${id}`
  const processedPipeline = s.pipeline || []

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
                Custom Roadmap Pipeline V2
              </span>
              <button
                onClick={() => handleSavePipeline(!s.roadmap_active)}
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
              Dây chuyền luyện tập tuần tự tự xây dựng. Chỉ cần bấm 1 nút để tự động hoàn thành các bước trong ngày.
            </p>
          </div>

          {/* Header Action Button */}
          {s.roadmap_active && !s.all_done && (
            <button
              onClick={() => navigate(s.next_action_url || `/flashcard/${id}/play?mode=roadmap`)}
              className="px-6 py-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{s.next_action_label || 'Bắt Đầu Học'} 🚀</span>
            </button>
          )}

          {s.roadmap_active && s.all_done && (
            <div className="px-6 py-4 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Đã Hoàn Thành Ngày 🎉</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Completion Banner (if all steps done) ── */}
      {s.roadmap_active && s.all_done && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              🏆
            </div>
            <div>
              <h3 className="text-lg font-black">Chúc mừng! Bạn đã xong lộ trình hôm nay!</h3>
              <p className="text-xs text-emerald-100 font-semibold">Tất cả các bước trong pipeline đã được hoàn thành xuất sắc.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black bg-white/20 px-4 py-2 rounded-xl">
              🔥 Streak: {s.streak || 1} ngày
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Daily Progress Pipeline (Timeline) ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Tiến Độ Lộ Trình Hôm Nay ({s.current_step_index || 0}/{processedPipeline.length} Bước)
          </h2>
          
          <button
            onClick={() => setIsEditingPipeline(!isEditingPipeline)}
            className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isEditingPipeline ? 'Ẩn Trình Tùy Chỉnh' : 'Chỉnh Sửa Pipeline'}</span>
          </button>
        </div>

        {/* Dynamic Pipeline Steps Timeline */}
        {processedPipeline.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
            <p className="text-xs font-bold text-slate-400 mb-3">Chưa có bước nào trong pipeline lộ trình của bạn.</p>
            <button
              onClick={() => setIsEditingPipeline(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black"
            >
              Thêm Bước Đầu Tiên ➕
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {processedPipeline.map((step: any, idx: number) => {
              const meta = STEP_META[step.type as StepType] || STEP_META.new_cards
              const isCurrent = s.roadmap_active && idx === s.current_step_index && !s.all_done
              const isDone = step.done
              const isLocked = s.roadmap_active && idx > s.current_step_index && !s.all_done

              return (
                <div
                  key={idx}
                  className={cn(
                    "bg-white rounded-3xl p-5 border shadow-xs transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4",
                    isDone ? "border-emerald-200 bg-emerald-50/10" :
                    isCurrent ? "border-indigo-500 ring-4 ring-indigo-500/10" :
                    isLocked ? "border-slate-100 opacity-60" : "border-slate-100"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black shrink-0", meta.bg, meta.color)}>
                      {meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Bước {idx + 1}
                        </span>
                        {isDone && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black">✓ Hoàn thành</span>}
                        {isCurrent && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black animate-pulse">▶ Bước Hiện Tại</span>}
                        {isLocked && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black">🔒 Chưa mở khóa</span>}
                      </div>
                      <h3 className="text-sm font-black text-slate-900">{meta.title}</h3>
                      <p className="text-xs text-slate-500 font-semibold">{meta.desc}</p>
                    </div>
                  </div>

                  {/* Step Progress Stats & Action Button */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      {step.type === 'new_cards' && (
                        <div className="text-xs font-black text-slate-700">
                          {step.progress?.learned || 0} / {step.daily_count || 10} từ mới
                        </div>
                      )}
                      {step.type === 'fsrs_review' && (
                        <div className="text-xs font-black text-slate-700">
                          {step.progress?.reviewed_today || 0} / {step.progress?.due_count || 0} thẻ ôn tập
                        </div>
                      )}
                      {(step.type === 'mcq' || step.type === 'typing') && (
                        <div className="text-xs font-black text-slate-700">
                          Điểm cao nhất: <span className={isDone ? "text-emerald-600" : "text-amber-600"}>{step.progress?.best_score || 0}%</span> / {step.pass_threshold}%
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(step.url)}
                      disabled={isLocked}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                        isDone ? "bg-slate-100 text-slate-600 hover:bg-slate-200" :
                        isCurrent ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200" :
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

      {/* ── Pipeline Builder Panel (Inline Editor) ── */}
      <AnimatePresence>
        {isEditingPipeline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-white rounded-3xl p-6 border-2 border-indigo-500 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">🛠️ Trình Tùy Chỉnh Pipeline Lộ Trình</h3>
                <p className="text-xs font-semibold text-slate-500">Thêm, xóa và sắp xếp thứ tự các bước theo phong cách học cá nhân của bạn.</p>
              </div>

              <button
                onClick={() => handleSavePipeline(true)}
                disabled={isSavingSettings}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-all"
              >
                {isSavingSettings ? 'Đang Lưu...' : 'Lưu Pipeline 💾'}
              </button>
            </div>

            {/* Steps Re-orderable List */}
            <div className="space-y-3 mb-6">
              {pipeline.map((st, idx) => {
                const meta = STEP_META[st.type] || STEP_META.new_cards
                return (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-lg">{meta.icon}</span>
                      <span className="text-xs font-black text-slate-800">{meta.title}</span>
                    </div>

                    {/* Step Controls */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {st.type === 'new_cards' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400">Từ mới/ngày:</span>
                          <input
                            type="number" min="5" max="100" step="5"
                            value={st.daily_count || 10}
                            onChange={(e) => updateStepConfig(idx, 'daily_count', parseInt(e.target.value) || 10)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center"
                          />
                        </div>
                      )}

                      {st.type === 'fsrs_review' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400">Quá hạn (h):</span>
                          <input
                            type="number" min="1" max="168"
                            value={st.overdue_hours || 24}
                            onChange={(e) => updateStepConfig(idx, 'overdue_hours', parseInt(e.target.value) || 24)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center"
                          />
                        </div>
                      )}

                      {(st.type === 'mcq' || st.type === 'typing') && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400">Số câu:</span>
                            <input
                              type="number" min="5" max="50"
                              value={st.question_count || 15}
                              onChange={(e) => updateStepConfig(idx, 'question_count', parseInt(e.target.value) || 15)}
                              className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400">Ngưỡng đỗ:</span>
                            <input
                              type="number" min="50" max="100" step="5"
                              value={st.pass_threshold || 80}
                              onChange={(e) => updateStepConfig(idx, 'pass_threshold', parseInt(e.target.value) || 80)}
                              className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center"
                            />
                            <span className="text-xs font-black text-slate-500">%</span>
                          </div>
                        </div>
                      )}

                      {/* Move & Delete buttons */}
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                        <button
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === pipeline.length - 1}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeStep(idx)}
                          className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add Step Controls */}
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Thêm Bước Mới Vào Pipeline</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => addStep('new_cards')}
                  className="px-3.5 py-2 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 text-xs font-black flex items-center gap-1.5 hover:bg-orange-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>🎴 Học Từ Mới</span>
                </button>

                <button
                  onClick={() => addStep('fsrs_review')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>🔄 Ôn Tập FSRS</span>
                </button>

                {enabledModes.includes('mcq') && (
                  <button
                    onClick={() => addStep('mcq')}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black flex items-center gap-1.5 hover:bg-purple-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>🎯 Trắc Nghiệm MCQ</span>
                  </button>
                )}

                {enabledModes.includes('typing') && (
                  <button
                    onClick={() => addStep('typing')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1.5 hover:bg-emerald-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>⌨️ Gõ Từ Vựng</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Retention & Activity Analytics Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Brain className="w-4 h-4 text-emerald-600" />
              Chỉ Số Ghi Nhớ (Retention Rate)
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
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Dự kiến hoàn thành bộ thẻ</div>
            <div className="text-base font-black text-indigo-950">
              📅 {s.estimated_completion_date || 'Hoàn thành hôm nay!'}
            </div>
            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
              Còn ~{s.days_left || 0} ngày cho {s.unlearned_cards || 0} thẻ chưa học
            </div>
          </div>
        </div>

        {/* 7-Day Activity Map */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Flame className="w-4 h-4 text-orange-500" />
              Lịch Hoạt Động 7 Ngày Qua
            </h3>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {s.seven_days?.map((day: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black transition-all", day.active ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-400")}>
                    {day.active ? '✓' : '•'}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{day.day_name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
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
