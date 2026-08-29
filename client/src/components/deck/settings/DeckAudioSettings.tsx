import React, { useState, useEffect } from 'react'
import { Volume2, Save, RefreshCw, CheckCircle2, Headphones, Server, Layers, Sliders, Plus, Trash2, Info, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface AudioConfigItem {
  id: string
  name: string
  data_col: string     // Cột dữ liệu hiển thị (front, back, example, kanji...)
  source_col: string   // Cột nội dung đọc (front_audio_content, back_audio_content...)
  url_col: string      // Cột lưu đường dẫn âm thanh (front_audio_url, back_audio_url...)
  lang: string         // multi, vi, ja, en, zh, ko, none
  enabled: boolean
}

export interface DeckAudioSettingsProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

export const LANGUAGE_VOICE_OPTIONS: Record<string, { label: string; voices: { value: string; label: string }[] }> = {
  ja: {
    label: 'Tiếng Nhật',
    voices: [
      { value: 'ja-JP-NanamiNeural', label: 'Nanami - Nữ Tokyo' },
      { value: 'ja-JP-KeitaNeural', label: 'Keita - Nam Tokyo' },
      { value: 'ja-JP-Neural2-C', label: 'Ja Neural2-C - Nữ Google' },
      { value: 'ja-JP-Neural2-D', label: 'Ja Neural2-D - Nam Google' },
      { value: 'gtts:ja', label: 'Tiếng Nhật - gTTS' }
    ]
  },
  vi: {
    label: 'Tiếng Việt',
    voices: [
      { value: 'vi-VN-HoaiMyNeural', label: 'Hoài My - Nữ' },
      { value: 'vi-VN-NamMinhNeural', label: 'Nam Minh - Nam' },
      { value: 'vi-VN-Neural2-A', label: 'Vi Neural2-A - Nữ Google' },
      { value: 'vi-VN-Neural2-F', label: 'Vi Neural2-F - Nam Google' },
      { value: 'gtts:vi', label: 'Tiếng Việt - gTTS' }
    ]
  },
  en: {
    label: 'Tiếng Anh',
    voices: [
      { value: 'en-US-AriaNeural', label: 'Aria - Nữ US' },
      { value: 'en-US-GuyNeural', label: 'Guy - Nam US' },
      { value: 'en-GB-SoniaNeural', label: 'Sonia - Nữ UK' },
      { value: 'en-US-Neural2-H', label: 'En Neural2-H - Nữ Google' },
      { value: 'gtts:en', label: 'Tiếng Anh - gTTS' }
    ]
  },
  zh: {
    label: 'Tiếng Trung',
    voices: [
      { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao - Nữ' },
      { value: 'gtts:zh', label: 'Tiếng Trung - gTTS' }
    ]
  },
  ko: {
    label: 'Tiếng Hàn',
    voices: [
      { value: 'ko-KR-SunHiNeural', label: 'SunHi - Nữ' },
      { value: 'gtts:ko', label: 'Tiếng Hàn - gTTS' }
    ]
  }
}

export function DeckAudioSettings({ deckId, initialSettings, onSaved }: DeckAudioSettingsProps) {
  const queryClient = useQueryClient()
  
  // Dynamic Audio Configs List
  const [audioConfigs, setAudioConfigs] = useState<AudioConfigItem[]>([
    {
      id: 'cfg_front',
      name: 'Mặt trước',
      data_col: 'front',
      source_col: 'front_audio_content',
      url_col: 'front_audio_url',
      lang: 'multi',
      enabled: true,
    },
    {
      id: 'cfg_back',
      name: 'Mặt sau',
      data_col: 'back',
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
          data_col: c.data_col || c.text_col || (idx === 0 ? 'front' : (idx === 1 ? 'back' : (availableColumns[0] || 'front'))),
          source_col: c.source_col || c.audio_content_col || (idx === 0 ? 'front_audio_content' : (idx === 1 ? 'back_audio_content' : (availableColumns[0] || 'front_audio_content'))),
          url_col: c.url_col || c.audio_url_col || (idx === 0 ? 'front_audio_url' : (idx === 1 ? 'back_audio_url' : `audio_url_${idx + 1}`)),
          lang: c.lang || 'multi',
          enabled: c.enabled !== false,
        })))
      } else {
        // Simple default: only 2 standard items
        const frontCfg = effectiveSettings.front_audio_config
        const backCfg = effectiveSettings.back_audio_config
        
        setAudioConfigs([
          {
            id: 'cfg_front',
            name: 'Mặt trước',
            data_col: frontCfg?.data_col || 'front',
            source_col: frontCfg?.audio_content_col || effectiveSettings.audio_source_field || 'front_audio_content',
            url_col: frontCfg?.audio_url_col || effectiveSettings.audio_target_field || 'front_audio_url',
            lang: frontCfg?.lang || 'multi',
            enabled: frontCfg?.lang !== 'none',
          },
          {
            id: 'cfg_back',
            name: 'Mặt sau',
            data_col: backCfg?.data_col || 'back',
            source_col: backCfg?.audio_content_col || 'back_audio_content',
            url_col: backCfg?.audio_url_col || 'back_audio_url',
            lang: backCfg?.lang || 'multi',
            enabled: backCfg?.lang !== 'none',
          }
        ])
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
      data_col: availableColumns[0] || 'front',
      source_col: availableColumns[0] || 'front_audio_content',
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
      alert('Cần giữ lại ít nhất 1 cấu hình âm thanh.')
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
      const frontItem = audioConfigs.find(c => c.data_col === 'front' || c.url_col === 'front_audio_url' || c.id === 'cfg_front') || audioConfigs[0]
      const backItem = audioConfigs.find(c => c.data_col === 'back' || c.url_col === 'back_audio_url' || c.id === 'cfg_back') || audioConfigs[1]

      const updatedSettings = {
        ...initialSettings,
        audio_configs: audioConfigs,
        front_audio_config: frontItem ? {
          audio_content_col: frontItem.source_col,
          audio_url_col: frontItem.url_col,
          data_col: frontItem.data_col,
          lang: frontItem.lang,
          enabled: frontItem.lang !== 'none'
        } : undefined,
        back_audio_config: backItem ? {
          audio_content_col: backItem.source_col,
          audio_url_col: backItem.url_col,
          data_col: backItem.data_col,
          lang: backItem.lang,
          enabled: backItem.lang !== 'none'
        } : undefined,
        audio_pairs: audioConfigs.map(c => ({
          text_col: c.data_col || c.source_col,
          data_col: c.data_col,
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
      alert(e?.response?.data?.error || 'Lỗi lưu cấu hình âm thanh')
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
      setAudioMessage(res.data?.message || 'Đã gửi yêu cầu sinh âm thanh.')
      setTimeout(() => {
        refetchTTSStatus()
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      }, 2000)
      setTimeout(() => setAudioMessage(null), 8000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Lỗi sinh âm thanh hàng loạt')
    } finally {
      setIsRunningAudio(false)
    }
  }

  return (
    <div className="space-y-5 text-left animate-in fade-in duration-200">
      {/* ═══════════════ SECTION 1: AUDIO CONFIGURATIONS LIST ═══════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>DANH SÁCH CẤU HÌNH ÂM THANH</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Liên kết giữa cột dữ liệu hiển thị (khi lật thẻ/MCQ) với kịch bản đọc TTS và cột lưu trữ file MP3.
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
            <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình âm thanh thành công!
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
                    placeholder={`Cấu hình #${idx + 1}`}
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

              {/* 4 COLUMNS MATRIX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Data / Trigger Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>Cột dữ liệu (Mặt thẻ):</span>
                  </label>
                  <select
                    value={cfg.data_col}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'data_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400 mt-0.5">Kích hoạt khi xem cột này</p>
                </div>

                {/* 2. Source TTS Script Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>Cột nội dung đọc:</span>
                  </label>
                  <select
                    value={cfg.source_col}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'source_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400 mt-0.5">Văn bản để AI/TTS đọc</p>
                </div>

                {/* 3. Target URL Column */}
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>Cột lưu đường dẫn âm thanh:</span>
                  </label>
                  <select
                    value={cfg.url_col}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'url_col', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400 mt-0.5">Link lưu file MP3</p>
                </div>

                {/* 4. Language Mode */}
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>Chế độ phát / Ngôn ngữ:</span>
                  </label>
                  <select
                    value={cfg.lang}
                    onChange={(e) => handleUpdateConfig(cfg.id, 'lang', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-sky-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    <option value="multi">Đa ngôn ngữ</option>
                    <option value="vi">Tiếng Việt</option>
                    <option value="ja">Tiếng Nhật</option>
                    <option value="en">Tiếng Anh</option>
                    <option value="zh">Tiếng Trung</option>
                    <option value="ko">Tiếng Hàn</option>
                    <option value="none">Tắt</option>
                  </select>
                  <p className="text-[9px] text-slate-400 mt-0.5">Ngôn ngữ hoặc đa giọng</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ SECTION 2: MULTI-LANGUAGE VOICE MATRIX ═══════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
            <Headphones className="w-4 h-4 text-purple-600" />
            <span>CẤU HÌNH GIỌNG ĐỌC CHO CHẾ ĐỘ ĐA NGÔN NGỮ (MULTI)</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Chỉ định chính xác giọng đọc cho từng tag ngôn ngữ (ví dụ: <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">ja:</code>, <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">vi:</code>, <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">en:</code>) khi kịch bản đọc chứa nhiều ngôn ngữ.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(LANGUAGE_VOICE_OPTIONS).map(([langKey, langData]) => (
            <div key={langKey} className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">{langData.label}</span>
                <span className="font-mono text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                  {langKey}:
                </span>
              </div>
              <select
                value={voiceMapping[langKey] || langData.voices[0]?.value}
                onChange={(e) => handleUpdateVoice(langKey, e.target.value)}
                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
              >
                {langData.voices.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ SECTION 3: SPEECH SPEED & GLOBAL SETTINGS ═══════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>TỐC ĐỘ ĐỌC (SPEECH RATE)</span>
          </h3>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Tốc độ đọc chung:</label>
            <select
              value={speechRate}
              onChange={(e) => setSpeechRate(e.target.value)}
              className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="0.75">0.75x (Chậm)</option>
              <option value="0.9">0.9x (Vừa phải)</option>
              <option value="1.0">1.0x (Chuẩn bình thường)</option>
              <option value="1.1">1.1x (Hơi nhanh)</option>
              <option value="1.25">1.25x (Nhanh)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════ SAVE CONFIGURATION BUTTON ═══════════════ */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSaveAudioConfig}
          disabled={isSaving}
          className="h-11 px-6 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'ĐANG LƯU CẤU HÌNH...' : 'LƯU TOÀN BỘ CẤU HÌNH AUDIO'}</span>
        </button>
      </div>

      {/* ═══════════════ SECTION 4: BATCH TTS GENERATOR STUDIO ═══════════════ */}
      <div className="bg-gradient-to-br from-sky-50/70 via-indigo-50/40 to-slate-50 rounded-3xl p-5 sm:p-6 border border-sky-100 shadow-xs space-y-4">
        <div className="border-b border-sky-100/80 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-sky-950 uppercase tracking-widest leading-none flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              <span>CÔNG CỤ SINH FILE ÂM THANH HÀNG LOẠT (BULK TTS GENERATOR)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Hệ thống sẽ duyệt toàn bộ thẻ và gọi Edge TTS / Google TTS sinh sẵn file MP3 lưu vào server.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetchTTSStatus()}
            disabled={isFetchingTTS}
            className="h-7.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("w-3 h-3", isFetchingTTS && "animate-spin text-sky-600")} />
            <span>Làm mới tiến độ</span>
          </button>
        </div>

        {/* Live Audio Status Monitor */}
        {ttsStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Tổng số thẻ</span>
              <span className="text-sm font-black text-slate-800">{ttsStatus.total_cards || 0}</span>
            </div>
            <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Đã có âm thanh</span>
              <span className="text-sm font-black text-emerald-600">{ttsStatus.total_with_audio || 0}</span>
            </div>
            <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Chưa có âm thanh</span>
              <span className="text-sm font-black text-amber-600">{ttsStatus.total_missing_audio || 0}</span>
            </div>
            <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Có kịch bản đọc</span>
              <span className="text-sm font-black text-sky-600">{ttsStatus.total_with_content || 0}</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap pt-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Mục tiêu sinh:</label>
            <select
              value={selectedBulkTarget}
              onChange={(e) => setSelectedBulkTarget(e.target.value)}
              className="h-9 px-3 bg-white border border-sky-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
            >
              {audioConfigs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.source_col} ➜ {c.url_col})
                </option>
              ))}
              <option value="all">Tất cả cấu hình (Mặt trước + Mặt sau)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <input
              type="checkbox"
              checked={forceAudio}
              onChange={(e) => setForceAudio(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
            />
            <span>Ghi đè âm thanh đã có (Force regenerate)</span>
          </label>

          <button
            type="button"
            onClick={handleTriggerBulkAudio}
            disabled={isRunningAudio}
            className="h-9 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs active:scale-95 ml-auto"
          >
            {isRunningAudio ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isRunningAudio ? 'ĐANG KHỞI CHẠY SINH ÂM THANH...' : 'BẮT ĐẦU SINH ÂM THANH'}</span>
          </button>
        </div>

        {audioMessage && (
          <div className="p-3 bg-sky-100 border border-sky-200 text-sky-800 text-xs rounded-xl font-bold flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-sky-600" />
            <span>{audioMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
