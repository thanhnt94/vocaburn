import React, { useState, useEffect } from 'react'
import { Sliders, Save, Check, Trophy, Keyboard, Headphones, Brain, Plus, Trash2, RotateCcw, HelpCircle } from 'lucide-react'
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
