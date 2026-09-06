import React, { useState, useEffect, useMemo } from 'react'
import {
  Brain,
  Compass,
  RotateCcw,
  Trophy,
  Keyboard,
  Headphones,
  Sparkles,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  ImageOff,
  Shuffle,
  Music,
  Check,
  Save,
  User,
  ShieldAlert,
  Sliders,
  BookmarkCheck,
  Zap,
  MousePointer,
  Move,
  Layers,
  ArrowRight
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

export interface DeckPersonalSettingsProps {
  deckId: string | number
  deckTitle?: string
  isOwner?: boolean
  onSaved?: () => void
}

type PreferredMode = 'fsrs' | 'roadmap' | 'flip' | 'mcq' | 'typing' | 'listening'
type AudioChoice = 'none' | 'front' | 'back' | 'always'
type ImageChoice = 'always' | 'front' | 'back' | 'none'

interface StudyTemplateItem {
  id: string
  name: string
  badge: string
  desc: string
  isSystem?: boolean
  isDeckDefault?: boolean
  isCustom?: boolean
  settings: Record<string, any>
}

const SYSTEM_TEMPLATES: StudyTemplateItem[] = [
  {
    id: 'preset-minimal',
    name: 'Minimalist',
    badge: 'Zero Distraction',
    desc: 'No images, no audio autoplay, hidden metrics, swipe-only without button clutter.',
    isSystem: true,
    settings: {
      learning_mode: 'fsrs',
      autoplay_audio: 'none',
      show_images: 'none',
      front_valign: 'center',
      front_halign: 'center',
      back_valign: 'center',
      back_halign: 'center',
      random_enabled: false,
      sfx_enabled: false,
      quick_learn_enabled: false,
      card_flip_trigger: 'tap',
      card_rating_mode: 'swipe_4way',
    }
  },
  {
    id: 'preset-standard',
    name: 'Standard',
    badge: 'Recommended',
    desc: 'Balanced recall: front question, audio pronunciation & illustration on back side.',
    isSystem: true,
    settings: {
      learning_mode: 'fsrs',
      autoplay_audio: 'back',
      show_images: 'back',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      quick_learn_enabled: false,
      card_flip_trigger: 'both',
      card_rating_mode: 'both',
    }
  },
  {
    id: 'preset-full',
    name: 'Full Experience',
    badge: 'All Features',
    desc: 'Everything enabled: dual-sided images, autoplay TTS audio, combined swipe & buttons.',
    isSystem: true,
    settings: {
      learning_mode: 'fsrs',
      autoplay_audio: 'always',
      show_images: 'always',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      quick_learn_enabled: false,
      card_flip_trigger: 'both',
      card_rating_mode: 'both',
    }
  },
  {
    id: 'preset-classic',
    name: 'Classic',
    badge: 'Traditional',
    desc: 'Traditional study: 4 rating buttons, top alignment, flip button trigger.',
    isSystem: true,
    settings: {
      learning_mode: 'fsrs',
      autoplay_audio: 'back',
      show_images: 'always',
      front_valign: 'top',
      front_halign: 'left',
      back_valign: 'top',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      quick_learn_enabled: false,
      card_flip_trigger: 'button_only',
      card_rating_mode: 'buttons',
    }
  },
]

export function DeckPersonalSettings({
  deckId,
  deckTitle,
  onSaved
}: DeckPersonalSettingsProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('deck-default')

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

  // Granular settings state
  const [preferredMode, setPreferredMode] = useState<PreferredMode>('fsrs')
  const [autoplayAudio, setAutoplayAudio] = useState<AudioChoice>('none')
  const [showImages, setShowImages] = useState<ImageChoice>('always')
  const [frontValign, setFrontValign] = useState<'center' | 'top'>('center')
  const [frontHalign, setFrontHalign] = useState<'center' | 'left'>('left')
  const [backValign, setBackValign] = useState<'center' | 'top'>('center')
  const [backHalign, setBackHalign] = useState<'left' | 'center'>('left')
  const [randomEnabled, setRandomEnabled] = useState<boolean>(false)
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true)
  const [quickLearnEnabled, setQuickLearnEnabled] = useState<boolean>(false)
  const [cardFlipTrigger, setCardFlipTrigger] = useState<'both' | 'tap' | 'button_only'>('both')
  const [cardRatingMode, setCardRatingMode] = useState<'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'>('both')

  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const userSettings = useAppStore((state) => state.userSettings)

  // Build complete list of templates
  const allTemplates: StudyTemplateItem[] = useMemo(() => {
    const items: StudyTemplateItem[] = []

    // If user has customized settings, show Current Customization item at the top
    if (isCustomized && Object.keys(userOverrides).length > 0) {
      items.push({
        id: 'current-custom',
        name: 'Current Customization',
        badge: 'Custom Settings',
        desc: 'Your personalized study configuration currently saved for this deck.',
        isCustom: true,
        settings: userOverrides
      })
    }

    const deckDefaultItem: StudyTemplateItem = {
      id: 'deck-default',
      name: 'Deck Creator Default',
      badge: 'Creator Baseline',
      desc: 'The original baseline study configuration recommended by the deck creator.',
      isDeckDefault: true,
      settings: creatorDefs
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
        settings: p.settings || {}
      }))

    items.push(...customList)
    return items
  }, [creatorDefs, userOverrides, isCustomized, userSettings?.study_profiles])

  const applyTemplate = (settings: any, templateId?: string) => {
    if (!settings) return
    if (templateId) setSelectedTemplateId(templateId)

    const lm = settings.learning_mode || settings.quiz_learning_mode
    if (lm && ['fsrs', 'roadmap', 'flip', 'mcq', 'typing', 'listening'].includes(lm)) {
      setPreferredMode(lm as any)
    }
    if (settings.autoplay_audio) setAutoplayAudio(settings.autoplay_audio as any)
    if (settings.show_images) setShowImages(settings.show_images as any)
    if (settings.front_valign) setFrontValign(settings.front_valign)
    if (settings.front_halign) setFrontHalign(settings.front_halign)
    if (settings.back_valign) setBackValign(settings.back_valign)
    if (settings.back_halign) setBackHalign(settings.back_halign)
    if (settings.random_enabled !== undefined) setRandomEnabled(Boolean(settings.random_enabled))
    if (settings.sfx_enabled !== undefined) setSfxEnabled(Boolean(settings.sfx_enabled))
    if (settings.quick_learn_enabled !== undefined) setQuickLearnEnabled(Boolean(settings.quick_learn_enabled))
    if (settings.card_flip_trigger) setCardFlipTrigger(settings.card_flip_trigger)
    if (settings.card_rating_mode) setCardRatingMode(settings.card_rating_mode)
  }

  // Synchronize state when data loads
  useEffect(() => {
    if (settingsData) {
      const initialMode = (userOverrides.learning_mode || creatorDefs.learning_mode || 'fsrs') as PreferredMode
      const initialAudio = (userOverrides.autoplay_audio || creatorDefs.autoplay_audio || 'none') as AudioChoice
      const initialImages = (userOverrides.show_images || creatorDefs.show_images || 'always') as ImageChoice
      const initialFrontValign = (userOverrides.front_valign || creatorDefs.front_valign || 'center') as 'center' | 'top'
      const initialFrontHalign = (userOverrides.front_halign || creatorDefs.front_halign || 'left') as 'center' | 'left'
      const initialBackValign = (userOverrides.back_valign || creatorDefs.back_valign || 'center') as 'center' | 'top'
      const initialBackHalign = (userOverrides.back_halign || creatorDefs.back_halign || 'left') as 'left' | 'center'
      const initialRandom = userOverrides.random_enabled !== undefined
        ? Boolean(userOverrides.random_enabled)
        : Boolean(creatorDefs.random_enabled ?? false)
      const initialSfx = userOverrides.sfx_enabled !== undefined
        ? Boolean(userOverrides.sfx_enabled)
        : Boolean(creatorDefs.sfx_enabled ?? true)
      const initialQuickLearn = userOverrides.quick_learn_enabled !== undefined
        ? Boolean(userOverrides.quick_learn_enabled)
        : Boolean(creatorDefs.quick_learn_enabled ?? false)
      const initialFlip = (userOverrides.card_flip_trigger || creatorDefs.card_flip_trigger || 'both') as 'both' | 'tap' | 'button_only'
      const initialRating = (userOverrides.card_rating_mode || creatorDefs.card_rating_mode || 'both') as 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'

      setPreferredMode(initialMode)
      setAutoplayAudio(initialAudio)
      setShowImages(initialImages)
      setFrontValign(initialFrontValign)
      setFrontHalign(initialFrontHalign)
      setBackValign(initialBackValign)
      setBackHalign(initialBackHalign)
      setRandomEnabled(initialRandom)
      setSfxEnabled(initialSfx)
      setQuickLearnEnabled(initialQuickLearn)
      setCardFlipTrigger(initialFlip)
      setCardRatingMode(initialRating)

      if (isCustomized && Object.keys(userOverrides).length > 0) {
        setSelectedTemplateId('current-custom')
      } else {
        setSelectedTemplateId('deck-default')
      }
    }
  }, [settingsData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const studyOverrides = {
      learning_mode: preferredMode,
      autoplay_audio: autoplayAudio,
      show_images: showImages,
      front_valign: frontValign,
      front_halign: frontHalign,
      back_valign: backValign,
      back_halign: backHalign,
      random_enabled: randomEnabled,
      sfx_enabled: sfxEnabled,
      quick_learn_enabled: quickLearnEnabled,
      card_flip_trigger: cardFlipTrigger,
      card_rating_mode: cardRatingMode,
    }

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        settings: {
          ...studyOverrides,
          study_settings: studyOverrides
        }
      })

      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setMessage({ type: 'success', text: 'Personal study preferences saved successfully!' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to save personal preferences' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Reset all settings to the original deck defaults?')) return

    setIsResetting(true)
    setMessage(null)

    const creatorMode = (creatorDefs.learning_mode || 'fsrs') as PreferredMode
    const creatorAudio = (creatorDefs.autoplay_audio || 'none') as AudioChoice
    const creatorImages = (creatorDefs.show_images || 'always') as ImageChoice
    const creatorFrontValign = (creatorDefs.front_valign || 'center') as 'center' | 'top'
    const creatorFrontHalign = (creatorDefs.front_halign || 'left') as 'center' | 'left'
    const creatorBackValign = (creatorDefs.back_valign || 'center') as 'center' | 'top'
    const creatorBackHalign = (creatorDefs.back_halign || 'left') as 'left' | 'center'
    const creatorRandom = Boolean(creatorDefs.random_enabled ?? false)
    const creatorSfx = Boolean(creatorDefs.sfx_enabled ?? true)
    const creatorQuickLearn = Boolean(creatorDefs.quick_learn_enabled ?? false)
    const creatorFlip = (creatorDefs.card_flip_trigger || 'both') as 'both' | 'tap' | 'button_only'
    const creatorRating = (creatorDefs.card_rating_mode || 'both') as 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'

    setPreferredMode(creatorMode)
    setAutoplayAudio(creatorAudio)
    setShowImages(creatorImages)
    setFrontValign(creatorFrontValign)
    setFrontHalign(creatorFrontHalign)
    setBackValign(creatorBackValign)
    setBackHalign(creatorBackHalign)
    setRandomEnabled(creatorRandom)
    setSfxEnabled(creatorSfx)
    setQuickLearnEnabled(creatorQuickLearn)
    setCardFlipTrigger(creatorFlip)
    setCardRatingMode(creatorRating)
    setSelectedTemplateId('deck-default')

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        reset_study_defaults: true
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
    <form onSubmit={handleSave} className="space-y-4 text-left animate-in fade-in duration-200">
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
          <div className="space-y-3">
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

            <div className="space-y-2">
              {allTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id
                const s = tpl.settings || {}
                const flipText = s.card_flip_trigger === 'button_only' ? 'Button Only' : s.card_flip_trigger === 'tap' ? 'Tap Only' : 'Tap & Swipe'
                const ratingText = s.card_rating_mode === 'buttons' ? '4 Buttons' : s.card_rating_mode === 'swipe_4way' ? '4-Way Swipe' : 'Both'
                const audioText = s.autoplay_audio === 'always' ? 'Always' : s.autoplay_audio === 'back' ? 'Back' : s.autoplay_audio === 'front' ? 'Front' : 'Off'

                return (
                  <div
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.settings, tpl.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none",
                      isSelected
                        ? "bg-orange-50/40 border-orange-500 shadow-xs ring-1 ring-orange-400/30"
                        : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {/* Circular Radio Dot */}
                    <div className="pt-0.5 shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300 bg-white"
                      )}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn("text-xs font-black truncate", isSelected ? "text-orange-950" : "text-slate-800")}>
                          {tpl.name}
                        </span>
                        <span className={cn(
                          "px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          tpl.isCustom
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : tpl.isDeckDefault
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isSelected
                            ? "bg-orange-100 text-orange-800 border-orange-200"
                            : "bg-slate-200/70 text-slate-600 border-slate-200"
                        )}>
                          {tpl.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-2">
                        {tpl.desc}
                      </p>

                      {/* Spec Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-white rounded-lg border border-slate-200/60 text-[9.5px] font-bold text-slate-600">
                          Flip: {flipText}
                        </span>
                        <span className="px-2 py-0.5 bg-white rounded-lg border border-slate-200/60 text-[9.5px] font-bold text-slate-600">
                          Rating: {ratingText}
                        </span>
                        <span className="px-2 py-0.5 bg-white rounded-lg border border-slate-200/60 text-[9.5px] font-bold text-slate-600">
                          Audio: {audioText}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Simple Mode Save Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {isCustomized && (
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetDefaults}
                  className="px-3.5 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Deck Default</span>
                </button>
              )}

              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'SAVING...' : 'SAVE PREFERENCES'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ VIEW 2: ADVANCED MODE (GRANULAR FINE-TUNING) ═══════════ */}
        {viewMode === 'advanced' && (
          <div className="space-y-4 pt-1">
            {/* Preferred Mode */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                Preferred Learning Mode
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'fsrs', title: 'Flashcard FSRS', sub: 'Spaced repetition v6', icon: Brain },
                  { id: 'roadmap', title: 'Daily Roadmap', sub: 'Targeted daily goals', icon: Compass },
                  { id: 'flip', title: 'Quick Flip', sub: 'Free 2-sided review', icon: RotateCcw },
                  { id: 'mcq', title: 'Multiple Choice', sub: 'Pick 1 of 4 choices', icon: Trophy },
                  { id: 'typing', title: 'Typing Drill', sub: 'Type exact vocabulary', icon: Keyboard },
                  { id: 'listening', title: 'Listening Drill', sub: 'Audio to meaning', icon: Headphones },
                ].map((m) => {
                  const Icon = m.icon
                  const isSelected = preferredMode === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPreferredMode(m.id as any)}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/50 border-indigo-500 shadow-xs ring-1 ring-indigo-400/30"
                          : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={cn("w-4 h-4", isSelected ? "text-indigo-600" : "text-slate-400")} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                      <span className="text-xs font-black text-slate-800 block truncate">{m.title}</span>
                      <span className="text-[9.5px] font-medium text-slate-400 block truncate">{m.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Gestures */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-purple-600" />
                Flashcard Gestures
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MousePointer className="w-3.5 h-3.5 text-indigo-600" />
                    Flip Trigger
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {[
                      { id: 'both', label: 'Both' },
                      { id: 'tap', label: 'Tap Only' },
                      { id: 'button_only', label: 'Button Only' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCardFlipTrigger(opt.id as any)}
                        className={cn(
                          "py-1.5 px-1 rounded-lg text-[10px] font-black transition-all text-center cursor-pointer",
                          cardFlipTrigger === opt.id ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-purple-600" />
                    FSRS Rating Mode
                  </span>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {[
                      { id: 'both', label: 'Both' },
                      { id: 'buttons', label: 'Buttons' },
                      { id: 'swipe_4way', label: '4-Way' },
                      { id: 'swipe_2way', label: '2-Way' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCardRatingMode(opt.id as any)}
                        className={cn(
                          "py-1.5 px-1 rounded-lg text-[9.5px] font-black transition-all text-center cursor-pointer",
                          cardRatingMode === opt.id ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Content Alignment */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Card Alignment (2-Axis)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Front */}
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Front Card Alignment</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Vertical:</span>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setFrontValign('center')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", frontValign === 'center' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Center
                        </button>
                        <button
                          type="button"
                          onClick={() => setFrontValign('top')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", frontValign === 'top' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Top
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setFrontHalign('left')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", frontHalign === 'left' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={() => setFrontHalign('center')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", frontHalign === 'center' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Center
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Back Card Alignment</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Vertical:</span>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setBackValign('center')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", backValign === 'center' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Center
                        </button>
                        <button
                          type="button"
                          onClick={() => setBackValign('top')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", backValign === 'top' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Top
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setBackHalign('left')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", backHalign === 'left' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={() => setBackHalign('center')}
                          className={cn("py-1 rounded-lg text-[10px] font-black text-center cursor-pointer", backHalign === 'center' ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                          Center
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensory & Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                Sensory & Playback Options
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* TTS Autoplay */}
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    TTS Audio Autoplay
                  </span>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {[
                      { id: 'none', label: 'Off' },
                      { id: 'front', label: 'Front' },
                      { id: 'back', label: 'Back' },
                      { id: 'always', label: 'Both' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAutoplayAudio(opt.id as any)}
                        className={cn(
                          "py-1.5 px-1 rounded-lg text-[10px] font-black text-center cursor-pointer",
                          autoplayAudio === opt.id ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Images */}
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Image Illustrations
                  </span>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/50">
                    {[
                      { id: 'always', label: 'Both' },
                      { id: 'front', label: 'Front' },
                      { id: 'back', label: 'Back' },
                      { id: 'none', label: 'Off' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setShowImages(opt.id as any)}
                        className={cn(
                          "py-1.5 px-1 rounded-lg text-[10px] font-black text-center cursor-pointer",
                          showImages === opt.id ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <Shuffle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">Shuffle Queue</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRandomEnabled(!randomEnabled)}
                    className={cn("w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer", randomEnabled ? "bg-indigo-600" : "bg-slate-200")}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", randomEnabled ? "translate-x-4" : "translate-x-0")} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">Sound FX (SFX)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSfxEnabled(!sfxEnabled)}
                    className={cn("w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer", sfxEnabled ? "bg-indigo-600" : "bg-slate-200")}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", sfxEnabled ? "translate-x-4" : "translate-x-0")} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <Zap className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">Quick Learn (Auto)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickLearnEnabled(!quickLearnEnabled)}
                    className={cn("w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer", quickLearnEnabled ? "bg-indigo-600" : "bg-slate-200")}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", quickLearnEnabled ? "translate-x-4" : "translate-x-0")} />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Mode Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {isCustomized && (
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetDefaults}
                  className="px-3.5 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Deck Default</span>
                </button>
              )}

              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'SAVING...' : 'SAVE CUSTOM SETTINGS'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}

export default DeckPersonalSettings
