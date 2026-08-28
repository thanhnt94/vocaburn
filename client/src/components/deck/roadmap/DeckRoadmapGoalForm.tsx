import React, { useState, useEffect } from 'react'
import { Save, Settings, Compass, Sparkles, Plus, Trash2, Check, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckRoadmapGoalFormProps {
  deckId: string | number
  initialSettings?: any
  onSaved?: () => void
}

export function DeckRoadmapGoalForm({
  deckId,
  initialSettings,
  onSaved
}: DeckRoadmapGoalFormProps) {
  const queryClient = useQueryClient()
  const [isActive, setIsActive] = useState(true)
  const [dailyNew, setDailyNew] = useState(10)
  const [dailyReviewMax, setDailyReviewMax] = useState(50)
  const [passThreshold, setPassThreshold] = useState(80)
  const [enableMcq, setEnableMcq] = useState(true)
  const [enableTyping, setEnableTyping] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (initialSettings) {
      if (initialSettings.roadmap_active !== undefined) setIsActive(initialSettings.roadmap_active)
      if (initialSettings.roadmap_daily_new) setDailyNew(initialSettings.roadmap_daily_new)
      if (initialSettings.roadmap_daily_review_max) setDailyReviewMax(initialSettings.roadmap_daily_review_max)
      if (initialSettings.roadmap_pass_threshold) setPassThreshold(initialSettings.roadmap_pass_threshold)
      
      const pipe = initialSettings.pipeline || []
      setEnableMcq(pipe.some((p: any) => p.type === 'mcq'))
      setEnableTyping(pipe.some((p: any) => p.type === 'typing'))
    }
  }, [initialSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    // Build pipeline array
    const pipeline: any[] = [{ type: 'new_cards', daily_count: Number(dailyNew) }]
    if (enableMcq) {
      pipeline.push({ type: 'mcq', question_count: Number(dailyNew), pass_threshold: Number(passThreshold) })
    }
    if (enableTyping) {
      pipeline.push({ type: 'typing', question_count: Number(dailyNew), pass_threshold: Number(passThreshold) })
    }
    pipeline.push({ type: 'fsrs_review', overdue_hours: 24 })

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          roadmap_active: isActive,
          roadmap_daily_new: Number(dailyNew),
          roadmap_daily_review_max: Number(dailyReviewMax),
          roadmap_pass_threshold: Number(passThreshold),
          pipeline: pipeline
        },
        is_creator: false
      })

      queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status', Number(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (err) {
      alert('Không thể lưu cài đặt lộ trình.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
              Thiết Lập Mục Tiêu Lộ Trình
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Tùy biến nhịp độ học tập hàng ngày
            </p>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">
            {isActive ? 'Đang Bật' : 'Đang Tắt'}
          </span>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              isActive ? 'bg-amber-500' : 'bg-slate-300'
            }`}
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
          <Check className="w-4 h-4" /> Đã lưu thành công cài đặt lộ trình!
        </div>
      )}

      {/* Target inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Từ Mới Mỗi Ngày (Daily New)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={dailyNew}
            onChange={(e) => setDailyNew(Number(e.target.value))}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Khuyên dùng: 10 - 20 từ</span>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Giới Hạn Ôn Tập (Review Max)
          </label>
          <input
            type="number"
            min={5}
            max={500}
            value={dailyReviewMax}
            onChange={(e) => setDailyReviewMax(Number(e.target.value))}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Khuyên dùng: 50 - 100 thẻ</span>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Ngưỡng Đạt Test (%)
          </label>
          <input
            type="number"
            min={50}
            max={100}
            value={passThreshold}
            onChange={(e) => setPassThreshold(Number(e.target.value))}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Tỷ lệ đúng để vượt qua bài test</span>
        </div>
      </div>

      {/* Pipeline sub-steps options */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
          Các chặng luyện tập trong ngày:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={enableMcq}
              onChange={(e) => setEnableMcq(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <div>
              <span className="text-xs font-black text-slate-800 block">🎯 Chặng Trắc Nghiệm (MCQ)</span>
              <span className="text-[10px] text-slate-400">Kiểm tra phản xạ chọn 4 đáp án</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={enableTyping}
              onChange={(e) => setEnableTyping(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <div>
              <span className="text-xs font-black text-slate-800 block">⌨️ Chặng Gõ Từ (Typing)</span>
              <span className="text-[10px] text-slate-400">Luyện nhớ chính xác mặt chữ</span>
            </div>
          </label>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs shadow-amber-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH LỘ TRÌNH'}</span>
        </button>
      </div>
    </form>
  )
}

export default DeckRoadmapGoalForm
