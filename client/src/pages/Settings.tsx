import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  Settings as SettingsIcon, 
  Brain, 
  Zap, 
  Clock, 
  RotateCcw, 
  Shuffle, 
  ListOrdered,
  Sparkles,
  ShieldCheck,
  Bell,
  Moon,
  Send,
  Lock,
  ExternalLink,
  Move,
  MousePointer,
  Compass,
  Layers,
  AlignLeft,
  AlignCenter,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Check,
  Headphones,
  BookOpen,
  BookmarkCheck,
  User,
  Sliders,
  Copy,
  Edit3,
  Eye,
  ChevronDown,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { StudyProfile } from '@/store/useSettingsStore'
import { cn } from '@/lib/utils'

export type SettingsTab = 'deck_template' | 'alerts' | 'general'

interface TabConfig {
  id: SettingsTab
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const SETTINGS_TABS: TabConfig[] = [
  {
    id: 'deck_template',
    label: 'Deck Templates',
    shortLabel: 'Templates',
    icon: Sparkles,
    description: 'Profiles, gestures, algorithm & card alignments'
  },
  {
    id: 'alerts',
    label: 'Telegram & Alerts',
    shortLabel: 'Alerts',
    icon: Send,
    description: 'Telegram bot & push notifications'
  },
  {
    id: 'general',
    label: 'General & Security',
    shortLabel: 'General',
    icon: ShieldCheck,
    description: 'Theme, focus timer & account security'
  }
]

const SYSTEM_PROFILES = [
  {
    id: 'preset-minimal',
    name: 'Minimalist',
    icon: 'sparkles',
    badge: 'Zero Distraction',
    desc: 'Pure minimalist study: no images, no audio autoplay, hidden FSRS metrics, and swipe-only without button clutter.',
    details: [
      { label: 'Flip', val: 'Tap Body' },
      { label: 'Rating', val: '4-Way Swipe' },
      { label: 'Audio', val: 'Off' },
      { label: 'Order', val: 'Standard' },
    ],
    settings: {
      autoplay_audio: 'none',
      show_images: 'none',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'center',
      back_valign: 'center',
      back_halign: 'center',
      random_enabled: false,
      sfx_enabled: false,
      haptic_enabled: false,
      quick_learn_enabled: false,
      show_fsrs: false,
      card_flip_trigger: 'tap',
      card_rating_mode: 'swipe_4way',
    }
  },
  {
    id: 'preset-full',
    name: 'Full Experience',
    icon: 'zap',
    badge: 'All Features',
    desc: 'Everything enabled: dual-sided images, autoplay TTS audio, FSRS metrics, and combined swipe & buttons.',
    details: [
      { label: 'Flip', val: 'Tap & Swipe' },
      { label: 'Rating', val: 'Swipe & 4 Buttons' },
      { label: 'Audio', val: 'Always Play' },
      { label: 'Order', val: 'Standard' },
    ],
    settings: {
      autoplay_audio: 'always',
      show_images: 'both',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: false,
      show_fsrs: true,
      card_flip_trigger: 'both',
      card_rating_mode: 'both',
    }
  },
  {
    id: 'preset-standard',
    name: 'Standard',
    icon: 'sparkles',
    badge: 'Recommended',
    desc: 'Balanced recall: clean question on the front side; audio pronunciation and illustration appear only on the back side.',
    details: [
      { label: 'Flip', val: 'Tap & Swipe' },
      { label: 'Rating', val: 'Swipe & 4 Buttons' },
      { label: 'Audio', val: 'Back Side Only' },
      { label: 'Order', val: 'Standard' },
    ],
    settings: {
      autoplay_audio: 'back',
      show_images: 'back_only',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: false,
      show_fsrs: true,
      card_flip_trigger: 'both',
      card_rating_mode: 'both',
    }
  },
  {
    id: 'preset-classic',
    name: 'Classic',
    icon: 'book',
    badge: 'Anki Style',
    desc: 'Traditional 4-button workflow: flip strictly via button so you can easily select and copy text without accidental flips.',
    details: [
      { label: 'Flip', val: 'Button Only' },
      { label: 'Rating', val: '4 Buttons Only' },
      { label: 'Audio', val: 'Back Side Only' },
      { label: 'Order', val: 'Standard' },
    ],
    settings: {
      autoplay_audio: 'back',
      show_images: 'both',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'top',
      front_halign: 'left',
      back_valign: 'top',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: false,
      show_fsrs: true,
      card_flip_trigger: 'button_only',
      card_rating_mode: 'buttons',
    }
  }
]

type LearningMode = 'sequential' | 'random' | 'unseen' | 'review'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const getPresetDetails = (preset: any) => {
  const s = preset.settings || {}
  const flip = s.card_flip_trigger === 'button_only' ? 'Button Only' : s.card_flip_trigger === 'tap' ? 'Tap Body' : 'Tap & Swipe'
  const rating = s.card_rating_mode === 'buttons' ? '4 Buttons' : s.card_rating_mode === 'swipe_4way' ? '4-Way Swipe' : s.card_rating_mode === 'swipe_2way' ? '2-Way Swipe' : 'Swipe & 4 Buttons'
  const audio = s.autoplay_audio === 'always' ? 'Always Play' : s.autoplay_audio === 'back' ? 'Back Only' : s.autoplay_audio === 'front' ? 'Front Only' : 'Off'
  const img = s.show_images === 'none' ? 'Hidden' : s.show_images === 'back_only' || s.show_images === 'back' ? 'Back Only' : s.show_images === 'front' ? 'Front Only' : 'Both Sides'
  return [
    { label: 'Flip', val: flip },
    { label: 'Rating', val: rating },
    { label: 'Audio', val: audio },
    { label: 'Images', val: img },
  ]
}

interface SegmentedOption<T extends string | boolean> {
  id: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SegmentedControlProps<T extends string | boolean> {
  value: T
  onChange: (val: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

function SegmentedControl<T extends string | boolean>({
  value,
  onChange,
  options,
  className
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn("grid gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id
        const Icon = opt.icon
        return (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer truncate",
              isSelected
                ? "bg-white text-indigo-600 shadow-xs border border-slate-200/90 font-black"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

interface ToggleRowProps {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  desc: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange }: ToggleRowProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-200 transition-all cursor-pointer group shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-xs font-black text-slate-800 uppercase tracking-tight block truncate">{label}</span>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{desc}</p>
        </div>
      </div>
      <div className={cn("w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0", checked ? "bg-indigo-600" : "bg-slate-200")}>
        <div className={cn("w-4 h-4 rounded-full bg-white transition-transform shadow-xs", checked ? "translate-x-4" : "translate-x-0")} />
      </div>
    </div>
  )
}

export const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { user, userSettings, updateUserSettings, authConfig } = useAppStore()

  // Dynamic system presets loaded from database with fallback to defaults
  const systemProfiles = useMemo(() => {
    const fromBackend = (userSettings.study_profiles || []).filter((p: any) => p.is_system)
    if (fromBackend.length > 0) {
      return fromBackend.map((bp: any) => {
        const matchingFallback = SYSTEM_PROFILES.find(sp => sp.id === bp.id)
        return {
          ...bp,
          icon: bp.icon || matchingFallback?.icon || 'sparkles',
          badge: bp.badge || matchingFallback?.badge || 'System',
          desc: bp.description || matchingFallback?.desc || '',
          details: getPresetDetails(bp)
        }
      })
    }
    return SYSTEM_PROFILES
  }, [userSettings.study_profiles])

  // Read initial tab from URL query param, default to 'deck_template'
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null
  const initialTab: SettingsTab = (tabFromUrl && SETTINGS_TABS.some(t => t.id === tabFromUrl))
    ? tabFromUrl
    : 'deck_template'

  const [activeTab, setActiveTabState] = useState<SettingsTab>(initialTab)

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }

  // Scope and Filter State for Study Templates & Direct Preferences
  const [selectedDeckId, setSelectedDeckId] = useState<string>(searchParams.get('deck_id') || 'global')
  const [userDecks, setUserDecks] = useState<Array<{ id: string | number; title: string }>>([])
  const [isResettingCreator, setIsResettingCreator] = useState(false)
  const [templateFilter, setTemplateFilter] = useState<'all' | 'system' | 'custom'>('all')
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [templateTab, setTemplateTab] = useState<'system' | 'custom' | 'customize'>('system')
  const [activeTunerTab, setActiveTunerTab] = useState<'gestures' | 'display' | 'media' | 'algorithm'>('gestures')

  // Profile / Template Creation & Editing State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [modalTab, setModalTab] = useState<'gestures' | 'display' | 'media' | 'algorithm'>('gestures')
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileIcon, setNewProfileIcon] = useState('sparkles')
  const [newProfileBase, setNewProfileBase] = useState('preset-standard')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Detailed Template Gestures & Study Settings State for Creation Modal
  const [templateSettings, setTemplateSettings] = useState<{
    card_flip_trigger: 'both' | 'tap' | 'button_only';
    card_rating_mode: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way';
    quiz_learning_mode: 'sequential' | 'unseen' | 'review' | 'random' | 'fsrs';
    front_valign: 'center' | 'top';
    front_halign: 'left' | 'center';
    back_valign: 'center' | 'top';
    back_halign: 'left' | 'center';
    autoplay_audio: 'always' | 'front' | 'back' | 'none';
    show_images: 'both' | 'back_only' | 'none' | 'always';
    show_fsrs: boolean;
    sfx_enabled: boolean;
    haptic_enabled: boolean;
    random_enabled: boolean;
  }>({
    card_flip_trigger: 'both',
    card_rating_mode: 'both',
    quiz_learning_mode: 'fsrs',
    front_valign: 'center',
    front_halign: 'left',
    back_valign: 'center',
    back_halign: 'left',
    autoplay_audio: 'always',
    show_images: 'both',
    show_fsrs: true,
    sfx_enabled: true,
    haptic_enabled: true,
    random_enabled: false
  })

  const loadBaseSettings = (baseId: string) => {
    setNewProfileBase(baseId)
    if (baseId === 'current') {
      setTemplateSettings({
        card_flip_trigger: (userSettings.card_flip_trigger as any) || 'both',
        card_rating_mode: (userSettings.card_rating_mode as any) || 'both',
        quiz_learning_mode: (userSettings.quiz_learning_mode as any) || 'fsrs',
        front_valign: (userSettings.front_valign as any) || 'center',
        front_halign: (userSettings.front_halign as any) || 'left',
        back_valign: (userSettings.back_valign as any) || 'center',
        back_halign: (userSettings.back_halign as any) || 'left',
        autoplay_audio: (userSettings.autoplay_audio as any) || 'always',
        show_images: (userSettings.show_images as any) || 'both',
        show_fsrs: userSettings.show_fsrs ?? true,
        sfx_enabled: userSettings.sfx_enabled ?? true,
        haptic_enabled: userSettings.haptic_enabled ?? true,
        random_enabled: userSettings.random_enabled ?? false
      })
    } else {
      const preset = systemProfiles.find(p => p.id === baseId) || systemProfiles[0]
      const s = preset.settings as any
      setTemplateSettings({
        card_flip_trigger: s.card_flip_trigger || 'both',
        card_rating_mode: s.card_rating_mode || 'both',
        quiz_learning_mode: s.quiz_learning_mode || 'fsrs',
        front_valign: s.front_valign || 'center',
        front_halign: s.front_halign || 'left',
        back_valign: s.back_valign || 'center',
        back_halign: s.back_halign || 'left',
        autoplay_audio: s.autoplay_audio || 'always',
        show_images: s.show_images || 'both',
        show_fsrs: s.show_fsrs ?? true,
        sfx_enabled: s.sfx_enabled ?? true,
        haptic_enabled: s.haptic_enabled ?? true,
        random_enabled: s.random_enabled ?? false
      })
    }
  }

  const handleCreateProfile = async (name: string, icon = 'sparkles', baseSettings: any = {}) => {
    const newId = `custom-${Date.now()}`
    const newProfile: StudyProfile = {
      id: newId,
      name,
      icon,
      is_system: false,
      settings: baseSettings
    }
    const currentProfiles = userSettings.study_profiles || []
    const updatedProfiles = [...currentProfiles.filter((p: any) => !p.is_system), newProfile]
    await updateUserSettings({
      study_profiles: updatedProfiles as any,
      active_profile_id: newId,
      ...baseSettings
    } as any)
  }

  const handleUpdateCustomProfile = async (profileId: string, name: string, icon: string, updatedSettings: any) => {
    const currentProfiles = userSettings.study_profiles || []
    const updatedProfiles = currentProfiles.map((p: any) => {
      if (p.id === profileId) {
        return {
          ...p,
          name,
          icon,
          settings: updatedSettings
        }
      }
      return p
    })
    const isCurrentActive = userSettings.active_profile_id === profileId
    await updateUserSettings({
      study_profiles: updatedProfiles as any,
      ...(isCurrentActive ? updatedSettings : {})
    } as any)
  }

  const handleClonePreset = (preset: any) => {
    setEditingProfileId(null)
    setNewProfileName(`${preset.name} (Customized)`)
    setNewProfileIcon(preset.icon || 'sparkles')
    setTemplateSettings({
      card_flip_trigger: (preset.settings.card_flip_trigger as any) || 'both',
      card_rating_mode: (preset.settings.card_rating_mode as any) || 'both',
      quiz_learning_mode: (preset.settings.quiz_learning_mode as any) || 'fsrs',
      front_valign: (preset.settings.front_valign as any) || 'center',
      front_halign: (preset.settings.front_halign as any) || 'left',
      back_valign: (preset.settings.back_valign as any) || 'center',
      back_halign: (preset.settings.back_halign as any) || 'left',
      autoplay_audio: (preset.settings.autoplay_audio as any) || 'always',
      show_images: (preset.settings.show_images as any) || 'both',
      show_fsrs: preset.settings.show_fsrs ?? true,
      sfx_enabled: preset.settings.sfx_enabled ?? true,
      haptic_enabled: preset.settings.haptic_enabled ?? true,
      random_enabled: preset.settings.random_enabled ?? false
    })
    setModalTab('gestures')
    setIsCreateModalOpen(true)
  }

  const handleEditCustomProfile = (prof: StudyProfile) => {
    setEditingProfileId(prof.id)
    setNewProfileName(prof.name)
    setNewProfileIcon(prof.icon || 'sparkles')
    const s = prof.settings || {}
    setTemplateSettings({
      card_flip_trigger: (s.card_flip_trigger as any) || 'both',
      card_rating_mode: (s.card_rating_mode as any) || 'both',
      quiz_learning_mode: (s.quiz_learning_mode as any) || 'fsrs',
      front_valign: (s.front_valign as any) || 'center',
      front_halign: (s.front_halign as any) || 'left',
      back_valign: (s.back_valign as any) || 'center',
      back_halign: (s.back_halign as any) || 'left',
      autoplay_audio: (s.autoplay_audio as any) || 'always',
      show_images: (s.show_images as any) || 'both',
      show_fsrs: s.show_fsrs ?? true,
      sfx_enabled: s.sfx_enabled ?? true,
      haptic_enabled: s.haptic_enabled ?? true,
      random_enabled: s.random_enabled ?? false
    })
    setModalTab('gestures')
    setIsCreateModalOpen(true)
  }

  const handleDeleteProfile = async (profileId: string) => {
    const currentProfiles = userSettings.study_profiles || []
    const updatedProfiles = currentProfiles.filter((p: any) => p.id !== profileId && !p.is_system)
    const nextActiveId = userSettings.active_profile_id === profileId ? 'preset-standard' : userSettings.active_profile_id
    await updateUserSettings({
      study_profiles: updatedProfiles as any,
      active_profile_id: nextActiveId
    })
  }

  const handleSetActiveProfile = async (profileId: string) => {
    const customProfiles: StudyProfile[] = (userSettings.study_profiles || []).filter((p: any) => !p.is_system)
    const targetProf = [...systemProfiles, ...customProfiles].find(p => p.id === profileId)
    const profSettings = targetProf?.settings || {}

    // Apply BOTH active profile ID AND all study + gesture settings to user's global settings
    await updateUserSettings({
      active_profile_id: profileId,
      ...profSettings
    } as any)
  }

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const res = await axios.get('/api/v1/deck/roadmap/decks')
        const decks = res.data?.decks || []
        setUserDecks(decks.map((d: any) => ({ id: d.id, title: d.title || d.name || `Deck #${d.id}` })))
      } catch (e) {
        console.error('Failed to fetch user decks for settings scope', e)
      }
    }
    fetchDecks()
  }, [])

  const handleResetToCreator = async () => {
    setIsResettingCreator(true)
    try {
      if (selectedDeckId === 'global') {
        const standardPreset = systemProfiles.find(p => p.id === 'preset-standard') || systemProfiles[0]
        await updateUserSettings({
          active_profile_id: standardPreset.id,
          ...standardPreset.settings
        })
        setToastMessage({ type: 'success', text: 'Global study settings restored to factory Standard template.' })
      } else {
        const res = await axios.post(`/api/v1/deck/${selectedDeckId}/practice-settings`, {
          is_creator: false,
          reset_study_defaults: true
        })
        if (res.data?.effective_study_settings) {
          await updateUserSettings(res.data.effective_study_settings)
        }
        setToastMessage({ type: 'success', text: "Successfully reset to the deck creator's original template!" })
      }
    } catch (err) {
      console.error('Failed to reset template', err)
      setToastMessage({ type: 'error', text: 'Failed to reset settings. Please try again.' })
    } finally {
      setIsResettingCreator(false)
    }
  }

  const handleApplyTemplate = async (profile: any) => {
    try {
      const s = profile.settings || {}
      if (selectedDeckId === 'global') {
        await updateUserSettings({
          active_profile_id: profile.id,
          ...s
        })
        setToastMessage({ type: 'success', text: `Applied "${profile.name}" template to account defaults.` })
      } else {
        await axios.post(`/api/v1/deck/${selectedDeckId}/practice-settings`, {
          is_creator: false,
          active_profile_id: profile.id,
          ...s
        })
        await updateUserSettings({
          active_profile_id: profile.id,
          ...s
        })
        setToastMessage({ type: 'success', text: `Applied "${profile.name}" template to this deck!` })
      }
    } catch (err) {
      console.error('Failed to apply template', err)
      setToastMessage({ type: 'error', text: 'Failed to apply template. Please try again.' })
    }
  }

  const handleUpdateStudySetting = async (key: string, value: any) => {
    try {
      await updateUserSettings({ [key]: value })
      if (selectedDeckId !== 'global') {
        await axios.post(`/api/v1/deck/${selectedDeckId}/practice-settings`, {
          is_creator: false,
          [key]: value
        })
      }
    } catch (err) {
      console.error(`Failed to update ${key}`, err)
    }
  }

  const [pushActive, setPushActive] = useState(false)
  const [, setCheckingPush] = useState(true)
  const [telegramConfig, setTelegramConfig] = useState<any>(null)
  
  const darkMode = userSettings.theme === 'dark'
  const focusTimer = userSettings.focus_timer_active
  const learningMode = (userSettings.quiz_learning_mode || 'fsrs') as LearningMode

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passMsg, setPassMsg] = useState({ type: '', text: '' })
  const [passLoading, setPassLoading] = useState(false)

  const toggleDarkMode = () => {
    const nextMode = darkMode ? 'light' : 'dark'
    if (nextMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    updateUserSettings({ theme: nextMode })
  }

  const toggleFocusTimer = () => {
    updateUserSettings({ focus_timer_active: !focusTimer })
  }

  const fetchTelegramConfig = async () => {
    try {
      const res = await axios.get('/api/v1/notifications/telegram/config')
      setTelegramConfig(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const updateTelegram = async (data: any) => {
    try {
      await axios.post('/api/v1/notifications/telegram/config', data)
      fetchTelegramConfig()
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchTelegramConfig()
    
    // Check if browser has push subscription active
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          const sub = await registration.pushManager.getSubscription()
          setPushActive(!!sub && Notification.permission === 'granted')
        } catch (e) {
          console.error("Error checking push subscription status:", e)
        }
      }
      setCheckingPush(false)
    }
    checkSubscription()
  }, [])

  useEffect(() => {
    if (location.hash) {
      if (location.hash === '#preferences' || location.hash === '#security') {
        setActiveTabState('general')
      } else if (location.hash === '#telegram') {
        setActiveTabState('alerts')
      } else {
        setActiveTabState('deck_template')
      }
    }
  }, [location.hash])

  const updateLearningMode = (mode: LearningMode) => {
    updateUserSettings({ quiz_learning_mode: mode })
  }

  const togglePushNotifications = async () => {
    if (pushActive) {
      // Unsubscribe
      setPushActive(false)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await subscription.unsubscribe()
            await axios.post('/api/v1/notifications/push/unsubscribe', {
              endpoint: subscription.endpoint
            })
          }
        } catch (e) {
          console.error("Failed to unsubscribe", e)
        }
      }
    } else {
      // Subscribe
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert("Push notifications are not supported in this browser.")
        return
      }
      
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert("Notification permission denied. Please allow notifications in browser settings.")
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const keyRes = await axios.get('/api/v1/notifications/vapid-public-key')
        const vapidPublicKey = keyRes.data.public_key
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        })

        const subJson = subscription.toJSON()
        await axios.post('/api/v1/notifications/push/subscribe', {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth
          }
        })
        setPushActive(true)
      } catch (error) {
        console.error("Push subscription failed", error)
        alert("Failed to subscribe. Please try again.")
      }
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassMsg({ type: '', text: '' })
    if (!currentPassword || !newPassword) {
      setPassMsg({ type: 'error', text: 'Please fill in both fields.' })
      return
    }
    setPassLoading(true)
    try {
      const res = await axios.post('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      if (res.data.status === 'success') {
        setPassMsg({ type: 'success', text: res.data.message })
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPassMsg({ type: 'error', text: res.data.message })
      }
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password' })
    } finally {
      setPassLoading(false)
    }
  }

  const modes = [
    {
      id: 'sequential',
      name: 'Orderly Progression',
      desc: 'Follow the original neural sequence (1, 2, 3...)',
      icon: ListOrdered,
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      id: 'unseen',
      name: 'Expansion Mode',
      desc: 'Prioritize nodes you have never encountered before',
      icon: Sparkles,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      id: 'review',
      name: 'Mastery Cycle',
      desc: 'Focus on weak patterns and review session history',
      icon: RotateCcw,
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      id: 'random',
      name: 'Neural Entropy',
      desc: 'Shuffle all nodes for maximum chaos and retention',
      icon: Shuffle,
      color: 'text-rose-500',
      bg: 'bg-rose-50'
    }
  ]

  // ══════════════ TAB 0: STREAMLINED STUDY TEMPLATES & LIVE PREFERENCES ══════════════
  const renderDeckTemplateTab = () => {
    const customProfiles: StudyProfile[] = (userSettings.study_profiles || []).filter((p: any) => !p.is_system)
    const activeId = userSettings.active_profile_id || 'preset-standard'
    const allProfiles = [...systemProfiles, ...customProfiles]
    const activeProfileObj = allProfiles.find(p => p.id === activeId)
    const selectedDeck = userDecks.find(d => String(d.id) === String(selectedDeckId))

    const filteredProfiles = templateFilter === 'system' 
      ? systemProfiles 
      : templateFilter === 'custom' 
        ? customProfiles 
        : allProfiles

    return (
      <div className="space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm border",
              toastMessage.type === 'success' 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* 1. TOP HERO & SCOPE SELECTOR */}
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Study Experience Settings</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                Study Templates & Preferences
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Switch or customize gestures, card alignments, pronunciation, and algorithms for your study sessions.
              </p>
            </div>

            {/* Scope Switcher Pill */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDeckId('global')}
                className={cn(
                  "py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer",
                  selectedDeckId === 'global'
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Global Account
              </button>
              <button
                type="button"
                onClick={() => {
                  if (userDecks.length > 0 && selectedDeckId === 'global') {
                    setSelectedDeckId(String(userDecks[0].id))
                  }
                }}
                className={cn(
                  "py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer",
                  selectedDeckId !== 'global'
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Specific Deck
              </button>
            </div>
          </div>

          {/* Scope Detail Card */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 font-black shrink-0">
                {selectedDeckId === 'global' ? <Sliders className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Current Target Scope
                </span>
                {selectedDeckId === 'global' ? (
                  <span className="text-xs font-black text-slate-800 truncate block">
                    All Decks (Default Account Profile: <span className="text-indigo-600">{activeProfileObj?.name || 'Standard'}</span>)
                  </span>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {userDecks.map((d) => (
                        <option key={d.id} value={String(d.id)}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Reset Action Button */}
            <button
              type="button"
              disabled={isResettingCreator}
              onClick={handleResetToCreator}
              className={cn(
                "inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border",
                selectedDeckId !== 'global'
                  ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              <RotateCcw className={cn("w-3.5 h-3.5", isResettingCreator && "animate-spin")} />
              <span>
                {selectedDeckId !== 'global'
                  ? "↺ Reset to Creator's Template"
                  : "↺ Reset to Standard Defaults"}
              </span>
            </button>
          </div>
        </section>

        {/* 2. LOAD TEMPLATE HUB */}
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Load Study Template
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Choose a pre-configured profile or apply your saved template.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200/70 text-[11px] font-black">
                <button
                  type="button"
                  onClick={() => setTemplateFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    templateFilter === 'all' ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  All ({allProfiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter('system')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    templateFilter === 'system' ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  System ({systemProfiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter('custom')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    templateFilter === 'custom' ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  My Templates ({customProfiles.length})
                </button>
              </div>

              {/* Save As Template Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingProfileId(null)
                  setNewProfileName('')
                  setNewProfileIcon('sparkles')
                  loadBaseSettings('current')
                  setIsCreateModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save as Template</span>
              </button>
            </div>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredProfiles.map((prof: any) => {
              const isActive = activeId === prof.id
              const IconComp = prof.icon === 'zap' ? Zap : prof.icon === 'headphones' ? Headphones : prof.icon === 'book' ? BookOpen : Sparkles
              const s = prof.settings || {}

              return (
                <div
                  key={prof.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative",
                    isActive
                      ? "border-indigo-500 bg-indigo-50/20 shadow-xs"
                      : "border-slate-200/80 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                            {prof.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold block truncate">
                            {prof.is_system ? 'System Preset' : 'Custom Template'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {!prof.is_system && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditCustomProfile(prof)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit Template"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProfile(prof.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Specs Chips */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <div className="truncate">
                        <span className="text-slate-400 font-medium">Flip: </span>
                        {s.card_flip_trigger === 'button_only' ? 'Button' : s.card_flip_trigger === 'tap' ? 'Tap Body' : 'Tap & Swipe'}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 font-medium">Rating: </span>
                        {s.card_rating_mode === 'buttons' ? '4 Buttons' : s.card_rating_mode === 'swipe_4way' ? '4-Way' : s.card_rating_mode === 'swipe_2way' ? '2-Way' : 'Hybrid'}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 font-medium">Audio: </span>
                        {s.autoplay_audio === 'none' ? 'Muted' : s.autoplay_audio === 'back' ? 'Back' : 'Always'}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 font-medium">Align: </span>
                        {s.front_valign === 'top' ? 'Top' : 'Center'}
                      </div>
                    </div>
                  </div>

                  {/* Apply Template Button */}
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(prof)}
                    className={cn(
                      "w-full py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                      isActive
                        ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                    )}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Currently Active</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply to {selectedDeckId === 'global' ? 'Account Defaults' : 'This Deck'}</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* 3. DIRECT PREFERENCES (LIVE ADJUSTMENTS) */}
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Direct Preferences Tuning
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Fine-tune study controls for {selectedDeckId === 'global' ? 'your entire account' : `deck: ${selectedDeck?.title || selectedDeckId}`}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* GROUP 1: Gestures & Feedback */}
            <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2 text-indigo-600">
                <Move className="w-4 h-4" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Gestures & Controls
                </h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Card Flip Trigger
                </label>
                <SegmentedControl
                  value={userSettings.card_flip_trigger || 'both'}
                  onChange={(val) => handleUpdateStudySetting('card_flip_trigger', val)}
                  options={[
                    { id: 'both', label: 'Tap & Swipe' },
                    { id: 'tap', label: 'Tap Card Body' },
                    { id: 'button_only', label: 'Button Only' }
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  FSRS Rating Mode
                </label>
                <SegmentedControl
                  value={userSettings.card_rating_mode || 'both'}
                  onChange={(val) => handleUpdateStudySetting('card_rating_mode', val)}
                  options={[
                    { id: 'both', label: 'Hybrid' },
                    { id: 'swipe_4way', label: '4-Way Swipe' },
                    { id: 'swipe_2way', label: '2-Way Swipe' },
                    { id: 'buttons', label: 'Buttons Only' }
                  ]}
                />
              </div>

              <ToggleRow
                icon={Volume2}
                label="Sound Effects (SFX)"
                desc="Play audio feedback on card flips and answer ratings"
                checked={userSettings.sfx_enabled ?? true}
                onChange={(val) => handleUpdateStudySetting('sfx_enabled', val)}
              />

              <ToggleRow
                icon={Zap}
                label="Haptic Feedback"
                desc="Vibrate on mobile devices when swiping cards"
                checked={userSettings.haptic_enabled ?? true}
                onChange={(val) => handleUpdateStudySetting('haptic_enabled', val)}
              />
            </div>

            {/* GROUP 2: Display & Alignment */}
            <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2 text-indigo-600">
                <Layers className="w-4 h-4" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Display & Card Alignment
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Front Card Alignment
                  </label>
                  <SegmentedControl
                    value={userSettings.front_valign || 'center'}
                    onChange={(val) => handleUpdateStudySetting('front_valign', val)}
                    options={[
                      { id: 'center', label: 'Center' },
                      { id: 'top', label: 'Top' }
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Back Card Alignment
                  </label>
                  <SegmentedControl
                    value={userSettings.back_valign || 'center'}
                    onChange={(val) => handleUpdateStudySetting('back_valign', val)}
                    options={[
                      { id: 'center', label: 'Center' },
                      { id: 'top', label: 'Top' }
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Illustration Images
                </label>
                <SegmentedControl
                  value={userSettings.show_images || 'both'}
                  onChange={(val) => handleUpdateStudySetting('show_images', val)}
                  options={[
                    { id: 'both', label: 'Both Sides' },
                    { id: 'back_only', label: 'Back Only' },
                    { id: 'none', label: 'Hidden' }
                  ]}
                />
              </div>

              <ToggleRow
                icon={Eye}
                label="FSRS Algorithm Metrics"
                desc="Show memory stability, retrievability, and interval on card"
                checked={userSettings.show_fsrs ?? true}
                onChange={(val) => handleUpdateStudySetting('show_fsrs', val)}
              />
            </div>

            {/* GROUP 3: Audio & Speech */}
            <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2 text-indigo-600">
                <Headphones className="w-4 h-4" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Audio & Pronunciation
                </h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Autoplay Pronunciation
                </label>
                <SegmentedControl
                  value={userSettings.autoplay_audio || 'always'}
                  onChange={(val) => handleUpdateStudySetting('autoplay_audio', val)}
                  options={[
                    { id: 'always', label: 'Always' },
                    { id: 'back', label: 'Back Only' },
                    { id: 'front', label: 'Front Only' },
                    { id: 'none', label: 'Off' }
                  ]}
                />
              </div>
            </div>

            {/* GROUP 4: Queue & Algorithm */}
            <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2 text-indigo-600">
                <Brain className="w-4 h-4" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Queue & Review Order
                </h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Card Order Mode
                </label>
                <SegmentedControl
                  value={userSettings.quiz_learning_mode || 'fsrs'}
                  onChange={(val) => handleUpdateStudySetting('quiz_learning_mode', val)}
                  options={[
                    { id: 'fsrs', label: 'FSRS v6' },
                    { id: 'sequential', label: 'Sequential' },
                    { id: 'unseen', label: 'New First' },
                    { id: 'random', label: 'Shuffle' }
                  ]}
                />
              </div>

              <ToggleRow
                icon={Shuffle}
                label="Randomize Card Order"
                desc="Shuffle cards within the review queue"
                checked={userSettings.random_enabled ?? false}
                onChange={(val) => handleUpdateStudySetting('random_enabled', val)}
              />
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ══════════════ TAB 1: TELEGRAM & ALERTS ══════════════
  const renderAlertsTab = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Telegram Settings */}
      <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-4 sm:mb-6 border-b border-slate-100 pb-3.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Telegram Integration</h2>
            <p className="text-[10px] font-medium text-slate-400">Receive spaced repetition alerts and study reminders on Telegram</p>
          </div>
        </div>
        
        <div className="bg-blue-50/30 p-4 sm:p-6 rounded-2xl md:rounded-3xl border border-blue-50">
          {!telegramConfig?.is_linked ? (
            <div className="text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl mx-auto mb-3 md:mb-4 flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                <Send className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1.5 md:mb-2">Connect Telegram Bot</h3>
              <p className="text-[10px] font-medium text-slate-400 mb-4 md:mb-6">Get daily reminders and practice directly on Telegram.</p>
              <div className="bg-white border border-slate-100 p-3.5 md:p-4 rounded-2xl flex flex-col items-center gap-1.5 md:gap-2 shadow-sm max-w-xs mx-auto">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Your Link Code</span>
                <span className="text-xl md:text-2xl font-black text-blue-600 tracking-widest">{telegramConfig?.connect_token || '...'}</span>
              </div>
              <div className="mt-4 md:mt-6">
                <p className="text-[10px] font-medium text-slate-400 mb-3">
                  Send <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">/start {telegramConfig?.connect_token}</span> to our bot.
                </p>
                <a href={`https://t.me/${(telegramConfig?.bot_username || 'VocaburnBot').replace(/^@/, '')}?start=${telegramConfig?.connect_token}`} target="_blank" rel="noreferrer" className="inline-block w-full max-w-xs py-3 md:py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
                  Open Bot
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Connected</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Reminders are active</p>
                  </div>
                </div>
                <button onClick={() => updateTelegram({ unlink: true })} className="text-[10px] font-black uppercase tracking-wider text-rose-500 px-3.5 py-1.5 md:px-4 md:py-2 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors active:scale-95 cursor-pointer">
                  Unlink
                </button>
              </div>
              
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Reminder Time</span>
                  <select 
                    value={telegramConfig?.reminder_time || "20:00"} 
                    onChange={(e) => updateTelegram({ reminder_time: e.target.value })} 
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-black text-indigo-600 focus:outline-none focus:border-indigo-300 transition-all cursor-pointer" 
                  >
                    {Array.from({ length: 18 }).map((_, i) => {
                      const hour = (i + 6).toString().padStart(2, '0');
                      return <option key={`${hour}:00`} value={`${hour}:00`}>{`${hour}:00`}</option>
                    })}
                  </select>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3.5 md:space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">Advanced Alerts</h4>
                  
                  <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateTelegram({ streak_guard_enabled: !(telegramConfig?.streak_guard_enabled ?? true) })}>
                    <div>
                      <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span>🛡️</span> Streak Guard
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-0.5">Alert at 22:00 if streak is at risk</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${telegramConfig?.streak_guard_enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${telegramConfig?.streak_guard_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateTelegram({ weekly_summary_enabled: !(telegramConfig?.weekly_summary_enabled ?? true) })}>
                    <div>
                      <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span>📊</span> Weekly Summary
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-0.5">Progress report on Sunday 09:00</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${telegramConfig?.weekly_summary_enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${telegramConfig?.weekly_summary_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateTelegram({ inactivity_alert_enabled: !(telegramConfig?.inactivity_alert_enabled ?? true) })}>
                    <div>
                      <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <span>💤</span> Inactivity Alert
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-0.5">Reminder after 3 days of missing study</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${telegramConfig?.inactivity_alert_enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${telegramConfig?.inactivity_alert_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Push Notification Toggle */}
      <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Browser Push Notifications</h2>
            <p className="text-[10px] font-medium text-slate-400">Receive review reminders directly in your browser</p>
          </div>
        </div>

        <SettingItem 
          icon={Bell} 
          label="Daily Reminder Push" 
          desc="Get push notifications when daily reviews are due" 
          active={pushActive} 
          onClick={togglePushNotifications}
        />
      </section>
    </div>
  )

  // ══════════════ TAB 4: GENERAL & SECURITY ══════════════
  const renderGeneralTab = () => (
    <div className="space-y-4 md:space-y-6">
      {/* General Settings */}
      <section id="preferences" className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">System Preferences</h2>
            <p className="text-[10px] font-medium text-slate-400">Interface display, theme, and timer behaviors</p>
          </div>
        </div>

        <div className="space-y-1.5 md:space-y-2">
          <SettingItem 
            icon={Moon} 
            label="Dark Matrix Mode" 
            desc="Switch interface to high-contrast dark mode" 
            active={darkMode}
            onClick={toggleDarkMode}
          />
          <SettingItem 
            icon={Clock} 
            label="Focus Timer" 
            desc="Display time spent per neural node during sessions" 
            active={focusTimer}
            onClick={toggleFocusTimer}
          />
        </div>
      </section>

      {/* Security / Password */}
      <section id="security" className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Account & Security</h2>
            <p className="text-[10px] font-medium text-slate-400">Manage credentials and authentication portal</p>
          </div>
        </div>
        
        {authConfig?.sso_enabled ? (
          <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 text-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1.5 md:mb-2">SSO Managed Account</h3>
            <p className="text-[10px] font-medium text-slate-400 mb-4 md:mb-6 max-w-sm mx-auto">
              Your account security is managed securely through CentralAuth. Please visit the SSO portal to change your password or update your profile.
            </p>
            <a 
              href={authConfig.jump_url || '#'} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full max-w-xs py-3 md:py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
            >
              Manage in SSO <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 max-w-md">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 md:mb-6">Change Password</h3>
            
            <div className="space-y-3.5 md:space-y-4 mb-4 md:mb-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            
            {passMsg.text && (
              <div className={`text-xs font-bold px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl mb-4 md:mb-6 ${passMsg.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {passMsg.text}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={passLoading}
              className="w-full py-3 md:py-3.5 bg-indigo-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </section>
    </div>
  )

  return (
    <div className="fixed inset-0 top-0 bottom-[68px] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="bg-white/90 md:bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-2xs px-3.5 sm:px-6 py-2.5 sm:py-3 shrink-0 z-30">
        <div className="w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-900/10 shrink-0">
              <SettingsIcon className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 uppercase tracking-tight italic leading-none truncate">
                System Configuration
              </h1>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 truncate">
                {SETTINGS_TABS.find(t => t.id === activeTab)?.description || 'Optimize Your Neural Link'}
              </p>
            </div>
          </div>

          {/* Desktop Segmented Tab Switcher */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs">
            {SETTINGS_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 py-1.5 px-3.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
                    isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopSettingsTabActive"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <TabIcon className={cn("w-4 h-4 relative z-10 shrink-0", isActive ? "text-indigo-600 stroke-[2.2]" : "text-slate-400 stroke-[1.8]")} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN TAB CONTENT (SCROLLABLE CONTAINER) ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5 md:py-6">
        <div className="w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto space-y-4 md:space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 md:space-y-6"
            >
              {activeTab === 'deck_template' && renderDeckTemplateTab()}
              {activeTab === 'alerts' && renderAlertsTab()}
              {activeTab === 'general' && renderGeneralTab()}
            </motion.div>
          </AnimatePresence>

          <div className="pt-2 pb-6 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Vocaburn v1.0.0 // Neural OS</p>
          </div>
        </div>
      </div>

      {/* ═══════════ ONE-HAND CENTERED BOTTOM DOCKED TAB BAR (MOBILE ONLY) ═══════════ */}
      <div className="md:hidden shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-2 sm:px-4 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md mx-auto">
          <div className="grid grid-cols-3 w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-2xs gap-1">
            {SETTINGS_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all select-none cursor-pointer",
                    isActive ? "text-indigo-600 font-black" : "text-slate-500 hover:text-slate-800 font-bold"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsBottomTabPill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <TabIcon className={cn(
                    "w-4 h-4 relative z-10 shrink-0 mb-0.5 transition-colors",
                    isActive ? "text-indigo-600 stroke-[2.3]" : "text-slate-400 stroke-[1.8]"
                  )} />
                  <span className="relative z-10 text-[10px] sm:text-xs tracking-tight truncate w-full text-center leading-tight font-black">
                    {tab.shortLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sleek, Compact Save as Custom Template Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {editingProfileId ? 'Edit Template' : 'Save as My Template'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Speedrun Morning, Deep Focus..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Icon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
                    { id: 'zap', label: 'Speed', icon: Zap },
                    { id: 'headphones', label: 'Audio', icon: Headphones },
                    { id: 'book', label: 'Focus', icon: BookOpen },
                  ].map((ic) => {
                    const isSel = newProfileIcon === ic.id
                    const IconComp = ic.icon
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setNewProfileIcon(ic.id)}
                        className={cn(
                          "py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
                          isSel
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs font-black"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 font-medium"
                        )}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9.5px] truncate">{ic.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-[11px] text-slate-600 font-medium leading-relaxed">
                <span className="font-bold text-indigo-700 block mb-0.5">Captures Your Live Settings:</span>
                This template will snapshot your currently selected swipe triggers, FSRS rating style, card alignment, and audio preferences.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newProfileName.trim() || isSavingProfile}
                onClick={async () => {
                  if (!newProfileName.trim()) return
                  setIsSavingProfile(true)
                  try {
                    const capturedSettings = {
                      card_flip_trigger: userSettings.card_flip_trigger || 'both',
                      card_rating_mode: userSettings.card_rating_mode || 'both',
                      quiz_learning_mode: userSettings.quiz_learning_mode || 'fsrs',
                      front_valign: userSettings.front_valign || 'center',
                      front_halign: userSettings.front_halign || 'center',
                      back_valign: userSettings.back_valign || 'center',
                      back_halign: userSettings.back_halign || 'center',
                      autoplay_audio: userSettings.autoplay_audio || 'always',
                      show_images: userSettings.show_images || 'both',
                      show_fsrs: userSettings.show_fsrs ?? true,
                      sfx_enabled: userSettings.sfx_enabled ?? true,
                      haptic_enabled: userSettings.haptic_enabled ?? true,
                      random_enabled: userSettings.random_enabled ?? false
                    }
                    if (editingProfileId) {
                      await handleUpdateCustomProfile(editingProfileId, newProfileName.trim(), newProfileIcon, capturedSettings)
                    } else {
                      await handleCreateProfile(newProfileName.trim(), newProfileIcon, capturedSettings)
                    }
                    setIsCreateModalOpen(false)
                  } catch (e) {
                    console.error('Failed to save profile', e)
                  } finally {
                    setIsSavingProfile(false)
                  }
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {isSavingProfile ? 'Saving...' : (editingProfileId ? 'Save Changes' : 'Save Template')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SettingItem = ({ icon: Icon, label, desc, active = false, onClick }: any) => (
  <div onClick={onClick} className="flex items-center justify-between p-3 sm:p-3.5 md:p-4 rounded-2xl md:rounded-3xl hover:bg-slate-50 transition-all group cursor-pointer border border-transparent hover:border-slate-100">
    <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
      <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all shrink-0">
        <Icon className="w-4.5 h-4.5 md:w-5 md:h-5" />
      </div>
      <div className="min-w-0">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{label}</h4>
        <p className="text-[9px] font-medium text-slate-400 mt-0.5 truncate leading-relaxed">{desc}</p>
      </div>
    </div>
    <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 shrink-0 ${active ? 'bg-indigo-600' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
)

export default Settings
