import React, { useState, Suspense, lazy } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ChevronLeft, 
  Sparkles, 
  Layers, 
  Settings as SettingsIcon, 
  Compass, 
  BookOpen, 
  Globe, 
  Lock,
  Search,
  X,
  Zap,
  ClipboardPaste,
  Plus,
  ChevronDown,
  User,
  Check,
  ArrowRight,
  Target
} from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import { DeckPagination } from '@/components/deck/DeckPagination'

// Lazy load tab components for optimal performance
const DeckOverviewTab = lazy(() => import('@/components/deck/tabs/DeckOverviewTab'))
const DeckCardsTab = lazy(() => import('@/components/deck/tabs/DeckCardsTab'))
const DeckSettingsTab = lazy(() => import('@/components/deck/tabs/DeckSettingsTab'))
const DeckRoadmapTab = lazy(() => import('@/components/deck/tabs/DeckRoadmapTab'))

export type DeckDetailTab = 'overview' | 'cards' | 'roadmap' | 'settings'

export interface StudyModeOption {
  id: string
  name: string
  fullName: string
  emoji: string
  desc: string
  badge?: (due: number) => string
  badgeColor?: string
  color: string
  getUrl: (deckId: string | number) => string
}

export const STUDY_MODES: StudyModeOption[] = [
  {
    id: 'fsrs',
    name: 'FSRS Mode',
    fullName: 'FSRS Spaced Repetition',
    emoji: '🧠',
    desc: 'Spaced repetition based on memory stability & retention',
    badge: (due: number) => due > 0 ? `${due} due` : 'SRS',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    color: 'from-indigo-600 to-purple-600',
    getUrl: (id) => `/flashcard/${id}/play?mode=fsrs`
  },
  {
    id: 'skim',
    name: 'Speed Skim',
    fullName: 'Speed Skim (Flash View)',
    emoji: '⚡',
    desc: 'Rapid 1-tap card preview without grading pressure',
    badge: () => '+3 XP',
    badgeColor: 'bg-amber-100 text-amber-700',
    color: 'from-amber-500 to-orange-500',
    getUrl: (id) => `/flashcard/${id}/play?mode=skim`
  },
  {
    id: 'review',
    name: 'Review Mode',
    fullName: 'Continuous Review',
    emoji: '📚',
    desc: 'Review all learned cards in a continuous cycle',
    badge: () => 'Learned',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    color: 'from-teal-600 to-emerald-600',
    getUrl: (id) => `/flashcard/${id}/play?mode=review`
  },
  {
    id: 'new',
    name: 'New Cards',
    fullName: 'Learn New Vocabulary',
    emoji: '✨',
    desc: 'Focus solely on unlearned vocabulary cards',
    badge: () => 'NEW',
    badgeColor: 'bg-purple-100 text-purple-700',
    color: 'from-purple-600 to-pink-600',
    getUrl: (id) => `/flashcard/${id}/play?mode=new`
  },
  {
    id: 'mcq',
    name: 'MCQ Test',
    fullName: '4-Choice Quiz Test',
    emoji: '🎯',
    desc: 'Rapid reflex 4 choices multiple choice test',
    badge: () => 'Quiz',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    color: 'from-emerald-500 to-teal-600',
    getUrl: (id) => `/practice/${id}/mcq`
  },
  {
    id: 'typing',
    name: 'Typing Test',
    fullName: 'Spelling Recall Test',
    emoji: '⌨️',
    desc: 'Deep recall spelling and character typing',
    badge: () => 'Typing',
    badgeColor: 'bg-purple-100 text-purple-700',
    color: 'from-purple-600 to-indigo-600',
    getUrl: (id) => `/practice/${id}/typing`
  },
  {
    id: 'listening',
    name: 'Listening Test',
    fullName: 'Audio Comprehension',
    emoji: '🎧',
    desc: 'Audio comprehension and listening recall',
    badge: () => 'Audio',
    badgeColor: 'bg-sky-100 text-sky-700',
    color: 'from-sky-500 to-blue-600',
    getUrl: (id) => `/practice/${id}/listening`
  }
]

