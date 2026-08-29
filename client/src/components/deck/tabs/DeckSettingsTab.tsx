import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import {
  DeckGeneralForm,
  DeckPracticeConfig,
  DeckAISettings,
  DeckAudioSettings,
  DeckFuriganaSettings,
  DeckExcelManager,
  DeckDangerZone,
  DeckCollaboratorsModal
} from '../settings'
import { Settings, Sparkles, Volume2, Sliders, FileSpreadsheet, Users, AlertTriangle, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DeckSettingsTabProps {
  embedded?: boolean
  deckId?: string | number
}

export type SettingsSubTab = 'general' | 'ai' | 'audio' | 'furigana' | 'practice' | 'excel' | 'collab' | 'danger'

const VALID_SUB_TABS: SettingsSubTab[] = ['general', 'ai', 'audio', 'furigana', 'practice', 'excel', 'collab', 'danger']

export function DeckSettingsTab({ embedded = false, deckId }: DeckSettingsTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAppStore()
  
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false)

  // URL query parameter synchronization for Sub-Tabs
  const subtabParam = searchParams.get('subtab') as SettingsSubTab
  const activeSubTab: SettingsSubTab = VALID_SUB_TABS.includes(subtabParam) ? subtabParam : 'general'

  const handleSelectSubTab = (newSubTab: SettingsSubTab) => {
    if (newSubTab === 'collab') {
      setIsCollabModalOpen(true)
      return
    }

    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      updated.set('tab', 'settings')
      if (newSubTab === 'general') {
        updated.delete('subtab')
      } else {
        updated.set('subtab', newSubTab)
      }
      return updated
    }, { replace: true })
  }

  // Fetch Deck metadata
  const { data: deckData, isLoading, refetch } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/data`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  const isOwner = Boolean(
    deckData?.is_creator ||
    (user && deckData?.owner_id === user.id) ||
    user?.role === 'admin'
  )

  const subTabs = [
    { id: 'general' as const, label: 'Cơ bản', shortLabel: 'Cơ bản', icon: Settings, color: 'text-indigo-600', badge: null },
    { id: 'ai' as const, label: 'Cấu hình AI', shortLabel: 'AI Prompt', icon: Sparkles, color: 'text-purple-600', badge: 'AI' },
    { id: 'audio' as const, label: 'Âm thanh & TTS', shortLabel: 'Audio TTS', icon: Volume2, color: 'text-sky-600', badge: 'TTS' },
    { id: 'furigana' as const, label: 'Furigana Ruby', shortLabel: 'Furigana', icon: Languages, color: 'text-emerald-600', badge: 'あ' },
    { id: 'practice' as const, label: 'Luyện tập', shortLabel: 'Luyện tập', icon: Sliders, color: 'text-amber-600', badge: null },
    { id: 'excel' as const, label: 'Dữ liệu Excel', shortLabel: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600', badge: null },
    { id: 'collab' as const, label: 'Cộng tác viên', shortLabel: 'Thành viên', icon: Users, color: 'text-blue-600', badge: null },
    { id: 'danger' as const, label: 'Nguy hiểm', shortLabel: 'Nguy hiểm', icon: AlertTriangle, color: 'text-rose-600', badge: null },
  ]

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-14 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        <div className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-4 space-y-4 text-left animate-in fade-in duration-200">
      {/* ═══════════ STICKY TOP SUB-TAB NAVIGATION BAR ═══════════ */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-md pt-1 pb-2">
        <div className="bg-white/95 p-1 sm:p-1.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-4 sm:flex sm:items-center sm:gap-1">
            {subTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeSubTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectSubTab(tab.id)}
                  className={cn(
                    "relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer select-none",
                    isActive
                      ? "text-slate-900 font-black shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsSubTab"
                      className="absolute inset-0 bg-slate-100/90 border border-slate-200/90 rounded-xl"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <Icon className={cn("w-4 h-4 sm:w-3.5 sm:h-3.5 relative z-10 shrink-0", isActive ? tab.color : "text-slate-400")} />
                  <span className="relative z-10 text-[10px] sm:text-xs truncate">
                    <span className="inline sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                  {tab.badge && (
                    <span className="hidden sm:inline relative z-10 px-1 py-0.2 rounded text-[9px] font-black bg-slate-200/70 text-slate-700 leading-none">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ SUB-TAB CONTENT AREA ═══════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeSubTab === 'general' && (
            <DeckGeneralForm
              deckId={id!}
              initialData={deckData}
              onSaved={() => refetch()}
            />
          )}

          {activeSubTab === 'ai' && (
            <DeckAISettings
              deckId={id!}
              initialSettings={deckData?.practice_settings}
              onSaved={() => refetch()}
            />
          )}

          {activeSubTab === 'audio' && (
            <DeckAudioSettings
              deckId={id!}
              initialSettings={deckData?.practice_settings}
              onSaved={() => refetch()}
            />
          )}

          {activeSubTab === 'furigana' && (
            <DeckFuriganaSettings
              deckId={id!}
              initialSettings={deckData?.practice_settings}
              onSaved={() => refetch()}
            />
          )}

          {activeSubTab === 'practice' && (
            <DeckPracticeConfig
              deckId={id!}
              initialSettings={deckData?.practice_settings}
              onSaved={() => refetch()}
            />
          )}

          {activeSubTab === 'excel' && (
            <DeckExcelManager deckId={id!} />
          )}

          {activeSubTab === 'danger' && (
            <DeckDangerZone deckId={id!} isOwner={isOwner} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Collaborators Modal */}
      <DeckCollaboratorsModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        deckId={id!}
        isOwner={isOwner}
      />
    </div>
  )
}

export default DeckSettingsTab
