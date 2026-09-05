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
  Check
} from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { DeckPagination } from '@/components/deck/DeckPagination'

// Lazy load tab components for optimal performance
const DeckOverviewTab = lazy(() => import('@/components/deck/tabs/DeckOverviewTab'))
const DeckCardsTab = lazy(() => import('@/components/deck/tabs/DeckCardsTab'))
const DeckSettingsTab = lazy(() => import('@/components/deck/tabs/DeckSettingsTab'))
const DeckRoadmapTab = lazy(() => import('@/components/deck/tabs/DeckRoadmapTab'))

export type DeckDetailTab = 'overview' | 'cards' | 'roadmap' | 'settings'

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
                    <img src={deckMeta.cover_image} alt="" className="w-full h-full object-cover" />
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

            {/* Right: Start Learning CTA */}
            <div className="flex items-center gap-1.5 shrink-0">
              {id && (() => {
                const targetMode = deckMeta?.practice_settings?.study_defaults?.learning_mode || deckMeta?.default_mode || 'fsrs'
                let targetUrl = `/flashcard/${id}/play?mode=fsrs`
                if (targetMode === 'mcq') targetUrl = `/practice/${id}/mcq`
                else if (targetMode === 'typing') targetUrl = `/practice/${id}/typing`
                else if (targetMode === 'listening') targetUrl = `/practice/${id}/listening`
                else if (targetMode === 'roadmap') targetUrl = `/flashcard/${id}/play?mode=roadmap`
                else if (targetMode === 'flip') targetUrl = `/flashcard/${id}/play?mode=flip`
                else if (targetMode === 'new') targetUrl = `/flashcard/${id}/play?mode=new`
                else if (targetMode === 'review') targetUrl = `/flashcard/${id}/play?mode=review`

                return (
                  <Link
                    to={targetUrl}
                    className="flex items-center gap-1.5 px-3.5 h-8.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Study Now</span>
                  </Link>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TAB CONTENT AREA (INTERNAL SCROLLABLE - FLEX-1) ═══════════ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
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

      {/* ═══════════ ONE-HAND BOTTOM DOCKED TAB BAR (MOBILE ONLY) ═══════════ */}
      <div className="md:hidden shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3 sm:px-6 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-sm sm:max-w-md mx-auto flex items-center justify-center">
          {/* Tabs Segmented Switcher */}
          <div className="grid grid-flow-col auto-cols-fr w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
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
                        "relative w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
                        isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeDeckDetailBottomTabPill"
                          className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        />
                      )}
                      <Icon className={cn("w-3.5 h-3.5 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
                      <span className="relative z-10 text-[11px] sm:text-xs truncate">{label}</span>
                      <ChevronDown className={cn("w-2.5 h-2.5 relative z-10 text-slate-400 transition-transform duration-200", isSettingsMenuOpen && "rotate-180")} />
                    </button>

                    {/* Pull Dropdown Menu (Pops Upwards on Mobile) */}
                    <AnimatePresence>
                      {isSettingsMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSettingsMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute bottom-full mb-3 right-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 min-w-[210px] z-50 space-y-1 text-left"
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
                    "relative flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
                    isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDeckDetailBottomTabPill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <Icon className={cn("w-3.5 h-3.5 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
                  <span className="relative z-10 text-[11px] sm:text-xs truncate">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeckDetailPage
