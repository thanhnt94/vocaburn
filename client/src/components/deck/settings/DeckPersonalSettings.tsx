import React, { useState, useEffect, useMemo } from 'react'
import {
  User,
  Sliders,
  BookmarkCheck,
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
import { useAutoSaveStore } from './useAutoSaveNotifier'

export interface DeckPersonalSettingsProps {
  deckId: string | number
  deckTitle?: string
  isOwner?: boolean
  onSaved?: () => void
}

export function DeckPersonalSettings({
  deckId,
  deckTitle,
  onSaved
}: DeckPersonalSettingsProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('deck-default')
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_STUDY_SETTINGS)

  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const userSettings = useAppStore((state) => state.userSettings)

  // Fetch practice & study settings (both creator defaults and user overrides)
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
  const userOverrides = settingsData?.user_study_settings || {}
  const isCustomized = Boolean(settingsData?.is_study_customized)

  // Synchronize state when data loads
  useEffect(() => {
    if (settingsData) {
      const merged: StudySettings = {
        ...DEFAULT_STUDY_SETTINGS,
        ...creatorDefs,
        ...userOverrides,
      }
      if (merged.learning_mode && !merged.quiz_learning_mode) {
        merged.quiz_learning_mode = merged.learning_mode
      }
      setSettings(merged)

      if (isCustomized && Object.keys(userOverrides).length > 0) {
        setSelectedTemplateId('current-custom')
      } else {
        setSelectedTemplateId('deck-default')
      }
    }
  }, [settingsData])

  // Build complete list of templates
  const allTemplates: StudyTemplateItem[] = useMemo(() => {
    const items: StudyTemplateItem[] = []

    // If user has customized settings, show Current Customization item at top
    if (isCustomized && Object.keys(userOverrides).length > 0) {
      items.push({
        id: 'current-custom',
        name: 'Current Customization',
        badge: 'Custom Settings',
        desc: 'Your personalized study configuration currently saved for this deck.',
        icon: 'sparkles',
        isCustom: true,
        settings: userOverrides,
      })
    }

    const deckDefaultItem: StudyTemplateItem = {
      id: 'deck-default',
      name: 'Deck Creator Default',
      badge: 'Creator Baseline',
      desc: 'The original baseline study configuration recommended by the deck creator.',
      icon: 'sparkles',
      isDeckDefault: true,
      settings: creatorDefs,
    }
    items.push(deckDefaultItem)
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
        desc: p.desc || 'Your saved custom study profile.',
        icon: p.icon || 'sparkles',
        isCustom: true,
        settings: p.settings || {},
      }))

    items.push(...customList)
    return items
  }, [creatorDefs, userOverrides, isCustomized, userSettings?.study_profiles])

  const autoSaveTimerRef = React.useRef<any>(null)

  const triggerSavePersonalSettings = (nextSettings: StudySettings, immediate = false) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

    const execute = async () => {
      if (!deckId) return
      setIsSaving(true)
      useAutoSaveStore.getState().notifySaving()

      const studyOverrides = {
        ...nextSettings,
        learning_mode: nextSettings.quiz_learning_mode || nextSettings.learning_mode || 'fsrs',
        quiz_learning_mode: nextSettings.quiz_learning_mode || nextSettings.learning_mode || 'fsrs',
        random_enabled: Boolean(nextSettings.random_enabled),
        auto_next_delay: nextSettings.auto_next_delay !== undefined && nextSettings.auto_next_delay !== null ? Number(nextSettings.auto_next_delay) : 0,
        quick_learn_enabled: Boolean(nextSettings.quick_learn_enabled),
      }

      try {
        await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
          is_creator: false,
          settings: {
            ...studyOverrides,
            study_settings: studyOverrides,
          },
        })

        queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
        useAutoSaveStore.getState().notifySaved()
        if (onSaved) onSaved()
      } catch (err: any) {
        useAutoSaveStore.getState().notifyError(err?.response?.data?.error || 'Failed to save personal preferences')
      } finally {
        setIsSaving(false)
      }
    }

    if (immediate) {
      execute()
    } else {
      autoSaveTimerRef.current = setTimeout(execute, 700)
    }
  }

  const handleSelectTemplate = (tpl: StudyTemplateItem) => {
    setSelectedTemplateId(tpl.id)
    if (tpl.settings) {
      const nextSettings: StudySettings = {
        ...settings,
        ...tpl.settings,
        quiz_learning_mode: tpl.settings.quiz_learning_mode || tpl.settings.learning_mode || settings.quiz_learning_mode,
      }
      setSettings(nextSettings)
      triggerSavePersonalSettings(nextSettings, true)
    }
  }

  const updateSetting = (key: string, value: any) => {
    const nextSettings: StudySettings = { ...settings, [key]: value }
    setSettings(nextSettings)
    triggerSavePersonalSettings(nextSettings, false)
  }

  const handleResetDefaults = async () => {
    if (!confirm('Reset all settings to the original deck defaults?')) return

    setIsResetting(true)
    setMessage(null)

    const baseline: StudySettings = {
      ...DEFAULT_STUDY_SETTINGS,
      ...creatorDefs,
    }
    setSettings(baseline)
    setSelectedTemplateId('deck-default')

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        reset_study_defaults: true,
      })

      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setMessage({ type: 'success', text: 'Reset all settings to original deck defaults!' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to reset defaults' })
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
    <div id="deck-personal-settings-form" className="space-y-4 text-left animate-in fade-in duration-200">
      {/* HEADER & MODE SWITCHER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Personal Study Preferences
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {deckTitle ? `Customize study experience for "${deckTitle}"` : 'Customize study experience for your account'}
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
                  ? "bg-white text-orange-600 shadow-xs"
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
                  <BookmarkCheck className="w-3.5 h-3.5 text-orange-500" />
                  Select Study Template
                </span>
                <p className="text-[10px] text-slate-400 font-medium">
                  Pick a pre-configured template with 1 click
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {allTemplates.length} templates available
              </span>
            </div>

            <StudyTemplateSelector
              templates={allTemplates}
              selectedId={selectedTemplateId}
              onSelect={handleSelectTemplate}
            />

            {/* Simple Mode Footer Actions */}
            {isCustomized && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetDefaults}
                  className="px-3.5 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Deck Default</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ VIEW 2: ADVANCED MODE (GRANULAR FINE-TUNING) ═══════════ */}
        {viewMode === 'advanced' && (
          <div className="space-y-4 pt-1">
            <StudySettingsEditor
              settings={settings}
              onChange={updateSetting}
            />

            {/* Advanced Mode Footer Actions */}
            {isCustomized && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetDefaults}
                  className="px-3.5 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Deck Default</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeckPersonalSettings
