import React, { useState, useEffect } from 'react'
import { Sliders, Save, Check, Trophy, Keyboard, Headphones, Brain, Plus, Trash2, ArrowRight } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface QuestionAnswerPair {
  id?: string
  prompt_col: string
  answer_col: string
  name?: string
}

export interface DeckPracticeConfigProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

export function DeckPracticeConfig({ deckId, initialSettings, onSaved }: DeckPracticeConfigProps) {
  const queryClient = useQueryClient()
  const [disabledModes, setDisabledModes] = useState<string[]>([])
  const [numChoices, setNumChoices] = useState<number>(4)
  const [activePairs, setActivePairs] = useState<QuestionAnswerPair[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Fetch available columns
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
    if (initialSettings) {
      setDisabledModes(initialSettings.disabled_modes || [])
      
      const mcqConfig = initialSettings.mcq || {}
      setNumChoices(mcqConfig.num_choices || initialSettings.num_choices || 4)
      
      const pairs = mcqConfig.active_pairs || initialSettings.active_pairs || []
      if (Array.isArray(pairs) && pairs.length > 0) {
        setActivePairs(pairs.map((p: any) => ({
          prompt_col: p.prompt_col || p.question_col || 'front',
          answer_col: p.answer_col || 'back',
          name: p.name || ''
        })))
      } else {
        setActivePairs([
          { prompt_col: 'front', answer_col: 'back', name: 'Mặt trước ➜ Mặt sau' }
        ])
      }
    }
  }, [initialSettings])

  const toggleMode = (modeKey: string) => {
    setDisabledModes((prev) =>
      prev.includes(modeKey) ? prev.filter((m) => m !== modeKey) : [...prev, modeKey]
    )
  }

  const handleAddPair = () => {
    setActivePairs(prev => [
      ...prev,
      { prompt_col: 'front', answer_col: 'back', name: `Cặp #${prev.length + 1}` }
    ])
  }

  const handleRemovePair = (index: number) => {
    setActivePairs(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdatePair = (index: number, field: keyof QuestionAnswerPair, value: string) => {
    setActivePairs(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const mcqSettings = {
        active_pairs: activePairs,
        num_choices: numChoices,
      }
      const typingSettings = {
        active_pairs: activePairs,
      }
      const listeningSettings = {
        active_pairs: activePairs,
        num_choices: numChoices,
      }

      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...initialSettings,
          disabled_modes: disabledModes,
          num_choices: numChoices,
          active_pairs: activePairs,
          mcq: mcqSettings,
          typing: typingSettings,
          listening: listeningSettings,
        },
        is_creator: true,
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (e) {
      alert('Không thể lưu cấu hình luyện tập')
    } finally {
      setIsSaving(false)
    }
  }

  const modes = [
    { key: 'mcq', label: 'Trắc Nghiệm (MCQ)', icon: '🎯', desc: 'Luyện tập trắc nghiệm chọn đáp án đúng' },
    { key: 'typing', label: 'Gõ Từ Vựng (Typing)', icon: '⌨️', desc: 'Kiểm tra khả năng nhớ chính xác mặt chữ' },
    { key: 'listening', label: 'Luyện Nghe Phát Âm (Listening)', icon: '🎧', desc: 'Nghe giọng đọc và chọn nghĩa chính xác' },
    { key: 'flip', label: 'Lật Thẻ Tự Do (Flip Card)', icon: '🔄', desc: 'Chế độ lật thẻ nhanh phản xạ' },
  ]

  return (
    <form onSubmit={handleSave} className="space-y-5 text-left">
      {/* SECTION 1: PRACTICE MODES TOGGLE */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Cấu Hình Các Chế Độ Luyện Tập</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Bật/tắt các chế độ luyện tập khả dụng cho người học bộ thẻ này
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <Check className="w-4 h-4" /> Đã lưu cấu hình luyện tập thành công!
          </div>
        )}

        <div className="space-y-2.5">
          {modes.map((m) => {
            const isEnabled = !disabledModes.includes(m.key)
            return (
              <div
                key={m.key}
                onClick={() => toggleMode(m.key)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isEnabled
                    ? 'bg-slate-50/80 border-slate-200/80 hover:border-indigo-300'
                    : 'bg-slate-100/50 border-slate-200/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-2xs">
                    {m.icon}
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{m.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{m.desc}</span>
                  </div>
                </div>

                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 2: QUESTION & ANSWER COLUMN PAIRING */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Ghép Cặp Cột Hỏi - Đáp (Q&A Column Pairs)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Quy định cột nào hiển thị làm câu hỏi và cột nào làm đáp án lựa chọn/gõ từ
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddPair}
            className="h-8.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Cặp Hỏi - Đáp</span>
          </button>
        </div>

        {/* Number of MCQ choices */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-xs font-black text-slate-800 block">Số lượng đáp án trắc nghiệm:</span>
            <span className="text-[10px] text-slate-400 font-medium">Số phương án hiển thị trong chế độ trắc nghiệm MCQ</span>
          </div>

          <div className="flex items-center gap-2">
            {[3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setNumChoices(num)}
                className={cn(
                  "w-9 h-8 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs border",
                  numChoices === num
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Pairs List */}
        <div className="space-y-3">
          {activePairs.map((pair, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-indigo-900">
                  Cặp #{idx + 1}
                </span>

                {activePairs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePair(idx)}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    title="Xóa cặp này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Question Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Cột Hiển Thị Làm Câu Hỏi (Question):
                  </label>
                  <select
                    value={pair.prompt_col}
                    onChange={(e) => handleUpdatePair(idx, 'prompt_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Answer Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Cột Chứa Đáp Án Đúng (Answer):
                  </label>
                  <select
                    value={pair.answer_col}
                    onChange={(e) => handleUpdatePair(idx, 'answer_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH LUYỆN TẬP'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

export default DeckPracticeConfig
