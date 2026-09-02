import React, { useState, useEffect } from 'react'
import {
  Save,
  Compass,
  Sparkles,
  Plus,
  Trash2,
  Check,
  ArrowUp,
  ArrowDown,
  BookOpen,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Clock,
  HelpCircle
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export type StepType = 'new_cards' | 'mcq' | 'typing' | 'fsrs_review' | 'study_time'

export interface PipelineStepConfig {
  id: string
  type: StepType
  daily_count?: number
  question_count?: number
  pass_threshold?: number
  overdue_hours?: number
  target_minutes?: number
}

export interface DeckRoadmapGoalFormProps {
  deckId: string | number
  status?: any
  initialSettings?: any
  onSaved?: () => void
}

const STEP_META: Record<StepType, { icon: string; label: string; desc: string; color: string; badgeBg: string }> = {
  new_cards: {
    icon: '🎴',
    label: 'Học Từ Mới',
    desc: 'Học từ vựng mới chưa học qua Flashcard',
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700'
  },
  mcq: {
    icon: '🎯',
    label: 'Trắc Nghiệm (MCQ Quiz)',
    desc: 'Luyện phản xạ chọn 4 đáp án đúng',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 border-rose-200 text-rose-700'
  },
  typing: {
    icon: '⌨️',
    label: 'Gõ Từ (Typing Test)',
    desc: 'Luyện nhớ chính xác mặt chữ bằng cách gõ lại',
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 border-purple-200 text-purple-700'
  },
  fsrs_review: {
    icon: '🔄',
    label: 'Ôn Tập FSRS v6',
    desc: 'Ôn tập thẻ theo thuật toán ngắt quãng FSRS v6',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-700'
  },
  study_time: {
    icon: '⏱️',
    label: 'Thời Gian Học',
    desc: 'Đạt thời lượng tập trung tối thiểu trong ngày',
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700'
  }
}

const PRESETS: { name: string; icon: string; desc: string; steps: PipelineStepConfig[] }[] = [
  {
    name: 'Tiêu Chuẩn',
    icon: '⚡',
    desc: 'Từ mới ➔ MCQ Quiz ➔ Ôn FSRS',
    steps: [
      { id: 'p1', type: 'new_cards', daily_count: 20 },
      { id: 'p2', type: 'mcq', question_count: 20, pass_threshold: 80 },
      { id: 'p3', type: 'fsrs_review', overdue_hours: 24 }
    ]
  },
  {
    name: 'Luyện Gõ Từ',
    icon: '⌨️',
    desc: 'Từ mới ➔ Gõ từ vựng ➔ Ôn FSRS',
    steps: [
      { id: 'p1', type: 'new_cards', daily_count: 15 },
      { id: 'p2', type: 'typing', question_count: 15, pass_threshold: 80 },
      { id: 'p3', type: 'fsrs_review', overdue_hours: 24 }
    ]
  },
  {
    name: 'Toàn Diện',
    icon: '🚀',
    desc: 'Từ mới ➔ MCQ ➔ Gõ từ ➔ Ôn FSRS',
    steps: [
      { id: 'p1', type: 'new_cards', daily_count: 20 },
      { id: 'p2', type: 'mcq', question_count: 20, pass_threshold: 80 },
      { id: 'p3', type: 'typing', question_count: 20, pass_threshold: 80 },
      { id: 'p4', type: 'fsrs_review', overdue_hours: 24 }
    ]
  },
  {
    name: 'Chỉ Ôn Tập',
    icon: '🔄',
    desc: 'Chỉ tập trung ôn thẻ đến hạn FSRS',
    steps: [
      { id: 'p1', type: 'fsrs_review', overdue_hours: 24 }
    ]
  }
]

export function DeckRoadmapGoalForm({
  deckId,
  status,
  initialSettings,
  onSaved
}: DeckRoadmapGoalFormProps) {
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState<boolean>(true)
  const [steps, setSteps] = useState<PipelineStepConfig[]>([
    { id: 's1', type: 'new_cards', daily_count: 20 },
    { id: 's2', type: 'mcq', question_count: 20, pass_threshold: 80 },
    { id: 's3', type: 'fsrs_review', overdue_hours: 24 }
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize from status or initialSettings
  useEffect(() => {
    // 1. Prefer status from roadmap-status API
    if (status) {
      if (status.roadmap_active !== undefined) {
        setIsActive(Boolean(status.roadmap_active))
      }
      if (Array.isArray(status.pipeline) && status.pipeline.length > 0) {
        const loaded: PipelineStepConfig[] = status.pipeline.map((p: any, idx: number) => ({
          id: `step-${idx}-${Date.now()}`,
          type: (p.type in STEP_META ? p.type : 'new_cards') as StepType,
          daily_count: p.daily_count ?? p.progress?.target ?? 20,
          question_count: p.question_count ?? 20,
          pass_threshold: p.pass_threshold ?? 80,
          overdue_hours: p.overdue_hours !== undefined ? Number(p.overdue_hours) : 24,
          target_minutes: p.target_minutes ?? 15
        }))
        setSteps(loaded)
        return
      }
    }

    // 2. Fallback to initialSettings
    if (initialSettings) {
      if (initialSettings.roadmap_active !== undefined) {
        setIsActive(Boolean(initialSettings.roadmap_active))
      }
      if (Array.isArray(initialSettings.pipeline) && initialSettings.pipeline.length > 0) {
        const loaded: PipelineStepConfig[] = initialSettings.pipeline.map((p: any, idx: number) => ({
          id: `step-${idx}-${Date.now()}`,
          type: (p.type in STEP_META ? p.type : 'new_cards') as StepType,
          daily_count: p.daily_count ?? 20,
          question_count: p.question_count ?? 20,
          pass_threshold: p.pass_threshold ?? 80,
          overdue_hours: p.overdue_hours !== undefined ? Number(p.overdue_hours) : 24,
          target_minutes: p.target_minutes ?? 15
        }))
        setSteps(loaded)
      }
    }
  }, [status, initialSettings])

  // Move step up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setSteps(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index - 1]
      next[index - 1] = temp
      return next
    })
  }

  // Move step down
  const handleMoveDown = (index: number) => {
    if (index >= steps.length - 1) return
    setSteps(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index + 1]
      next[index + 1] = temp
      return next
    })
  }

  // Delete step
  const handleDeleteStep = (index: number) => {
    if (steps.length <= 1) {
      alert('Lộ trình cần có ít nhất 1 chặng.')
      return
    }
    setSteps(prev => prev.filter((_, idx) => idx !== index))
  }

  // Add step
  const handleAddStep = (type: StepType = 'new_cards') => {
    const newStep: PipelineStepConfig = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      daily_count: 20,
      question_count: 20,
      pass_threshold: 80,
      overdue_hours: 24,
      target_minutes: 15
    }
    setSteps(prev => [...prev, newStep])
  }

  // Apply a preset
  const handleApplyPreset = (presetSteps: PipelineStepConfig[]) => {
    const cloned = presetSteps.map((s, idx) => ({
      ...s,
      id: `step-${idx}-${Date.now()}`
    }))
    setSteps(cloned)
    setIsActive(true)
  }

  // Save roadmap configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    // Build cleaned pipeline for API
    const cleanedPipeline = steps.map(s => {
      const item: any = { type: s.type }
      if (s.type === 'new_cards') {
        item.daily_count = Math.max(1, Number(s.daily_count) || 20)
      } else if (s.type === 'mcq') {
        item.question_count = Math.max(1, Number(s.question_count) || 20)
        item.pass_threshold = Math.min(100, Math.max(1, Number(s.pass_threshold) || 80))
      } else if (s.type === 'typing') {
        item.question_count = Math.max(1, Number(s.question_count) || 20)
        item.pass_threshold = Math.min(100, Math.max(1, Number(s.pass_threshold) || 80))
      } else if (s.type === 'fsrs_review') {
        item.overdue_hours = Number(s.overdue_hours !== undefined ? s.overdue_hours : 24)
      } else if (s.type === 'study_time') {
        item.target_minutes = Math.max(1, Number(s.target_minutes) || 15)
      }
      return item
    })

    const newCardsStep = steps.find(s => s.type === 'new_cards')
    const testStep = steps.find(s => s.type === 'mcq' || s.type === 'typing')

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          roadmap_active: isActive,
          pipeline: cleanedPipeline,
          roadmap_daily_new: newCardsStep ? Number(newCardsStep.daily_count) || 20 : 20,
          roadmap_pass_threshold: testStep ? Number(testStep.pass_threshold) || 80 : 80
        },
        is_creator: false
      })

      // Invalidate React Query caches
      await queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status'] })
      await queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      await queryClient.invalidateQueries({ queryKey: ['quiz', Number(deckId)] })
      await queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (err) {
      console.error('Failed to save roadmap configuration:', err)
      alert('Không thể lưu cài đặt lộ trình.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs text-left space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm shadow-amber-200 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Thiết Lập Lộ Trình Học Hàng Ngày</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                Custom Pipeline
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tùy biến thứ tự và nội dung từng chặng học tập mỗi ngày
            </p>
          </div>
        </div>

        {/* Master Roadmap Toggle */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/70 px-3.5 py-2 rounded-2xl shrink-0 self-start sm:self-auto">
          <span className="text-xs font-black text-slate-700">
            {isActive ? 'Đang Bật Lộ Trình' : 'Đang Tắt Lộ Trình'}
          </span>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              isActive ? 'bg-amber-500 shadow-xs shadow-amber-300' : 'bg-slate-300'
            }`}
            title="Bật/Tắt chế độ lộ trình cho bộ thẻ này"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Đã lưu thành công cấu hình lộ trình học tập! Chuyển sang tab <b>Tiến Độ Hôm Nay</b> để xem tiến trình.</span>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Mẫu Lộ Trình Gợi Ý Nhanh (Presets):</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((preset, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleApplyPreset(preset.steps)}
              className="p-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-amber-50/50 hover:border-amber-300 transition-all text-left group cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{preset.icon}</span>
                <span className="text-xs font-black text-slate-800 group-hover:text-amber-700">
                  {preset.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-tight line-clamp-1">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Steps Pipeline Builder */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Danh Sách Các Chặng Trong Ngày ({steps.length} chặng)</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Thực hiện tuần tự từ trên xuống dưới
          </span>
        </div>

        {/* Step Items List */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const meta = STEP_META[step.type] || STEP_META.new_cards

            return (
              <div
                key={step.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-indigo-200 transition-all space-y-3"
              >
                {/* Step Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    {/* Step Type Selector */}
                    <div className="relative">
                      <select
                        value={step.type}
                        onChange={(e) => {
                          const newType = e.target.value as StepType
                          setSteps(prev => prev.map((s, i) => i === index ? { ...s, type: newType } : s))
                        }}
                        className="text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer pr-7"
                      >
                        <option value="new_cards">🎴 Học Từ Mới (New Words)</option>
                        <option value="mcq">🎯 Trắc Nghiệm (MCQ Quiz)</option>
                        <option value="typing">⌨️ Gõ Từ (Typing Test)</option>
                        <option value="fsrs_review">🔄 Ôn Tập FSRS v6</option>
                        <option value="study_time">⏱️ Thời Gian Học (Study Time)</option>
                      </select>
                    </div>

                    <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium truncate">
                      {meta.desc}
                    </span>
                  </div>

                  {/* Step Action Controls (Reorder & Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                      title="Di chuyển lên trên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === steps.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                      title="Di chuyển xuống dưới"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={steps.length <= 1}
                      onClick={() => handleDeleteStep(index)}
                      className="w-7 h-7 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all ml-1"
                      title="Xóa chặng này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step Parameter Inputs Based on Type */}
                <div className="pt-2 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
                  {/* TYPE: NEW CARDS */}
                  {step.type === 'new_cards' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          Số từ mới mỗi ngày:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={step.daily_count ?? 20}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSteps(prev => prev.map((s, i) => i === index ? { ...s, daily_count: val } : s))
                          }}
                          className="w-20 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-black text-slate-800 text-center focus:border-indigo-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">từ</span>
                      </div>

                      {/* Quick Choice Pills */}
                      <div className="flex items-center gap-1">
                        {[10, 15, 20, 30].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              setSteps(prev => prev.map((s, i) => i === index ? { ...s, daily_count: cnt } : s))
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              step.daily_count === cnt
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TYPE: MCQ QUIZ */}
                  {step.type === 'mcq' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          Số câu hỏi test:
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={step.question_count ?? 20}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSteps(prev => prev.map((s, i) => i === index ? { ...s, question_count: val } : s))
                          }}
                          className="w-20 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-black text-slate-800 text-center focus:border-rose-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">câu</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          Ngưỡng đạt:
                        </label>
                        <input
                          type="number"
                          min={50}
                          max={100}
                          value={step.pass_threshold ?? 80}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSteps(prev => prev.map((s, i) => i === index ? { ...s, pass_threshold: val } : s))
                          }}
                          className="w-16 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-black text-slate-800 text-center focus:border-rose-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">% đúng để qua</span>
                      </div>
                    </div>
                  )}

                  {/* TYPE: TYPING TEST */}
                  {step.type === 'typing' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          Số câu hỏi gõ:
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={step.question_count ?? 20}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSteps(prev => prev.map((s, i) => i === index ? { ...s, question_count: val } : s))
                          }}
                          className="w-20 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-black text-slate-800 text-center focus:border-purple-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">câu</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          Ngưỡng đạt:
                        </label>
                        <input
                          type="number"
                          min={50}
                          max={100}
                          value={step.pass_threshold ?? 80}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSteps(prev => prev.map((s, i) => i === index ? { ...s, pass_threshold: val } : s))
                          }}
                          className="w-16 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-black text-slate-800 text-center focus:border-purple-500 outline-none"
                        />
                        <span className="text-xs font-bold text-slate-400">% đúng để qua</span>
                      </div>
                    </div>
                  )}

                  {/* TYPE: FSRS REVIEW (WITH OVERDUE FILTERING) */}
                  {step.type === 'fsrs_review' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                          <span>Điều kiện thẻ cần ôn tập:</span>
                        </label>

                        <select
                          value={step.overdue_hours !== undefined ? step.overdue_hours : 24}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSteps(prev => prev.map((s, i) => i === index ? { ...s, overdue_hours: val } : s))
                          }}
                          className="h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-black text-slate-800 focus:border-amber-500 outline-none cursor-pointer"
                        >
                          <option value={24}>⭐ Quá hạn trên 1 ngày (Mốc 23h59 hôm nay)</option>
                          <option value={0}>Tất cả thẻ đến hạn hôm nay (0 giờ)</option>
                          <option value={48}>Quá hạn trên 2 ngày (48 giờ)</option>
                          <option value={72}>Quá hạn trên 3 ngày (72 giờ)</option>
                        </select>
                      </div>

                      {/* Explanation Note for 23:59 Cutoff */}
                      <p className="text-[10px] text-amber-700/90 bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl flex items-start gap-1.5 leading-relaxed">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <b>Mẹo:</b> Với mốc 23h59 hôm nay, những từ bạn vừa học trong ngày sẽ không bao giờ bị tính vào danh sách quá hạn, giúp số lượng thẻ cần ôn ở chặng này giữ <b>cố định và ổn định</b> suốt cả ngày!
                        </span>
                      </p>
                    </div>
                  )}

                  {/* TYPE: STUDY TIME */}
                  {step.type === 'study_time' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                        Mục tiêu thời gian học:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={step.target_minutes ?? 15}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setSteps(prev => prev.map((s, i) => i === index ? { ...s, target_minutes: val } : s))
                        }}
                        className="w-20 h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-black text-slate-800 text-center focus:border-emerald-500 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-400">phút tập trung</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Step Button */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddStep('new_cards')}
            className="px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Học Từ Mới</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddStep('mcq')}
            className="px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 text-slate-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Trắc Nghiệm MCQ</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddStep('typing')}
            className="px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50/50 text-slate-600 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Gõ Từ (Typing)</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddStep('fsrs_review')}
            className="px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 text-slate-600 hover:text-amber-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Ôn Tập FSRS</span>
          </button>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <p className="text-[11px] text-slate-400 font-medium">
          {isActive ? `Lộ trình đang gồm ${steps.length} chặng` : 'Lộ trình đang tắt đối với bộ thẻ này'}
        </p>

        <button
          type="submit"
          disabled={isSaving}
          className="px-6 h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black shadow-sm shadow-amber-200 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'ĐANG LƯU CẤU HÌNH...' : 'LƯU CẤU HÌNH LỘ TRÌNH'}</span>
        </button>
      </div>
    </form>
  )
}

export default DeckRoadmapGoalForm
