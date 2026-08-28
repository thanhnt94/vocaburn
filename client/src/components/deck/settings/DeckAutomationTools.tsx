import React, { useState } from 'react'
import { Sparkles, Volume2, Wand2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckAutomationToolsProps {
  deckId: string | number
}

export function DeckAutomationTools({ deckId }: DeckAutomationToolsProps) {
  const queryClient = useQueryClient()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const triggerAction = async (endpoint: string, actionKey: string, successMsg: string) => {
    setLoadingAction(actionKey)
    setStatusMessage(null)
    try {
      await axios.post(`/api/v1/deck/${deckId}/${endpoint}`)
      setStatusMessage(successMsg)
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setTimeout(() => setStatusMessage(null), 5000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Không thể thực hiện tác vụ tự động')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Công Cụ AI & Tự Động Hóa (Studio Tools)
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Sinh dữ liệu hàng loạt cho toàn bộ thẻ từ vựng trong bộ
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tool 1: Gemini AI Explanation */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/60 to-indigo-50/60 border border-purple-100 flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-purple-950">Giải Thích Gemini AI</span>
            </div>
            <p className="text-[10px] text-purple-800/80 font-medium leading-relaxed">
              Tự động phân tích ngữ pháp, từ loại, sắc thái nghĩa và ví dụ câu cho từng thẻ.
            </p>
          </div>

          <button
            onClick={() =>
              triggerAction(
                'generate-all-ai',
                'ai',
                'Đã kích hoạt sinh giải thích Gemini AI chạy trong nền!'
              )
            }
            disabled={loadingAction !== null}
            className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'ai' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>Sinh AI Toàn Bộ</span>
          </button>
        </div>

        {/* Tool 2: Audio TTS */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/60 to-indigo-50/60 border border-sky-100 flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs">
                <Volume2 className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-sky-950">Phát Âm Chuẩn TTS</span>
            </div>
            <p className="text-[10px] text-sky-800/80 font-medium leading-relaxed">
              Tạo tệp âm thanh giọng đọc chuẩn cho mặt trước và mặt sau các thẻ từ vựng.
            </p>
          </div>

          <button
            onClick={() =>
              triggerAction(
                'generate-all-audio',
                'audio',
                'Đã kích hoạt tạo âm thanh TTS hàng loạt!'
              )
            }
            disabled={loadingAction !== null}
            className="w-full h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-xs shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'audio' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>Sinh Audio TTS</span>
          </button>
        </div>

        {/* Tool 3: Furigana Ruby */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border border-emerald-100 flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                あ
              </span>
              <span className="text-xs font-black text-emerald-950">Furigana Ruby Tiếng Nhật</span>
            </div>
            <p className="text-[10px] text-emerald-800/80 font-medium leading-relaxed">
              Tự động đính kèm phiên âm cách đọc Hiragana trên đầu các chữ Hán tự Kanji.
            </p>
          </div>

          <button
            onClick={() =>
              triggerAction(
                'generate-all-furigana',
                'furigana',
                'Đã kích hoạt sinh Furigana cho toàn bộ thẻ!'
              )
            }
            disabled={loadingAction !== null}
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'furigana' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>Sinh Furigana</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckAutomationTools
