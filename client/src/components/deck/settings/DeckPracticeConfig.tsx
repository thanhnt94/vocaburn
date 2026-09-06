import React, { useState, useEffect } from 'react'
import { Sliders, Save, Check, Trophy, Keyboard, Headphones, Brain, Plus, Trash2, RotateCcw, HelpCircle, Volume2, VolumeX, Image, ImageOff, Shuffle, Music, Sparkles, Move, Compass, MousePointer } from 'lucide-react'
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
    name: p.name || `${q} ➜ ${Array.isArray(a) ? a.join(', ') : a}`,
    prompt_col: p.prompt_col || q,
    answer_col: p.answer_col || a,
  }
}

export function DeckPracticeConfig({ deckId, initialSettings, onSaved }: DeckPracticeConfigProps) {
  const queryClient = useQueryClient()
  const [activeModeTab, setActiveModeTab] = useState<PracticeModeKey>('mcq')
  const [disabledModes, setDisabledModes] = useState<string[]>([])

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

  // Flashcard Gestures & Alignment Defaults
  const [studyCardFlipTrigger, setStudyCardFlipTrigger] = useState<'both' | 'tap' | 'button_only'>('both')
  const [studyCardRatingMode, setStudyCardRatingMode] = useState<'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'>('both')
  const [studyFrontValign, setStudyFrontValign] = useState<'center' | 'top'>('center')
  const [studyFrontHalign, setStudyFrontHalign] = useState<'left' | 'center'>('left')
  const [studyBackValign, setStudyBackValign] = useState<'center' | 'top'>('center')
  const [studyBackHalign, setStudyBackHalign] = useState<'left' | 'center'>('left')

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
        if (studyDefs.card_flip_trigger) setStudyCardFlipTrigger(studyDefs.card_flip_trigger)
        if (studyDefs.card_rating_mode) setStudyCardRatingMode(studyDefs.card_rating_mode)
        if (studyDefs.front_valign) setStudyFrontValign(studyDefs.front_valign)
        if (studyDefs.front_halign) setStudyFrontHalign(studyDefs.front_halign)
        if (studyDefs.back_valign) setStudyBackValign(studyDefs.back_valign)
        if (studyDefs.back_halign) setStudyBackHalign(studyDefs.back_halign)
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
    setCurrentPairs((prev) => [
      ...prev,
      {
        q: availableColumns[0] || 'front',
        a: availableColumns[1] || 'back',
        name: `Cặp #${prev.length + 1}`,
      },
    ])
  }

  const handleRemovePair = (index: number) => {
    setCurrentPairs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdatePair = (index: number, field: 'q' | 'a', value: string | string[]) => {
    setCurrentPairs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const baseSettings = practiceSettingsData?.creator_settings || initialSettings || {}

      const formattedMcqPairs = mcqPairs.map((p) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a[0] : p.a,
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a[0] : p.a,
      }))

      const formattedTypingPairs = typingPairs.map((p) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a : [p.a],
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a : [p.a],
      }))

      const formattedListeningPairs = listeningPairs.map((p) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a : [p.a],
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a : [p.a],
      }))

      const mcqSettings = {
        num_choices: mcqNumChoices,
        active_pairs: formattedMcqPairs,
      }
      const typingSettings = {
        active_pairs: formattedTypingPairs,
      }
      const listeningSettings = {
        num_choices: listeningNumChoices,
        active_pairs: formattedListeningPairs,
      }

      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...baseSettings,
          disabled_modes: disabledModes,
          mcq: mcqSettings,
          typing: typingSettings,
          listening: listeningSettings,
          study_defaults: {
            autoplay_audio: studyAutoplayAudio,
            show_images: studyShowImages,
            learning_mode: studyLearningMode,
            random_enabled: studyRandomEnabled,
            sfx_enabled: studySfxEnabled,
            quick_learn_enabled: studyQuickLearnEnabled,
            card_flip_trigger: studyCardFlipTrigger,
            card_rating_mode: studyCardRatingMode,
            front_valign: studyFrontValign,
            front_halign: studyFrontHalign,
            back_valign: studyBackValign,
            back_halign: studyBackHalign,
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
      label: 'Multiple Choice',
      sublabel: 'MCQ',
      icon: Trophy,
      color: 'text-amber-500',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-50',
      activeText: 'text-amber-700',
      desc: 'Prompt one column and generate multiple choices from other cards'
    },
    {
      key: 'typing' as const,
      label: 'Typing Drill',
      sublabel: 'Typing',
      icon: Keyboard,
      color: 'text-indigo-600',
      activeBorder: 'border-indigo-500',
      activeBg: 'bg-indigo-50',
      activeText: 'text-indigo-700',
      desc: 'Show prompt question and require typing exact answer characters'
    },
    {
      key: 'listening' as const,
      label: 'Listening Drill',
      sublabel: 'Listening',
      icon: Headphones,
      color: 'text-sky-600',
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-50',
      activeText: 'text-sky-700',
      desc: 'Play TTS audio pronunciation and select matching translation'
    },
    {
      key: 'flip' as const,
      label: 'Quick Flip',
      sublabel: 'Flip Card',
      icon: RotateCcw,
      color: 'text-emerald-600',
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-50',
      activeText: 'text-emerald-700',
      desc: 'Traditional 2-sided flashcard flip for rapid recall'
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
              <span>Deck Study Defaults (Creator Baseline)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Initial baseline configuration applied to all learners opening this deck (learners can customize their personal settings).
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
            Deck Creator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Autoplay Audio Default */}
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                TTS Audio Autoplay
              </span>
              <span className="text-[9px] font-bold text-slate-400">Default</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
              {[
                { id: 'none', label: 'Off', icon: VolumeX },
                { id: 'front', label: 'Front', icon: Volume2 },
                { id: 'back', label: 'Back', icon: Volume2 },
                { id: 'always', label: 'Both', icon: Volume2 }
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
                Image Illustrations
              </span>
              <span className="text-[9px] font-bold text-slate-400">Default</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
              {[
                { id: 'always', label: 'Both', icon: Image },
                { id: 'front', label: 'Front', icon: Image },
                { id: 'back', label: 'Back', icon: Image },
                { id: 'none', label: 'Off', icon: ImageOff }
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
                Default Learning Mode
              </span>
              <span className="text-[9px] font-bold text-slate-400">Startup</span>
            </div>
            <select
              value={studyLearningMode}
              onChange={(e) => setStudyLearningMode(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="fsrs">Flashcard FSRS (Spaced Repetition)</option>
              <option value="roadmap">Daily Roadmap</option>
              <option value="flip">Quick Flip (Flip Cards)</option>
              <option value="mcq">Multiple Choice (MCQ Quiz)</option>
              <option value="typing">Typing Drill</option>
              <option value="listening">Listening Drill</option>
              <option value="new">New Cards</option>
              <option value="review">Review Due Cards</option>
            </select>
          </div>
        </div>

        {/* Sensory & Toggles Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Random Shuffle Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Shuffle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Shuffle Questions</span>
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
              <span className="text-xs font-bold text-slate-700 truncate">Sound FX (SFX)</span>
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
              <span className="text-xs font-bold text-slate-700 truncate">Auto Advance (Quick Learn)</span>
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

        {/* 4. Flashcard Gestures Default */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-purple-600" />
              Default Flashcard Gestures
            </span>
            <span className="text-[9px] font-bold text-slate-400">Applied to learners</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card Flip Trigger */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5 text-indigo-600" />
                  Card Flip Trigger
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                {[
                  { id: 'both', label: 'Touch & Swipe' },
                  { id: 'tap', label: 'Touch Only' },
                  { id: 'button_only', label: 'Button Only' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStudyCardFlipTrigger(opt.id as any)}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-black transition-all text-center cursor-pointer active:scale-95",
                      studyCardFlipTrigger === opt.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FSRS Rating Mode */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-600" />
                  FSRS Recall Rating Mode
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                {[
                  { id: 'both', label: 'Both' },
                  { id: 'swipe_4way', label: '4-Way' },
                  { id: 'swipe_2way', label: '2-Way' },
                  { id: 'buttons', label: '4 Buttons' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStudyCardRatingMode(opt.id as any)}
                    className={cn(
                      "py-1.5 px-0.5 rounded-lg text-[9.5px] font-black transition-all text-center cursor-pointer active:scale-95 truncate",
                      studyCardRatingMode === opt.id
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Card Alignment Defaults */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Default Card Alignment (2-Axis)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Front Card Alignment */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Front Card Alignment</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Vertical:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {(['center', 'top'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setStudyFrontValign(v)}
                        className={cn(
                          "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all text-center cursor-pointer",
                          studyFrontValign === v ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {v === 'center' ? 'Center' : 'Top'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {(['left', 'center'] as const).map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setStudyFrontHalign(h)}
                        className={cn(
                          "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all text-center cursor-pointer",
                          studyFrontHalign === h ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {h === 'left' ? 'Left' : 'Center'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Back Card Alignment */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Back Card Alignment</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Vertical:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {(['center', 'top'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setStudyBackValign(v)}
                        className={cn(
                          "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all text-center cursor-pointer",
                          studyBackValign === v ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {v === 'center' ? 'Center' : 'Top'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {(['left', 'center'] as const).map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setStudyBackHalign(h)}
                        className={cn(
                          "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all text-center cursor-pointer",
                          studyBackHalign === h ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {h === 'left' ? 'Left' : 'Center'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ PRACTICE MODES SEGMENTED SELECTOR ═══════════ */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Per-Mode Practice Configurations</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Configure active question-answer columns and options for each practice mode
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
            <Check className="w-4 h-4" /> Practice configurations saved successfully for all modes!
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
                    {isEnabled ? 'Active' : 'Disabled'}
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
                Mode Settings: {activeModeConfig.label} ({activeModeConfig.sublabel})
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {activeModeConfig.desc}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              {isCurrentModeEnabled ? 'Active' : 'Disabled'}
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
              <span className="text-xs font-black text-slate-800 block">Multiple Choice Options Count:</span>
              <span className="text-[10px] text-slate-400 font-medium">Number of answer choices presented to the learner</span>
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
              <span className="text-xs font-black text-slate-800 block">Listening Drill Options Count:</span>
              <span className="text-[10px] text-slate-400 font-medium">Number of answer choices displayed after audio plays</span>
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
                  Active Column Pairs for {activeModeConfig.sublabel}:
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {activeModeTab === 'typing'
                    ? 'Designate prompt question column and target vocabulary column to type'
                    : activeModeTab === 'listening'
                    ? 'Designate audio script/voice column and target correct answer column'
                    : 'Designate question display column and correct answer column'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddPair}
                className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Pair</span>
              </button>
            </div>

            {/* Pairs Items */}
            <div className="space-y-2.5">
              {currentPairs.length === 0 ? (
                <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  No column pairs configured. Click "+ Add New Pair" to create one.
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
                            title="Delete pair"
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
                              ? '1. Prompt Column (Question):'
                              : activeModeTab === 'listening'
                              ? '1. Audio TTS Column:'
                              : '1. Question Column (Prompt):'}
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
                                2. Accepted Answer Columns (Select 1 or more):
                              </label>
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border", activeModeTab === 'listening' ? "text-sky-600 bg-sky-50 border-sky-200/60" : "text-amber-600 bg-amber-50 border-amber-200/60")}>
                                Any column matches as correct
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
                              2. Target Answer Column:
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
            <span className="text-xs font-black text-slate-800 block">Quick Flip Mode</span>
            <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto">
              Automatically uses Front column for initial prompt and Back column for revelation with audio pronunciation.
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
            <span>{isSaving ? 'SAVING...' : 'SAVE PRACTICE CONFIG'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

export default DeckPracticeConfig
