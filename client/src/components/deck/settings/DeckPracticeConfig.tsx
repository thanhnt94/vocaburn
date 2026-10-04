import React, { useState, useEffect, useRef } from 'react'
import {
  Sliders,
  Check,
  Trophy,
  Keyboard,
  Headphones,
  Brain,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  Sprout,
  CheckCircle2,
  HelpCircle,
  Target,
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAutoSaveStore } from './useAutoSaveNotifier'

export type PracticeModeKey = 'mcq' | 'typing' | 'listening_mcq' | 'listening_typing'
export type LearnModeKey = 'fsrs' | 'skim' | 'memrise'

export interface QuestionAnswerPair {
  q: string
  a: string | string[]
  name?: string
  prompt_col?: string
  answer_col?: string | string[]
}

export interface DeckPracticeConfigProps {
  deckId: string | number
  initialSettings?: any
  onSaved?: () => void
  section?: 'modes' | 'drills'
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

const FLASHCARD_LEARN_MODES = [
  {
    id: 'fsrs' as LearnModeKey,
    name: 'FSRS Spaced Repetition',
    shortName: 'FSRS v6',
    emoji: '🧠',
    desc: 'Adaptive spaced repetition based on memory retention with 4 rating buttons (Again, Hard, Good, Easy)',
    badge: 'Recommended',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    id: 'skim' as LearnModeKey,
    name: 'Speed Skim (Quick Scan)',
    shortName: 'Speed Skim',
    emoji: '⚡',
    desc: 'Rapid 1-tap/Space card scanning without rating friction (+3 XP per card). Ideal for quick review',
    badge: '1-Tap Rapid',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'memrise' as LearnModeKey,
    name: 'Memrise Mode',
    shortName: 'Memrise',
    emoji: '🌱',
    desc: 'Deep multi-stage word mastery: Plant new words, grow, and water them step-by-step',
    badge: 'Deep Study',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
]

export function DeckPracticeConfig({ deckId, initialSettings, onSaved, section }: DeckPracticeConfigProps) {
  const queryClient = useQueryClient()
  const [disabledModes, setDisabledModes] = useState<string[]>([])
  const [defaultLearnMode, setDefaultLearnMode] = useState<LearnModeKey>('fsrs')

  // Interactive practice modes
  const [activePracticeTab, setActivePracticeTab] = useState<PracticeModeKey>('mcq')
  const [mcqPairs, setMcqPairs] = useState<QuestionAnswerPair[]>([])
  const [mcqNumChoices, setMcqNumChoices] = useState<number>(4)

  const [typingPairs, setTypingPairs] = useState<QuestionAnswerPair[]>([])

  const [listeningMcqPairs, setListeningMcqPairs] = useState<QuestionAnswerPair[]>([])
  const [listeningMcqNumChoices, setListeningMcqNumChoices] = useState<number>(4)

  const [listeningTypingPairs, setListeningTypingPairs] = useState<QuestionAnswerPair[]>([])

  const { notifySaving, notifySaved, notifyError } = useAutoSaveStore()
  const isLoadedRef = useRef(false)
  const debounceTimerRef = useRef<any>(null)

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
  listeningMcqPairs.forEach(p => { addCols(p.q); addCols(p.a) })
  listeningTypingPairs.forEach(p => { addCols(p.q); addCols(p.a) })

  const availableColumns: string[] = Array.from(new Set([
    ...rawAvailableColumns,
    ...allPairCols,
    'front', 'back'
  ])).filter((c): c is string => typeof c === 'string' && Boolean(c))

  useEffect(() => {
    const effectiveSettings = practiceSettingsData?.creator_settings || initialSettings
    const studyDefs = practiceSettingsData?.creator_study_defaults || practiceSettingsData?.study_defaults || effectiveSettings?.study_defaults || {}

    if (effectiveSettings || studyDefs) {
      setDisabledModes(practiceSettingsData?.disabled_modes || effectiveSettings?.disabled_modes || [])

      const rawDefault = studyDefs.quiz_learning_mode || studyDefs.learning_mode || effectiveSettings?.learning_mode || 'fsrs'
      const sanitized = rawDefault === 'speed_skim' ? 'skim' : (rawDefault as LearnModeKey)
      setDefaultLearnMode(sanitized === 'skim' || sanitized === 'memrise' ? sanitized : 'fsrs')

      // MCQ
      const mcqConfig = effectiveSettings?.mcq || {}
      setMcqNumChoices(mcqConfig.num_choices || effectiveSettings?.num_choices || 4)
      const rawMcqPairs = mcqConfig.active_pairs || effectiveSettings?.active_pairs || []
      if (Array.isArray(rawMcqPairs) && rawMcqPairs.length > 0) {
        setMcqPairs(rawMcqPairs.map(normalizePair))
      } else {
        setMcqPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back', name: 'Mặt trước ➜ Mặt sau' }])
      }

      // Typing
      const typingConfig = effectiveSettings?.typing || {}
      const rawTypingPairs = typingConfig.active_pairs || effectiveSettings?.active_pairs || []
      if (Array.isArray(rawTypingPairs) && rawTypingPairs.length > 0) {
        setTypingPairs(rawTypingPairs.map(normalizePair))
      } else {
        setTypingPairs([{ q: 'back', a: 'front', prompt_col: 'back', answer_col: 'front', name: 'Nghĩa (Đề) ➜ Từ vựng (Gõ)' }])
      }

      // Listening MCQ
      const listeningMcqConfig = effectiveSettings?.listening_mcq || effectiveSettings?.listening || {}
      setListeningMcqNumChoices(listeningMcqConfig.num_choices || 4)
      const rawListeningMcqPairs = listeningMcqConfig.active_pairs || effectiveSettings?.listening?.active_pairs || effectiveSettings?.active_pairs || []
      if (Array.isArray(rawListeningMcqPairs) && rawListeningMcqPairs.length > 0) {
        setListeningMcqPairs(rawListeningMcqPairs.map(normalizePair))
      } else {
        setListeningMcqPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back', name: 'Nghe phát âm ➜ Chọn nghĩa' }])
      }

      // Listening Typing
      const listeningTypingConfig = effectiveSettings?.listening_typing || effectiveSettings?.listening || {}
      const rawListeningTypingPairs = listeningTypingConfig.active_pairs || effectiveSettings?.listening?.active_pairs || effectiveSettings?.active_pairs || []
      if (Array.isArray(rawListeningTypingPairs) && rawListeningTypingPairs.length > 0) {
        setListeningTypingPairs(rawListeningTypingPairs.map(normalizePair))
      } else {
        setListeningTypingPairs([{ q: 'front', a: 'front', prompt_col: 'front', answer_col: 'front', name: 'Nghe phát âm ➜ Gõ từ vựng' }])
      }
    } else {
      setMcqPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back' }])
      setTypingPairs([{ q: 'back', a: 'front', prompt_col: 'back', answer_col: 'front' }])
      setListeningMcqPairs([{ q: 'front', a: 'back', prompt_col: 'front', answer_col: 'back' }])
      setListeningTypingPairs([{ q: 'front', a: 'front', prompt_col: 'front', answer_col: 'front' }])
    }
    setTimeout(() => {
      isLoadedRef.current = true
    }, 150)
  }, [practiceSettingsData, initialSettings])

  const savePracticeConfig = (overrides?: any, immediate = false) => {
    if (!isLoadedRef.current) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const run = async () => {
      notifySaving('Saving modes...')
      const effDisabled = overrides?.disabledModes !== undefined ? overrides.disabledModes : disabledModes
      const effDefault = overrides?.defaultLearnMode !== undefined ? overrides.defaultLearnMode : defaultLearnMode
      const effMcqPairs = overrides?.mcqPairs || mcqPairs
      const effTypingPairs = overrides?.typingPairs || typingPairs
      const effListeningMcqPairs = overrides?.listeningMcqPairs || listeningMcqPairs
      const effListeningTypingPairs = overrides?.listeningTypingPairs || listeningTypingPairs
      const effMcqNum = overrides?.mcqNumChoices !== undefined ? overrides.mcqNumChoices : mcqNumChoices
      const effListeningNum = overrides?.listeningMcqNumChoices !== undefined ? overrides.listeningMcqNumChoices : listeningMcqNumChoices

      const baseSettings = practiceSettingsData?.creator_settings || initialSettings || {}

      const formattedMcqPairs = effMcqPairs.map((p: any) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a : [p.a],
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a : [p.a],
      }))

      const formattedTypingPairs = effTypingPairs.map((p: any) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a : [p.a],
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a : [p.a],
      }))

