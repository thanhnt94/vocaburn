import React, { useState } from 'react'
import { Sparkles, RefreshCw, CheckCircle2, Server, HelpCircle } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckFuriganaSettingsProps {
  deckId: string | number
  initialSettings?: any
  onSaved?: () => void
}

export function DeckFuriganaSettings({ deckId }: DeckFuriganaSettingsProps) {
  const queryClient = useQueryClient()

  const [furiganaSource, setFuriganaSource] = useState('front')
  const [furiganaTarget, setFuriganaTarget] = useState('front')
  const [forceFurigana, setForceFurigana] = useState(false)
  const [isRunningFurigana, setIsRunningFurigana] = useState(false)
  const [furiganaMessage, setFuriganaMessage] = useState<string | null>(null)

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

  const availableColumns: string[] = practiceSettingsData?.available_columns || [
    'front', 'back', 'explanation', 'furigana'
  ]

  // Query Furigana Status
  const { data: furiganaStatus, refetch: refetchFuriganaStatus, isFetching: isFetchingFurigana } = useQuery({
    queryKey: ['deck-furigana-status', String(deckId), furiganaSource, furiganaTarget],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/furigana-status`, {
        params: { source_field: furiganaSource, target_field: furiganaTarget }
      })
      return res.data
    },
    enabled: !!deckId,
    staleTime: 10 * 1000,
  })

  const handleTriggerBulkFurigana = async () => {
    setIsRunningFurigana(true)
    setFuriganaMessage(null)
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/generate-all-furigana`, {
        source_field: furiganaSource,
        target_field: furiganaTarget,
        force: forceFurigana,
      })
      setFuriganaMessage(res.data?.message || 'Đã gửi yêu cầu sinh Furigana chạy nền tới CentralAuth thành công!')
      setTimeout(() => {
        refetchFuriganaStatus()
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      }, 2000)
      setTimeout(() => setFuriganaMessage(null), 8000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Lỗi khi kích hoạt sinh Furigana')
    } finally {
      setIsRunningFurigana(false)
    }
  }

  return (
    <div className="space-y-5 text-left">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                あ
              </span>
              <span>Sinh Phiên Âm Furigana Tự Động (Ruby Text)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Tự động phân tích Hán tự Kanji tiếng Nhật và đính kèm cách đọc Furigana cho toàn bộ thẻ
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetchFuriganaStatus()}
            className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Làm mới trạng thái"
          >
            <RefreshCw className={cn("w-3 h-3", isFetchingFurigana && "animate-spin")} />
            <span>Kiểm tra trạng thái</span>
          </button>
        </div>

        {furiganaMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{furiganaMessage}</span>
          </div>
        )}

        {/* Live Furigana Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tổng Số Thẻ</span>
            <span className="text-lg font-black text-slate-800 mt-0.5 block">
              {furiganaStatus?.total_cards ?? '--'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
            <span className="text-[10px] font-bold text-amber-600 uppercase block">Chưa Có Furigana</span>
            <span className="text-lg font-black text-amber-700 mt-0.5 block">
              {furiganaStatus?.missing_furigana_cards ?? '--'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Đã Có Furigana</span>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">
              {furiganaStatus?.total_cards !== undefined && furiganaStatus?.missing_furigana_cards !== undefined
                ? Math.max(0, furiganaStatus.total_cards - furiganaStatus.missing_furigana_cards)
                : '--'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Cột Chứa Kanji Gốc:
            </label>
            <select
              value={furiganaSource}
              onChange={(e) => setFuriganaSource(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-emerald-200 rounded-xl text-xs font-black text-emerald-900 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col} {col === 'front' ? '(Mặt trước / Từ vựng)' : col === 'back' ? '(Mặt sau / Nghĩa)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Cột Lưu Furigana:
            </label>
            <select
              value={furiganaTarget}
              onChange={(e) => setFuriganaTarget(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-emerald-200 rounded-xl text-xs font-black text-emerald-900 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col} {col === 'front' ? '(Ghi đè trực tiếp mặt trước)' : col === 'furigana' ? '(Lưu vào cột furigana riêng)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-3 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={forceFurigana}
                onChange={(e) => setForceFurigana(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                Ghi đè tất cả (Tạo lại Furigana cho cả những thẻ đã có sẵn phiên âm)
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tiến trình xử lý bởi CentralAuth Queue Worker</span>
          </div>

          <button
            type="button"
            onClick={handleTriggerBulkFurigana}
            disabled={isRunningFurigana}
            className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
          >
            {isRunningFurigana ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {isRunningFurigana
                ? 'ĐANG GỬI QUEUE...'
                : `SINH FURIGANA CHO "${furiganaSource.toUpperCase()}" ➜ "${furiganaTarget.toUpperCase()}"`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckFuriganaSettings
