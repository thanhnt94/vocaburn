import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import {
  DeckGeneralForm,
  DeckColumnSettings,
  DeckPracticeConfig,
  DeckAISettings,
  DeckAudioSettings,
  DeckExcelManager,
  DeckDangerZone,
  DeckCollaboratorsSettings,
  DeckPersonalSettings,
  DeckStudyDefaults,
  DeckSubLessonSettings,
} from '../settings'
import { Settings, Sparkles, Volume2, Sliders, Columns3, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DeckSettingsTabProps {
  embedded?: boolean
  deckId?: string | number
}

export type SettingsScope = 'deck' | 'personal'
export type SettingsSubTab = 'general' | 'columns' | 'study' | 'practice' | 'ai' | 'audio'

const VALID_SUB_TABS: SettingsSubTab[] = ['general', 'columns', 'study', 'practice', 'ai', 'audio']

export function DeckSettingsTab({ embedded = false, deckId }: DeckSettingsTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAppStore()

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
    deckData?.can_edit ||
    (user && (deckData?.owner_id === user.id || deckData?.creator_id === user.id)) ||
    deckData?.is_collaborator ||
    user?.role === 'admin'
  )

  // Scope: 'deck' (owner only) | 'personal' (available to all)
  const scopeParam = searchParams.get('scope')
  const settingsScope: SettingsScope = (!isOwner || scopeParam === 'personal') ? 'personal' : 'deck'

  const handleSelectScope = (newScope: SettingsScope) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      updated.set('tab', 'settings')
      if (newScope === 'personal') {
        updated.set('scope', 'personal')
      } else {
        updated.delete('scope')
      }
      return updated
    }, { replace: true })
  }

  // URL query parameter synchronization for Sub-Tabs (when in deck scope)
  const rawSubTab = searchParams.get('subtab')
  const normalizedSubTab = (
    rawSubTab === 'sublessons' ? 'columns' :
    (rawSubTab === 'excel' || rawSubTab === 'collab' || rawSubTab === 'danger') ? 'general' :
    rawSubTab
  ) as SettingsSubTab
  const activeSubTab: SettingsSubTab = VALID_SUB_TABS.includes(normalizedSubTab) ? normalizedSubTab : 'general'

  const handleSelectSubTab = (newSubTab: SettingsSubTab) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      updated.set('tab', 'settings')
      updated.delete('scope')
      updated.delete('section')
      if (newSubTab === 'general') {
        updated.delete('subtab')
      } else {
        updated.set('subtab', newSubTab)
      }
      return updated
    }, { replace: true })
  }

  const subTabs = [
    { id: 'general' as const, label: 'General', icon: Settings, color: 'text-indigo-600' },
    { id: 'columns' as const, label: 'Columns', icon: Columns3, color: 'text-blue-600' },
    { id: 'study' as const, label: 'Study', icon: BookmarkCheck, color: 'text-emerald-600' },
    { id: 'practice' as const, label: 'Modes', icon: Sliders, color: 'text-amber-600' },
    { id: 'ai' as const, label: 'AI & Ruby', icon: Sparkles, color: 'text-purple-600' },
    { id: 'audio' as const, label: 'Audio', icon: Volume2, color: 'text-sky-600' },
  ]

  if (isLoading) {
    return (
      <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-4">
        <div className="h-14 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        <div className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-4 space-y-4 text-left animate-in fade-in duration-200">
      {/* ═══════════ VIEW A: PERSONAL SETTINGS ═══════════ */}
      {settingsScope === 'personal' ? (
        <DeckPersonalSettings
          deckId={id!}
          deckTitle={deckData?.title}
          isOwner={isOwner}
          onSaved={() => refetch()}
        />
      ) : (
        /* ═══════════ VIEW B: DECK CREATOR SETTINGS (OWNER SCOPE) ═══════════ */
        <div className="space-y-4">
          {/* STICKY TOP SUB-TAB NAVIGATION BAR (COMPACT 1-ROW HORIZONTAL BAR) */}
          <div className="sticky top-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-md pt-0.5 pb-1">
            <div className="bg-white/95 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {subTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeSubTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectSubTab(tab.id)}
                      className={cn(
                        "relative flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer select-none shrink-0 whitespace-nowrap text-xs",
                        isActive
                          ? "text-slate-900 font-black shadow-2xs bg-slate-100/90 border border-slate-200/90 dark:bg-slate-800 dark:text-white"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 relative z-10 shrink-0", isActive ? tab.color : "text-slate-400")} />
                      <span className="relative z-10 text-[11px] sm:text-xs">
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SUB-TAB CONTENT AREA */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeSubTab}_${searchParams.get('section') || 'default'}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {activeSubTab === 'general' && (() => {
                const rawSubTab = searchParams.get('subtab')
                const sectionParam = searchParams.get('section')
                const currentSection = sectionParam || (
                  rawSubTab === 'excel' ? 'excel' :
                  rawSubTab === 'collab' ? 'collab' :
                  rawSubTab === 'danger' ? 'danger' :
                  'info'
                )
                return (
                  <div className="space-y-4">
                    {currentSection === 'info' && (
                      <DeckGeneralForm
                        deckId={id!}
                        initialData={deckData}
                        onSaved={() => refetch()}
                      />
                    )}

                    {currentSection === 'collab' && (
                      <DeckCollaboratorsSettings
                        deckId={id!}
                        isOwner={isOwner}
                      />
                    )}

                    {currentSection === 'excel' && (
                      <DeckExcelManager deckId={id!} />
                    )}

                    {currentSection === 'danger' && (
                      <DeckDangerZone deckId={id!} isOwner={isOwner} />
                    )}
                  </div>
                )
              })()}

              {activeSubTab === 'columns' && (() => {
                const rawSubTab = searchParams.get('subtab')
                const sectionParam = searchParams.get('section')
                const currentSection = sectionParam || (
                  rawSubTab === 'sublessons' ? 'sublessons' :
                  'cols'
                )
                return currentSection === 'sublessons' ? (
                  <DeckSubLessonSettings
                    deckId={id!}
                    onSaved={() => refetch()}
                  />
                ) : (
                  <DeckColumnSettings
                    deckId={id!}
                    isOwner={isOwner}
                    hideSubLessons
                  />
                )
              })()}

              {activeSubTab === 'study' && (
                <DeckStudyDefaults
                  deckId={id!}
                  onSaved={() => refetch()}
                />
              )}

              {activeSubTab === 'practice' && (
                <DeckPracticeConfig
                  deckId={id!}
                  initialSettings={deckData?.practice_settings}
                  onSaved={() => refetch()}
                  section={searchParams.get('section') as any}
                />
              )}

              {activeSubTab === 'ai' && (
                <DeckAISettings
                  deckId={id!}
                  initialSettings={deckData?.practice_settings}
                  onSaved={() => refetch()}
                  section={searchParams.get('section') as any}
                />
              )}

              {activeSubTab === 'audio' && (
                <DeckAudioSettings
                  deckId={id!}
                  initialSettings={deckData?.practice_settings}
                  onSaved={() => refetch()}
                  section={searchParams.get('section') as any}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default DeckSettingsTab
