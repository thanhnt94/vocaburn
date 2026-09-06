import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  Settings as SettingsIcon, 
  Sparkles,
  ShieldCheck,
  Bell,
  Moon,
  Send,
  Lock,
  ExternalLink,
  Clock,
  Plus,
  Trash2,
  Check,
  Headphones,
  BookOpen,
  User,
  Sliders,
  Edit3,
  Eye,
  X,
  Zap,
  BookmarkCheck,
  RotateCcw,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { StudyProfile } from '@/store/useSettingsStore'
import { cn } from '@/lib/utils'
import {
  SYSTEM_TEMPLATES,
  getSettingsSpecPills,
  StudyTemplateSelector,
  StudySettingsEditor,
  type StudyTemplateItem,
} from '@/components/common/study'

export type SettingsTab = 'study' | 'alerts' | 'general'

interface TabConfig {
  id: SettingsTab
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const SETTINGS_TABS: TabConfig[] = [
  {
    id: 'study',
    label: 'Study Settings',
    shortLabel: 'Study',
    icon: Sparkles,
    description: 'Templates, gestures, audio & card display'
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  zap: Zap,
  headphones: Headphones,
  book: BookOpen,
}

export const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { user, userSettings, updateUserSettings, authConfig } = useAppStore()

  // ─── Tab navigation ───
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null
  const initialTab: SettingsTab = (tabFromUrl && SETTINGS_TABS.some(t => t.id === tabFromUrl))
    ? tabFromUrl
    : 'study'

  const [activeTab, setActiveTabState] = useState<SettingsTab>(initialTab)

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }

  // ─── Study tab state ───
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple')
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileIcon, setNewProfileIcon] = useState('sparkles')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // ─── Build template list ───
  const systemProfiles = useMemo(() => {
    const fromBackend = (userSettings.study_profiles || []).filter((p: any) => p.is_system)
    const seen = new Set<string>()
    const uniqueBackend = fromBackend.filter((bp: any) => {
      if (!bp || !bp.id || seen.has(bp.id)) return false
      seen.add(bp.id)
      return true
    })
    if (uniqueBackend.length > 0) {
      return uniqueBackend.map((bp: any) => {
        const matchingFallback = SYSTEM_TEMPLATES.find(sp => sp.id === bp.id)
        return {
          ...bp,
          icon: bp.icon || matchingFallback?.icon || 'sparkles',
          badge: bp.badge || matchingFallback?.badge || 'System',
          desc: bp.description || matchingFallback?.desc || '',
          isSystem: true,
        } as StudyTemplateItem
      })
    }
    return SYSTEM_TEMPLATES
  }, [userSettings.study_profiles])

  const customProfiles: StudyTemplateItem[] = useMemo(() => {
    const seen = new Set<string>()
    return (userSettings.study_profiles || [])
      .filter((p: any) => {
        if (!p || !p.id || p.is_system || String(p.id).startsWith('preset-') || seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      .map((p: any) => ({
        id: p.id,
        name: p.name || 'Custom Template',
        icon: p.icon || 'sparkles',
        badge: 'My Template',
        desc: p.desc || 'Your saved custom study profile.',
        isCustom: true,
        settings: p.settings || {},
      }))
  }, [userSettings.study_profiles])

  const allTemplates: StudyTemplateItem[] = useMemo(
    () => [...systemProfiles, ...customProfiles],
    [systemProfiles, customProfiles]
  )

  const activeProfileId = userSettings.active_profile_id || 'preset-standard'

  // ─── Template actions ───
  const handleApplyTemplate = async (template: StudyTemplateItem) => {
    try {
      const s = template.settings || {}
      await updateUserSettings({
        active_profile_id: template.id,
        ...s,
      } as any)
      setToastMessage({ type: 'success', text: `Applied "${template.name}" template.` })
      setTimeout(() => setToastMessage(null), 3000)
    } catch (err) {
      console.error('Failed to apply template', err)
      setToastMessage({ type: 'error', text: 'Failed to apply template.' })
    }
  }

  const handleResetToStandard = async () => {
    const standardPreset = systemProfiles.find(p => p.id === 'preset-standard') || systemProfiles[0]
    await updateUserSettings({
      active_profile_id: standardPreset.id,
      ...standardPreset.settings,
    })
    setToastMessage({ type: 'success', text: 'Reset to Standard defaults.' })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleUpdateStudySetting = async (key: string, value: any) => {
    try {
      await updateUserSettings({ [key]: value })
    } catch (err) {
      console.error(`Failed to update ${key}`, err)
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
        return { ...p, name, icon, settings: updatedSettings }
      }
      return p
    })
    const isCurrentActive = userSettings.active_profile_id === profileId
    await updateUserSettings({
      study_profiles: updatedProfiles as any,
      ...(isCurrentActive ? updatedSettings : {}),
    } as any)
  }

  const handleDeleteProfile = async (profileId: string) => {
    const currentProfiles = userSettings.study_profiles || []
    const updatedProfiles = currentProfiles.filter((p: any) => p.id !== profileId && !p.is_system)
    const nextActiveId = userSettings.active_profile_id === profileId ? 'preset-standard' : userSettings.active_profile_id
    await updateUserSettings({
      study_profiles: updatedProfiles as any,
      active_profile_id: nextActiveId,
    })
  }

  const handleEditCustomProfile = (prof: StudyProfile) => {
    setEditingProfileId(prof.id)
    setNewProfileName(prof.name)
    setNewProfileIcon(prof.icon || 'sparkles')
    setIsCreateModalOpen(true)
  }

  // ─── Telegram & Alerts state ───
  const [pushActive, setPushActive] = useState(false)
  const [, setCheckingPush] = useState(true)
  const [telegramConfig, setTelegramConfig] = useState<any>(null)
  
  const darkMode = userSettings.theme === 'dark'
  const focusTimer = userSettings.focus_timer_active

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
        setActiveTabState('study')
      }
    }
  }, [location.hash])

  const togglePushNotifications = async () => {
    if (pushActive) {
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

  // ══════════════ TAB 1: STUDY SETTINGS ══════════════
  const renderStudyTab = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Toast */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* HEADER + SIMPLE/ADVANCED TOGGLE */}
      <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Default Account Study Settings</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              Study Templates & Preferences
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure default gestures, card display, audio, and algorithms for all your decks.
            </p>
          </div>

          {/* Simple / Advanced toggle */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shrink-0 self-start sm:self-center">
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
              <span>Templates</span>
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
              <span>Fine-Tune</span>
            </button>
          </div>
        </div>

        {/* ═══ SIMPLE MODE: Template Selector ═══ */}
        {viewMode === 'simple' && (
          <div className="space-y-4">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {allTemplates.length} templates
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToStandard}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset to Standard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfileId(null)
                    setNewProfileName('')
                    setNewProfileIcon('sparkles')
                    setIsCreateModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save as Template</span>
                </button>
              </div>
            </div>

            {/* Template list (with edit/delete actions for custom) */}
            <div className="space-y-2">
              {allTemplates.map((tpl) => {
                const isActive = activeProfileId === tpl.id
                const IconComp = ICON_MAP[tpl.icon] || Sparkles
                const specs = getSettingsSpecPills(tpl.settings)

                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className={cn(
                      "rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 p-3.5 select-none",
                      isActive
                        ? "bg-indigo-50/30 border-indigo-500 shadow-xs ring-1 ring-indigo-400/30"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {/* Radio */}
                    <div className="pt-0.5 shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isActive ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white"
                      )}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                          isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                        )}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className={cn("text-xs font-black truncate", isActive ? "text-indigo-900" : "text-slate-800")}>
                          {tpl.name}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          tpl.isCustom
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : isActive
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}>
                          {tpl.badge}
                        </span>
                        {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-2">
                        {tpl.desc}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {specs.map((spec) => (
                          <span key={spec.label} className="px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-200/60 text-[9.5px] font-bold text-slate-600">
                            {spec.label}: {spec.val}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Custom template actions */}
                    {tpl.isCustom && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditCustomProfile(tpl as any) }}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteProfile(tpl.id) }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ ADVANCED MODE: Direct Settings Editor ═══ */}
        {viewMode === 'advanced' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Fine-Tune Preferences
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Adjust individual settings directly. Changes apply to your account defaults.
              </p>
            </div>

            <StudySettingsEditor
              settings={userSettings as any}
              onChange={handleUpdateStudySetting}
            />
          </div>
        )}
      </section>
    </div>
  )

  // ══════════════ TAB 2: TELEGRAM & ALERTS ══════════════
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

  // ══════════════ TAB 3: GENERAL & SECURITY ══════════════
  const renderGeneralTab = () => (
    <div className="space-y-4 md:space-y-6">
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

      {/* ═══════════ MAIN TAB CONTENT ═══════════ */}
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
              {activeTab === 'study' && renderStudyTab()}
              {activeTab === 'alerts' && renderAlertsTab()}
              {activeTab === 'general' && renderGeneralTab()}
            </motion.div>
          </AnimatePresence>

          <div className="pt-2 pb-6 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Vocaburn v1.0.0 // Neural OS</p>
          </div>
        </div>
      </div>

      {/* ═══════════ MOBILE BOTTOM TAB BAR ═══════════ */}
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

      {/* ═══════════ SAVE AS TEMPLATE MODAL ═══════════ */}
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
                    setToastMessage({ type: 'success', text: editingProfileId ? 'Template updated!' : 'Template saved!' })
                    setTimeout(() => setToastMessage(null), 3000)
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
