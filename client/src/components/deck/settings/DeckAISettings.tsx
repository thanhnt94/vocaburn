import React, { useState, useEffect } from 'react'
import { Sparkles, Save, Wand2, RefreshCw, CheckCircle2, Plus, Trash2, HelpCircle, Code2 } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface AIPromptItem {
  id?: string
  column: string
  target_column?: string
  prompt: string
  name?: string
}

export interface DeckAISettingsProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

const DEFAULT_PRESETS = [
  {
    name: 'Giải thích chi tiết (Ngữ pháp + Ví dụ)',
    column: 'explanation',
    prompt: `Bạn là trợ lý tiếng Nhật chuyên nghiệp. Hãy giải thích chi tiết từ vựng/mẫu câu sau cho người học Việt Nam:
Từ vựng: {front}
Ý nghĩa cơ bản: {back}

Yêu cầu định dạng đầu ra ngắn gọn, đẹp mắt:
1. Từ loại & Sắc thái sử dụng
2. 2 ví dụ câu song ngữ Nhật - Việt tự nhiên, chuẩn giao tiếp
3. Lưu ý ngữ pháp hoặc từ đồng nghĩa/trái nghĩa nếu có.`
  },
  {
    name: 'Tạo ví dụ câu song ngữ',
    column: 'example',
    prompt: `Hãy tạo 2 câu ví dụ tiếng Nhật tự nhiên chứa từ vựng sau kèm dịch nghĩa tiếng Việt:
Từ: {front} ({back})`
  },
  {
    name: 'Phân tích Hán tự & Bộ thủ',
    column: 'hán việt',
    prompt: `Hãy phân tích chi tiết chữ Hán sau: {front}
Bao gồm:
- Âm Hán Việt
- Âm Onyomi & Kunyomi
- Bộ thủ chính & Cách nhớ chữ Hán qua hình ảnh/câu chuyện.`
  }
]

