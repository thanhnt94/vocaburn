import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Sliders,
  BookmarkCheck,
  Save,
  RotateCcw,
  Check,
  ShieldAlert,
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import {
  SYSTEM_TEMPLATES,
  DEFAULT_STUDY_SETTINGS,
  StudyTemplateSelector,
  StudySettingsEditor,
  type StudySettings,
  type StudyTemplateItem,
} from '@/components/common/study'

export interface DeckStudyDefaultsProps {
  deckId: string | number
  onSaved?: () => void
}

export function DeckStudyDefaults({ deckId, onSaved }: DeckStudyDefaultsProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('preset-standard')
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_STUDY_SETTINGS)

  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const userSettings = useAppStore((state) => state.userSettings)

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
      if (merged.learning_mode && !merged.quiz_learning_mode) {
        merged.quiz_learning_mode = merged.learning_mode
      }
      setSettings(merged)

      // Try matching with system templates
      const matched = SYSTEM_TEMPLATES.find((tpl) => {
        const s = tpl.settings || {}
        return Object.keys(s).every((k) => s[k as keyof StudySettings] === merged[k as keyof StudySettings])
      })
      if (matched) {
        setSelectedTemplateId(matched.id)
      } else {
        setSelectedTemplateId('custom-baseline')
      }
    }
  }, [settingsData])

  // Build templates list for creator selection
  const allTemplates: StudyTemplateItem[] = useMemo(() => {
    const items: StudyTemplateItem[] = []

    // If currently customized from presets, show current baseline item
    if (selectedTemplateId === 'custom-baseline' && Object.keys(creatorDefs).length > 0) {
      items.push({
        id: 'custom-baseline',
        name: 'Current Deck Defaults',
        badge: 'Active Baseline',
        desc: 'Customized defaults currently saved for learners of this deck.',
        icon: 'sparkles',
        isCustom: true,
        settings: creatorDefs,
      })
    }

    items.push(...SYSTEM_TEMPLATES)

    const seen = new Set<string>()
    const customList: StudyTemplateItem[] = (userSettings?.study_profiles || [])
      .filter((p: any) => {
        if (!p || !p.id || p.is_system || String(p.id).startsWith('preset-') || seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      .map((p: any) => ({
        id: p.id,
        name: p.name || 'Custom Template',
        badge: 'My Template',
        desc: p.desc || 'Your saved template.',
        icon: p.icon || 'sparkles',
        isCustom: true,
        settings: p.settings || {},
      }))

    items.push(...customList)
    return items
  }, [creatorDefs, selectedTemplateId, userSettings?.study_profiles])

  const handleSelectTemplate = (tpl: StudyTemplateItem) => {
    setSelectedTemplateId(tpl.id)
    if (tpl.settings) {
      setSettings((prev) => ({
        ...prev,
        ...tpl.settings,
        quiz_learning_mode: tpl.settings.quiz_learning_mode || tpl.settings.learning_mode || prev.quiz_learning_mode,
      }))
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const studyDefaults = {
      ...settings,
      learning_mode: settings.quiz_learning_mode || settings.learning_mode || 'fsrs',
      quiz_learning_mode: settings.quiz_learning_mode || settings.learning_mode || 'fsrs',
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
      setMessage({ type: 'success', text: 'Creator study defaults saved successfully! All learners will study with these defaults.' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to save study defaults' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToStandard = async () => {
    if (!confirm('Reset study defaults for this deck back to the factory Standard preset?')) return

    setIsResetting(true)
    setMessage(null)

    const baseline = { ...DEFAULT_STUDY_SETTINGS }
    setSettings(baseline)
    setSelectedTemplateId('preset-standard')

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
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* HEADER & SWITCHER */}
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
                Set baseline gestures, audio & card layout for all learners opening this deck
              </p>
            </div>
          </div>

          {/* Simple Mode vs Advanced Mode Switch */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('simple')}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'simple'
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Simple Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('advanced')}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'advanced'
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced Mode</span>
            </button>
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

        {/* ═══════════ VIEW 1: SIMPLE MODE (TEMPLATE RADIO LIST) ═══════════ */}
        {viewMode === 'simple' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Select Baseline Template
                </span>
                <p className="text-[10px] text-slate-400 font-medium">
                  Learners will start with this template until they customize their own preferences
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {allTemplates.length} presets available
              </span>
            </div>

            <StudyTemplateSelector
              templates={allTemplates}
              selectedId={selectedTemplateId}
              onSelect={handleSelectTemplate}
            />

            {/* Simple Mode Footer Actions */}
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
        )}

        {/* ═══════════ VIEW 2: ADVANCED MODE (GRANULAR CONTROLS) ═══════════ */}
        {viewMode === 'advanced' && (
          <div className="space-y-4 pt-1">
            <StudySettingsEditor
              settings={settings}
              onChange={updateSetting}
            />

            {/* Advanced Mode Footer Actions */}
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
        )}
      </div>
    </form>
  )
}

export default DeckStudyDefaults
