import React, { useState, useEffect } from 'react'
import { Sliders, Save, Check, Trophy, Keyboard, Headphones, Brain } from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckPracticeConfigProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

export function DeckPracticeConfig({ deckId, initialSettings, onSaved }: DeckPracticeConfigProps) {
  const queryClient = useQueryClient()
  const [disabledModes, setDisabledModes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (initialSettings) {
      setDisabledModes(initialSettings.disabled_modes || [])
    }
  }, [initialSettings])

  const toggleMode = (modeKey: string) => {
    setDisabledModes((prev) =>
      prev.includes(modeKey) ? prev.filter((m) => m !== modeKey) : [...prev, modeKey]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...initialSettings,
          disabled_modes: disabledModes,
        },
        is_creator: true,
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
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
    { key: 'mcq', label: 'Trắc Nghiệm 4 Đáp Án (MCQ)', icon: '🎯', desc: 'Luyện tập trắc nghiệm chọn đáp án đúng' },
    { key: 'typing', label: 'Gõ Từ Vựng (Typing)', icon: '⌨️', desc: 'Kiểm tra khả năng nhớ chính xác mặt chữ' },
    { key: 'listening', label: 'Luyện Nghe Phát Âm (Listening)', icon: '🎧', desc: 'Nghe giọng đọc và chọn nghĩa chính xác' },
    { key: 'flip', label: 'Lật Thẻ Tự Do (Flip Card)', icon: '🔄', desc: 'Chế độ lật thẻ nhanh phản xạ' },
  ]

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Cấu Hình Các Chế Độ Luyện Tập
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

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CHẾ ĐỘ LUYỆN TẬP'}</span>
        </button>
      </div>
    </form>
  )
}

export default DeckPracticeConfig