      const formattedListeningMcqPairs = effListeningMcqPairs.map((p: any) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a : [p.a],
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a : [p.a],
      }))

      const formattedListeningTypingPairs = effListeningTypingPairs.map((p: any) => ({
        q: p.q,
        a: Array.isArray(p.a) ? p.a : [p.a],
        prompt_col: p.q,
        answer_col: Array.isArray(p.a) ? p.a : [p.a],
      }))

      try {
        await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
          is_creator: true,
          disabled_modes: effDisabled,
          settings: {
            ...baseSettings,
            disabled_modes: effDisabled,
            study_defaults: {
              ...(baseSettings.study_defaults || {}),
              learning_mode: effDefault,
              quiz_learning_mode: effDefault,
            },
            mcq: { num_choices: effMcqNum, active_pairs: formattedMcqPairs },
            typing: { active_pairs: formattedTypingPairs },
            listening_mcq: { num_choices: effListeningNum, active_pairs: formattedListeningMcqPairs },
            listening_typing: { active_pairs: formattedListeningTypingPairs },
            listening: { num_choices: effListeningNum, active_pairs: formattedListeningMcqPairs },
          },
        })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
        notifySaved('Modes auto-saved')
        if (onSaved) onSaved()
      } catch (e: any) {
        notifyError(e?.response?.data?.error || 'Failed to save modes configuration')
      }
    }

    if (immediate) {
      run()
    } else {
      debounceTimerRef.current = setTimeout(run, 600)
    }
  }

  // Toggle mode enabled / disabled
  const toggleModeDisabled = (modeKey: string) => {
    const isCurrentlyDisabled = disabledModes.includes(modeKey)
    let nextDisabled = [...disabledModes]
    let nextDefault = defaultLearnMode
    if (!isCurrentlyDisabled) {
      // If disabling a learn mode, check that at least one remains active
      const learnIds = ['fsrs', 'skim', 'memrise']
      if (learnIds.includes(modeKey)) {
        const remaining = learnIds.filter(id => id !== modeKey && !disabledModes.includes(id))
        if (remaining.length === 0) {
          alert('At least one flashcard learning mode (FSRS, Speed Skim, or Memrise) must remain active for this deck!')
          return
        }
        if (defaultLearnMode === modeKey) {
          nextDefault = remaining[0] as LearnModeKey
          setDefaultLearnMode(nextDefault)
        }
      }
      nextDisabled = [...disabledModes, modeKey]
    } else {
      nextDisabled = disabledModes.filter(m => m !== modeKey)
    }
    setDisabledModes(nextDisabled)
    savePracticeConfig({ disabledModes: nextDisabled, defaultLearnMode: nextDefault }, true)
  }

  const handleSetDefaultLearnMode = (modeKey: LearnModeKey) => {
    setDefaultLearnMode(modeKey)
    savePracticeConfig({ defaultLearnMode: modeKey }, true)
  }

  const isModeEnabled = (modeKey: string) => !disabledModes.includes(modeKey)

  // Pair helpers for currently active practice mode
  const getCurrentPairs = (): QuestionAnswerPair[] => {
    if (activePracticeTab === 'mcq') return mcqPairs
    if (activePracticeTab === 'typing') return typingPairs
    if (activePracticeTab === 'listening_mcq') return listeningMcqPairs
    if (activePracticeTab === 'listening_typing') return listeningTypingPairs
    return []
  }

  const setCurrentPairs = (updater: (prev: QuestionAnswerPair[]) => QuestionAnswerPair[]) => {
    if (activePracticeTab === 'mcq') {
      setMcqPairs((prev) => {
        const updated = updater(prev)
        savePracticeConfig({ mcqPairs: updated }, false)
        return updated
      })
    } else if (activePracticeTab === 'typing') {
      setTypingPairs((prev) => {
        const updated = updater(prev)
        savePracticeConfig({ typingPairs: updated }, false)
        return updated
      })
    } else if (activePracticeTab === 'listening_mcq') {
      setListeningMcqPairs((prev) => {
        const updated = updater(prev)
        savePracticeConfig({ listeningMcqPairs: updated }, false)
        return updated
      })
    } else if (activePracticeTab === 'listening_typing') {
      setListeningTypingPairs((prev) => {
        const updated = updater(prev)
        savePracticeConfig({ listeningTypingPairs: updated }, false)
        return updated
      })
    }
  }

  const handleAddPair = () => {
    setCurrentPairs((prev) => [
      ...prev,
      {
        q: availableColumns[0] || 'front',
        a: availableColumns[1] || 'back',
        name: `Pair #${prev.length + 1}`,
      },
    ])
  }

  const handleRemovePair = (index: number) => {
    setCurrentPairs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdatePair = (index: number, field: 'q' | 'a', value: string | string[]) => {
    setCurrentPairs((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p
        const updated = { ...p, [field]: value }
        if (field === 'q') updated.prompt_col = String(value)
        if (field === 'a') updated.answer_col = value
        updated.name = `${updated.q} ➜ ${Array.isArray(updated.a) ? updated.a.join(', ') : updated.a}`
        return updated
      })
    )
  }

  const handleUpdateMcqNumChoices = (num: number) => {
    setMcqNumChoices(num)
    savePracticeConfig({ mcqNumChoices: num }, true)
  }

  const handleUpdateListeningMcqNumChoices = (num: number) => {
    setListeningMcqNumChoices(num)
    savePracticeConfig({ listeningMcqNumChoices: num }, true)
  }

  const practiceModesConfig = [
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
      desc: 'Show prompt question and require typing exact answer characters (supports | delimiter)'
    },
    {
      key: 'listening_mcq' as const,
      label: 'Listening MCQ',
      sublabel: 'Audio Choice',
      icon: Headphones,
      color: 'text-sky-600',
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-50',
      activeText: 'text-sky-700',
      desc: 'Play TTS audio pronunciation and select matching translation from choices'
    },
    {
      key: 'listening_typing' as const,
      label: 'Listening Typing',
      sublabel: 'Audio Dictation',
      icon: Keyboard,
      color: 'text-cyan-600',
      activeBorder: 'border-cyan-500',
      activeBg: 'bg-cyan-50',
      activeText: 'text-cyan-700',
      desc: 'Play TTS audio pronunciation and type the exact vocabulary (supports | delimiter)'
    },
  ]

  const activeModeConfig = practiceModesConfig.find(m => m.key === activePracticeTab) || practiceModesConfig[0]
  const isCurrentPracticeEnabled = isModeEnabled(activePracticeTab)
  const currentPairs = getCurrentPairs()

  return (
    <div id="deck-practice-config-form" className="space-y-6 text-left animate-in fade-in duration-200">
      {/* ═══════════ SECTION 1: FLASHCARD LEARNING MODES ═══════════ */}
      {(!section || section === 'modes') && (
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span>Flashcard Learning Modes</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  {FLASHCARD_LEARN_MODES.filter(m => isModeEnabled(m.id)).length}/3 Active
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Enable or disable flashcard review engines and choose which mode opens by default when learners tap "Learn"
              </p>
            </div>
          </div>
        </div>

        {/* 3 Flashcard Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {FLASHCARD_LEARN_MODES.map((mode) => {
            const enabled = isModeEnabled(mode.id)
            const isDefault = defaultLearnMode === mode.id

            return (
              <div
                key={mode.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative",
                  enabled
                    ? isDefault
                      ? "bg-indigo-50/40 border-indigo-300 shadow-xs ring-1 ring-indigo-200"
                      : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                    : "bg-slate-50/70 border-slate-200/60 opacity-60"
                )}
              >
                {/* Header: Emoji, Title, Badges */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <h4 className={cn("text-xs font-black", enabled ? "text-slate-900" : "text-slate-500 line-through")}>
                          {mode.name}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          {mode.badge}
                        </span>
                      </div>
                    </div>

                    {/* Active Toggle Switch */}
                    <div
                      onClick={() => toggleModeDisabled(mode.id)}
                      className={cn(
                        "w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer",
                        enabled ? "bg-indigo-600" : "bg-slate-300"
                      )}
                      title={enabled ? 'Click to disable for this deck' : 'Click to enable for this deck'}
                    >
                      <div
                        className={cn(
                          "w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform",
                          enabled ? "translate-x-4.5" : "translate-x-0"
                        )}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {mode.desc}
                  </p>
                </div>

                {/* Default Mode Selector Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {enabled ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultLearnMode(mode.id)}
                      className={cn(
                        "w-full py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        isDefault
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                      )}
                    >
                      {isDefault ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Default Launch Mode</span>
                        </>
                      ) : (
                        <span>Set as Default</span>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 italic py-1">
                      Mode is disabled for this deck
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* ═══════════ SECTION 2: INTERACTIVE PRACTICE DRILLS ═══════════ */}
      {(!section || section === 'drills') && (
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span>Interactive Practice Drills</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                  {practiceModesConfig.filter(m => isModeEnabled(m.key)).length}/4 Active
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Configure question-answer column pairings, multiple choice counts, and spelling dictation
              </p>
            </div>
          </div>
        </div>

        {/* 4 Practice Mode Pills Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {practiceModesConfig.map((m) => {
            const Icon = m.icon
            const isSelected = activePracticeTab === m.key
            const isEnabled = isModeEnabled(m.key)

            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setActivePracticeTab(m.key)}
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

        {/* Detailed Config for Selected Practice Drill */}
        <div className="bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
          {/* Header & Enable Toggle */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center shadow-2xs">
                <activeModeConfig.icon className={cn("w-4 h-4", activeModeConfig.color)} />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  {activeModeConfig.label} ({activeModeConfig.sublabel})
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {activeModeConfig.desc}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                {isCurrentPracticeEnabled ? 'Active' : 'Disabled'}
              </span>
              <div
                onClick={() => toggleModeDisabled(activePracticeTab)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer",
                  isCurrentPracticeEnabled ? "bg-indigo-600" : "bg-slate-300"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-xs transition-transform",
                    isCurrentPracticeEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Mode-Specific Settings: MCQ choice counts */}
          {activePracticeTab === 'mcq' && (
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-xs font-black text-slate-800 block">Multiple Choice Options Count:</span>
                <span className="text-[10px] text-slate-400 font-medium">Number of answer choices presented to the learner</span>
              </div>

              <div className="flex items-center gap-2">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleUpdateMcqNumChoices(num)}
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

          {activePracticeTab === 'listening_mcq' && (
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-xs font-black text-slate-800 block">Listening MCQ Options Count:</span>
                <span className="text-[10px] text-slate-400 font-medium">Number of answer choices displayed after audio plays</span>
              </div>

              <div className="flex items-center gap-2">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleUpdateListeningMcqNumChoices(num)}
                    className={cn(
                      "w-9 h-8 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs border",
                      listeningMcqNumChoices === num
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

          {/* Pairs Configuration */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  Active Column Pairs for {activeModeConfig.sublabel}:
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {activePracticeTab === 'typing' || activePracticeTab === 'listening_typing'
                    ? 'Designate prompt question/audio column and target vocabulary column to type (supports | for multiple accepted answers)'
                    : activePracticeTab === 'listening_mcq'
                    ? 'Designate audio script/voice column and target correct answer choice column'
                    : 'Designate question display column and correct answer column'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddPair}
                className="h-8 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Pair</span>
              </button>
            </div>

            {/* Pairs Items */}
            <div className="space-y-2.5">
              {currentPairs.length === 0 ? (
                <div className="py-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  No column pairs configured. Click "+ Add New Pair" to create one.
                </div>
              ) : (
                currentPairs.map((pair, idx) => {
                  const currentSelectedAnswerCols = Array.isArray(pair.a)
                    ? pair.a
                    : (typeof pair.a === 'string' ? pair.a.split(',').map(s => s.trim()).filter(Boolean) : ['front'])

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 shadow-2xs">
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
                            className="w-6.5 h-6.5 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            title="Delete pair"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className={cn("grid gap-3 items-start", (activePracticeTab === 'typing' || activePracticeTab === 'listening_typing') ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
                        {/* Question / Prompt Column */}
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                            {activePracticeTab === 'typing'
                              ? '1. Prompt Column (Question):'
                              : activePracticeTab === 'listening_mcq' || activePracticeTab === 'listening_typing'
                              ? '1. Audio TTS Column:'
                              : '1. Question Column (Prompt):'}
                          </label>
                          <select
                            value={pair.q}
                            onChange={(e) => handleUpdatePair(idx, 'q', e.target.value)}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                          >
                            {availableColumns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Answer Column(s) */}
                        {(activePracticeTab === 'typing' || activePracticeTab === 'listening_typing') ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                2. Accepted Answer Columns (Select 1 or more):
                              </label>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded border text-amber-600 bg-amber-50 border-amber-200/60">
                                Any column matches as correct
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              {availableColumns.map((col) => {
                                const isSelected = currentSelectedAnswerCols.includes(col)
                                return (
                                  <button
                                    key={col}
                                    type="button"
                                    onClick={() => {
                                      let nextCols: string[]
                                      if (isSelected) {
                                        if (currentSelectedAnswerCols.length === 1) return
                                        nextCols = currentSelectedAnswerCols.filter(c => c !== col)
                                      } else {
                                        nextCols = [...currentSelectedAnswerCols, col]
                                      }
                                      handleUpdatePair(idx, 'a', nextCols.length === 1 ? nextCols[0] : nextCols)
                                    }}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer",
                                      isSelected
                                        ? "bg-amber-500 border-amber-500 text-white shadow-2xs"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 opacity-80"
                                    )}
                                  >
                                    <span>{isSelected ? "✓" : "+"}</span>
                                    <span>{col.toUpperCase()}</span>
                                  </button>
                                )
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
                              className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
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
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
      )}

    </div>
  )
}

export default DeckPracticeConfig
