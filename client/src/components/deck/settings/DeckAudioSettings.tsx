import React, { useState, useEffect } from 'react'
import { Volume2, Save, RefreshCw, CheckCircle2, Headphones, Server, Sparkles, Layers, Sliders, Plus, Trash2, HelpCircle } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface AudioConfigItem {
  id: string
  name: string
  source_col: string
  url_col: string
  lang: string
  enabled: boolean
}

export interface DeckAudioSettingsProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

export const LANGUAGE_VOICE_OPTIONS: Record<string, { label: string; voices: { value: string; label: string }[] }> = {
  ja: {
    label: '🇯🇵 Tiếng Nhật (Japanese - ja)',
    voices: [
      { value: 'ja-JP-NanamiNeural', label: 'Nanami (Nữ - EdgeTTS Chuẩn Tokyo)' },
      { value: 'ja-JP-KeitaNeural', label: 'Keita (Nam - EdgeTTS Chuẩn Tokyo)' },
      { value: 'ja-JP-Neural2-C', label: 'Ja Neural2-C (Nữ - Google Cloud)' },
      { value: 'ja-JP-Neural2-D', label: 'Ja Neural2-D (Nam - Google Cloud)' },
      { value: 'gtts:ja', label: 'Tiếng Nhật (gTTS Dự phòng)' }
    ]
  },
  vi: {
    label: '🇻🇳 Tiếng Việt (Vietnamese - vi)',
    voices: [
      { value: 'vi-VN-HoaiMyNeural', label: 'Hoài My (Nữ - EdgeTTS Tự Nhiên)' },
      { value: 'vi-VN-NamMinhNeural', label: 'Nam Minh (Nam - EdgeTTS)' },
      { value: 'vi-VN-Neural2-A', label: 'Vi Neural2-A (Nữ - Google Cloud)' },
      { value: 'vi-VN-Neural2-F', label: 'Vi Neural2-F (Nam - Google Cloud)' },
      { value: 'gtts:vi', label: 'Tiếng Việt (gTTS Dự phòng)' }
    ]
  },
  en: {
    label: '🇺🇸 Tiếng Anh (English - en)',
    voices: [
      { value: 'en-US-AriaNeural', label: 'Aria (Nữ - US - EdgeTTS)' },
      { value: 'en-US-GuyNeural', label: 'Guy (Nam - US - EdgeTTS)' },
      { value: 'en-GB-SoniaNeural', label: 'Sonia (Nữ - UK - EdgeTTS)' },
      { value: 'en-US-Neural2-H', label: 'En Neural2-H (Nữ - Google Cloud)' },
      { value: 'gtts:en', label: 'Tiếng Anh (gTTS Dự phòng)' }
    ]
  },
  zh: {
    label: '🇨🇳 Tiếng Trung (Chinese - zh)',
    voices: [
      { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (Nữ - EdgeTTS)' },
      { value: 'gtts:zh', label: 'Tiếng Trung (gTTS Dự phòng)' }
    ]
  },
  ko: {
    label: '🇰🇷 Tiếng Hàn (Korean - ko)',
    voices: [
      { value: 'ko-KR-SunHiNeural', label: 'SunHi (Nữ - EdgeTTS)' },
      { value: 'gtts:ko', label: 'Tiếng Hàn (gTTS Dự phòng)' }
    ]
  }
}

export function DeckAudioSettings({ deckId, initialSettings, onSaved }: DeckAudioSettingsProps) {
  const queryClient = useQueryClient()
  
  // Dynamic Audio Configs List
  const [audioConfigs, setAudioConfigs] = useState<AudioConfigItem[]>([
    {
      id: 'cfg_front',
      name: 'Mặt trước (Front Audio)',
      source_col: 'front_audio_content',
      url_col: 'front_audio_url',
      lang: 'multi',
      enabled: true,
    },
    {
      id: 'cfg_back',
      name: 'Mặt sau (Back Audio)',
      source_col: 'back_audio_content',
      url_col: 'back_audio_url',
      lang: 'multi',
      enabled: true,
    }
  ])

  // Multi-Language Voice Matrix
  const [voiceMapping, setVoiceMapping] = useState<Record<string, string>>({
    ja: 'ja-JP-NanamiNeural',
    vi: 'vi-VN-HoaiMyNeural',
    en: 'en-US-AriaNeural',
    zh: 'zh-CN-XiaoxiaoNeural',
    ko: 'ko-KR-SunHiNeural'
  })

  // Global Settings
  const [speechRate, setSpeechRate] = useState('1.0')

  // Bulk Generator State
  const [selectedBulkTarget, setSelectedBulkTarget] = useState<string>('cfg_front')
  const [forceAudio, setForceAudio] = useState(false)
  const [isRunningAudio, setIsRunningAudio] = useState(false)
  const [audioMessage, setAudioMessage] = useState<string | null>(null)

  // Status & Loaders
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

  const availableColumns: string[] = practiceSettingsData?.available_columns || [
    'front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url'
  ]

  // Initialize Settings from backend
  useEffect(() => {
    const effectiveSettings = practiceSettingsData?.creator_settings || initialSettings
    if (effectiveSettings) {
      if (Array.isArray(effectiveSettings.audio_configs) && effectiveSettings.audio_configs.length > 0) {
        setAudioConfigs(effectiveSettings.audio_configs.map((c: any, idx: number) => ({
          id: c.id || `cfg_${idx}_${Date.now()}`,
          name: c.name || `Cấu hình #${idx + 1}`,
          source_col: c.source_col || c.audio_content_col || 'front_audio_content',
          url_col: c.url_col || c.audio_url_col || 'front_audio_url',
          lang: c.lang || 'multi',
          enabled: c.enabled !== false,
        })))
      } else {
        // Build initial items from legacy front_audio_config, back_audio_config, audio_pairs
        const items: AudioConfigItem[] = []
        const frontCfg = effectiveSettings.front_audio_config
        const backCfg = effectiveSettings.back_audio_config
        
        items.push({
          id: 'cfg_front',
          name: 'Mặt trước (Front Audio)',
          source_col: frontCfg?.audio_content_col || effectiveSettings.audio_source_field || 'front_audio_content',
          url_col: frontCfg?.audio_url_col || effectiveSettings.audio_target_field || 'front_audio_url',
          lang: frontCfg?.lang || 'multi',
          enabled: frontCfg?.lang !== 'none',
        })

        items.push({
          id: 'cfg_back',
          name: 'Mặt sau (Back Audio)',
          source_col: backCfg?.audio_content_col || 'back_audio_content',
          url_col: backCfg?.audio_url_col || 'back_audio_url',
          lang: backCfg?.lang || 'multi',
          enabled: backCfg?.lang !== 'none',
        })

        if (Array.isArray(effectiveSettings.audio_pairs)) {
          effectiveSettings.audio_pairs.forEach((p: any, pIdx: number) => {
            if (p && (p.text_col || p.audio_content_col)) {
              items.push({
                id: `cfg_custom_${pIdx}`,
                name: p.name || `Cấu hình mở rộng #${pIdx + 1}`,
                source_col: p.audio_content_col || p.text_col,
                url_col: p.audio_url_col || `${p.text_col}_audio_url`,
                lang: p.lang || 'multi',
                enabled: p.lang !== 'none',
              })
            }
          })
        }
        setAudioConfigs(items)
      }

      // Voice Mapping Matrix
      if (effectiveSettings.voice_mapping && typeof effectiveSettings.voice_mapping === 'object') {
        setVoiceMapping(prev => ({
          ...prev,
          ...effectiveSettings.voice_mapping
        }))
      }

      // Speech Rate
      if (effectiveSettings.audio_speech_rate) {
        setSpeechRate(String(effectiveSettings.audio_speech_rate))
      }
    }
  }, [practiceSettingsData, initialSettings])

  // Find active selected config for live TTS stats
  const activeSelectedConfig = audioConfigs.find(c => c.id === selectedBulkTarget) || audioConfigs[0]
  const activeStatusSource = activeSelectedConfig?.source_col || 'front_audio_content'
  const activeStatusTarget = activeSelectedConfig?.url_col || 'front_audio_url'

  // Query TTS Status
  const { data: ttsStatus, refetch: refetchTTSStatus, isFetching: isFetchingTTS } = useQuery({
    queryKey: ['deck-tts-status', String(deckId), activeStatusSource, activeStatusTarget],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/tts-status`, {
        params: { source_field: activeStatusSource, target_field: activeStatusTarget }
      })
      return res.data
    },
    enabled: !!deckId,
    staleTime: 10 * 1000,
  })

  // Handlers for Audio Configs List
  const handleAddAudioConfig = () => {
    const nextIdx = audioConfigs.length + 1
    const newConfig: AudioConfigItem = {
      id: `cfg_${Date.now()}`,
      name: `Cấu hình #${nextIdx}`,
      source_col: availableColumns[0] || 'front',
      url_col: `audio_url_${nextIdx}`,
      lang: 'multi',
      enabled: true,
    }
    setAudioConfigs(prev => [...prev, newConfig])
  }

  const handleUpdateConfig = (id: string, field: keyof AudioConfigItem, value: any) => {
    setAudioConfigs(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const handleRemoveConfig = (id: string) => {
    if (audioConfigs.length <= 1) {
      alert('Bạn cần giữ lại ít nhất 1 cấu hình âm thanh cho bộ thẻ!')
      return
    }
    setAudioConfigs(prev => prev.filter(item => item.id !== id))
    if (selectedBulkTarget === id) {
      const remaining = audioConfigs.filter(item => item.id !== id)
      setSelectedBulkTarget(remaining[0]?.id || 'all')
    }
  }

  const handleUpdateVoice = (langKey: string, voiceValue: string) => {
    setVoiceMapping(prev => ({
      ...prev,
      [langKey]: voiceValue
    }))
  }

  const handleSaveAudioConfig = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      // Find front & back config for backward compatibility
      const frontItem = audioConfigs.find(c => c.url_col === 'front_audio_url' || c.id === 'cfg_front') || audioConfigs[0]
      const backItem = audioConfigs.find(c => c.url_col === 'back_audio_url' || c.id === 'cfg_back') || audioConfigs[1]

      const updatedSettings = {
        ...initialSettings,
        audio_configs: audioConfigs,
        // Synchronize legacy keys
        front_audio_config: frontItem ? {
          audio_content_col: frontItem.source_col,
          audio_url_col: frontItem.url_col,
          lang: frontItem.lang,
          enabled: frontItem.lang !== 'none'
        } : undefined,
        back_audio_config: backItem ? {
          audio_content_col: backItem.source_col,
          audio_url_col: backItem.url_col,
          lang: backItem.lang,
          enabled: backItem.lang !== 'none'
        } : undefined,
        audio_pairs: audioConfigs.map(c => ({
          text_col: c.source_col,
          audio_content_col: c.source_col,
          audio_url_col: c.url_col,
          lang: c.lang
        })),
        voice_mapping: voiceMapping,
        audio_speech_rate: speechRate,
        audio_source_field: frontItem?.source_col || 'front_audio_content',
        audio_target_field: frontItem?.url_col || 'front_audio_url',
        audio_voice_lang: voiceMapping.ja || 'ja-JP-NanamiNeural'
      }

      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: updatedSettings,
        is_creator: true,
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Không thể lưu cấu hình âm thanh & TTS')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTriggerBulkAudio = async () => {
    setIsRunningAudio(true)
    setAudioMessage(null)
    try {
      const payload: any = {
        target_face: selectedBulkTarget,
        force: forceAudio,
      }

      if (selectedBulkTarget !== 'all') {
        const targetCfg = audioConfigs.find(c => c.id === selectedBulkTarget)
        if (targetCfg) {
          payload.source_field = targetCfg.source_col
          payload.target_field = targetCfg.url_col
          payload.voice_name = targetCfg.lang
        }
      }

      const res = await axios.post(`/api/v1/deck/${deckId}/generate-all-audio`, payload)
      setAudioMessage(res.data?.message || 'Đã gửi yêu cầu tạo âm thanh TTS chạy nền tới CentralAuth Queue thành công!')
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
      {/* ═══════════════ SECTION 1: AUDIO CONFIGURATIONS LIST ═══════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Danh Sách Cấu Hình Âm Thanh (Audio Mappings)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Khai báo bao nhiêu nguồn âm thanh tùy thích (Mặt trước, Mặt sau, Câu ví dụ, Giải thích...). Tự động nhận diện cấu trúc hoặc chọn ngôn ngữ cố định.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddAudioConfig}
            className="h-8.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ THÊM CẤU HÌNH AUDIO</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Đã lưu danh sách cấu hình âm thanh & giọng đọc thành công!
          </div>
        )}

        <div className="space-y-3.5">
          {audioConfigs.map((cfg, idx) => (
            <div
              key={cfg.id}
              className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="w-5.5 h-5.5 rounded-lg bg-slate-800 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={cfg.name}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'name', e.target.value)}
                    placeholder={`Tên gợi nhớ cấu hình #${idx + 1}`}
                    className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-sky-500 flex-1 min-w-[150px] shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveConfig(cfg.id)}
                    className="h-8.5 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Xóa cấu hình này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xóa</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Source Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Cột Kịch Bản / Chữ Cần Đọc:
                  </label>
                  <select
                    value={cfg.source_col}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'source_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col} {col === 'front_audio_content' ? '★ (Kịch bản âm thanh mặt trước)' : col === 'back_audio_content' ? '★ (Kịch bản âm thanh mặt sau)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target URL Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Cột Lưu Đường Dẫn Âm Thanh (URL):
                  </label>
                  <select
                    value={cfg.url_col}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'url_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col} {col === 'front_audio_url' ? '★ (URL Audio mặt trước)' : col === 'back_audio_url' ? '★ (URL Audio mặt sau)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language Mode */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Chế Độ Phát / Ngôn Ngữ:
                  </label>
                  <select
                    value={cfg.lang}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'lang', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-sky-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    <option value="multi">🌐 Tự động đa ngôn ngữ (Đọc tag [ja:..][vi:..] hoặc vi:, ja:)</option>
                    <option value="ja">🇯🇵 Chỉ đọc Tiếng Nhật (ja - Không cần cấu trúc tag)</option>
                    <option value="vi">🇻🇳 Chỉ đọc Tiếng Việt (vi - Không cần cấu trúc tag)</option>
                    <option value="en">🇺🇸 Chỉ đọc Tiếng Anh (en - Không cần cấu trúc tag)</option>
                    <option value="zh">🇨🇳 Chỉ đọc Tiếng Trung (zh)</option>
                    <option value="ko">🇰🇷 Chỉ đọc Tiếng Hàn (ko)</option>
                    <option value="none">🚫 Tắt âm thanh cho mục này</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ SECTION 2: MULTI-LANGUAGE VOICE MATRIX ═══════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-600" />
              <span>Cấu Hình Giọng Đọc Đa Ngôn Ngữ (Multi-Language Voice Studio)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Khi cấu hình ở chế độ &quot;Tự động đa ngôn ngữ&quot;, hệ thống sẽ dùng các giọng AI này để đọc từng đoạn tương ứng với tag ngôn ngữ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(LANGUAGE_VOICE_OPTIONS).map(([langKey, langInfo]) => (
            <div key={langKey} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-[11px] font-black text-slate-700 block truncate">
                {langInfo.label}
              </label>
              <select
                value={voiceMapping[langKey] || langInfo.voices[0]?.value}
                onChange={(e) => handleUpdateVoice(langKey, e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-purple-200 rounded-xl text-xs font-black text-purple-900 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
              >
                {langInfo.voices.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Speed Rate in the matrix grid */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="text-[11px] font-black text-slate-700 block flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Tốc Độ Đọc (Speech Rate):</span>
            </label>
            <select
              value={speechRate}
              onChange={(e) => setSpeechRate(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
            >
              <option value="0.75">Chậm (0.75x) - Luyện nghe sơ cấp</option>
              <option value="1.0">Chuẩn (1.0x) - Tự nhiên hàng ngày</option>
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
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU TOÀN BỘ CẤU HÌNH ÂM THANH'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════ SECTION 3: BULK AUDIO RUNNER STUDIO ═══════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Headphones className="w-4 h-4 text-sky-600" />
              <span>Chạy Sinh Âm Thanh Hàng Loạt (CentralAuth Audio Queue)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Gửi toàn bộ danh sách thẻ tới CentralAuth để tổng hợp file âm thanh theo ma trận giọng đọc đã cấu hình
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Chọn Cấu Hình Cần Sinh Âm Thanh:
            </label>
            <select
              value={selectedBulkTarget}
              onChange={(e) => setSelectedBulkTarget(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-sky-200 rounded-xl text-xs font-black text-sky-900 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
            >
              {audioConfigs.map((cfg, cIdx) => (
                <option key={cfg.id} value={cfg.id}>
                  [#{cIdx + 1}] {cfg.name} ➜ [{cfg.source_col}] sang [{cfg.url_col}] ({cfg.lang === 'multi' ? 'Đa ngôn ngữ' : cfg.lang.toUpperCase()})
                </option>
              ))}
              <option value="all">
                ✨ Tất cả các cấu hình đã khai báo
              </option>
            </select>
          </div>

          <div className="flex flex-col justify-between">
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5 block">
              Tùy chọn tạo lại:
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={forceAudio}
                onChange={(e) => setForceAudio(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                Ghi đè tất cả (Tạo lại cả những thẻ đã có sẵn audio)
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Server className="w-3.5 h-3.5 text-sky-600" />
            <span>Tiến trình gửi tới CentralAuth TTS Worker (Batch 100 thẻ/lô)</span>
          </div>

          <button
            type="button"
            onClick={handleTriggerBulkAudio}
            disabled={isRunningAudio}
            className="px-6 h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-xs shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
          >
            {isRunningAudio ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>
              {isRunningAudio
                ? 'ĐANG GỬI QUEUE...'
                : selectedBulkTarget === 'all'
                ? 'SINH AUDIO CHO TẤT CẢ CẤU HÌNH'
                : `SINH AUDIO CHO: "${(activeSelectedConfig?.name || 'MỤC ĐÃ CHỌN').toUpperCase()}"`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckAudioSettings
