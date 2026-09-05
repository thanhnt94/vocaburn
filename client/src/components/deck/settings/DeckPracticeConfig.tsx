import React, { useState, useEffect } from 'react'
import { Sliders, Save, Check, Trophy, Keyboard, Headphones, Brain, Plus, Trash2, RotateCcw, HelpCircle, Volume2, VolumeX, Image, ImageOff, Shuffle, Music, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export type PracticeModeKey = 'mcq' | 'typing' | 'listening' | 'flip'

export interface QuestionAnswerPair {
  q: string
  a: string | string[]
  name?: string
  prompt_col?: string
  answer_col?: string | string[]
}

export interface DeckPracticeConfigProps {
  deckId: string | number
  initialSettings: any
  onSaved?: () => void
}

function normalizePair(p: any): QuestionAnswerPair {
  if (!p) return { q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back' }
  if (typeof p === 'string') {
    const parts = p.split(/[-:>]/)
    const q = (parts[0] || 'front').trim()
    const a = (parts[1] || 'back').trim()
    return { q, a, prompt_col: q, answer_col: a, name: p }
  }
  const q = String(p.q || p.prompt_col || p.question_col || p.question || p.from || p.source || 'front').trim()
  let a: string | string[]
  const rawA = p.a !== undefined ? p.a : (p.answer_col !== undefined ? p.answer_col : (p.answer || p.to || p.target || 'back'))
  if (Array.isArray(rawA)) {
    a = rawA.map(x => String(x).trim()).filter(Boolean)
  } else if (typeof rawA === 'string' && rawA.includes(',')) {
    a = rawA.split(',').map(x => x.trim()).filter(Boolean)
  } else {
    a = String(rawA || 'back').trim()
  }
  return {
    q,
    a,
    prompt_col: q,
    answer_col: a,
    name: p.name || ''
  }
}

export function DeckPracticeConfig({ deckId, initialSettings, onSaved }: DeckPracticeConfigProps) {
  const queryClient = useQueryClient()
  
  // Selected Practice Mode Tab
  const [activeModeTab, setActiveModeTab] = useState<PracticeModeKey>('mcq')
  const [disabledModes, setDisabledModes] = useState<string[]>([])
  
  // Per-mode Q&A Pairs & Settings
  const [mcqPairs, setMcqPairs] = useState<QuestionAnswerPair[]>([])
  const [mcqNumChoices, setMcqNumChoices] = useState<number>(4)

  const [typingPairs, setTypingPairs] = useState<QuestionAnswerPair[]>([])

  const [listeningPairs, setListeningPairs] = useState<QuestionAnswerPair[]>([])
  const [listeningNumChoices, setListeningNumChoices] = useState<number>(4)

  // Creator Default Study Settings for Learners
  const [studyAutoplayAudio, setStudyAutoplayAudio] = useState<'none' | 'front' | 'back' | 'always'>('none')
  const [studyShowImages, setStudyShowImages] = useState<'always' | 'front' | 'back' | 'none'>('always')
  const [studyLearningMode, setStudyLearningMode] = useState<string>('fsrs')
  const [studyRandomEnabled, setStudyRandomEnabled] = useState<boolean>(false)
  const [studySfxEnabled, setStudySfxEnabled] = useState<boolean>(true)
  const [studyQuickLearnEnabled, setStudyQuickLearnEnabled] = useState<boolean>(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Fetch available columns and full practice settings from backend
  const { data: practiceSettingsData } = useQuery({
    queryKey: ['deck-practice-settings', String(deckId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000,
  })

  // Combine available columns
  const rawAvailableColumns: string[] = practiceSettingsData?.available_columns || [
    'front', 'back', 'explanation', 'furigana', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url'
  ]

  // Collect all unique columns mentioned in pairs + available columns
  const allPairCols: string[] = []
  const addCols = (val: string | string[] | undefined) => {
    if (!val) return
    if (Array.isArray(val)) {
      val.forEach(v => { if (typeof v === 'string' && v.trim()) allPairCols.push(v.trim()) })
    } else if (typeof val === 'string' && val.trim()) {
      if (val.includes(',')) {
        val.split(',').forEach(v => { if (v.trim()) allPairCols.push(v.trim()) })
      } else {
        allPairCols.push(val.trim())
      }
    }
  }

  mcqPairs.forEach(p => { addCols(p.q); addCols(p.a) })
  typingPairs.forEach(p => { addCols(p.q); addCols(p.a) })
  listeningPairs.forEach(p => { addCols(p.q); addCols(p.a) })

  const availableColumns: string[] = Array.from(new Set([
    ...rawAvailableColumns,
    ...allPairCols,
    'front', 'back'
  ])).filter((c): c is string => typeof c === 'string' && Boolean(c))

  useEffect(() => {
    const effectiveSettings = practiceSettingsData?.creator_settings || initialSettings

    if (effectiveSettings) {
      setDisabledModes(effectiveSettings.disabled_modes || [])
      
      // MCQ
      const mcqConfig = effectiveSettings.mcq || {}
      setMcqNumChoices(mcqConfig.num_choices || effectiveSettings.num_choices || 4)
      const rawMcqPairs = mcqConfig.active_pairs || effectiveSettings.active_pairs || []
      if (Array.isArray(rawMcqPairs) && rawMcqPairs.length > 0) {
        setMcqPairs(rawMcqPairs.map(normalizePair))
      } else {
        setMcqPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back', name: 'Mặt trước ➜ Mặt sau' }])
      }

      // Typing
      const typingConfig = effectiveSettings.typing || {}
      const rawTypingPairs = typingConfig.active_pairs || effectiveSettings.active_pairs || []
      if (Array.isArray(rawTypingPairs) && rawTypingPairs.length > 0) {
        setTypingPairs(rawTypingPairs.map(normalizePair))
      } else {
        setTypingPairs([{ q: 'back', a: 'front', prompt_col: 'back', answer_col: 'front', name: 'Nghĩa (Đề) ➜ Từ vựng (Gõ)' }])
      }

      // Listening
      const listeningConfig = effectiveSettings.listening || {}
      setListeningNumChoices(listeningConfig.num_choices || 4)
      const rawListeningPairs = listeningConfig.active_pairs || effectiveSettings.active_pairs || []
      if (Array.isArray(rawListeningPairs) && rawListeningPairs.length > 0) {
        setListeningPairs(rawListeningPairs.map(normalizePair))
      } else {
        setListeningPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back', name: 'Nghe phát âm ➜ Chọn nghĩa' }])
      }

      // Creator Study Defaults
      const studyDefs = practiceSettingsData?.creator_study_defaults || practiceSettingsData?.study_defaults || effectiveSettings?.study_defaults || {}
      if (studyDefs && typeof studyDefs === 'object') {
        if (studyDefs.autoplay_audio) setStudyAutoplayAudio(studyDefs.autoplay_audio)
        if (studyDefs.show_images) setStudyShowImages(studyDefs.show_images)
        if (studyDefs.learning_mode) setStudyLearningMode(studyDefs.learning_mode)
        if (studyDefs.random_enabled !== undefined) setStudyRandomEnabled(Boolean(studyDefs.random_enabled))
        if (studyDefs.sfx_enabled !== undefined) setStudySfxEnabled(Boolean(studyDefs.sfx_enabled))
        if (studyDefs.quick_learn_enabled !== undefined) setStudyQuickLearnEnabled(Boolean(studyDefs.quick_learn_enabled))
      }
    } else {
      setMcqPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back' }])
      setTypingPairs([{ q: 'back', a: 'front', prompt_col: 'back', answer_col: 'front' }])
      setListeningPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back' }])
    }
  }, [practiceSettingsData, initialSettings])

  const toggleModeDisabled = (modeKey: string) => {
    setDisabledModes((prev) =>
      prev.includes(modeKey) ? prev.filter((m) => m !== modeKey) : [...prev, modeKey]
    )
  }

  // Pair helpers for currently active mode
  const getCurrentPairs = (): QuestionAnswerPair[] => {
    if (activeModeTab === 'mcq') return mcqPairs
    if (activeModeTab === 'typing') return typingPairs
    if (activeModeTab === 'listening') return listeningPairs
    return []
  }

  const setCurrentPairs = (updater: (prev: QuestionAnswerPair[]) => QuestionAnswerPair[]) => {
    if (activeModeTab === 'mcq') setMcqPairs(updater)
    else if (activeModeTab === 'typing') setTypingPairs(updater)
    else if (activeModeTab === 'listening') setListeningPairs(updater)
  }

  const handleAddPair = () => {
    setCurrentPairs(prev => [
      ...prev,
      {
        q: activeModeTab === 'typing' ? 'back' : 'front',
        a: activeModeTab === 'typing' ? 'front' : 'back',
        prompt_col: activeModeTab === 'typing' ? 'back' : 'front',
        answer_col: activeModeTab === 'typing' ? 'front' : 'back',
        name: `Cặp #${prev.length + 1}`
      }
    ])
  }

  const handleRemovePair = (index: number) => {
    setCurrentPairs(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdatePair = (index: number, field: 'q' | 'a', value: string | string[]) => {
    setCurrentPairs(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, [field]: value }
        if (field === 'q') updated.prompt_col = typeof value === 'string' ? value : value[0]
        if (field === 'a') updated.answer_col = value
        return updated
      }
      return item
    }))
  }

  const formatPairs = (pairs: QuestionAnswerPair[]) => {
    return pairs.map(p => ({
      q: p.q || 'front',
      a: p.a || 'back',
      prompt_col: p.q || 'front',
      answer_col: p.a || 'back',
      name: p.name || `${p.q} ➜ ${Array.isArray(p.a) ? p.a.join('/') : p.a}`
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    const formattedMcqPairs = formatPairs(mcqPairs)
    const formattedTypingPairs = formatPairs(typingPairs)
    const formattedListeningPairs = formatPairs(listeningPairs)

    const baseSettings = practiceSettingsData?.creator_settings || initialSettings || {}

    try {
      const mcqSettings = {
        active_pairs: formattedMcqPairs,
        num_choices: mcqNumChoices,
      }
      const typingSettings = {
        active_pairs: formattedTypingPairs,
      }
      const listeningSettings = {
        active_pairs: formattedListeningPairs,
        num_choices: listeningNumChoices,
      }

      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...baseSettings,
          disabled_modes: disabledModes,
          num_choices: mcqNumChoices,
          active_pairs: formattedMcqPairs,
          mcq: mcqSettings,
          typing: typingSettings,
          listening: listeningSettings,
          study_defaults: {
            autoplay_audio: studyAutoplayAudio,
            show_images: studyShowImages,
            learning_mode: studyLearningMode,
            random_enabled: studyRandomEnabled,
            sfx_enabled: studySfxEnabled,
            quick_learn_enabled: studyQuickLearnEnabled
          }
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

  const modesConfig = [
    {
      key: 'mcq' as const,
      label: 'Trắc Nghiệm',
      sublabel: 'MCQ',
      icon: Trophy,
      color: 'text-amber-500',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-50',
      activeText: 'text-amber-700',
      desc: 'Hỏi 1 cột và tạo các phương án lựa chọn ngẫu nhiên từ các thẻ khác'
    },
    {
      key: 'typing' as const,
      label: 'Gõ Từ Vựng',
      sublabel: 'Typing',
      icon: Keyboard,
      color: 'text-indigo-600',
      activeBorder: 'border-indigo-500',
      activeBg: 'bg-indigo-50',
      activeText: 'text-indigo-700',
      desc: 'Hiển thị câu hỏi gợi ý và bắt buộc gõ chính xác từng ký tự của cột đáp án'
    },
    {
      key: 'listening' as const,
      label: 'Luyện Nghe',
      sublabel: 'Listening',
      icon: Headphones,
      color: 'text-sky-600',
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-50',
      activeText: 'text-sky-700',
      desc: 'Phát âm thanh/giọng đọc TTS và chọn đáp án dịch nghĩa đúng'
    },
    {
      key: 'flip' as const,
      label: 'Lật Thẻ',
      sublabel: 'Flip Card',
      icon: RotateCcw,
      color: 'text-emerald-600',
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-50',
      activeText: 'text-emerald-700',
      desc: 'Chế độ lật mặt trước ➜ mặt sau phản xạ truyền thống'
    },
  ]

  const activeModeConfig = modesConfig.find(m => m.key === activeModeTab)!
  const isCurrentModeEnabled = !disabledModes.includes(activeModeTab)
  const currentPairs = getCurrentPairs()

  return (
    <form onSubmit={handleSave} className="space-y-4 text-left">
      {/* ═══════════ CREATOR STUDY DEFAULTS FOR LEARNERS ═══════════ */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Cài Đặt Học Mặc Định Đầu Vào (Creator Study Defaults)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Thiết lập cấu hình khởi đầu cho tất cả người học khi mở bộ thẻ này (người học có thể tự chỉnh lại sau trên tài khoản của họ)
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
            Tác giả bộ thẻ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Autoplay Audio Default */}
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                Âm thanh đọc TTS
              </span>
              <span className="text-[9px] font-bold text-slate-400">Mặc định</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
              {[
                { id: 'none', label: 'Tắt', icon: VolumeX },
                { id: 'front', label: 'Mặt trước', icon: Volume2 },
                { id: 'back', label: 'Mặt sau', icon: Volume2 },
                { id: 'always', label: 'Cả hai', icon: Volume2 }
              ].map(opt => {
                const active = studyAutoplayAudio === opt.id
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStudyAutoplayAudio(opt.id as any)}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95",
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Image Visibility Default */}
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-indigo-600" />
                Hình ảnh minh họa
              </span>
              <span className="text-[9px] font-bold text-slate-400">Mặc định</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
              {[
                { id: 'always', label: 'Cả hai', icon: Image },
                { id: 'front', label: 'Mặt trước', icon: Image },
                { id: 'back', label: 'Mặt sau', icon: Image },
                { id: 'none', label: 'Tắt', icon: ImageOff }
              ].map(opt => {
                const active = studyShowImages === opt.id
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStudyShowImages(opt.id as any)}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95",
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Initial Learning Mode Default */}
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                Chế độ học ban đầu
              </span>
              <span className="text-[9px] font-bold text-slate-400">Khởi đầu</span>
            </div>
            <select
              value={studyLearningMode}
              onChange={(e) => setStudyLearningMode(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="fsrs">Flashcard FSRS (Lặp lại ngắt quãng)</option>
              <option value="roadmap">Flashcard Lộ trình (Roadmap)</option>
              <option value="flip">Lật nhanh (Flip Cards)</option>
              <option value="mcq">Trắc nghiệm (MCQ Quiz)</option>
              <option value="typing">Gõ từ vựng (Typing Practice)</option>
              <option value="listening">Luyện nghe (Listening Practice)</option>
              <option value="new">Học từ mới (New Cards)</option>
              <option value="review">Ôn tập thẻ đến hạn (Review)</option>
            </select>
          </div>
        </div>

        {/* Sensory & Toggles Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Random Shuffle Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Shuffle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Mặc định xáo trộn (Shuffle)</span>
            </div>
            <button
              type="button"
              onClick={() => setStudyRandomEnabled(!studyRandomEnabled)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                studyRandomEnabled ? "bg-indigo-600" : "bg-slate-200"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", studyRandomEnabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>

          {/* SFX Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Âm thanh hiệu ứng (SFX)</span>
            </div>
            <button
              type="button"
              onClick={() => setStudySfxEnabled(!studySfxEnabled)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                studySfxEnabled ? "bg-indigo-600" : "bg-slate-200"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", studySfxEnabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>

          {/* Quick Learn (Auto Advance) Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Tự động chuyển câu</span>
            </div>
            <button
              type="button"
              onClick={() => setStudyQuickLearnEnabled(!studyQuickLearnEnabled)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                studyQuickLearnEnabled ? "bg-indigo-600" : "bg-slate-200"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", studyQuickLearnEnabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ PRACTICE MODES SEGMENTED SELECTOR ═══════════ */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Cấu Hình Từng Chế Độ Luyện Tập (Per-Mode Settings)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Chọn từng chế độ bên dưới để cài đặt riêng biệt cặp câu hỏi - đáp án và tùy chọn
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <Check className="w-4 h-4" /> Đã lưu cấu hình luyện tập thành công cho tất cả các chế độ!
          </div>
        )}

        {/* 4 Mode Pills Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {modesConfig.map((m) => {
            const Icon = m.icon
            const isSelected = activeModeTab === m.key
            const isEnabled = !disabledModes.includes(m.key)

            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveModeTab(m.key)}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer",
                  isSelected
                    ? `${m.activeBg} ${m.activeBorder} shadow-xs`
                    : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70 text-slate-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-2xs",
                    isSelected ? "bg-white" : "bg-white/80"
                  )}>
                    <Icon className={cn("w-4 h-4", m.color)} />
                  </div>

                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                    isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  )}>
                    {isEnabled ? 'Bật' : 'Tắt'}
                  </span>
                </div>

                <div>
                  <span className={cn(
                    "text-xs font-black block",
                    isSelected ? m.activeText : "text-slate-800"
                  )}>
                    {m.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {m.sublabel}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══════════ DETAILED CONFIG FOR SELECTED MODE ═══════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        {/* Header: Mode Name & Enable/Disable Toggle */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <activeModeConfig.icon className={cn("w-4.5 h-4.5", activeModeConfig.color)} />
            </span>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                Cài Đặt Riêng: {activeModeConfig.label} ({activeModeConfig.sublabel})
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {activeModeConfig.desc}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              {isCurrentModeEnabled ? 'Đang kích hoạt' : 'Đã vô hiệu hóa'}
            </span>
            <div
              onClick={() => toggleModeDisabled(activeModeTab)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer",
                isCurrentModeEnabled ? "bg-indigo-600" : "bg-slate-300"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-xs transition-transform",
                  isCurrentModeEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </div>
          </div>
        </div>

        {/* Mode-Specific Settings */}
        {activeModeTab === 'mcq' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs font-black text-slate-800 block">Số lượng phương án trắc nghiệm:</span>
              <span className="text-[10px] text-slate-400 font-medium">Số nút đáp án người học cần chọn</span>
            </div>

            <div className="flex items-center gap-2">
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMcqNumChoices(num)}
                  className={cn(
                    "w-9 h-8 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs border",
                    mcqNumChoices === num
                      ? "bg-amber-600 text-white border-amber-600 shadow-amber-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeModeTab === 'listening' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs font-black text-slate-800 block">Số lượng phương án trắc nghiệm nghe:</span>
              <span className="text-[10px] text-slate-400 font-medium">Số nút đáp án hiển thị sau khi nghe âm thanh</span>
            </div>

            <div className="flex items-center gap-2">
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setListeningNumChoices(num)}
                  className={cn(
                    "w-9 h-8 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs border",
                    listeningNumChoices === num
                      ? "bg-sky-600 text-white border-sky-600 shadow-sky-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pairs Configuration for MCQ, Typing, Listening */}
        {activeModeTab !== 'flip' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  Danh Sách Cặp Ghép Cột Dành Riêng Cho {activeModeConfig.sublabel}:
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {activeModeTab === 'typing'
                    ? 'Chỉ định cột làm đề bài gợi ý và cột từ vựng mục tiêu cần gõ'
                    : activeModeTab === 'listening'
                    ? 'Chỉ định cột file nghe / phát âm và cột đáp án đúng'
                    : 'Chỉ định cột hiển thị câu hỏi và cột đáp án đúng'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddPair}
                className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Cặp Mới</span>
              </button>
            </div>

            {/* Pairs Items */}
            <div className="space-y-2.5">
              {currentPairs.length === 0 ? (
                <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  Chưa có cặp cột nào được thiết lập. Nhấn "+ Thêm Cặp Mới" để tạo.
                </div>
              ) : (
                currentPairs.map((pair, idx) => {
                  const currentSelectedAnswerCols = Array.isArray(pair.a)
                    ? pair.a
                    : (typeof pair.a === 'string' ? pair.a.split(',').map(s => s.trim()).filter(Boolean) : ['front']);

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {pair.q} ➜ {Array.isArray(pair.a) ? pair.a.join(', ') : pair.a}
                          </span>
                        </div>

                        {currentPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePair(idx)}
                            className="w-6.5 h-6.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            title="Xóa cặp này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className={cn("grid gap-3 items-start", (activeModeTab === 'typing' || activeModeTab === 'listening') ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
                        {/* Question / Prompt Column */}
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                            {activeModeTab === 'typing'
                              ? '1. Cột Đề Bài Gợi Ý (Prompt):'
                              : activeModeTab === 'listening'
                              ? '1. Cột Kịch Bản/Giọng Đọc Phát Âm (Audio TTS):'
                              : '1. Cột Hiển Thị Câu Hỏi (Question):'}
                          </label>
                          <select
                            value={pair.q}
                            onChange={(e) => handleUpdatePair(idx, 'q', e.target.value)}
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                          >
                            {availableColumns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Answer Column(s) */}
                        {(activeModeTab === 'typing' || activeModeTab === 'listening') ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                2. Các Cột Đáp Án Được Chấp Nhận Khi Gõ (Chọn 1 hoặc nhiều):
                              </label>
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border", activeModeTab === 'listening' ? "text-sky-600 bg-sky-50 border-sky-200/60" : "text-amber-600 bg-amber-50 border-amber-200/60")}>
                                Cho phép gõ bất kỳ cột nào
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200">
                              {availableColumns.map((col) => {
                                const isSelected = currentSelectedAnswerCols.includes(col);
                                return (
                                  <button
                                    key={col}
                                    type="button"
                                    onClick={() => {
                                      let nextCols: string[];
                                      if (isSelected) {
                                        if (currentSelectedAnswerCols.length === 1) return;
                                        nextCols = currentSelectedAnswerCols.filter(c => c !== col);
                                      } else {
                                        nextCols = [...currentSelectedAnswerCols, col];
                                      }
                                      handleUpdatePair(idx, 'a', nextCols.length === 1 ? nextCols[0] : nextCols);
                                    }}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer",
                                      isSelected
                                        ? (activeModeTab === 'listening' ? "bg-sky-600 border-sky-600 text-white shadow-2xs" : "bg-amber-500 border-amber-500 text-white shadow-2xs")
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 opacity-80"
                                    )}
                                  >
                                    <span>{isSelected ? "✓" : "+"}</span>
                                    <span>{col.toUpperCase()}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                              2. Cột Chứa Đáp Án Đúng (Answer):
                            </label>
                            <select
                              value={typeof pair.a === 'string' ? pair.a : (pair.a[0] || 'back')}
                              onChange={(e) => handleUpdatePair(idx, 'a', e.target.value)}
                              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                            >
                              {availableColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeModeTab === 'flip' && (
          <div className="py-6 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-1">
            <span className="text-xs font-black text-slate-800 block">Chế Độ Lật Thẻ Phản Xạ Nhanh</span>
            <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto">
              Chế độ này tự động sử dụng cột Mặt trước (Front) làm mặt mở đầu và cột Mặt sau (Back) làm mặt giải nghĩa kèm âm thanh phát âm.
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU TẤT CẢ CẤU HÌNH LUYỆN TẬP'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

export default DeckPracticeConfig
