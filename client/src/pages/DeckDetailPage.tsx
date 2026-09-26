import React, { useState, useRef, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
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
import { LearnModeModal } from '@/components/LearnModeModal'

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
    id: 'memrise',
    name: 'Memrise Mode',
    fullName: 'Memrise Deep Learning',
    emoji: '🌱',
    desc: 'Deep multi-stage word mastery: Plant & water step-by-step',
    badge: () => 'Deep Study',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    color: 'from-emerald-500 to-teal-600',
    getUrl: (id) => `/memrise/${id}/plant`
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
    id: 'listening_mcq',
    name: 'Listening MCQ',
    fullName: 'Audio Recognition',
    emoji: '🎧',
    desc: 'Audio pronunciation with multiple choices',
    badge: () => 'Audio MCQ',
    badgeColor: 'bg-sky-100 text-sky-700',
    color: 'from-sky-500 to-blue-600',
    getUrl: (id) => `/practice/${id}/listening_mcq`
  },
  {
    id: 'listening_typing',
    name: 'Listening Typing',
    fullName: 'Audio Dictation',
    emoji: '⌨️',
    desc: 'Audio pronunciation and exact spelling drill',
    badge: () => 'Dictation',
    badgeColor: 'bg-cyan-100 text-cyan-700',
    color: 'from-cyan-500 to-teal-600',
    getUrl: (id) => `/practice/${id}/listening_typing`
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
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false)

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
    const disabledModes: string[] = deckMeta?.practice_settings?.disabled_modes || []
    let targetId = modeId || selectedStudyMode
    if (disabledModes.includes(targetId)) {
      const fallback = ['fsrs', 'skim', 'memrise'].find(m => !disabledModes.includes(m)) || 'fsrs'
      targetId = fallback
    }
    const targetMode = STUDY_MODES.find(m => m.id === targetId) || STUDY_MODES[0]
    if (id) {
      setSelectedStudyMode(targetMode.id)
      setStudySheetType(null)
      navigate(targetMode.getUrl(id))
    }
  }

  const handleMainLearnClick = () => {
    const disabledModes: string[] = deckMeta?.practice_settings?.disabled_modes || []
    const configuredDefault = deckMeta?.practice_settings?.study_defaults?.quiz_learning_mode || 
                              deckMeta?.practice_settings?.study_defaults?.learning_mode || 'fsrs'
    const normalizedDefault = configuredDefault === 'speed_skim' ? 'skim' : configuredDefault
    const effectiveMode = disabledModes.includes(normalizedDefault)
      ? (['fsrs', 'skim', 'memrise'].find(m => !disabledModes.includes(m)) || 'fsrs')
      : normalizedDefault

    handleLaunchStudy(effectiveMode)
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

  const handleTabChange = (tab: DeckDetailTab, additionalParams?: Record<string, string>) => {
    if (tab === 'settings' && isOwner && !additionalParams) {
      setIsSettingsMenuOpen((prev) => !prev)
      return
    }
    setIsSettingsMenuOpen(false)
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      updated.set('tab', tab)
      if (additionalParams) {
        Object.entries(additionalParams).forEach(([k, v]) => updated.set(k, v))
      }
      return updated
    }, { replace: true })
  }

  // Touch swipe handling for horizontal tab navigation
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY

    // Swipe left/right with minimum distance and horizontal dominance
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      const tabOrder: DeckDetailTab[] = isOwner 
        ? ['overview', 'cards', 'roadmap', 'settings'] 
        : ['overview', 'cards', 'roadmap']
      const currentIndex = tabOrder.indexOf(activeTab)
      if (diffX > 0 && currentIndex < tabOrder.length - 1) {
        // Swiped left -> Next tab
        if (navigator.vibrate) navigator.vibrate(8)
        const nextTab = tabOrder[currentIndex + 1]
        setIsSettingsMenuOpen(false)
        setSearchParams((prev) => {
          const updated = new URLSearchParams(prev)
          updated.set('tab', nextTab)
          return updated
        }, { replace: true })
      } else if (diffX < 0 && currentIndex > 0) {
        // Swiped right -> Previous tab
        if (navigator.vibrate) navigator.vibrate(8)
        const prevTab = tabOrder[currentIndex - 1]
        setIsSettingsMenuOpen(false)
        setSearchParams((prev) => {
          const updated = new URLSearchParams(prev)
          updated.set('tab', prevTab)
          return updated
        }, { replace: true })
      }
    }
    touchStartX.current = null
    touchStartY.current = null
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
    <div className="fixed inset-0 top-0 bottom-0 md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] dark:bg-[#0b0f19] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER (SHRINK-0) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-slate-200/70 dark:border-slate-800 shadow-2xs">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between pt-2.5 pb-2.5 gap-3">
            {/* Left: Back Button & Deck Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => navigate('/decks')}
                className="w-8.5 h-8.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
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
                                    <span className="block text-[10px] text-slate-400 font-medium">Deck configuration & visibility</span>
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
                                    <span className="block text-[10px] text-slate-400 font-medium">Your personal study preferences</span>
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

      <LearnModeModal isOpen={isLearnModalOpen} onClose={() => setIsLearnModalOpen(false)} deckId={id || ''} />

      {/* ═══════════ TAB CONTENT AREA (INTERNAL SCROLLABLE - FLEX-1 WITH TOUCH SWIPE) ═══════════ */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto custom-scrollbar pb-4"
      >
        <Suspense
          fallback={
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400">Loading {activeTab}...</p>
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
                <DeckOverviewTab embedded deckId={id} onNavigateTab={(t: string, params?: Record<string, string>) => handleTabChange(t as DeckDetailTab, params)} />
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

      {/* ═══════════ FIXED ACTION & PAGINATION BAR (ONLY SHOWN IN CARDS TAB) ═══════════ */}
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
                      placeholder="Search words, kanji, meaning..."
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
                    Close
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

                  {/* Right: Quick actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className={cn(
                        "h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                        cardsSearch
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                      )}
                      title="Search flashcards"
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
                          title="Toggle quick add bar"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                        </button>

                        <button
                          onClick={() => setIsBatchPasteOpen(true)}
                          className="h-8.5 w-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                          title="Batch paste cards from Excel / Google Sheets"
                        >
                          <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                        </button>

                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="h-8.5 w-8.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                          title="Add new card (full details)"
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
        <div className="shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800 px-3.5 sm:px-6 lg:px-8 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center gap-2.5">
            {/* 1. Learn Button (1-Tap Launch Default Mode | ▾ Open Sheet) */}
            <div className="flex-1 flex items-stretch rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 overflow-hidden">
              <button
                type="button"
                onClick={handleMainLearnClick}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 pl-3 pr-2 font-black text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer truncate"
                title="Start Learning"
              >
                <Zap className="w-4 h-4 fill-current shrink-0 animate-pulse" />
                <span className="truncate">Learn</span>
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
            {(() => {
              const disabledModes: string[] = deckMeta?.practice_settings?.disabled_modes || []
              const activePracticeModes = STUDY_MODES.slice(3).filter(m => !disabledModes.includes(m.id))
              if (activePracticeModes.length === 0) return null

              const defaultPracticeMode = activePracticeModes[0].id

              return (
                <div className="flex-1 flex items-stretch rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleLaunchStudy(defaultPracticeMode)}
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
              )
            })()}
          </div>
        </div>
      )}

      {/* ═══════════ MOBILE DOCKED TAB SWITCHER (4 Tabs in Natural Thumb Reach) ═══════════ */}
      <div className="md:hidden shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/70 dark:border-slate-800 px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-2xs">
        <div className="max-w-md mx-auto flex items-center w-full bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs gap-0.5">
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
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDeckDetailMobileBottomTabPill"
                        className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-600"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <Icon className={cn("w-3.5 h-3.5 shrink-0 relative z-10", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                    <span className="relative z-10 text-[10.5px] font-black tracking-tight whitespace-nowrap">{label}</span>
                    <ChevronDown className={cn("w-2.5 h-2.5 shrink-0 relative z-10 text-slate-400 transition-transform duration-200", isSettingsMenuOpen && "rotate-180")} />
                  </button>

                  {/* Dropdown Menu (Pops UPWARDS because it's docked at the bottom!) */}
                  <AnimatePresence>
                    {isSettingsMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.12 }}
                          className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-1.5 min-w-[210px] z-50 space-y-1 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectScope('deck')}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                              isActive && settingsScope === 'deck'
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-black"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-indigo-100/70 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <SettingsIcon className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="block text-xs font-black">Deck Settings</span>
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-medium">Deck configuration & visibility</span>
                              </div>
                            </div>
                            {isActive && settingsScope === 'deck' && (
                              <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectScope('personal')}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                              isActive && settingsScope === 'personal'
                                ? "bg-orange-50 dark:bg-orange-950/60 text-orange-950 dark:text-orange-200 font-black"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="block text-xs font-black">My Settings</span>
                                <span className="block text-[10px] text-slate-400 font-medium">Your personal study preferences</span>
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
                    layoutId="activeDeckDetailMobileBottomTabPill"
                    className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Icon className={cn("w-3.5 h-3.5 shrink-0 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span className="relative z-10 text-[10.5px] font-black tracking-tight whitespace-nowrap">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══════════ FLASHCARD MODES BOTTOM SHEET ═══════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {studySheetType === 'flashcard' && (
            <div className="fixed inset-0 z-[300] flex items-end justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                onClick={() => setStudySheetType(null)}
              />

              {/* Modal Sheet */}
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-4 sm:p-5 max-h-[85vh] flex flex-col z-10 text-left overflow-hidden pb-[max(1.75rem,env(safe-area-inset-bottom))]"
              >
                <div className="w-full max-w-2xl mx-auto flex flex-col flex-1 min-h-0">
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
                    {(() => {
                      const disabledModes: string[] = deckMeta?.practice_settings?.disabled_modes || []
                      const activeLearnModes = STUDY_MODES.slice(0, 3).filter(m => !disabledModes.includes(m.id))

                      if (activeLearnModes.length === 0) {
                        return (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                            <p className="text-xs text-amber-800 font-bold">
                              All learning modes have been disabled for this deck by the creator.
                            </p>
                          </div>
                        )
                      }

                      return activeLearnModes.map((mode) => {
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
                      })
                    })()}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ═══════════ PRACTICE MODES BOTTOM SHEET ═══════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {studySheetType === 'practice' && (
            <div className="fixed inset-0 z-[300] flex items-end justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                onClick={() => setStudySheetType(null)}
              />

              {/* Modal Sheet */}
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-4 sm:p-5 max-h-[85vh] flex flex-col z-10 text-left overflow-hidden pb-[max(1.75rem,env(safe-area-inset-bottom))]"
              >
                <div className="w-full max-w-2xl mx-auto flex flex-col flex-1 min-h-0">
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
                    {(() => {
                      const disabledModes: string[] = deckMeta?.practice_settings?.disabled_modes || []
                      const activePracticeModes = STUDY_MODES.slice(3).filter(m => !disabledModes.includes(m.id))

                      if (activePracticeModes.length === 0) {
                        return (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                            <p className="text-xs text-amber-800 font-bold">
                              All practice modes have been disabled for this deck.
                            </p>
                          </div>
                        )
                      }

                      return activePracticeModes.map((mode) => {
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
                      })
                    })()}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

export default DeckDetailPage
