import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Save,
  RotateCcw,
  Check,
  ShieldAlert,
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  DEFAULT_STUDY_SETTINGS,
  StudySettingsEditor,
  type StudySettings,
} from '@/components/common/study'

export interface DeckStudyDefaultsProps {
  deckId: string | number
  onSaved?: () => void
}

export function DeckStudyDefaults({ deckId, onSaved }: DeckStudyDefaultsProps) {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_STUDY_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch practice settings (including creator defaults)
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['deck-practice-settings', String(deckId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000,
  })

  const creatorDefs = settingsData?.creator_study_defaults || settingsData?.study_defaults || {}

  // Synchronize state when data loads
  useEffect(() => {
    if (settingsData) {
      const merged: StudySettings = {
        ...DEFAULT_STUDY_SETTINGS,
        ...creatorDefs,
      }
      setSettings(merged)
    }
  }, [settingsData])

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const studyDefaults = {
      ...settings,
      random_enabled: Boolean(settings.random_enabled),
      auto_next_delay: settings.auto_next_delay !== undefined && settings.auto_next_delay !== null ? Number(settings.auto_next_delay) : 0,
      quick_learn_enabled: Boolean(settings.quick_learn_enabled),
    }

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        settings: {
          study_defaults: studyDefaults,
        },
      })

      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setMessage({ type: 'success', text: 'Creator study defaults saved successfully! All learners will study with these inside-card defaults.' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to save study defaults' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToStandard = async () => {
    if (!confirm('Reset flashcard study defaults for this deck back to the factory Standard preset?')) return

    setIsResetting(true)
    setMessage(null)

    const baseline: StudySettings = {
      ...DEFAULT_STUDY_SETTINGS,
      auto_next_delay: 0,
      quick_learn_enabled: false,
      random_enabled: false,
    }
    setSettings((prev) => ({
      ...baseline,
      learning_mode: prev.learning_mode,
      quiz_learning_mode: prev.quiz_learning_mode,
      disabled_modes: prev.disabled_modes,
    }))

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        settings: {
          study_defaults: baseline,
        },
      })

      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setMessage({ type: 'success', text: 'Study defaults restored to factory Standard preset!' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to reset study defaults' })
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 text-left animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Deck Study Defaults (Creator View)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Set baseline gestures, audio & card layout inside flashcards for all learners opening this deck
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in",
            message.type === 'success'
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          )}>
            {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* DIRECT FLASHCARD SETTINGS EDITOR */}
        <div className="space-y-4 pt-1">
          <StudySettingsEditor
            settings={settings}
            onChange={updateSetting}
          />

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isResetting}
              onClick={handleResetToStandard}
              className="px-3.5 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Standard</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'SAVING...' : 'SAVE STUDY DEFAULTS'}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default DeckStudyDefaults