export function DeckAISettings({ deckId, initialSettings, onSaved }: DeckAISettingsProps) {
  const queryClient = useQueryClient()
  const [prompts, setPrompts] = useState<AIPromptItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedColumnToRun, setSelectedColumnToRun] = useState('explanation')
  const [forceRegenerate, setForceRegenerate] = useState(false)
  const [isRunningAI, setIsRunningAI] = useState(false)
  const [aiRunMessage, setAiRunMessage] = useState<string | null>(null)

  // Fetch available columns in this deck
  const { data: practiceSettingsData } = useQuery({
    queryKey: ['deck-practice-settings', String(deckId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000,
  })

  const availableColumns: string[] = practiceSettingsData?.available_columns || ['front', 'back', 'explanation', 'furigana']

  useEffect(() => {
    const effectiveSettings = practiceSettingsData?.creator_settings || initialSettings
    if (effectiveSettings && Array.isArray(effectiveSettings.ai_prompts) && effectiveSettings.ai_prompts.length > 0) {
      setPrompts(effectiveSettings.ai_prompts)
      if (effectiveSettings.ai_prompts[0]?.column) {
        setSelectedColumnToRun(effectiveSettings.ai_prompts[0].column)
      }
    } else {
      // Default initial prompt
      setPrompts([
        {
          id: 'prompt_explanation',
          column: 'explanation',
          target_column: 'explanation',
          name: 'Giải thích từ vựng mặc định',
          prompt: DEFAULT_PRESETS[0].prompt
        }
      ])
    }
  }, [practiceSettingsData, initialSettings])

  const handleAddPrompt = (preset?: typeof DEFAULT_PRESETS[0]) => {
    const newItem: AIPromptItem = preset ? {
      id: `prompt_${Date.now()}`,
      column: preset.column,
      target_column: preset.column,
      name: preset.name,
      prompt: preset.prompt
    } : {
      id: `prompt_${Date.now()}`,
      column: availableColumns.find(c => !prompts.some(p => p.column === c)) || 'explanation',
      target_column: 'explanation',
      name: 'Prompt mới',
      prompt: 'Hãy phân tích và bổ sung thông tin chi tiết cho: {front}'
    }
    setPrompts(prev => [...prev, newItem])
  }

  const handleRemovePrompt = (index: number) => {
    setPrompts(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdatePrompt = (index: number, field: keyof AIPromptItem, value: string) => {
    setPrompts(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...initialSettings,
          ai_prompts: prompts,
        },
        is_creator: true,
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (e) {
      alert('Không thể lưu cấu hình Prompt AI')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTriggerBulkAI = async () => {
    if (!selectedColumnToRun) return
    setIsRunningAI(true)
    setAiRunMessage(null)
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/generate-all-ai`, {
        field: selectedColumnToRun,
        force: forceRegenerate,
      })
      setAiRunMessage(res.data?.message || 'Đã gửi yêu cầu sinh AI hàng loạt thành công!')
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setTimeout(() => setAiRunMessage(null), 6000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Lỗi khi kích hoạt sinh AI hàng loạt')
    } finally {
      setIsRunningAI(false)
    }
  }

  const insertVariable = (index: number, variableName: string) => {
    const promptItem = prompts[index]
    if (!promptItem) return
    const newPrompt = (promptItem.prompt || '') + ` {${variableName}}`
    handleUpdatePrompt(index, 'prompt', newPrompt)
  }

  return (
    <div className="space-y-5 text-left">
      {/* SECTION 1: PROMPT TEMPLATES & MAPPING */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Cấu Hình Prompt AI Theo Cột Dữ Liệu</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Tùy biến câu lệnh (prompt) và chỉ định cột dữ liệu sẽ lưu kết quả sinh từ Gemini AI
            </p>
          </div>

          <button
            onClick={() => handleAddPrompt()}
            className="h-8.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Prompt</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình AI Prompt thành công!
          </div>
        )}

        {/* Presets Row */}
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
            ⚡ Thêm nhanh từ mẫu có sẵn:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {DEFAULT_PRESETS.map((preset, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleAddPrompt(preset)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 text-[11px] font-bold text-slate-700 hover:text-purple-700 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-purple-500" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompts List */}
        <div className="space-y-4 pt-1">
          {prompts.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
              Chưa có cấu hình AI Prompt nào. Nhấn "+ Thêm Prompt" để bắt đầu.
            </div>
          ) : (
            prompts.map((item, idx) => (
              <div key={item.id || idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="Tên gợi nhớ prompt..."
                      value={item.name || ''}
                      onChange={(e) => handleUpdatePrompt(idx, 'name', e.target.value)}
                      className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500 flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Lưu vào cột:</span>
                      <select
                        value={item.column || 'explanation'}
                        onChange={(e) => {
                          handleUpdatePrompt(idx, 'column', e.target.value)
                          handleUpdatePrompt(idx, 'target_column', e.target.value)
                        }}
                        className="h-8 px-2.5 bg-white border border-purple-200 rounded-lg text-xs font-black text-purple-700 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                      >
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePrompt(idx)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Xóa Prompt này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Variable Injection Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chèn biến:</span>
                  {availableColumns.slice(0, 6).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => insertVariable(idx, col)}
                      className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 border border-purple-200/60 text-purple-700 text-[10px] font-mono font-bold transition-all cursor-pointer"
                      title={`Chèn biến {${col}}`}
                    >
                      +{`{${col}}`}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div>
                  <textarea
                    rows={4}
                    value={item.prompt || ''}
                    onChange={(e) => handleUpdatePrompt(idx, 'prompt', e.target.value)}
                    placeholder="Nhập nội dung prompt chỉ dẫn cho AI..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all resize-y"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs shadow-purple-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH AI PROMPTS'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: BULK AI RUNNER STUDIO */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              <span>Chạy Sinh AI Hàng Loạt (Batch Generator)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Tự động gọi Gemini AI sinh dữ liệu cho toàn bộ các thẻ từ vựng trong bộ thẻ này
            </p>
          </div>
        </div>

        {aiRunMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {aiRunMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Chọn Cột Cần Sinh Dữ Liệu AI:
            </label>
            <select
              value={selectedColumnToRun}
              onChange={(e) => setSelectedColumnToRun(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  Cột: {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-between">
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Tùy chọn tạo lại:
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={forceRegenerate}
                onChange={(e) => setForceRegenerate(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                Ghi đè (Tạo lại cả những thẻ đã có nội dung)
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleTriggerBulkAI}
            disabled={isRunningAI}
            className="px-6 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRunningAI ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isRunningAI ? 'ĐANG XỬ LÝ...' : `SINH AI CHO CỘT "${selectedColumnToRun.toUpperCase()}"`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckAISettings
