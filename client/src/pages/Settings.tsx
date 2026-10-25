import React, { useState, useEffect } from 'react'
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
  Check,
  X,
  Copy,
  Bot,
  Flame,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { StudySettingsEditor } from '@/components/common/study'
import { ToggleRow } from '@/components/common/study/ToggleRow'

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
    description: 'Gestures, audio & card display'
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
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
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
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateStudySetting = async (key: string, value: any) => {
    try {
      await updateUserSettings({ [key]: value })
    } catch (err) {
      console.error(`Failed to update ${key}`, err)
    }
  }

  // ─── Telegram & Alerts state ───
  const [pushActive, setPushActive] = useState(false)
  const [, setCheckingPush] = useState(true)
  const [telegramConfig, setTelegramConfig] = useState<any>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  
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

  const handleCopyLinkCode = () => {
    if (!telegramConfig?.connect_token) return
    navigator.clipboard.writeText(telegramConfig.connect_token)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
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
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs border",
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

      {/* Main Study Settings Card */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-5 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                Study Controls & Preferences
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Gestures, card flip triggers, audio synthesis & auto-advance pacing
              </p>
            </div>
          </div>
          <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl self-start sm:self-auto">
            Synced with Cloud Database
          </span>
        </div>

        {/* Modular Study Settings Editor */}
        <StudySettingsEditor
          settings={userSettings as any}
          onChange={handleUpdateStudySetting}
        />
      </section>
    </div>
  )

  // ══════════════ TAB 2: TELEGRAM & ALERTS ══════════════
  const renderAlertsTab = () => (
    <div className="space-y-5 md:space-y-6 text-left">
      {/* Card 1: Telegram Bot Integration */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                Telegram Bot Notifications
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Spaced repetition reminders, streak guard alerts, and weekly digests
              </p>
            </div>
          </div>

          {telegramConfig?.is_linked ? (
            <div className="inline-flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Linked & Active
              </span>
              <button 
                onClick={() => updateTelegram({ unlink: true })} 
                className="text-[9.5px] font-bold uppercase tracking-wider text-rose-600 px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer border border-rose-100"
              >
                Unlink
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase self-start sm:self-auto">
              Not Connected
            </span>
          )}
        </div>
        
        {!telegramConfig?.is_linked ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-blue-500 shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Connect @VocaburnBot in 2 Steps
              </h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Get notified before cards expire to keep your learning streak protected and receive scheduled daily reviews.
              </p>
            </div>

            {/* Link Code Box with 1-click Copy */}
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-xs">
              <div className="text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Your One-Time Link Code</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-widest font-mono">
                  {telegramConfig?.connect_token || '...'}
                </span>
              </div>
              <button
                onClick={handleCopyLinkCode}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="w-full max-w-sm pt-1">
              <a 
                href={`https://t.me/${(telegramConfig?.bot_username || 'VocaburnBot').replace(/^@/, '')}?start=${telegramConfig?.connect_token}`} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 active:scale-98"
              >
                <span>Open Bot in Telegram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <p className="text-[9.5px] font-medium text-slate-400 mt-2">
                Or send <code className="bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300">/start {telegramConfig?.connect_token}</code> directly to the bot.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reminder Time Selector Row */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight block">
                    Daily Schedule Digest Time
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Telegram message dispatched when cards are ready for study
                  </p>
                </div>
              </div>

              <select 
                value={telegramConfig?.reminder_time || "20:00"} 
                onChange={(e) => updateTelegram({ reminder_time: e.target.value })} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-blue-600 dark:text-blue-400 focus:outline-none transition-all cursor-pointer shadow-xs" 
              >
                {Array.from({ length: 18 }).map((_, i) => {
                  const hour = (i + 6).toString().padStart(2, '0')
                  return <option key={`${hour}:00`} value={`${hour}:00`}>{`${hour}:00`}</option>
                })}
              </select>
            </div>

            {/* Smart Telegram Alerts Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ToggleRow
                icon={Flame}
                label="Streak Guard Alert"
                desc="Sends an urgent reminder at 22:00 if your daily streak is at risk"
                checked={telegramConfig?.streak_guard_enabled !== false}
                onChange={(val) => updateTelegram({ streak_guard_enabled: val })}
              />
              <ToggleRow
                icon={Calendar}
                label="Weekly Summary"
                desc="Sunday 09:00 retention analysis & card volume summary"
                checked={telegramConfig?.weekly_summary_enabled !== false}
                onChange={(val) => updateTelegram({ weekly_summary_enabled: val })}
              />
              <ToggleRow
                icon={Bot}
                label="Inactivity Alert"
                desc="Gentle encouragement notification after 3 days of missed study"
                checked={telegramConfig?.inactivity_alert_enabled !== false}
                onChange={(val) => updateTelegram({ inactivity_alert_enabled: val })}
              />
            </div>
          </div>
        )}
      </section>

      {/* Card 2: Browser Push Notifications */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
              Browser Web Push Notifications
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              Direct device notifications on desktop & mobile browsers
            </p>
          </div>
        </div>

        <ToggleRow 
          icon={Bell} 
          label="Daily Review Web Push" 
          desc="Receive device alerts when flashcards reach their scheduled due time" 
          checked={pushActive} 
          onChange={togglePushNotifications}
        />
      </section>
    </div>
  )

  // ══════════════ TAB 3: GENERAL & SECURITY ══════════════
  const renderGeneralTab = () => (
    <div className="space-y-5 md:space-y-6 text-left">
      {/* Section 1: System Display & Timer Preferences */}
      <section id="preferences" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
              Interface Display & Theme
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              Visual themes and in-session productivity timer preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow 
            icon={Moon} 
            label="Dark Mode Theme" 
            desc="Switch interface styling to high-contrast dark palette" 
            checked={darkMode}
            onChange={toggleDarkMode}
          />
          <ToggleRow 
            icon={Clock} 
            label="Focus Stopwatch" 
            desc="Display real-time study stopwatch during active learning sessions" 
            checked={focusTimer}
            onChange={toggleFocusTimer}
          />
        </div>
      </section>

      {/* Section 2: Account & Security Portal */}
      <section id="security" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
              Account Authentication & Security
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              Credentials management and CentralAuth single sign-on hub
            </p>
          </div>
        </div>
        
        {authConfig?.sso_enabled ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center text-center max-w-lg mx-auto space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-emerald-600 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                CentralAuth SSO Active
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Single Sign-On Managed Account
              </h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Your credentials, 2FA, and profile are unified under InMind CentralAuth. Visit the SSO hub to update your security settings.
              </p>
            </div>
            <a 
              href={authConfig.jump_url || 'https://auth.inmind.site/account'} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full max-w-xs py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs active:scale-98"
            >
              <span>Manage in CentralAuth</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 max-w-md space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Change Account Password
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>
            
            {passMsg.text && (
              <div className={cn(
                "text-xs font-bold px-3 py-2 rounded-xl",
                passMsg.type === 'error' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {passMsg.text}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={passLoading}
              className="w-full py-2.5 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50 active:scale-98 cursor-pointer"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </section>
    </div>
  )

  return (
    <div className="fixed inset-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom))] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] dark:bg-[#0b0f19] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 md:backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs md:shadow-none px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-left">
          {/* Left: Branding with Clean Slate Squircle & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0">
              <SettingsIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                  Settings & Preferences
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black shrink-0 leading-none">
                  Config
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1 leading-none truncate">
                <span>Configure gestures, audio, alerts & security</span>
              </p>
            </div>
          </div>

          {/* Unified Responsive Segmented Tab Switcher */}
          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-3 sm:flex sm:items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-inner gap-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(8)
                      setActiveTab(tab.id)
                    }}
                    className={cn(
                      "relative py-1.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 min-w-0",
                      isActive
                        ? "text-slate-900 dark:text-slate-100 font-black shadow-xs bg-white dark:bg-slate-700"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors",
                      isActive ? "text-slate-900 dark:text-white stroke-[2.4]" : "text-slate-400 dark:text-slate-500"
                    )} />
                    <span className="truncate text-[11px] sm:text-xs leading-tight">{tab.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN TAB CONTENT ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5 md:py-6">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto space-y-4 md:space-y-6">
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
            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.25em]">
              Vocaburn · InMind Learning Ecosystem
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
