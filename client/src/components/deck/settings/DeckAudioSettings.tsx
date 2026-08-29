import React, { useState, useEffect } from 'react'
import { Volume2, Save, RefreshCw, CheckCircle2, Wand2, Play, AlertCircle, Headphones, Mic } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckAudioSettingsProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

export function DeckAudioSettings({ deckId, initialSettings, onSaved }: DeckAudioSettingsProps) {
  const queryClient = useQueryClient()
  
  // Mapping State
  const [sourceField, setSourceField] = useState('front')
  const [targetField, setTargetField] = useState('front_audio_url')
  const [voiceLang, setVoiceLang] = useState('ja-JP')
  const [speechRate, setSpeechRate] = useState('1.0')
  const [forceAudio, setForceAudio] = useState(false)

  // Furigana State
  const [furiganaSource, setFuriganaSource] = useState('front')
  const [furiganaTarget, setFuriganaTarget] = useState('furigana')
  const [forceFurigana, setForceFurigana] = useState(false)

  // Status & Loaders
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isRunningAudio, setIsRunningAudio] = useState(false)
  const [audioMessage, setAudioMessage] = useState<string | null>(null)
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
    'front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'furigana'
  ]

  // Query TTS Status
  const { data: ttsStatus, refetch: refetchTTSStatus, isFetching: isFetchingTTS } = useQuery({
    queryKey: ['deck-tts-status', String(deckId), sourceField, targetField],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/tts-status`, {
        params: { source_field: sourceField, target_field: targetField }
      })
      return res.data
    },
    enabled: !!deckId,
    staleTime: 10 * 1000,
  })

  useEffect(() => {
    const effectiveSettings = practiceSettingsData?.creator_settings || initialSettings
    if (effectiveSettings) {
      if (effectiveSettings.audio_source_field) setSourceField(effectiveSettings.audio_source_field)
      if (effectiveSettings.audio_target_field) setTargetField(effectiveSettings.audio_target_field)
      if (effectiveSettings.audio_voice_lang) setVoiceLang(effectiveSettings.audio_voice_lang)
      if (effectiveSettings.audio_speech_rate) setSpeechRate(String(effectiveSettings.audio_speech_rate))
    }
  }, [practiceSettingsData, initialSettings])

  const handleSaveAudioConfig = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...initialSettings,
          audio_source_field: sourceField,
          audio_target_field: targetField,
          audio_voice_lang: voiceLang,
          audio_speech_rate: speechRate,
        },
        is_creator: true,
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (e) {
      alert('Không thể lưu cấu hình âm thanh & TTS')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTriggerBulkAudio = async () => {
    setIsRunningAudio(true)
    setAudioMessage(null)
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/generate-all-audio`, {
        source_field: sourceField,
        target_field: targetField,
        force: forceAudio,
      })
      setAudioMessage(res.data?.message || 'Đã gửi yêu cầu tạo âm thanh TTS chạy nền thành công!')
      setTimeout(() => {
        refetchTTSStatus()
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
      }, 2000)
      setTimeout(() => setAudioMessage(null), 6000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Lỗi khi kích hoạt sinh âm thanh hàng loạt')
    } finally {
      setIsRunningAudio(false)
    }
  }

  const handleTriggerBulkFurigana = async () => {
    setIsRunningFurigana(true)
    setFuriganaMessage(null)
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/generate-all-furigana`, {
        source_field: furiganaSource,
        target_field: furiganaTarget,
        force: forceFurigana,
      })
      setFuriganaMessage(res.data?.message || 'Đã gửi yêu cầu sinh Furigana thành công!')
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
      setTimeout(() => setFuriganaMessage(null), 6000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Lỗi khi kích hoạt sinh Furigana')
    } finally {
      setIsRunningFurigana(false)
    }
  }

  return (
    <div className="space-y-5 text-left">
      {/* SECTION 1: AUDIO & TTS MAPPING CONFIGURATION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-600" />
              <span>Cấu Hình Ánh Xạ Âm Thanh & Giọng Đọc (TTS Audio Mapping)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Chọn cột văn bản đọc và cột đích để lưu trữ URL âm thanh mp3/wav
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình ánh xạ âm thanh thành công!
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Source Column */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              1. Cột Chứa Kịch Bản / Chữ Cần Đọc:
            </label>
            <select
              value={sourceField}
              onChange={(e) => setSourceField(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col} {col === 'front' ? '(Mặt trước / Từ vựng)' : col === 'back' ? '(Mặt sau / Nghĩa)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Văn bản từ cột này sẽ được gửi tới bộ tổng hợp giọng đọc AI TTS.
            </span>
          </div>

          {/* Target Column */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              2. Cột Lưu Đường Dẫn Âm Thanh (Audio URL):
            </label>
            <select
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col} {col === 'front_audio_url' ? '(Đường dẫn audio mặt trước)' : col === 'back_audio_url' ? '(Đường dẫn audio mặt sau)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Link file âm thanh sau khi sinh sẽ được lưu vào trường này của mỗi thẻ.
            </span>
          </div>

          {/* Voice Language */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              3. Ngôn Ngữ & Bộ Đọc Giọng AI:
            </label>
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value="ja-JP">🇯🇵 Tiếng Nhật (Japanese - ja-JP)</option>
              <option value="en-US">🇺🇸 Tiếng Anh (English US - en-US)</option>
              <option value="vi-VN">🇻🇳 Tiếng Việt (Vietnamese - vi-VN)</option>
              <option value="ko-KR">🇰🇷 Tiếng Hàn (Korean - ko-KR)</option>
              <option value="zh-CN">🇨🇳 Tiếng Trung (Chinese - zh-CN)</option>
            </select>
          </div>

          {/* Speed Rate */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              4. Tốc Độ Đọc (Speech Rate):
            </label>
            <select
              value={speechRate}
              onChange={(e) => setSpeechRate(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value="0.75">Chậm (0.75x) - Thích hợp cho người mới bắt đầu</option>
              <option value="1.0">Chuẩn (1.0x) - Tốc độ tự nhiên hàng ngày</option>
              <option value="1.2">Nhanh (1.2x) - Luyện phản xạ cao cấp</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAudioConfig}
            disabled={isSaving}
            className="px-5 h-10 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-xs shadow-sky-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH ÁNH XẠ ÂM THANH'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: BULK TTS AUDIO GENERATION STUDIO */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-600" />
              <span>Sinh Âm Thanh Hàng Loạt (Bulk Audio Generator)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Kiểm tra trạng thái âm thanh và tạo file phát âm mp3 chuẩn cho tất cả các thẻ
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetchTTSStatus()}
            className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Làm mới trạng thái"
          >
            <RefreshCw className={cn("w-3 h-3", isFetchingTTS && "animate-spin")} />
            <span>Kiểm tra</span>
          </button>
        </div>

        {audioMessage && (
          <div className="p-3 bg-sky-50 border border-sky-200 text-sky-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {audioMessage}
          </div>
        )}

        {/* Live Audio Status Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tổng Số Thẻ</span>
            <span className="text-lg font-black text-slate-800 mt-0.5 block">
              {ttsStatus?.total_cards ?? '--'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
            <span className="text-[10px] font-bold text-amber-600 uppercase block">Chưa Có Audio</span>
            <span className="text-lg font-black text-amber-700 mt-0.5 block">
              {ttsStatus?.missing_audio_cards ?? '--'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Đã Có Audio Đầy Đủ</span>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">
              {ttsStatus?.total_cards !== undefined && ttsStatus?.missing_audio_cards !== undefined
                ? Math.max(0, ttsStatus.total_cards - ttsStatus.missing_audio_cards)
                : '--'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceAudio}
              onChange={(e) => setForceAudio(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">
              Ghi đè tất cả (Tạo lại âm thanh cho cả những thẻ đã có sẵn audio)
            </span>
          </label>

          <button
            type="button"
            onClick={handleTriggerBulkAudio}
            disabled={isRunningAudio}
            className="px-5 h-9 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
          >
            {isRunningAudio ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isRunningAudio ? 'ĐANG KHỞI CHẠY...' : `SINH AUDIO CHO "${sourceField.toUpperCase()}" ➜ "${targetField.toUpperCase()}"`}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: FURIGANA RUBY STUDIO */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                あ
              </span>
              <span>Sinh Phiên Âm Furigana Tự Động (Ruby Text)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Tự động phân tích Kanji tiếng Nhật và đính kèm cách đọc Furigana cho toàn bộ thẻ
            </p>
          </div>
        </div>

        {furiganaMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {furiganaMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Cột Chứa Kanji Gốc:
            </label>
            <select
              value={furiganaSource}
              onChange={(e) => setFuriganaSource(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
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
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceFurigana}
              onChange={(e) => setForceFurigana(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">
              Ghi đè tất cả (Tạo lại cả những thẻ đã có Furigana)
            </span>
          </label>

          <button
            type="button"
            onClick={handleTriggerBulkFurigana}
            disabled={isRunningFurigana}
            className="px-5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs shadow-emerald-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
          >
            {isRunningFurigana ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>{isRunningFurigana ? 'ĐANG XỬ LÝ...' : 'SINH FURIGANA TOÀN BỘ'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckAudioSettings
