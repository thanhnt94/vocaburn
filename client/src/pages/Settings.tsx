import React, { useState, useEffect } from 'react'
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
  BookmarkCheck
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
    id: 'preset-standard',
    name: 'Tiêu chuẩn (FSRS)',
    icon: 'sparkles',
    badge: 'Khuyên dùng',
    desc: 'Lật thẻ cả 2 chiều, FSRS đầy đủ, hình ảnh & âm thanh thông minh.',
    details: [
      { label: 'Lật thẻ', val: 'Chạm & Vuốt' },
      { label: 'Đánh giá', val: '4 hướng FSRS' },
      { label: 'Âm thanh', val: 'Luôn phát' },
      { label: 'Thứ tự', val: 'Tuần tự' },
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
    id: 'preset-speedrun',
    name: 'Tốc độ cao (Speedrun)',
    icon: 'zap',
    badge: 'Tốc độ',
    desc: 'Bỏ qua hiệu ứng rườm rà, lướt 2 chiều nhanh gọn, tối ưu số lượng thẻ mỗi phút.',
    details: [
      { label: 'Lật thẻ', val: 'Chạm thân thẻ' },
      { label: 'Đánh giá', val: 'Vuốt 2 chiều' },
      { label: 'Âm thanh', val: 'Tắt' },
      { label: 'Thứ tự', val: 'Xáo trộn' },
    ],
    settings: {
      autoplay_audio: 'none',
      show_images: 'both',
      quiz_learning_mode: 'random',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'center',
      back_valign: 'center',
      back_halign: 'center',
      random_enabled: true,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: true,
      show_fsrs: false,
      card_flip_trigger: 'tap',
      card_rating_mode: 'swipe_2way',
    }
  },
  {
    id: 'preset-audio',
    name: 'Luyện nghe phản xạ (Audio-First)',
    icon: 'headphones',
    badge: 'Phát âm',
    desc: 'Tự động phát audio ngay khi vào thẻ, tối ưu học từ vựng qua âm thanh bản ngữ.',
    details: [
      { label: 'Lật thẻ', val: 'Cả 2 chiều' },
      { label: 'Đánh giá', val: 'Hỗn hợp' },
      { label: 'Âm thanh', val: 'Tự động phát' },
      { label: 'Thứ tự', val: 'Thẻ chưa học' },
    ],
    settings: {
      autoplay_audio: 'always',
      show_images: 'back_only',
      quiz_learning_mode: 'unseen',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'center',
      back_valign: 'center',
      back_halign: 'center',
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
    id: 'preset-focus',
    name: 'Tập trung tối giản (Deep Focus)',
    icon: 'book',
    badge: 'Tối giản',
    desc: 'Tắt toàn bộ âm thanh và FSRS rườm rà, tập trung 100% vào ngữ nghĩa và mặt chữ.',
    details: [
      { label: 'Lật thẻ', val: 'Cả 2 chiều' },
      { label: 'Đánh giá', val: '4 nút bấm' },
      { label: 'Âm thanh', val: 'Tắt hoàn toàn' },
      { label: 'Thứ tự', val: 'Ôn tập' },
    ],
    settings: {
      autoplay_audio: 'none',
      show_images: 'none',
      quiz_learning_mode: 'review',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: false,
      haptic_enabled: false,
      quick_learn_enabled: false,
      show_fsrs: false,
      card_flip_trigger: 'both',
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

const Settings = () => {
  const { authConfig, userSettings, updateUserSettings } = useAppStore()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as SettingsTab

  const getInitialTab = (): SettingsTab => {
    if (tabParam === 'alerts' || tabParam === 'general' || tabParam === 'deck_template') {
      return tabParam
    }
    if (location.hash === '#preferences' || location.hash === '#security') {
      return 'general'
    }
    if (location.hash === '#telegram') {
      return 'alerts'
    }
    return 'deck_template'
  }

  const [activeTab, setActiveTabState] = useState<SettingsTab>(getInitialTab)

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }

  // Nested Sub-Tab State for Deck Templates Tab
  const [deckSubTab, setDeckSubTab] = useState<'presets' | 'gestures' | 'algorithm' | 'display'>('presets')

  // Profile / Template Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
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
    haptic_enabled: true
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
        haptic_enabled: userSettings.haptic_enabled ?? true
      })
    } else {
      const preset = SYSTEM_PROFILES.find(p => p.id === baseId) || SYSTEM_PROFILES[0]
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
        haptic_enabled: s.haptic_enabled ?? true
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
    const targetProf = [...SYSTEM_PROFILES, ...customProfiles].find(p => p.id === profileId)
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
    const allProfiles = [...SYSTEM_PROFILES, ...customProfiles]
    const activeProfileObj = allProfiles.find(p => p.id === activeId)

    // Current gesture labels for summary
    const flipLabel = (userSettings.card_flip_trigger || 'both') === 'both' 
      ? 'Chạm & Vuốt' 
      : (userSettings.card_flip_trigger === 'tap' ? 'Chạm thẻ' : 'Nút bấm')
    const ratingLabel = (userSettings.card_rating_mode || 'both') === 'both'
      ? 'Hỗn hợp'
      : (userSettings.card_rating_mode === 'swipe_4way' ? 'Vuốt 4 hướng' : (userSettings.card_rating_mode === 'swipe_2way' ? 'Vuốt 2 chiều' : '4 Nút'))
    const algoLabel = modes.find(m => m.id === learningMode)?.name || 'Tuần tự'
    const audioLabel = (userSettings.autoplay_audio || 'always') === 'always'
      ? 'Luôn phát'
      : (userSettings.autoplay_audio === 'none' ? 'Tắt' : userSettings.autoplay_audio)

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
                Mẫu Cấu Hình Bộ Thẻ (Deck Templates)
              </h2>
              <p className="text-xs text-indigo-100 max-w-2xl font-medium leading-relaxed">
                Toàn bộ thiết lập bộ thẻ (Cử chỉ lật, Đánh giá FSRS, Thuật toán thứ tự, Căn lề thẻ & Âm thanh) được gói gọn trong một Template duy nhất để áp dụng nhanh chỉ với 1-click.
              </p>

              {/* Active Profile Pill & Quick Summary Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-white/80 text-[11px]">Đang áp dụng toàn cục:</span>
                <span className="px-2.5 py-1 rounded-xl bg-white text-indigo-700 font-black text-xs shadow-xs flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                  {activeProfileObj ? activeProfileObj.name : 'Tiêu chuẩn (FSRS)'}
                </span>

                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/90">
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Lật: {flipLabel}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Đánh giá: {ratingLabel}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 font-bold backdrop-blur-xs">Thứ tự: {algoLabel}</span>
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
                <span>Tạo Template Mới</span>
              </button>
            </div>
          </div>
        </section>

        {/* ══════════ NESTED SUB-TAB SWITCHER ══════════ */}
        <div className="bg-slate-100/90 p-1 sm:p-1.5 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5">
            {[
              { id: 'presets', label: 'Mẫu Templates', icon: Sparkles, desc: 'Presets & Cá nhân' },
              { id: 'gestures', label: 'Cử chỉ (Gestures)', icon: Move, desc: 'Lật thẻ & Đánh giá' },
              { id: 'algorithm', label: 'Thuật toán học', icon: Brain, desc: 'Thứ tự ôn tập' },
              { id: 'display', label: 'Căn lề & Hiển thị', icon: Layers, desc: 'Lề, Âm thanh & SFX' },
            ].map((tab) => {
              const isSubActive = deckSubTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDeckSubTab(tab.id as any)}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-xl md:rounded-2xl transition-all text-left flex items-center gap-2.5 cursor-pointer select-none",
                    isSubActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-white/80 hover:bg-white text-slate-600 border border-slate-200/60"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSubActive ? "bg-white/20 text-white" : "bg-slate-50 text-indigo-600 shadow-2xs"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={cn("text-xs font-black uppercase tracking-tight truncate", isSubActive ? "text-white" : "text-slate-800")}>
                      {tab.label}
                    </h4>
                    <p className={cn("text-[9.5px] font-bold truncate hidden sm:block", isSubActive ? "text-indigo-100" : "text-slate-400")}>
                      {tab.desc}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ══════════ SECTION 1: SYSTEM PRESETS & USER TEMPLATES ══════════ */}
        {deckSubTab === 'presets' && (
          <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                  1. Danh Sách Templates & Presets
                </h3>
                <p className="text-[10px] font-medium text-slate-400">
                  Chọn một template làm mặc định hoặc áp dụng cho mọi bộ thẻ bạn học
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewProfileName('')
                setNewProfileIcon('sparkles')
                loadBaseSettings('preset-standard')
                setIsCreateModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs uppercase hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm template
            </button>
          </div>

          {/* System Presets Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest">
                Presets Chuẩn Hệ Thống
              </span>
              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                4 mẫu tối ưu
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {SYSTEM_PROFILES.map((preset) => {
                const isDefaultActive = activeId === preset.id
                const IconComp = preset.icon === 'zap' ? Zap : (preset.icon === 'headphones' ? Headphones : (preset.icon === 'book' ? BookOpen : Sparkles))
                return (
                  <div
                    key={preset.id}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between relative",
                      isDefaultActive
                        ? "border-indigo-600 bg-indigo-50/20 shadow-xs"
                        : "border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            <IconComp className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                {preset.name}
                              </h4>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
                                {preset.badge}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Hệ thống</span>
                          </div>
                        </div>

                        {isDefaultActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Mặc định
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {preset.desc}
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {preset.details.map((d, idx) => (
                          <div key={idx} className="bg-white/80 border border-slate-200/60 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">{d.label}:</span>
                            <span className="text-slate-700 font-black">{d.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-end">
                      {isDefaultActive ? (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 font-black text-[11px] uppercase cursor-default flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Đang dùng làm mặc định
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetActiveProfile(preset.id)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-[11px] uppercase hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" /> Đặt làm mặc định
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* User Custom Templates */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest">
                Template Cá Nhân Của Bạn
              </span>
              {customProfiles.length > 0 && (
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {customProfiles.length} template
                </span>
              )}
            </div>

            {customProfiles.length === 0 ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                <Sparkles className="w-7 h-7 text-slate-300 mx-auto" />
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Chưa có template tuỳ chỉnh nào
                </h4>
                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                  Bạn có thể tinh chỉnh các thông số Cử chỉ, Thuật toán và Căn lề bên dưới rồi bấm <strong>"Lưu thành Template mới"</strong>!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {customProfiles.map((prof) => {
                  const isDefaultActive = activeId === prof.id
                  const IconComp = prof.icon === 'zap' ? Zap : (prof.icon === 'headphones' ? Headphones : (prof.icon === 'book' ? BookOpen : Sparkles))
                  const sett = prof.settings || {}
                  return (
                    <div
                      key={prof.id}
                      className={cn(
                        "p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between relative",
                        isDefaultActive
                          ? "border-amber-500 bg-amber-50/20 shadow-xs"
                          : "border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                              <IconComp className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                  {prof.name}
                                </h4>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                  Cá nhân
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Template người dùng</span>
                            </div>
                          </div>

                          {isDefaultActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Mặc định
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <div className="bg-white/80 border border-slate-200/60 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">Lật thẻ:</span>
                            <span className="text-slate-700 font-black">{sett.card_flip_trigger || 'both'}</span>
                          </div>
                          <div className="bg-white/80 border border-slate-200/60 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">Đánh giá:</span>
                            <span className="text-slate-700 font-black">{sett.card_rating_mode || 'both'}</span>
                          </div>
                          <div className="bg-white/80 border border-slate-200/60 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">Thứ tự:</span>
                            <span className="text-slate-700 font-black">{sett.quiz_learning_mode || 'fsrs'}</span>
                          </div>
                          <div className="bg-white/80 border border-slate-200/60 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-bold">Âm thanh:</span>
                            <span className="text-slate-700 font-black">{sett.autoplay_audio || 'always'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xoá template "${prof.name}"?`)) {
                              handleDeleteProfile(prof.id)
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 font-bold text-[11px] uppercase transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Xoá
                        </button>

                        {isDefaultActive ? (
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 font-black text-[11px] uppercase cursor-default flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Đang dùng làm mặc định
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetActiveProfile(prof.id)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-[11px] uppercase hover:border-amber-600 hover:text-amber-600 hover:bg-amber-50/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <BookmarkCheck className="w-3.5 h-3.5" /> Đặt làm mặc định
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════ SECTION 2: GESTURES & INTERACTION ══════════ */}
      {deckSubTab === 'gestures' && (
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Move className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                  2. Thao Tác Cử Chỉ Flashcard (Gestures)
                </h3>
                <p className="text-[10px] font-medium text-slate-400">
                  Cách lật mặt thẻ và vuốt 4 hướng để chấm điểm FSRS
                </p>
              </div>
            </div>
          </div>

          {/* Sub-section 2.1: Card Flipping Trigger */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-3.5 h-3.5 text-indigo-500" />
              <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Cách Lật Thẻ (Flip Trigger)
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
              {[
                {
                  id: 'both',
                  title: 'Chạm & Vuốt (Hybrid)',
                  desc: 'Chạm thân thẻ hoặc hất nhẹ để lật giữa 2 mặt.',
                  icon: Sparkles,
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50'
                },
                {
                  id: 'tap',
                  title: 'Chạm Thân Thẻ',
                  desc: 'Chạm vào bất cứ vị trí nào trên thẻ để lật ngay lập tức.',
                  icon: MousePointer,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50'
                },
                {
                  id: 'button_only',
                  title: 'Chỉ Bấm Nút Dưới',
                  desc: 'Lật nghiêm ngặt bằng nút (tránh lật nhầm khi bôi đen sao chép chữ).',
                  icon: Lock,
                  color: 'text-slate-600',
                  bg: 'bg-slate-50'
                }
              ].map((opt) => {
                const isSelected = (userSettings.card_flip_trigger || 'both') === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => updateUserSettings({ card_flip_trigger: opt.id as any })}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/30 shadow-xs"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("p-2 rounded-xl", opt.bg, opt.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                        isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                      )}>
                        {isSelected && <Zap className="w-2 h-2 fill-current" />}
                      </div>
                    </div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{opt.title}</h5>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-section 2.2: FSRS Rating Mode */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-purple-500" />
              <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Đánh Giá Kết Quả FSRS (Rating Mode)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {[
                {
                  id: 'both',
                  title: 'Hỗn Hợp (Vuốt & Nút)',
                  badge: 'Khuyên dùng',
                  desc: 'Tự do tối đa: vừa vuốt thẻ 4 hướng VỪA bấm 4 nút bên dưới.',
                  color: 'border-purple-500 text-purple-600',
                  bg: 'bg-purple-50'
                },
                {
                  id: 'swipe_4way',
                  title: 'Vuốt La Bàn 4 Hướng',
                  badge: 'Gamified',
                  desc: 'Vuốt Trái (Again), Dưới (Hard), Phải (Good), Lên (Easy) với bay 3D.',
                  color: 'border-indigo-500 text-indigo-600',
                  bg: 'bg-indigo-50'
                },
                {
                  id: 'swipe_2way',
                  title: 'Vuốt Nhanh 2 Chiều',
                  badge: 'Tốc độ cao',
                  desc: 'Vuốt Trái (Again) & Phải (Good). Có nút phụ cho Hard/Easy.',
                  color: 'border-emerald-500 text-emerald-600',
                  bg: 'bg-emerald-50'
                },
                {
                  id: 'buttons',
                  title: 'Chỉ 4 Nút Bấm',
                  badge: 'Cổ điển',
                  desc: 'Chuẩn 4 nút kiểu Anki truyền thống. Tắt cử chỉ vuốt đánh giá.',
                  color: 'border-slate-500 text-slate-600',
                  bg: 'bg-slate-50'
                }
              ].map((opt) => {
                const isSelected = (userSettings.card_rating_mode || 'both') === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => updateUserSettings({ card_rating_mode: opt.id as any })}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "border-purple-600 bg-purple-50/30 shadow-xs"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md", opt.bg, opt.color)}>
                          {opt.badge}
                        </span>
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                          isSelected ? "border-purple-600 bg-purple-600 text-white" : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <Zap className="w-2 h-2 fill-current" />}
                        </div>
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{opt.title}</h5>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Visual 4-Way Compass Guide Preview */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-3.5 sm:p-4 mt-2">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Sơ Đồ Vuốt La Bàn 4 Hướng
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Vuốt quá 65px để kích hoạt
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-rose-200 shadow-xs flex items-center gap-2">
                  <span className="text-base">⬅️</span>
                  <div>
                    <span className="text-[10px] font-black text-rose-600 uppercase block">Vuốt Trái</span>
                    <span className="text-[9px] text-slate-500 font-bold">Again (Quên)</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-xs flex items-center gap-2">
                  <span className="text-base">⬇️</span>
                  <div>
                    <span className="text-[10px] font-black text-amber-600 uppercase block">Vuốt Xuống</span>
                    <span className="text-[9px] text-slate-500 font-bold">Hard (Khó)</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-200 shadow-xs flex items-center gap-2">
                  <span className="text-base">➡️</span>
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase block">Vuốt Phải</span>
                    <span className="text-[9px] text-slate-500 font-bold">Good (Nhớ)</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs flex items-center gap-2">
                  <span className="text-base">⬆️</span>
                  <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase block">Vuốt Lên</span>
                    <span className="text-[9px] text-slate-500 font-bold">Easy (Dễ)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ SECTION 3: LEARNING ALGORITHM & ORDER ══════════ */}
      {deckSubTab === 'algorithm' && (
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                3. Thuật Toán & Trình Tự Học (Learning Algorithm)
              </h3>
              <p className="text-[10px] font-medium text-slate-400">
                Lựa chọn cách thẻ được phân phối và sắp xếp trong các phiên học
              </p>
            </div>
          </div>

          {/* Mobile view: Compact cohesive option list */}
          <div className="md:hidden space-y-2">
            {modes.map((mode) => {
              const isSelected = learningMode === mode.id
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => updateLearningMode(mode.id as LearningMode)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left",
                    isSelected
                      ? "bg-indigo-50/70 border border-indigo-200/80 shadow-2xs"
                      : "bg-slate-50/50 hover:bg-slate-100/60 border border-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", mode.bg, mode.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <h4 className={cn("text-xs font-black uppercase tracking-tight truncate", isSelected ? "text-indigo-950" : "text-slate-800")}>
                        {mode.name}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-400 truncate leading-relaxed">
                        {mode.desc}
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all",
                    isSelected 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs" 
                      : "border-slate-300 bg-white"
                  )}>
                    {isSelected && <Zap className="w-2.5 h-2.5 fill-current" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Desktop view: 2-column cards layout */}
          <div className="hidden md:grid md:grid-cols-2 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateLearningMode(mode.id as LearningMode)}
                className={cn(
                  "relative p-5 rounded-2xl border-2 transition-all text-left group",
                  learningMode === mode.id 
                    ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-50' 
                    : 'border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white hover:shadow-lg'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${mode.bg} ${mode.color}`}>
                    <mode.icon className="w-5 h-5" />
                  </div>
                  {learningMode === mode.id && (
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xs">
                      <Zap className="w-3 h-3 fill-current" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1">{mode.name}</h4>
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed">{mode.desc}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ SECTION 4: CARD ALIGNMENT, AUDIO & DISPLAY DEFAULTS ══════════ */}
      {deckSubTab === 'display' && (
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                  4. Căn Lề & Tùy Chọn Hiển Thị (Alignment & Display)
                </h3>
                <p className="text-[10px] font-medium text-slate-400">
                  Căn chỉnh lề thẻ, âm thanh tự động, hình ảnh và hiển thị chỉ số FSRS
                </p>
              </div>
            </div>
          </div>

          {/* Alignment Controls */}
          <div className="space-y-3">
            <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
              Căn Lề Thẻ Mặt Trước & Mặt Sau
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Front Card Alignment */}
              <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2.5">
                <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                  Mặt Trước (Front Card)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Dọc (Vertical)</span>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                      {(['center', 'top'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateUserSettings({ front_valign: mode })}
                          className={cn(
                            "py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                            (userSettings.front_valign || 'center') === mode
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {mode === 'center' ? 'Center' : 'Top'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Ngang (Horizontal)</span>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                      {(['left', 'center'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateUserSettings({ front_halign: mode })}
                          className={cn(
                            "py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                            (userSettings.front_halign || 'left') === mode
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {mode === 'left' ? 'Left' : 'Center'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Card Alignment */}
              <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2.5">
                <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                  Mặt Sau (Back Card)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Dọc (Vertical)</span>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                      {(['center', 'top'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateUserSettings({ back_valign: mode })}
                          className={cn(
                            "py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                            (userSettings.back_valign || 'center') === mode
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {mode === 'center' ? 'Center' : 'Top'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Ngang (Horizontal)</span>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                      {(['left', 'center'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateUserSettings({ back_halign: mode })}
                          className={cn(
                            "py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer text-center",
                            (userSettings.back_halign || 'left') === mode
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
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

          {/* Audio & Image Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                Tự Động Phát Âm Thanh (Audio)
              </span>
              <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                {[
                  { id: 'always', label: 'Luôn phát' },
                  { id: 'front', label: 'Mặt trước' },
                  { id: 'back', label: 'Mặt sau' },
                  { id: 'none', label: 'Tắt' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateUserSettings({ autoplay_audio: opt.id })}
                    className={cn(
                      "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                      (userSettings.autoplay_audio || 'always') === opt.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">
                Hiển Thị Hình Ảnh (Images)
              </span>
              <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200/60">
                {[
                  { id: 'both', label: 'Cả 2 mặt' },
                  { id: 'back_only', label: 'Chỉ mặt sau' },
                  { id: 'none', label: 'Tắt hình' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateUserSettings({ show_images: opt.id })}
                    className={cn(
                      "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                      (userSettings.show_images || 'both') === opt.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggle Items */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <SettingItem 
              icon={Brain} 
              label="Hiển Thị Chỉ Số & Thống Kê FSRS" 
              desc="Hiển thị độ ổn định (Stability), độ khó (Difficulty) và thời gian ôn tập trên thẻ" 
              active={userSettings.show_fsrs ?? true} 
              onClick={() => updateUserSettings({ show_fsrs: !(userSettings.show_fsrs ?? true) })}
            />
            <SettingItem 
              icon={Volume2} 
              label="Hiệu Ứng Âm Thanh (SFX)" 
              desc="Phát âm thanh phản hồi khi lật thẻ và đánh giá kết quả" 
              active={userSettings.sfx_enabled ?? true} 
              onClick={() => updateUserSettings({ sfx_enabled: !(userSettings.sfx_enabled ?? true) })}
            />
            <SettingItem 
              icon={Zap} 
              label="Rung Phản Hồi (Haptic Feedback)" 
              desc="Rung nhẹ khi vuốt và chạm nút trên điện thoại" 
              active={userSettings.haptic_enabled ?? true} 
              onClick={() => updateUserSettings({ haptic_enabled: !(userSettings.haptic_enabled ?? true) })}
            />
          </div>

          {/* Bottom Save as Custom Template Callout */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-amber-600" />
                Lưu cấu hình hiện tại thành Template mới?
              </h4>
              <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                Đóng gói toàn bộ cử chỉ, thuật toán và căn lề vừa thiết lập thành một template mang tên bạn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewProfileName('')
                setNewProfileIcon('sparkles')
                loadBaseSettings('current')
                setIsCreateModalOpen(true)
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-black text-xs uppercase tracking-wider hover:bg-amber-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
            >
              Lưu thành Template
            </button>
          </div>
        </section>
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

      {/* Create New Profile Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Tạo Template Mới
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Tên Template
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ôn thi JLPT N2, Luyện phát âm..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Biểu tượng (Icon)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'sparkles', label: 'Lấp lánh', icon: Sparkles },
                    { id: 'zap', label: 'Tia chớp', icon: Zap },
                    { id: 'headphones', label: 'Tai nghe', icon: Headphones },
                    { id: 'book', label: 'Sách', icon: BookOpen },
                  ].map((ic) => {
                    const isSel = newProfileIcon === ic.id
                    const IconComp = ic.icon
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setNewProfileIcon(ic.id)}
                        className={cn(
                          "py-2 px-1 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold transition-all cursor-pointer",
                          isSel
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <IconComp className="w-4 h-4" />
                        <span>{ic.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Mẫu Cấu Hình Gốc (Baseline)
                </label>
                <select
                  value={newProfileBase}
                  onChange={(e) => loadBaseSettings(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
                >
                  <option value="current">⚡ Sao chép toàn bộ Cử chỉ & Học tập hiện tại của bạn</option>
                  <option value="preset-standard">Tiêu chuẩn (FSRS) - Đầy đủ 2 chiều & âm thanh</option>
                  <option value="preset-speedrun">Tốc độ cao (Speedrun) - Vuốt nhanh 2 chiều, tắt audio</option>
                  <option value="preset-audio">Luyện nghe (Audio-First) - Tự động phát âm thanh</option>
                  <option value="preset-focus">Tập trung tối giản (Deep Focus) - Tắt âm thanh & FSRS</option>
                </select>
              </div>

              {/* Explicit Gestures Configuration */}
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                    <Move className="w-3 h-3" /> Thao Tác Cử Chỉ (Gestures)
                  </span>
                  <span className="text-[9px] font-bold text-purple-600 bg-purple-100/70 px-1.5 py-0.2 rounded">Tùy biến</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Cách lật thẻ</span>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-purple-100">
                      {[
                        { id: 'both', label: 'Chạm & Vuốt' },
                        { id: 'tap', label: 'Chạm thân thẻ' },
                        { id: 'button_only', label: 'Chỉ nút' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTemplateSettings(prev => ({ ...prev, card_flip_trigger: opt.id as any }))}
                          className={cn(
                            "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
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
                    <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Đánh giá kết quả FSRS</span>
                    <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-purple-100">
                      {[
                        { id: 'both', label: 'Cả hai' },
                        { id: 'swipe_4way', label: 'Vuốt 4 hướng' },
                        { id: 'swipe_2way', label: 'Vuốt 2 chiều' },
                        { id: 'buttons', label: '4 Nút' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTemplateSettings(prev => ({ ...prev, card_rating_mode: opt.id as any }))}
                          className={cn(
                            "py-1 px-0.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer text-center truncate",
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
                </div>
              </div>

              {/* Explicit Study, Algorithm & Audio Configuration */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <Brain className="w-3 h-3" /> Thuật Toán & Hiển Thị
                  </span>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.2 rounded">Tùy biến</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Thuật toán thứ tự học</span>
                    <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-indigo-100">
                      {[
                        { id: 'fsrs', label: 'FSRS' },
                        { id: 'unseen', label: 'Chưa học' },
                        { id: 'review', label: 'Ôn tập' },
                        { id: 'random', label: 'Xáo trộn' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTemplateSettings(prev => ({ ...prev, quiz_learning_mode: opt.id as any }))}
                          className={cn(
                            "py-1 px-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer text-center",
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

                  <div>
                    <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Tự động phát âm thanh</span>
                    <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-indigo-100">
                      {[
                        { id: 'always', label: 'Luôn phát' },
                        { id: 'front', label: 'Mặt trước' },
                        { id: 'back', label: 'Mặt sau' },
                        { id: 'none', label: 'Tắt' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTemplateSettings(prev => ({ ...prev, autoplay_audio: opt.id as any }))}
                          className={cn(
                            "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                            templateSettings.autoplay_audio === opt.id
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Hiển thị ảnh</span>
                      <div className="grid grid-cols-3 gap-0.5 bg-white p-1 rounded-xl border border-indigo-100">
                        {[
                          { id: 'both', label: 'Cả 2' },
                          { id: 'back_only', label: 'Mặt sau' },
                          { id: 'none', label: 'Tắt' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, show_images: opt.id as any }))}
                            className={cn(
                              "py-1 px-0.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer text-center truncate",
                              templateSettings.show_images === opt.id
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Chỉ số FSRS</span>
                      <div className="grid grid-cols-2 gap-0.5 bg-white p-1 rounded-xl border border-indigo-100">
                        {[
                          { id: true, label: 'Hiện' },
                          { id: false, label: 'Ẩn' },
                        ].map((opt) => (
                          <button
                            key={String(opt.id)}
                            type="button"
                            onClick={() => setTemplateSettings(prev => ({ ...prev, show_fsrs: opt.id }))}
                            className={cn(
                              "py-1 px-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center",
                              templateSettings.show_fsrs === opt.id
                                ? "bg-indigo-600 text-white shadow-xs"
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
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!newProfileName.trim() || isSavingProfile}
                onClick={async () => {
                  if (!newProfileName.trim()) return
                  setIsSavingProfile(true)
                  try {
                    const basePreset = SYSTEM_PROFILES.find(p => p.id === newProfileBase) || SYSTEM_PROFILES[0]
                    const finalSettings = {
                      ...basePreset.settings,
                      ...templateSettings
                    }
                    await handleCreateProfile(newProfileName.trim(), newProfileIcon, finalSettings)
                    setIsCreateModalOpen(false)
                  } catch (e) {
                    console.error('Failed to create profile', e)
                  } finally {
                    setIsSavingProfile(false)
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black uppercase tracking-wider hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                {isSavingProfile ? 'Đang tạo...' : 'Lưu Template Cử Chỉ & Học Tập'}
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