export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAppStore()

  // Active Tab from URL
  const tabParam = searchParams.get('tab') as DeckDetailTab
  const activeTab: DeckDetailTab = (tabParam && ['overview', 'cards', 'roadmap', 'settings'].includes(tabParam)) 
    ? tabParam 
    : 'overview'

  // Manage Card Selection & Modals for sticky bar
  const [cardsPage, setCardsPage] = useState(1)
  const [cardsTotalPages, setCardsTotalPages] = useState(1)
  const [hasCardSelection, setHasCardSelection] = useState(false)
  const [cardsSearch, setCardsSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isBatchPasteOpen, setIsBatchPasteOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Settings Pull Dropdown Menu State
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)

  // Study Mode Selector & Sheet State
  const [selectedStudyMode, setSelectedStudyMode] = useState<string>('fsrs')
  const [studySheetType, setStudySheetType] = useState<'flashcard' | 'practice' | null>(null)

  // Fetch Deck Metadata
  const { data: deckMeta, isLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/data`)
      return res.data
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  })

  // Fetch Mastery Stats (for due count in Study Bar)
  const { data: masteryData } = useQuery({
    queryKey: ['quiz-mastery', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/mastery`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  const dueCount = masteryData?.due_count ?? 0
  const currentMode = STUDY_MODES.find(m => m.id === selectedStudyMode) || STUDY_MODES[0]

  const handleLaunchStudy = (modeId?: string) => {
    const targetMode = STUDY_MODES.find(m => m.id === (modeId || selectedStudyMode)) || STUDY_MODES[0]
    if (id) {
      if (modeId) setSelectedStudyMode(modeId)
      setStudySheetType(null)
      navigate(targetMode.getUrl(id))
    }
  }

  const isOwner = Boolean(
    deckMeta?.is_creator || 
    deckMeta?.can_edit ||
    (user && (deckMeta?.owner_id === user.id || deckMeta?.creator_id === user.id)) ||
    deckMeta?.is_collaborator ||
    (user?.role === 'admin')
  )

  const isOriginalCreator = Boolean(
    user && (deckMeta?.creator_id === user.id || deckMeta?.owner_id === user.id)
  )

  const scopeParam = searchParams.get('scope')
  const settingsScope = (!isOwner || scopeParam === 'personal') ? 'personal' : 'deck'

  const handleSelectScope = (newScope: 'deck' | 'personal') => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      updated.set('tab', 'settings')
      if (newScope === 'personal') {
        updated.set('scope', 'personal')
      } else {
        updated.set('scope', 'deck')
      }
      return updated
    }, { replace: true })
    setIsSettingsMenuOpen(false)
  }

  const handleTabChange = (tab: DeckDetailTab) => {
    if (tab === 'settings' && isOwner) {
      setIsSettingsMenuOpen((prev) => !prev)
      return
    }
    setIsSettingsMenuOpen(false)
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      updated.set('tab', tab)
      return updated
    }, { replace: true })
  }

  const getSettingsTabLabel = () => {
    if (activeTab !== 'settings') return 'Settings'
    if (!isOwner) return 'Settings'
    return settingsScope === 'personal' ? 'My Settings' : 'Deck Settings'
  }

  const getSettingsTabIcon = () => {
    if (activeTab !== 'settings') return SettingsIcon
    if (!isOwner) return SettingsIcon
    return settingsScope === 'personal' ? User : SettingsIcon
  }

  const allTabs: { id: DeckDetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'cards', label: 'Cards', icon: Layers },
    { id: 'roadmap', label: 'Roadmap', icon: Compass },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  const visibleTabs = allTabs

  return (
    <div className="fixed inset-0 top-0 bottom-[60px] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER (SHRINK-0) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-2xs">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between pt-2.5 pb-2.5 gap-3">
            {/* Left: Back Button & Deck Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => navigate('/decks')}
                className="w-8.5 h-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                title="Back to Decks"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-base shrink-0 overflow-hidden shadow-sm shadow-indigo-500/20">
                  {deckMeta?.cover_image ? (
                    <img src={resolveMediaUrl(deckMeta.cover_image)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>🎴</span>
                  )}
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">
                    {deckMeta?.title || 'Loading deck...'}
                  </h1>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <span className="text-indigo-600 font-extrabold">{deckMeta?.questions_count ?? '--'} cards</span>
                    {deckMeta?.creator_name && (
                      <>
                        <span>•</span>
                        <span className="text-slate-600 truncate max-w-[120px]">
                          @{deckMeta.creator_name}{isOriginalCreator ? ' (You)' : ''}
                        </span>
                      </>
                    )}
                    {deckMeta?.is_public !== undefined && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-slate-400">
                          {deckMeta.is_public ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {deckMeta.is_public ? 'Public' : 'Private'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Desktop Segmented Tab Switcher */}
            <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] gap-1">
              {visibleTabs.map((tab) => {
                const isSettingsTab = tab.id === 'settings'
                const Icon = isSettingsTab ? getSettingsTabIcon() : tab.icon
                const label = isSettingsTab ? getSettingsTabLabel() : tab.label
                const isActive = activeTab === tab.id

                if (isSettingsTab && isOwner) {
                  return (
                    <div key={tab.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
                        className={cn(
                          "relative flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs lg:text-sm font-bold transition-all select-none cursor-pointer",
                          isActive ? "text-orange-600 font-extrabold" : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="desktopDeckDetailTabPill"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                          />
                        )}
                        <Icon className={cn("w-4 h-4 relative z-10 shrink-0", isActive ? "text-orange-500 stroke-[2.2]" : "text-slate-400 stroke-[1.8]")} />
                        <span className="relative z-10">{label}</span>
                        <ChevronDown className={cn("w-3 h-3 relative z-10 text-slate-400 transition-transform duration-200", isSettingsMenuOpen && "rotate-180")} />
                      </button>

                      {/* Pull Dropdown Menu */}
                      <AnimatePresence>
                        {isSettingsMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSettingsMenuOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.95 }}
                              transition={{ duration: 0.12 }}
                              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 min-w-[210px] z-50 space-y-1 text-left"
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectScope('deck')}
                                className={cn(
                                  "w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                  isActive && settingsScope === 'deck'
                                    ? "bg-indigo-50 text-indigo-900 font-black"
                                    : "hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                                    <SettingsIcon className="w-3.5 h-3.5" />
                                  </span>
                                  <div>
                                    <span className="block text-xs font-black">Deck Settings</span>
                                    <span className="block text-[10px] text-slate-400 font-medium">Cài đặt bộ thẻ</span>
                                  </div>
                                </div>
                                {isActive && settingsScope === 'deck' && (
                                  <Check className="w-4 h-4 text-indigo-600" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectScope('personal')}
                                className={cn(
                                  "w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                  isActive && settingsScope === 'personal'
                                    ? "bg-orange-50 text-orange-950 font-black"
                                    : "hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                  </span>
                                  <div>
                                    <span className="block text-xs font-black">My Settings</span>
                                    <span className="block text-[10px] text-slate-400 font-medium">Cài đặt cá nhân</span>
                                  </div>
                                </div>
                                {isActive && settingsScope === 'personal' && (
                                  <Check className="w-4 h-4 text-orange-600" />
                                )}
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 py-1.5 px-3.5 rounded-xl text-xs lg:text-sm font-bold transition-all select-none cursor-pointer",
                      isActive ? "text-orange-600 font-extrabold" : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktopDeckDetailTabPill"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 relative z-10 shrink-0", isActive ? "text-orange-500 stroke-[2.2]" : "text-slate-400 stroke-[1.8]")} />
                    <span className="relative z-10">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MOBILE TOP TAB SWITCHER (Directly below Header) ═══════════ */}
      <div className="md:hidden shrink-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-200/70 px-2.5 py-1.5 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-2xs gap-0.5">
          {visibleTabs.map((tab) => {
            const isSettingsTab = tab.id === 'settings'
            const Icon = isSettingsTab ? getSettingsTabIcon() : tab.icon
            const label = isSettingsTab ? getSettingsTabLabel() : tab.label
            const isActive = activeTab === tab.id

            if (isSettingsTab && isOwner) {
              return (
                <div key={tab.id} className="relative flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
                    className={cn(
                      "relative w-full flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
                      isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDeckDetailTopTabPill"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <Icon className={cn("w-3.5 h-3.5 shrink-0 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
                    <span className="relative z-10 text-[10.5px] sm:text-xs font-black tracking-tight whitespace-nowrap">{label}</span>
                    <ChevronDown className={cn("w-2.5 h-2.5 shrink-0 relative z-10 text-slate-400 transition-transform duration-200", isSettingsMenuOpen && "rotate-180")} />
                  </button>

                  {/* Dropdown Menu (Pops DOWNWARDS on Mobile because it's at the top!) */}
                  <AnimatePresence>
                    {isSettingsMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.12 }}
                          className="absolute top-full mt-2 right-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 min-w-[210px] z-50 space-y-1 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectScope('deck')}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                              isActive && settingsScope === 'deck'
                                ? "bg-indigo-50 text-indigo-900 font-black"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                                <SettingsIcon className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="block text-xs font-black">Deck Settings</span>
                                <span className="block text-[10px] text-slate-400 font-medium">Cài đặt bộ thẻ</span>
                              </div>
                            </div>
                            {isActive && settingsScope === 'deck' && (
                              <Check className="w-4 h-4 text-indigo-600" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectScope('personal')}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                              isActive && settingsScope === 'personal'
                                ? "bg-orange-50 text-orange-950 font-black"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="block text-xs font-black">My Settings</span>
                                <span className="block text-[10px] text-slate-400 font-medium">Cài đặt cá nhân</span>
                              </div>
                            </div>
                            {isActive && settingsScope === 'personal' && (
                              <Check className="w-4 h-4 text-orange-600" />
                            )}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "relative flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDeckDetailTopTabPill"
                    className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Icon className={cn("w-3.5 h-3.5 shrink-0 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span className="relative z-10 text-[10.5px] sm:text-xs font-black tracking-tight whitespace-nowrap">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══════════ TAB CONTENT AREA (INTERNAL SCROLLABLE - FLEX-1) ═══════════ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
        <Suspense
          fallback={
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400">Đang tải tab {activeTab}...</p>
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && (
                <DeckOverviewTab embedded deckId={id} onNavigateTab={(t: string) => handleTabChange(t as DeckDetailTab)} />
              )}
              {activeTab === 'cards' && (
                <DeckCardsTab 
                  embedded 
                  deckId={id} 
                  currentPage={cardsPage}
                  onPageChange={setCardsPage}
                  onTotalPagesChange={setCardsTotalPages}
                  onSelectionChange={setHasCardSelection}
                  search={cardsSearch}
                  isQuickAddOpen={isQuickAddOpen}
                  onCloseQuickAdd={() => setIsQuickAddOpen(false)}
                  isBatchPasteOpen={isBatchPasteOpen}
                  onCloseBatchPaste={() => setIsBatchPasteOpen(false)}
                  isEditModalOpen={isEditModalOpen}
                  onCloseEditModal={() => setIsEditModalOpen(false)}
                />
              )}
              {activeTab === 'settings' && (
                <DeckSettingsTab embedded deckId={id} />
              )}
              {activeTab === 'roadmap' && (
                <DeckRoadmapTab embedded deckId={id} />
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>

      {/* ═══════════ FIXED ACTION & PAGINATION BAR (CHỈ HIỆN KHI Ở TAB CARDS - NẰM NGAY TRÊN 4 TABS) ═══════════ */}
      {activeTab === 'cards' && (() => {
        const metaTotalCount = deckMeta?.questions_count ?? 0
        const metaTotalPages = metaTotalCount > 0 ? Math.max(1, Math.ceil(metaTotalCount / 50)) : 1
        const effectiveTotalPages = Math.max(cardsTotalPages, metaTotalPages)

        return (
          <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3.5 sm:px-6 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
            <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center justify-between gap-2 min-h-[36px] px-3.5 sm:px-6 lg:px-8 xl:px-10">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 flex-1 animate-in fade-in duration-150">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Tìm từ vựng, kanji, nghĩa..."
                      value={cardsSearch}
                      onChange={(e) => setCardsSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-100/90 border border-indigo-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 shadow-inner"
                    />
                    {cardsSearch && (
                      <button
                        onClick={() => setCardsSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCardsSearch('')
                      setIsSearchOpen(false)
                    }}
                    className="h-8.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Đóng
                  </button>
                </div>
              ) : (
                <>
                  {/* Left: Pagination */}
                  <DeckPagination
                    currentPage={cardsPage}
                    totalPages={effectiveTotalPages}
                    onPageChange={setCardsPage}
                  />

                  {/* Right: Quick actions (Tìm kiếm, Thêm nhanh, Paste, Thêm chi tiết) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className={cn(
                        "h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                        cardsSearch
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                      )}
                      title="Tìm kiếm thẻ từ vựng"
                    >
                      <Search className="w-4 h-4" />
                    </button>

                    {isOwner && (
                      <>
                        <button
                          onClick={() => setIsQuickAddOpen(prev => !prev)}
                          className={cn(
                            "h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                            isQuickAddOpen
                              ? "bg-orange-500 border-orange-500 text-white shadow-orange-500/20"
                              : "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                          )}
                          title="Bật/tắt thanh thêm nhanh thẻ"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                        </button>

                        <button
                          onClick={() => setIsBatchPasteOpen(true)}
                          className="h-8.5 w-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                          title="Dán nhanh nhiều thẻ từ Excel / Google Sheets"
                        >
                          <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                        </button>

                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="h-8.5 w-8.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                          title="Thêm thẻ mới (đầy đủ chi tiết)"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ═══════════ DOCKED BOTTOM STUDY BAR (TWO STUDY BUTTONS: FLASHCARD & PRACTICE) ═══════════ */}
      {activeTab !== 'cards' && (
        <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3.5 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-lg mx-auto flex items-center gap-2.5">
            {/* 1. Flashcard Study Button (Split: 1-Tap Start | ▾ Mode Menu) */}
            <div className="flex-1 flex items-stretch rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 overflow-hidden">
              <button
                type="button"
                onClick={() => handleLaunchStudy('fsrs')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 pl-3 pr-2 font-black text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer truncate"
                title="Start FSRS Flashcards"
              >
                <Zap className="w-4 h-4 fill-current shrink-0 animate-pulse" />
                <span className="truncate">Flashcards</span>
                {dueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-black shrink-0">
                    {dueCount} due
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStudySheetType('flashcard')}
                className="px-2.5 flex items-center justify-center border-l border-white/20 hover:bg-white/15 active:bg-white/25 transition-all cursor-pointer shrink-0"
                title="Choose flashcard study mode"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Practice & Quiz Button (Split: 1-Tap Start | ▾ Mode Menu) */}
            <div className="flex-1 flex items-stretch rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 overflow-hidden">
              <button
                type="button"
                onClick={() => handleLaunchStudy('mcq')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 pl-3 pr-2 font-black text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer truncate"
                title="Start Practice Quiz"
              >
                <Target className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span className="truncate">Practice</span>
              </button>
              <button
                type="button"
                onClick={() => setStudySheetType('practice')}
                className="px-2.5 flex items-center justify-center border-l border-white/20 hover:bg-white/15 active:bg-white/25 transition-all cursor-pointer shrink-0"
                title="Choose practice test mode"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ FLASHCARD MODES BOTTOM SHEET ═══════════ */}
      <AnimatePresence>
        {studySheetType === 'flashcard' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setStudySheetType(null)}
            />

            {/* Modal Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 shadow-2xl p-4 sm:p-5 max-h-[85vh] flex flex-col z-10 text-left overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base shadow-2xs">
                    ⚡
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Flashcard Study Modes</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Select a spaced repetition or review method</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStudySheetType(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modes List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 custom-scrollbar pr-1">
                {STUDY_MODES.slice(0, 4).map((mode) => {
                  const isSelected = selectedStudyMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleLaunchStudy(mode.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.99]",
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-2xs",
                          isSelected ? "bg-white shadow-xs" : "bg-slate-100"
                        )}>
                          {mode.emoji}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 truncate">
                              {mode.fullName}
                            </span>
                            {mode.badge && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0",
                                mode.badgeColor || "bg-slate-100 text-slate-600"
                              )}>
                                {mode.badge(dueCount)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {mode.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════ PRACTICE MODES BOTTOM SHEET ═══════════ */}
      <AnimatePresence>
        {studySheetType === 'practice' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setStudySheetType(null)}
            />

            {/* Modal Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/90 shadow-2xl p-4 sm:p-5 max-h-[85vh] flex flex-col z-10 text-left overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base shadow-2xs">
                    🎯
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Practice & Quiz Tests</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Test your memory with interactive quizzes & exercises</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStudySheetType(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modes List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 custom-scrollbar pr-1">
                {STUDY_MODES.slice(4).map((mode) => {
                  const isSelected = selectedStudyMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleLaunchStudy(mode.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.99]",
                        isSelected
                          ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-2xs",
                          isSelected ? "bg-white shadow-xs" : "bg-slate-100"
                        )}>
                          {mode.emoji}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 truncate">
                              {mode.fullName}
                            </span>
                            {mode.badge && (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0",
                                mode.badgeColor || "bg-slate-100 text-slate-600"
                              )}>
                                {mode.badge(dueCount)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {mode.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DeckDetailPage
