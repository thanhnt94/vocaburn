import React, { useState, useEffect } from 'react'
import {
  Brain,
  Compass,
  RotateCcw,
  Trophy,
  Keyboard,
  Headphones,
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Shuffle,
  Music,
  Check,
  RotateCcw as ResetIcon,
  Save,
  User,
  ShieldAlert,
  Sliders,
  BookmarkCheck,
  Zap
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

const SYSTEM_TEMPLATES = [
  {
    id: 'preset-minimal',
    name: 'Minimalist',
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
    id: 'preset-full',
    name: 'Full Experience',
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
    id: 'preset-standard',
    name: 'Standard',
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
    id: 'preset-classic',
    name: 'Classic',
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

const audioLabelMap: Record<string, string> = {
  none: 'Off',
  front: 'Front Only',
  back: 'Back Only',
  always: 'Always Play'
}

const imageLabelMap: Record<string, string> = {
  always: 'Both Sides',
  front: 'Front Only',
  back: 'Back Only',
  none: 'Hidden'
}

export function DeckPersonalSettings({
  deckId,
  deckTitle,
  onSaved
}: DeckPersonalSettingsProps) {
  const queryClient = useQueryClient()

  // 1. Fetch practice & study settings (both creator defaults and user overrides)
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

  // Local state: automatically copies exact original values from deck defaults if not customized
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
  const customTemplates = (userSettings?.study_profiles || []).filter((p: any) => !p.is_system)
  const allTemplates = [...SYSTEM_TEMPLATES, ...customTemplates]

  const applyTemplate = (settings: any) => {
    if (!settings) return
    if (settings.learning_mode || settings.quiz_learning_mode) {
      const lm = settings.learning_mode || settings.quiz_learning_mode
      if (['fsrs', 'roadmap', 'flip', 'mcq', 'typing', 'listening'].includes(lm)) {
        setPreferredMode(lm as any)
      }
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
    setMessage({ type: 'success', text: 'Đã áp dụng cử chỉ & thông số từ Template vào biểu mẫu! Bấm "Lưu Thay Đổi" để kích hoạt.' })
    setTimeout(() => setMessage(null), 3500)
  }

  // Sync state when data loads: copy user settings if customized, otherwise copy deck's original default settings
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
    }
  }, [settingsData])

  const defaultCreatorMode = creatorDefs.learning_mode || 'fsrs'

  const studyModes: {
    id: PreferredMode
    title: string
    sublabel: string
    desc: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    border: string
  }[] = [
    {
      id: 'fsrs',
      title: 'Flashcard FSRS',
      sublabel: 'Lặp lại ngắt quãng v6',
      desc: 'Ôn luyện thông minh theo thuật toán lặp lại ngắt quãng hiện đại nhất',
      icon: Brain,
      color: 'text-purple-600 bg-purple-50',
      border: 'border-purple-500'
    },
    {
      id: 'roadmap',
      title: 'Flashcard Lộ Trình',
      sublabel: 'Roadmap hàng ngày',
      desc: 'Học thẻ mới và ôn tập đúng hạn theo chỉ tiêu mỗi ngày',
      icon: Compass,
      color: 'text-amber-600 bg-amber-50',
      border: 'border-amber-500'
    },
    {
      id: 'flip',
      title: 'Lật Thẻ Phản Xạ',
      sublabel: 'Flip Cards tự do',
      desc: 'Chế độ lật thẻ 2 mặt truyền thống, thích hợp xem lướt phản xạ',
      icon: RotateCcw,
      color: 'text-emerald-600 bg-emerald-50',
      border: 'border-emerald-500'
    },
    {
      id: 'mcq',
      title: 'Trắc Nghiệm MCQ',
      sublabel: 'Chọn 1 trong 4 đáp án',
      desc: 'Hỏi mặt trước và chọn nhanh đáp án mặt sau từ các phương án ngẫu nhiên',
      icon: Trophy,
      color: 'text-amber-600 bg-amber-50',
      border: 'border-amber-500'
    },
    {
      id: 'typing',
      title: 'Gõ Từ Vựng',
      sublabel: 'Luyện nhớ mặt chữ',
      desc: 'Bắt buộc gõ chuẩn xác từng ký tự của từ vựng để ghi nhớ sâu',
      icon: Keyboard,
      color: 'text-indigo-600 bg-indigo-50',
      border: 'border-indigo-500'
    },
    {
      id: 'listening',
      title: 'Luyện Nghe',
      sublabel: 'Nghe TTS chọn nghĩa',
      desc: 'Phát âm thanh đọc mẫu và chọn đáp án dịch nghĩa chuẩn',
      icon: Headphones,
      color: 'text-sky-600 bg-sky-50',
      border: 'border-sky-500'
    }
  ]

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
    if (!confirm('Are you sure you want to reset all settings to the original deck defaults?')) return

    setIsResetting(true)
    setMessage(null)

    // Copy original deck settings directly into the form
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
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to reset default settings' })
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
      {/* ═══════════ HEADER & STATUS BANNER ═══════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
                <User className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  Personal Study Preferences
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {deckTitle ? `Customize study experience for "${deckTitle}"` : 'Customize study experience for your account'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCustomized ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-600" />
                Custom Overrides Active
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Using Deck Defaults
              </span>
            )}
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

        {/* ═══════════ QUICK APPLY TEMPLATE SELECTOR ═══════════ */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 rounded-2xl border border-indigo-100/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Quick Apply Template
            </span>
            <span className="text-[10px] font-bold text-indigo-600/80">
              1-click populate gestures & algorithm
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.settings)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-indigo-200/60 hover:border-indigo-600 text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <BookmarkCheck className="w-3 h-3 text-indigo-500 group-hover:text-white" />
                <span>{tpl.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════ 1. PREFERRED STUDY MODE ═══════════ */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-orange-500" />
              Preferred Study Mode
            </span>
            <span className="text-[10px] font-bold text-slate-400">Default mode for "Study Now"</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {studyModes.map((mode) => {
              const Icon = mode.icon
              const isSelected = preferredMode === mode.id
              const isDeckDefault = mode.id === defaultCreatorMode

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPreferredMode(mode.id)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer select-none group",
                    isSelected
                      ? `bg-orange-50/50 border-orange-500 shadow-xs ring-1 ring-orange-500/30`
                      : "bg-slate-50/60 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                        mode.color
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={cn("text-xs font-black block truncate", isSelected ? "text-orange-950" : "text-slate-800")}>
                          {mode.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block truncate">
                          {mode.sublabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isDeckDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                          Default
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 text-[10px] shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {mode.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══════════ 2. SENSORY & DISPLAY CUSTOMIZATIONS ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-orange-600" />
            Media & Display Preferences
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Audio Autoplay */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  Automatic Audio (TTS)
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Original: {audioLabelMap[creatorDefs.autoplay_audio || 'none'] || 'Off'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                {[
                  { id: 'none', label: 'Off' },
                  { id: 'front', label: 'Front' },
                  { id: 'back', label: 'Back' },
                  { id: 'always', label: 'Always' },
                ].map(opt => {
                  const active = autoplayAudio === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAutoplayAudio(opt.id as AudioChoice)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                        active
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Image Visibility */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Illustration Images
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Original: {imageLabelMap[creatorDefs.show_images || 'always'] || 'Both Sides'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                {[
                  { id: 'always', label: 'Both' },
                  { id: 'front', label: 'Front' },
                  { id: 'back', label: 'Back' },
                  { id: 'none', label: 'Off' },
                ].map(opt => {
                  const active = showImages === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setShowImages(opt.id as ImageChoice)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                        active
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ CARD ALIGNMENT (2-AXIS: FRONT & BACK) ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-600" />
            Card Content Alignment (Front & Back)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Front Card Alignment */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  🎴 Front Card
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Original: {creatorDefs.front_valign === 'top' ? 'Top' : 'Center'} / {creatorDefs.front_halign === 'center' ? 'Center' : 'Left'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Vertical:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setFrontValign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontValign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrontValign('top')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontValign === 'top'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Top
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setFrontHalign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontHalign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrontHalign('left')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontHalign === 'left'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Left
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Card Alignment */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  📖 Back Card
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Original: {creatorDefs.back_valign === 'top' ? 'Top' : 'Center'} / {creatorDefs.back_halign === 'center' ? 'Center' : 'Left'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Vertical:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setBackValign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backValign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackValign('top')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backValign === 'top'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Top
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setBackHalign('left')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backHalign === 'left'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackHalign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backHalign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Center
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ 3. BEHAVIOR & INTERACTION TOGGLES ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Study Behavior & Interaction
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Shuffle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Shuffle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">Random Shuffle</span>
              </div>
              <button
                type="button"
                onClick={() => setRandomEnabled(prev => !prev)}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                  randomEnabled ? "bg-orange-500" : "bg-slate-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", randomEnabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>

            {/* SFX */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">Sound Effects (SFX)</span>
              </div>
              <button
                type="button"
                onClick={() => setSfxEnabled(prev => !prev)}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                  sfxEnabled ? "bg-orange-500" : "bg-slate-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", sfxEnabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>

            {/* Auto Advance */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">Auto Advance</span>
              </div>
              <button
                type="button"
                onClick={() => setQuickLearnEnabled(prev => !prev)}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                  quickLearnEnabled ? "bg-orange-500" : "bg-slate-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", quickLearnEnabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════ 4. FLASHCARD GESTURE & INTERACTION ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Flashcard Gestures & FSRS Rating
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card Flip Trigger */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Card Flip Trigger
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setCardFlipTrigger('both')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardFlipTrigger === 'both' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Tap card body or swipe to flip"
                >
                  Tap & Swipe
                </button>
                <button
                  type="button"
                  onClick={() => setCardFlipTrigger('tap')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardFlipTrigger === 'tap' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Tap card body to flip"
                >
                  Tap Only
                </button>
                <button
                  type="button"
                  onClick={() => setCardFlipTrigger('button_only')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardFlipTrigger === 'button_only' ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Strict button-only flipping"
                >
                  Button Only
                </button>
              </div>
            </div>

            {/* FSRS Rating Mode */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  FSRS Rating Mode
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setCardRatingMode('both')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardRatingMode === 'both' ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Both 4-directional swipe and 4 bottom buttons"
                >
                  Hybrid (Both)
                </button>
                <button
                  type="button"
                  onClick={() => setCardRatingMode('swipe_4way')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardRatingMode === 'swipe_4way' ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Swipe 4 directions: Left (Again), Down (Hard), Right (Good), Up (Easy)"
                >
                  4-Way Swipe
                </button>
                <button
                  type="button"
                  onClick={() => setCardRatingMode('swipe_2way')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardRatingMode === 'swipe_2way' ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Fast 2-way swipe: Left (Again), Right (Good)"
                >
                  2-Way Swipe
                </button>
                <button
                  type="button"
                  onClick={() => setCardRatingMode('buttons')}
                  className={cn(
                    "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                    cardRatingMode === 'buttons' ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Traditional 4 Anki-style buttons"
                >
                  4 Buttons
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ ACTION BUTTONS ═══════════ */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isResetting || isSaving}
            className="px-4 h-10 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset all settings to the creator original defaults"
          >
            <ResetIcon className={cn("w-3.5 h-3.5", isResetting && "animate-spin")} />
            <span>{isResetting ? 'Resetting...' : 'Reset to Deck Defaults'}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isResetting}
            className="px-5 h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'SAVING...' : 'SAVE PERSONAL SETTINGS'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

export default DeckPersonalSettings
