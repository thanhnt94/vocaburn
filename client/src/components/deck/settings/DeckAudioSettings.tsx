import React, { useState, useEffect } from 'react'
import { Volume2, Save, RefreshCw, CheckCircle2, Headphones, Server, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckAudioSettingsProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

// Full voice options list supported by CentralAuth
export const VOICE_OPTIONS = [
  { group: 'Hệ thống tự động', items: [
    { value: 'auto', label: 'Tự động chọn (Theo ngôn ngữ bộ thẻ & cấu hình máy chủ)' }
  ]},
  { group: '🇻🇳 Tiếng Việt (Microsoft Edge TTS & Google)', items: [
    { value: 'vi-VN-HoaiMyNeural', label: '🇻🇳 Hoài My (Nữ - EdgeTTS Rất Tự Nhiên)' },
    { value: 'vi-VN-NamMinhNeural', label: '🇻🇳 Nam Minh (Nam - EdgeTTS)' },
    { value: 'vi-VN-Neural2-A', label: '🇻🇳 Vi Neural2-A (Nữ - Google Cloud)' },
    { value: 'vi-VN-Neural2-F', label: '🇻🇳 Vi Neural2-F (Nam - Google Cloud)' },
    { value: 'gtts:vi', label: '🇻🇳 Tiếng Việt (gTTS Backup)' }
  ]},
  { group: '🇯🇵 Tiếng Nhật (Japanese - EdgeTTS & Google)', items: [
    { value: 'ja-JP-NanamiNeural', label: '🇯🇵 Nanami (Nữ - EdgeTTS Chuẩn Tokyo)' },
    { value: 'ja-JP-KeitaNeural', label: '🇯🇵 Keita (Nam - EdgeTTS)' },
    { value: 'ja-JP-Neural2-C', label: '🇯🇵 Ja Neural2-C (Nữ - Google Cloud)' },
    { value: 'ja-JP-Neural2-D', label: '🇯🇵 Ja Neural2-D (Nam - Google Cloud)' },
    { value: 'gtts:ja', label: '🇯🇵 Tiếng Nhật (gTTS Backup)' }
  ]},
  { group: '🇺🇸 Tiếng Anh (English US & UK)', items: [
    { value: 'en-US-AriaNeural', label: '🇺🇸 Aria (Nữ - US - EdgeTTS)' },
    { value: 'en-US-GuyNeural', label: '🇺🇸 Guy (Nam - US - EdgeTTS)' },
    { value: 'en-GB-SoniaNeural', label: '🇬🇧 Sonia (Nữ - UK - EdgeTTS)' },
    { value: 'en-US-Neural2-H', label: '🇺🇸 En Neural2-H (Nữ - Google Cloud)' },
    { value: 'gtts:en', label: '🇺🇸 Tiếng Anh (gTTS Backup)' }
  ]},
  { group: '🇨🇳 Tiếng Trung & 🇰🇷 Tiếng Hàn', items: [
    { value: 'zh-CN-XiaoxiaoNeural', label: '🇨🇳 Xiaoxiao (Nữ - Tiếng Trung EdgeTTS)' },
    { value: 'ko-KR-SunHiNeural', label: '🇰🇷 SunHi (Nữ - Tiếng Hàn EdgeTTS)' },
    { value: 'gtts:zh', label: '🇨🇳 Tiếng Trung (gTTS Backup)' },
    { value: 'gtts:ko', label: '🇰🇷 Tiếng Hàn (gTTS Backup)' }
  ]},
  { group: '🇪🇺 Các Ngôn Ngữ Khác (Châu Âu)', items: [
    { value: 'fr-FR-DeniseNeural', label: '🇫🇷 Denise (Pháp - EdgeTTS)' },
    { value: 'de-DE-KillianNeural', label: '🇩🇪 Killian (Đức - EdgeTTS)' },
    { value: 'es-ES-ElviraNeural', label: '🇪🇸 Elvira (Tây Ban Nha - EdgeTTS)' },
    { value: 'ru-RU-SvetlanaNeural', label: '🇷🇺 Svetlana (Nga - EdgeTTS)' },
    { value: 'it-IT-ElsaNeural', label: '🇮🇹 Elsa (Ý - EdgeTTS)' }
  ]}
]

export function DeckAudioSettings({ deckId, initialSettings, onSaved }: DeckAudioSettingsProps) {
  const queryClient = useQueryClient()
  
  // Mapping State
  const [sourceField, setSourceField] = useState('front')
  const [targetField, setTargetField] = useState('front_audio_url')
  const [voiceName, setVoiceName] = useState('auto')
  const [speechRate, setSpeechRate] = useState('1.0')
  const [forceAudio, setForceAudio] = useState(false)

  // Status & Loaders
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isRunningAudio, setIsRunningAudio] = useState(false)
  const [audioMessage, setAudioMessage] = useState<string | null>(null)

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
    'front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url'
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
      if (effectiveSettings.audio_voice_name) {
        setVoiceName(effectiveSettings.audio_voice_name)
      } else if (effectiveSettings.audio_voice_lang) {
        // Fallback for legacy voice_lang
        setVoiceName(effectiveSettings.audio_voice_lang)
      }
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
          audio_voice_name: voiceName,
          audio_voice_lang: voiceName === 'auto' ? 'ja-JP' : voiceName,
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
        voice_name: voiceName !== 'auto' ? voiceName : undefined,
      })
      setAudioMessage(res.data?.message || 'Đã gửi yêu cầu tạo âm thanh TTS chạy nền thành công!')
      setTimeout(() => {
        refetchTTSStatus()
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      }, 2000)
      setTimeout(() => setAudioMessage(null), 8000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Lỗi khi kích hoạt sinh âm thanh hàng loạt')
    } finally {
      setIsRunningAudio(false)
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
              <span>Cấu Hình Ánh Xạ Âm Thanh & Giọng Đọc (TTS Audio Studio)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Chọn cột văn bản đọc, cột lưu trữ URL âm thanh và chỉ định giọng đọc AI TTS (EdgeTTS / Google)
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

          {/* Specific Voice Engine Selection */}
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              3. Giọng Đọc & Bộ Engine AI TTS:
            </label>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-sky-200 rounded-xl text-xs font-black text-sky-900 outline-none focus:border-sky-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              {VOICE_OPTIONS.map((grp, gIdx) => (
                <optgroup key={gIdx} label={grp.group}>
                  {grp.items.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Hỗ trợ Microsoft Edge TTS Studio, Google Cloud Neural2 và gTTS dự phòng.
            </span>
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

      {/* SECTION 2: BULK AUDIO RUNNER STUDIO */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Headphones className="w-4 h-4 text-sky-600" />
              <span>Chạy Sinh Âm Thanh Hàng Loạt (CentralAuth Audio Queue)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Gửi toàn bộ danh sách thẻ tới CentralAuth để tổng hợp file âm thanh chạy ngầm
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetchTTSStatus()}
            className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Làm mới trạng thái"
          >
            <RefreshCw className={cn("w-3 h-3", isFetchingTTS && "animate-spin")} />
            <span>Kiểm tra trạng thái</span>
          </button>
        </div>

        {audioMessage && (
          <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
            <span>{audioMessage}</span>
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
            <span className="text-[10px] font-bold text-amber-600 uppercase block">Chưa Có Âm Thanh</span>
            <span className="text-lg font-black text-amber-700 mt-0.5 block">
              {ttsStatus?.missing_audio_cards ?? '--'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Đã Có Âm Thanh</span>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">
              {ttsStatus?.total_cards !== undefined && ttsStatus?.missing_audio_cards !== undefined
                ? Math.max(0, ttsStatus.total_cards - ttsStatus.missing_audio_cards)
                : '--'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-3 rounded-xl border border-slate-200 flex-1 min-w-[240px]">
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
            className="px-6 h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-xs shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRunningAudio ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>
              {isRunningAudio
                ? 'ĐANG GỬI QUEUE...'
                : `SINH AUDIO CHO "${sourceField.toUpperCase()}" ➜ "${targetField.toUpperCase()}"`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckAudioSettings
