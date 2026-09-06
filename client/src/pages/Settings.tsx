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

  // Sub-Tab State for Deck Templates Tab: System Presets | My Custom Templates | Live Customizer
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

  // ══════════════ TAB 0: ALL-IN-ONE DECK TEMPLATES (PROFILES + GESTURES + ALGORITHM + ALIGNMENT) ══════════════
  const renderDeckTemplateTab = () => {
    const customProfiles: StudyProfile[] = (userSettings.study_profiles || []).filter((p: any) => !p.is_system)
    const activeId = userSettings.active_profile_id || 'preset-standard'
    const allProfiles = [...systemProfiles, ...customProfiles]
    const activeProfileObj = allProfiles.find(p => p.id === activeId)

    // Current gesture labels for summary
    const flipLabel = (userSettings.card_flip_trigger || 'both') === 'both' 
      ? 'Tap & Swipe' 
      : (userSettings.card_flip_trigger === 'tap' ? 'Tap Body' : 'Button Only')
    const ratingLabel = (userSettings.card_rating_mode || 'both') === 'both'
      ? 'Hybrid'
      : (userSettings.card_rating_mode === 'swipe_4way' ? '4-Way Swipe' : (userSettings.card_rating_mode === 'swipe_2way' ? '2-Way Swipe' : '4 Buttons'))
    const algoLabel = modes.find(m => m.id === learningMode)?.name || 'Sequential'
    const audioLabel = (userSettings.autoplay_audio || 'always') === 'always'
      ? 'Always'
      : (userSettings.autoplay_audio === 'none' ? 'Off' : (userSettings.autoplay_audio === 'back' ? 'Back Only' : 'Front Only'))

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Banner Card: Active Profile Overview */}
        <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl md:rounded-[2.5rem] p-5 sm:p-7 text-white shadow-xl shadow-indigo-500/15 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>All-in-One Deck Profile System</span>
              </div>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-tight">
                Deck Templates & Profiles
              </h2>
              <p className="text-xs text-indigo-100 max-w-2xl font-medium leading-relaxed">
                Full flashcard configuration (gestures, FSRS rating, queue algorithm, layout alignment & audio) packaged into 1-click reusable templates.
              </p>

              {/* Active Profile Pill & Quick Summary Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-white/80 text-[11px]">Active Globally:</span>
                <span className="px-2.5 py-1 rounded-xl bg-white text-indigo-700 font-black text-xs shadow-xs flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                  {activeProfileObj ? activeProfileObj.name : 'Standard'}
                </span>

                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/90">
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Flip: {flipLabel}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Rating: {ratingLabel}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Order: {algoLabel}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Audio: {audioLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => {
                  setNewProfileName('')
                  setNewProfileIcon('sparkles')
                  loadBaseSettings('current')
                  setIsCreateModalOpen(true)
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-white text-indigo-700 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Template</span>
              </button>
            </div>
          </div>
        </section>

        {/* ══════════ SUB-TAB SWITCHER: SYSTEM PRESETS | CUSTOM TEMPLATES | LIVE CUSTOMIZER ══════════ */}
        <div className="bg-slate-100/90 p-1 sm:p-1.5 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setTemplateTab('system')}
              className={cn(
                "py-2 sm:py-2.5 px-2 rounded-xl transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[11px] sm:text-xs uppercase tracking-wider",
                templateTab === 'system'
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
              )}
            >
              <Sparkles className={cn("w-3.5 h-3.5 shrink-0", templateTab === 'system' ? "text-indigo-600" : "text-slate-400")} />
              <span className="truncate">System Presets (4)</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateTab('custom')}
              className={cn(
                "py-2 sm:py-2.5 px-2 rounded-xl transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[11px] sm:text-xs uppercase tracking-wider",
                templateTab === 'custom'
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
              )}
            >
              <User className={cn("w-3.5 h-3.5 shrink-0", templateTab === 'custom' ? "text-indigo-600" : "text-slate-400")} />
              <span className="truncate">My Templates ({customProfiles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateTab('customize')}
              className={cn(
                "py-2 sm:py-2.5 px-2 rounded-xl transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[11px] sm:text-xs uppercase tracking-wider",
                templateTab === 'customize'
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
              )}
            >
              <Sliders className={cn("w-3.5 h-3.5 shrink-0", templateTab === 'customize' ? "text-indigo-600" : "text-slate-400")} />
              <span className="truncate">Live Customizer</span>
            </button>
          </div>
        </div>

        {/* ══════════ TAB 1: SYSTEM PRESETS ══════════ */}
        {templateTab === 'system' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  System Preset Library
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Optimized, battle-tested templates pre-configured for every learning scenario
                </p>
              </div>
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase border border-indigo-100/50">
                {systemProfiles.length} Optimized Presets
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {systemProfiles.map((preset: any) => {
                const isDefaultActive = activeId === preset.id
                const IconComp = preset.icon === 'zap' ? Zap : (preset.icon === 'headphones' ? Headphones : (preset.icon === 'book' ? BookOpen : Sparkles))
                const sett = preset.settings as any

                return (
                  <div
                    key={preset.id}
                    className={cn(
                      "p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between relative bg-white",
                      isDefaultActive
                        ? "border-indigo-600 bg-indigo-50/15 shadow-md shadow-indigo-500/5"
                        : "border-slate-100 hover:border-slate-200 shadow-2xs"
                    )}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0",
                            isDefaultActive ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                          )}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                                {preset.name}
                              </h4>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                {preset.badge}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">System Preset</span>
                          </div>
                        </div>

                        {isDefaultActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                            <Check className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {preset.desc}
                      </p>

                      {/* 4 Compact Tiles (2x2 Grid) */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* 1. Gestures & Feedback */}
                        <div className="p-2.5 rounded-2xl bg-purple-50/60 border border-purple-100/80 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-purple-700 uppercase tracking-wider flex items-center gap-1">
                            <Move className="w-2.5 h-2.5 text-purple-600 shrink-0" /> Gestures & SFX
                          </span>
                          <div className="text-[11px] font-black text-slate-800 truncate mt-1">
                            {sett.card_flip_trigger === 'both' ? 'Tap & Swipe' : (sett.card_flip_trigger === 'tap' ? 'Tap Body' : 'Button Only')}
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                            {sett.card_rating_mode === 'both' ? 'Swipe & 4 Buttons' : (sett.card_rating_mode === 'swipe_4way' ? '4-Way Swipe' : (sett.card_rating_mode === 'swipe_2way' ? '2-Way Swipe' : '4 Buttons'))}
                            {' • '}
                            <span className={sett.sfx_enabled !== false ? "text-purple-700 font-black" : "text-slate-400"}>
                              {sett.sfx_enabled !== false ? 'SFX On' : 'SFX Off'}
                            </span>
                          </div>
                        </div>

                        {/* 2. Display & Alignment */}
                        <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5 text-amber-600 shrink-0" /> Display & Align
                          </span>
                          <div className="text-[11px] font-black text-slate-800 truncate flex items-center gap-1.5 mt-1">
                            <span>FSRS:</span>
                            <span className={cn(
                              "font-black px-1.5 py-0.2 rounded text-[8.5px]",
                              sett.show_fsrs !== false ? "text-emerald-700 bg-emerald-100/80 border border-emerald-200/60" : "text-slate-400 bg-slate-100 border border-slate-200/60"
                            )}>
                              {sett.show_fsrs !== false ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                            F: {sett.front_valign === 'top' ? 'Top' : 'Center'}/{sett.front_halign === 'center' ? 'Center' : 'Left'}
                            {' • '}
                            B: {sett.back_valign === 'top' ? 'Top' : 'Center'}/{sett.back_halign === 'center' ? 'Center' : 'Left'}
                          </div>
                        </div>

                        {/* 3. Media & Audio */}
                        <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <Volume2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> Media & Audio
                          </span>
                          <div className="text-[11px] font-black text-slate-800 truncate mt-1">
                            TTS: {sett.autoplay_audio === 'always' ? 'Always' : (sett.autoplay_audio === 'none' ? 'Off' : (sett.autoplay_audio === 'front' ? 'Front Only' : (sett.autoplay_audio === 'back' ? 'Back Only' : sett.autoplay_audio)))}
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                            Images: {sett.show_images === 'none' ? 'Hidden' : ((sett.show_images === 'back_only' || sett.show_images === 'back') ? 'Back Only' : (sett.show_images === 'front' ? 'Front Only' : 'Both Sides'))}
                          </div>
                        </div>

                        {/* 4. Default Algorithm */}
                        <div className="p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                            <Brain className="w-2.5 h-2.5 text-indigo-600 shrink-0" /> Algorithm
                          </span>
                          <div className="text-[11px] font-black text-slate-800 truncate mt-1">
                            {sett.quiz_learning_mode === 'fsrs' ? 'FSRS v6' : (sett.quiz_learning_mode === 'random' ? 'Random' : (sett.quiz_learning_mode === 'unseen' ? 'New Cards' : (sett.quiz_learning_mode === 'review' ? 'Reviews' : 'Sequential')))}
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                            {sett.random_enabled ? 'Random Shuffle' : 'Standard Order'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleClonePreset(preset)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-[11px] uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Create a custom copy of this preset to customize"
                      >
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Clone</span>
                      </button>

                      {isDefaultActive ? (
                        <button
                          disabled
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-black text-[11px] uppercase cursor-default flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Active Globally
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetActiveProfile(preset.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-600/20 active:scale-95"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Apply Globally</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ══════════ TAB 2: USER CUSTOM TEMPLATES ══════════ */}
        {templateTab === 'custom' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  My Templates
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Custom templates created by you or cloned from system presets
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProfileId(null)
                  setNewProfileName('')
                  setNewProfileIcon('sparkles')
                  loadBaseSettings('current')
                  setModalTab('gestures')
                  setIsCreateModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase transition-all cursor-pointer shadow-xs shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Create Template
              </button>
            </div>

            {customProfiles.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  No Custom Templates Yet
                </h4>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  Create a new template or clone any system preset to package your custom gestures, algorithms, alignment, and audio preferences.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfileId(null)
                      setNewProfileName('')
                      setNewProfileIcon('sparkles')
                      loadBaseSettings('current')
                      setModalTab('gestures')
                      setIsCreateModalOpen(true)
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create New Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateTab('system')}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs uppercase transition-all hover:bg-slate-50 cursor-pointer"
                  >
                    View System Presets (4)
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {customProfiles.map((prof) => {
                  const isDefaultActive = activeId === prof.id
                  const IconComp = prof.icon === 'zap' ? Zap : (prof.icon === 'headphones' ? Headphones : (prof.icon === 'book' ? BookOpen : Sparkles))
                  const sett = prof.settings || {}

                  return (
                    <div
                      key={prof.id}
                      className={cn(
                        "p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between relative bg-white",
                        isDefaultActive
                          ? "border-amber-500 bg-amber-50/15 shadow-md shadow-amber-500/5"
                          : "border-slate-100 hover:border-slate-200 shadow-2xs"
                      )}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0",
                              isDefaultActive ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600"
                            )}>
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                                  {prof.name}
                                </h4>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">
                                  Custom
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">User Template</span>
                            </div>
                          </div>

                          {isDefaultActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                              <Check className="w-3.5 h-3.5" /> Active
                            </span>
                          )}
                        </div>

                        {/* 4 Compact Tiles (2x2 Grid) */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* 1. Gestures & SFX */}
                          <div className="p-2.5 rounded-2xl bg-purple-50/60 border border-purple-100/80 flex flex-col justify-between">
                            <span className="text-[9px] font-black text-purple-700 uppercase tracking-wider flex items-center gap-1">
                              <Move className="w-2.5 h-2.5 text-purple-600 shrink-0" /> Gestures & SFX
                            </span>
                            <div className="text-[11px] font-black text-slate-800 truncate mt-1">
                              {sett.card_flip_trigger === 'both' ? 'Tap & Swipe' : (sett.card_flip_trigger === 'tap' ? 'Tap Body' : 'Button Only')}
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                              {sett.card_rating_mode === 'both' ? 'Swipe & 4 Buttons' : (sett.card_rating_mode === 'swipe_4way' ? '4-Way Swipe' : (sett.card_rating_mode === 'swipe_2way' ? '2-Way Swipe' : '4 Buttons'))}
                              {' • '}
                              <span className={sett.sfx_enabled !== false ? "text-purple-700 font-black" : "text-slate-400"}>
                                {sett.sfx_enabled !== false ? 'SFX On' : 'SFX Off'}
                              </span>
                            </div>
                          </div>

                          {/* 2. Display & Alignment */}
                          <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 flex flex-col justify-between">
                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5 text-amber-600 shrink-0" /> Display & Align
                            </span>
                            <div className="text-[11px] font-black text-slate-800 truncate flex items-center gap-1.5 mt-1">
                              <span>FSRS:</span>
                              <span className={cn(
                                "font-black px-1.5 py-0.2 rounded text-[8.5px]",
                                sett.show_fsrs !== false ? "text-emerald-700 bg-emerald-100/80 border border-emerald-200/60" : "text-slate-400 bg-slate-100 border border-slate-200/60"
                              )}>
                                {sett.show_fsrs !== false ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                              F: {sett.front_valign === 'top' ? 'Top' : 'Center'}/{sett.front_halign === 'center' ? 'Center' : 'Left'}
                              {' • '}
                              B: {sett.back_valign === 'top' ? 'Top' : 'Center'}/{sett.back_halign === 'center' ? 'Center' : 'Left'}
                            </div>
                          </div>

                          {/* 3. Media & Audio */}
                          <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex flex-col justify-between">
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                              <Volume2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> Media & Audio
                            </span>
                            <div className="text-[11px] font-black text-slate-800 truncate mt-1">
                              TTS: {sett.autoplay_audio === 'always' ? 'Always' : (sett.autoplay_audio === 'none' ? 'Off' : (sett.autoplay_audio === 'front' ? 'Front Only' : (sett.autoplay_audio === 'back' ? 'Back Only' : sett.autoplay_audio)))}
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                              Images: {sett.show_images === 'none' ? 'Hidden' : ((sett.show_images === 'back_only' || sett.show_images === 'back') ? 'Back Only' : (sett.show_images === 'front' ? 'Front Only' : 'Both Sides'))}
                            </div>
                          </div>

                          {/* 4. Default Algorithm */}
                          <div className="p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex flex-col justify-between">
                            <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                              <Brain className="w-2.5 h-2.5 text-indigo-600 shrink-0" /> Algorithm
                            </span>
                            <div className="text-[11px] font-black text-slate-800 truncate mt-1">
                              {sett.quiz_learning_mode === 'fsrs' ? 'FSRS v6' : (sett.quiz_learning_mode === 'random' ? 'Random' : (sett.quiz_learning_mode === 'unseen' ? 'New Cards' : (sett.quiz_learning_mode === 'review' ? 'Reviews' : 'Sequential')))}
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold truncate mt-0.5">
                              {sett.random_enabled ? 'Random Shuffle' : 'Standard Order'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditCustomProfile(prof)}
                            className="px-2.5 py-1.5 rounded-xl text-indigo-600 hover:bg-indigo-50 font-black text-[11px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete template "${prof.name}"?`)) {
                                handleDeleteProfile(prof.id)
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 font-black text-[11px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>

                        {isDefaultActive ? (
                          <button
                            disabled
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-black text-[11px] uppercase cursor-default flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Active Globally
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetActiveProfile(prof.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-amber-500/20 active:scale-95"
                          >
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            <span>Set as Default</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ══════════ TAB 3: LIVE CUSTOMIZER FOR ACTIVE TEMPLATE ══════════ */}
        {templateTab === 'customize' && (
          <div className="space-y-4 md:space-y-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-indigo-50/80 rounded-3xl border border-indigo-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-tight">
                    Active Template Configuration
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase">
                    {activeProfileObj?.name || 'Standard'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700/80 font-medium">
                  This template includes Gestures, Display & Alignment, Media (Audio & Images), and Algorithm. Changes apply directly to your active configuration.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProfileId(null)
                  setNewProfileName(`${activeProfileObj?.name || 'Template'} (Custom)`)
                  setNewProfileIcon(activeProfileObj?.icon || 'sparkles')
                  loadBaseSettings('current')
                  setModalTab('gestures')
                  setIsCreateModalOpen(true)
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save as New Template</span>
              </button>
            </div>

            {/* 4 Internal Sub-tabs for the 4 facets of this Template */}
            <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {[
                  { id: 'gestures', label: '1. Gestures & SFX', icon: Move, desc: 'Flip trigger, swipe & SFX' },
                  { id: 'display', label: '2. Display & Align', icon: Layers, desc: 'FSRS metrics & alignment' },
                  { id: 'media', label: '3. Media & Audio', icon: Volume2, desc: 'TTS voice & illustrations' },
                  { id: 'algorithm', label: '4. Default Algorithm', icon: Brain, desc: 'FSRS v6 & card order' }
                ].map((t) => {
                  const Icon = t.icon
                  const isCur = activeTunerTab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTunerTab(t.id as any)}
                      className={cn(
                        "py-2 sm:py-2.5 px-2 rounded-xl transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 text-center font-black text-xs uppercase tracking-tight",
                        isCur
                          ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", isCur ? "text-indigo-600" : "text-slate-400")} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Facet 1: Gestures & SFX */}
            {activeTunerTab === 'gestures' && (
              <section className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Move className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                      1. Gestures & Interaction Feedback
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      Configure card flip triggers, directional FSRS swipe ratings, sound effects, and haptic feedback
                    </p>
                  </div>
                </div>

                {/* Flip Trigger */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-3.5 h-3.5 text-indigo-500" />
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Card Flip Trigger
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {[
                      { id: 'both', title: 'Hybrid (Tap & Swipe)', desc: 'Tap anywhere on the card or swipe lightly to flip.', icon: Sparkles },
                      { id: 'tap', title: 'Tap Card Body', desc: 'Tap anywhere on the card body to flip immediately.', icon: MousePointer },
                      { id: 'button_only', title: 'Button Only', desc: 'Strict button-only flipping (prevents accidental flips when selecting text).', icon: Lock }
                    ].map((opt) => {
                      const isSelected = (userSettings.card_flip_trigger || 'both') === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => updateUserSettings({ card_flip_trigger: opt.id as any })}
                          className={cn(
                            "p-3 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                            isSelected ? "border-indigo-600 bg-indigo-50/30 shadow-xs" : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">{opt.title}</h5>
                            {isSelected && <Zap className="w-3 h-3 text-indigo-600 fill-current" />}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Rating Mode */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-purple-500" />
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      FSRS Rating Mode
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { id: 'both', title: 'Hybrid (Swipe & Buttons)', badge: 'Recommended', desc: 'Both 4-directional swipe gestures AND 4 bottom rating buttons.' },
                      { id: 'swipe_4way', title: '4-Way Swipe Compass', badge: 'Gamified', desc: 'Swipe Left (Again), Down (Hard), Right (Good), Up (Easy).' },
                      { id: 'swipe_2way', title: '2-Way Fast Swipe', badge: 'Speed', desc: 'Swipe Left (Again) & Right (Good). Secondary buttons for Hard/Easy.' },
                      { id: 'buttons', title: '4 Buttons Only', badge: 'Classic', desc: 'Traditional Anki-style 4 buttons. Swipe gestures disabled.' }
                    ].map((opt) => {
                      const isSelected = (userSettings.card_rating_mode || 'both') === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => updateUserSettings({ card_rating_mode: opt.id as any })}
                          className={cn(
                            "p-3 rounded-2xl border-2 text-left transition-all relative cursor-pointer flex flex-col justify-between",
                            isSelected ? "border-purple-600 bg-purple-50/30 shadow-xs" : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                                {opt.badge}
                              </span>
                              {isSelected && <Zap className="w-3 h-3 text-purple-600 fill-current" />}
                            </div>
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{opt.title}</h5>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* SFX & Haptic Feedback */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <SettingItem 
                    icon={Volume2} 
                    label="Sound Effects (SFX)" 
                    desc="Play audio feedback when flipping cards and rating review outcomes" 
                    active={userSettings.sfx_enabled ?? true} 
                    onClick={() => updateUserSettings({ sfx_enabled: !(userSettings.sfx_enabled ?? true) })}
                  />
                  <SettingItem 
                    icon={Zap} 
                    label="Haptic Feedback" 
                    desc="Subtle tactile vibration feedback on mobile touch devices during gestures and taps" 
                    active={userSettings.haptic_enabled ?? true} 
                    onClick={() => updateUserSettings({ haptic_enabled: !(userSettings.haptic_enabled ?? true) })}
                  />
                </div>
              </section>
            )}

            {/* Facet 2: Display & Alignment */}
            {activeTunerTab === 'display' && (
              <section className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                      2. Card Display & Alignment
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      Toggle FSRS algorithm metrics and configure content alignment for front and back cards
                    </p>
                  </div>
                </div>

                {/* FSRS Metrics Display Toggle */}
                <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-indigo-500" /> FSRS v6 Algorithm Metrics
                    </span>
                    <span className={cn(
                      "text-[9.5px] font-black px-2 py-0.5 rounded-full",
                      (userSettings.show_fsrs ?? true) ? "text-emerald-700 bg-emerald-100" : "text-slate-500 bg-slate-200"
                    )}>
                      {(userSettings.show_fsrs ?? true) ? 'Visible' : 'Hidden'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { 
                        id: true, 
                        label: 'Show FSRS Metrics', 
                        desc: 'Display stability (S), difficulty (D), and next review intervals directly on cards.' 
                      },
                      { 
                        id: false, 
                        label: 'Hide FSRS Metrics (Clean)', 
                        desc: 'Hide all algorithm numbers for a completely clean, distraction-free study card.' 
                      }
                    ].map(opt => {
                      const isCur = (userSettings.show_fsrs ?? true) === opt.id
                      return (
                        <button
                          key={String(opt.id)}
                          type="button"
                          onClick={() => updateUserSettings({ show_fsrs: opt.id })}
                          className={cn(
                            "p-3 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                            isCur ? "border-indigo-600 bg-indigo-50/40 shadow-xs" : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{opt.label}</h5>
                            {isCur && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                          </div>
                          <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Card Content Alignment
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                        Front Card
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Vertical:</span>
                          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                            {(['center', 'top'] as const).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateUserSettings({ front_valign: mode })}
                                className={cn(
                                  "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                                  (userSettings.front_valign || 'center') === mode ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {mode === 'center' ? 'Center' : 'Top'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                            {(['left', 'center'] as const).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateUserSettings({ front_halign: mode })}
                                className={cn(
                                  "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                                  (userSettings.front_halign || 'left') === mode ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {mode === 'left' ? 'Left' : 'Center'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                        Back Card
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Vertical:</span>
                          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                            {(['center', 'top'] as const).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateUserSettings({ back_valign: mode })}
                                className={cn(
                                  "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                                  (userSettings.back_valign || 'center') === mode ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {mode === 'center' ? 'Center' : 'Top'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Horizontal:</span>
                          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                            {(['left', 'center'] as const).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateUserSettings({ back_halign: mode })}
                                className={cn(
                                  "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                                  (userSettings.back_halign || 'left') === mode ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {mode === 'left' ? 'Left' : 'Center'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Facet 3: Media & Audio */}
            {activeTunerTab === 'media' && (
              <section className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                      3. Card Media Content (Audio & Images)
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      Configure automatic text-to-speech pronunciation (TTS) and flashcard illustration display modes
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* TTS Autoplay */}
                  <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Automatic Audio / TTS Autoplay
                      </span>
                      <span className="text-[9.5px] font-bold text-slate-400">
                        {userSettings.autoplay_audio === 'always' ? 'Always Play' : (userSettings.autoplay_audio === 'none' ? 'Off' : (userSettings.autoplay_audio === 'front' ? 'Front Only' : 'Back Only'))}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                      {[
                        { id: 'always', label: 'Always Play' },
                        { id: 'front', label: 'Front Only' },
                        { id: 'back', label: 'Back Only' },
                        { id: 'none', label: 'Off' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateUserSettings({ autoplay_audio: opt.id })}
                          className={cn(
                            "py-1.5 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                            (userSettings.autoplay_audio || 'always') === opt.id ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image Display Mode */}
                  <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-rose-500" /> Illustration Images
                      </span>
                      <span className="text-[9.5px] font-bold text-slate-400">
                        {userSettings.show_images === 'none' ? 'Hidden' : ((userSettings.show_images === 'back_only' || userSettings.show_images === 'back') ? 'Back Only' : (userSettings.show_images === 'front' ? 'Front Only' : 'Both Sides'))}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'both', label: 'Both Sides (Front & Back)', desc: 'Show illustration images on both sides of the flashcard.' },
                        { id: 'back_only', label: 'Back Only (Answer Side)', desc: 'Hide images on the front side to test recall; reveal only on the answer side.' },
                        { id: 'none', label: 'Hide Images (Minimalist)', desc: 'Do not load images; display clean typography and definitions only.' }
                      ].map(opt => {
                        const isCur = (userSettings.show_images || 'both') === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateUserSettings({ show_images: opt.id })}
                            className={cn(
                              "p-3 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                              isCur ? "border-rose-500 bg-rose-50/40 shadow-xs" : "border-slate-100 bg-white hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{opt.label}</h5>
                              {isCur && <Check className="w-3 h-3 text-rose-600 shrink-0" />}
                            </div>
                            <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Facet 4: Default Algorithm */}
            {activeTunerTab === 'algorithm' && (
              <section className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                      4. Default Algorithm & Review Order
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      Select how flashcards are scheduled, queued, and distributed during study sessions
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {modes.map((mode) => {
                    const isSelected = learningMode === mode.id
                    const Icon = mode.icon
                    return (
                      <button
                        key={mode.id}
                        onClick={() => updateLearningMode(mode.id as LearningMode)}
                        className={cn(
                          "p-3.5 rounded-2xl border-2 transition-all text-left flex flex-col justify-between cursor-pointer",
                          isSelected ? "border-indigo-600 bg-indigo-50/20 shadow-xs" : "border-slate-100 bg-slate-50/40 hover:bg-white hover:border-slate-200"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={cn("p-2 rounded-xl", mode.bg, mode.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {isSelected && <Zap className="w-3 h-3 text-indigo-600 fill-current" />}
                          </div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{mode.name}</h4>
                          <p className="text-[10px] font-medium text-slate-400 leading-relaxed">{mode.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <SettingItem
                    icon={Shuffle}
                    label="Random Shuffle Card Order"
                    desc="Randomly shuffle the card order in each study session"
                    active={userSettings.random_enabled ?? false}
                    onClick={() => updateUserSettings({ random_enabled: !(userSettings.random_enabled ?? false) })}
                  />
                </div>
              </section>
            )}
          </div>
        )}
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

      {/* Create / Edit Template Modal with 4-Part Internal Sub-Tabs */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {editingProfileId ? 'Edit Study Template' : 'Create New Template'}
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

            {/* Scrollable Modal Body */}
            <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {/* Template Name & Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Speedrun Morning, Deep Focus..."
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Icon
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'sparkles', icon: Sparkles },
                      { id: 'zap', icon: Zap },
                      { id: 'headphones', icon: Headphones },
                      { id: 'book', icon: BookOpen },
                    ].map((ic) => {
                      const isSel = newProfileIcon === ic.id
                      const IconComp = ic.icon
                      return (
                        <button
                          key={ic.id}
                          type="button"
                          onClick={() => setNewProfileIcon(ic.id)}
                          className={cn(
                            "py-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer",
                            isSel
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                              : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                          )}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {!editingProfileId && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Baseline Preset
                  </label>
                  <select
                    value={newProfileBase}
                    onChange={(e) => loadBaseSettings(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
                  >
                    <option value="current">⚡ Copy from your current active settings</option>
                    <option value="preset-minimal">Minimalist - Zero distractions, swipe-only, no media</option>
                    <option value="preset-full">Full Experience - Dual images, autoplay TTS, FSRS & hybrid controls</option>
                    <option value="preset-standard">Standard - Balanced recall, clean front, audio & images on back side</option>
                    <option value="preset-classic">Classic - 4 buttons only, button flip, easy text selection</option>
                  </select>
                </div>
              )}

              {/* 4 Internal Sub-tabs for the 4 facets of this Template */}
              <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {[
                    { id: 'gestures', label: '1. Gestures & SFX', icon: Move },
                    { id: 'display', label: '2. Display & Align', icon: Layers },
                    { id: 'media', label: '3. Media & Audio', icon: Volume2 },
                    { id: 'algorithm', label: '4. Algorithm', icon: Brain }
                  ].map((t) => {
                    const Icon = t.icon
                    const isCur = modalTab === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setModalTab(t.id as any)}
                        className={cn(
                          "py-1.5 px-1 rounded-xl transition-all select-none cursor-pointer flex items-center justify-center gap-1 text-center font-black text-[11px] uppercase tracking-tight",
                          isCur
                            ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        <Icon className={cn("w-3 h-3 shrink-0", isCur ? "text-indigo-600" : "text-slate-400")} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Modal Tab 1: Gestures & SFX */}
              {modalTab === 'gestures' && (
                <div className="p-3.5 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                    <Move className="w-3 h-3" /> 1. Gestures & Feedback Setup
                  </span>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Card Flip Trigger</span>
                      <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-purple-100">
                        {[
                          { id: 'both', label: 'Tap & Swipe' },
                          { id: 'tap', label: 'Tap Body' },
                          { id: 'button_only', label: 'Button Only' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, card_flip_trigger: opt.id as any }))}
                            className={cn(
                              "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                              templateSettings.card_flip_trigger === opt.id
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">FSRS Rating Mode</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-purple-100">
                        {[
                          { id: 'both', label: 'Hybrid' },
                          { id: 'swipe_4way', label: '4-Way Swipe' },
                          { id: 'swipe_2way', label: '2-Way Swipe' },
                          { id: 'buttons', label: '4 Buttons' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, card_rating_mode: opt.id as any }))}
                            className={cn(
                              "py-1 px-0.5 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center truncate",
                              templateSettings.card_rating_mode === opt.id
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-100/60">
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Sound Effects (SFX)</span>
                        <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-purple-100">
                          {[
                            { id: true, label: 'SFX On' },
                            { id: false, label: 'SFX Off' },
                          ].map((opt) => (
                            <button
                              key={String(opt.id)}
                              type="button"
                              onClick={() => setTemplateSettings(prev => ({ ...prev, sfx_enabled: opt.id }))}
                              className={cn(
                                "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                                templateSettings.sfx_enabled === opt.id
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Haptic Feedback</span>
                        <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-purple-100">
                          {[
                            { id: true, label: 'Haptic On' },
                            { id: false, label: 'Haptic Off' },
                          ].map((opt) => (
                            <button
                              key={String(opt.id)}
                              type="button"
                              onClick={() => setTemplateSettings(prev => ({ ...prev, haptic_enabled: opt.id }))}
                              className={cn(
                                "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                                templateSettings.haptic_enabled === opt.id
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Tab 2: Display & Alignment */}
              {modalTab === 'display' && (
                <div className="p-3.5 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> 2. Display & Alignment Setup
                  </span>

                  <div className="space-y-2.5">
                    {/* FSRS Metrics */}
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">FSRS Algorithm Metrics on Card</span>
                      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-amber-100">
                        {[
                          { id: true, label: 'Show FSRS Metrics' },
                          { id: false, label: 'Hide FSRS Metrics' },
                        ].map((opt) => (
                          <button
                            key={String(opt.id)}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, show_fsrs: opt.id }))}
                            className={cn(
                              "py-1.5 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                              templateSettings.show_fsrs === opt.id
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Front */}
                      <div className="p-2.5 bg-white rounded-xl border border-amber-100 space-y-2">
                        <span className="text-[10px] font-black text-slate-700 uppercase block">Front Card</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Vertical:</span>
                            <div className="grid grid-cols-2 gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200/60">
                              {(['center', 'top'] as const).map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setTemplateSettings(prev => ({ ...prev, front_valign: v }))}
                                  className={cn(
                                    "py-1 text-[9.5px] font-black uppercase rounded cursor-pointer text-center",
                                    templateSettings.front_valign === v ? "bg-amber-500 text-white shadow-2xs" : "text-slate-500"
                                  )}
                                >
                                  {v === 'center' ? 'Center' : 'Top'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Horizontal:</span>
                            <div className="grid grid-cols-2 gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200/60">
                              {(['left', 'center'] as const).map(h => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setTemplateSettings(prev => ({ ...prev, front_halign: h }))}
                                  className={cn(
                                    "py-1 text-[9.5px] font-black uppercase rounded cursor-pointer text-center",
                                    templateSettings.front_halign === h ? "bg-amber-500 text-white shadow-2xs" : "text-slate-500"
                                  )}
                                >
                                  {h === 'left' ? 'Left' : 'Center'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Back */}
                      <div className="p-2.5 bg-white rounded-xl border border-amber-100 space-y-2">
                        <span className="text-[10px] font-black text-slate-700 uppercase block">Back Card</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Vertical:</span>
                            <div className="grid grid-cols-2 gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200/60">
                              {(['center', 'top'] as const).map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setTemplateSettings(prev => ({ ...prev, back_valign: v }))}
                                  className={cn(
                                    "py-1 text-[9.5px] font-black uppercase rounded cursor-pointer text-center",
                                    templateSettings.back_valign === v ? "bg-amber-500 text-white shadow-2xs" : "text-slate-500"
                                  )}
                                >
                                  {v === 'center' ? 'Center' : 'Top'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Horizontal:</span>
                            <div className="grid grid-cols-2 gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200/60">
                              {(['left', 'center'] as const).map(h => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setTemplateSettings(prev => ({ ...prev, back_halign: h }))}
                                  className={cn(
                                    "py-1 text-[9.5px] font-black uppercase rounded cursor-pointer text-center",
                                    templateSettings.back_halign === h ? "bg-amber-500 text-white shadow-2xs" : "text-slate-500"
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
              )}

              {/* Modal Tab 3: Media (Audio & Images) */}
              {modalTab === 'media' && (
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3" /> 3. Media Content Setup (Audio & Images)
                  </span>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Automatic Audio (TTS)</span>
                      <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-emerald-100">
                        {[
                          { id: 'always', label: 'Always' },
                          { id: 'front', label: 'Front Only' },
                          { id: 'back', label: 'Back Only' },
                          { id: 'none', label: 'Off' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, autoplay_audio: opt.id as any }))}
                            className={cn(
                              "py-1.5 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                              templateSettings.autoplay_audio === opt.id
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Illustration Images</span>
                      <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-emerald-100">
                        {[
                          { id: 'both', label: 'Both Sides' },
                          { id: 'back_only', label: 'Back Only' },
                          { id: 'none', label: 'Hidden' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, show_images: opt.id as any }))}
                            className={cn(
                              "py-1.5 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center truncate",
                              templateSettings.show_images === opt.id
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Tab 4: Algorithm */}
              {modalTab === 'algorithm' && (
                <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <Brain className="w-3 h-3" /> 4. Default Algorithm & Review Order
                  </span>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Card Queue Algorithm</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-indigo-100">
                        {[
                          { id: 'fsrs', label: 'FSRS v6' },
                          { id: 'sequential', label: 'Sequential' },
                          { id: 'unseen', label: 'New Cards' },
                          { id: 'random', label: 'Random' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, quiz_learning_mode: opt.id as any }))}
                            className={cn(
                              "py-1 px-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                              templateSettings.quiz_learning_mode === opt.id
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-indigo-100">
                        <span className="text-[10.5px] font-bold text-slate-700">Random Shuffle Card Order</span>
                        <button
                          type="button"
                          onClick={() => setTemplateSettings(prev => ({ ...prev, random_enabled: !prev.random_enabled }))}
                          className={cn(
                            "w-8 h-4.5 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0",
                            templateSettings.random_enabled ? "bg-indigo-600" : "bg-slate-200"
                          )}
                        >
                          <div className={cn("w-3.5 h-3.5 rounded-full bg-white transition-transform", templateSettings.random_enabled ? "translate-x-3.5" : "translate-x-0")} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
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
                    const basePreset = systemProfiles.find(p => p.id === newProfileBase) || systemProfiles[0]
                    const finalSettings = {
                      ...basePreset.settings,
                      ...templateSettings
                    }
                    if (editingProfileId) {
                      await handleUpdateCustomProfile(editingProfileId, newProfileName.trim(), newProfileIcon, finalSettings)
                    } else {
                      await handleCreateProfile(newProfileName.trim(), newProfileIcon, finalSettings)
                    }
                    setIsCreateModalOpen(false)
                  } catch (e) {
                    console.error('Failed to save profile', e)
                  } finally {
                    setIsSavingProfile(false)
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black uppercase tracking-wider hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                {isSavingProfile ? 'Saving...' : (editingProfileId ? 'Save Template Changes' : 'Create Template')}
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
