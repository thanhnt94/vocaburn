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
  Plus
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

export type DeckDetailTab = 'overview' | 'cards' | 'settings' | 'roadmap'

export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAppStore()

  // Cards Pagination & Search State (Controlled from detail page)
  const [cardsPage, setCardsPage] = useState(1)
  const [cardsTotalPages, setCardsTotalPages] = useState(1)
  const [hasCardSelection, setHasCardSelection] = useState(false)
  const [cardsSearch, setCardsSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Modals state controlled from fixed action bar
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isBatchPasteOpen, setIsBatchPasteOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const currentTabParam = searchParams.get('tab') as DeckDetailTab
  const activeTab: DeckDetailTab = ['overview', 'cards', 'settings', 'roadmap'].includes(currentTabParam)
    ? currentTabParam
    : 'overview'

  // Fetch basic deck metadata to determine role & display header
  const { data: deckMeta, isLoading: isMetaLoading } = useQuery({
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

  const handleTabChange = (tab: DeckDetailTab) => {
    setSearchParams({ tab }, { replace: true })
  }

  const allTabs: { id: DeckDetailTab; label: string; icon: React.ComponentType<{ className?: string }>; ownerOnly?: boolean }[] = [
    { id: 'overview', label: 'Tổng quan', icon: BookOpen },
    { id: 'cards', label: 'Thẻ từ', icon: Layers },
    { id: 'roadmap', label: 'Lộ trình', icon: Compass },
    { id: 'settings', label: 'Cài đặt', icon: SettingsIcon, ownerOnly: true },
  ]

  const visibleTabs = allTabs.filter(t => !t.ownerOnly || isOwner)

  return (
    <div className="fixed inset-0 top-0 bottom-[60px] md:relative md:inset-auto md:top-auto md:bottom-auto md:min-h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER (SHRINK-0) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between pt-2.5 pb-2.5 gap-2">
            {/* Left: Back Button & Deck Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                onClick={() => navigate('/decks')}
                className="w-8.5 h-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                title="Quay lại danh sách bộ thẻ"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-base shrink-0 overflow-hidden shadow-sm shadow-indigo-500/20">
                  {deckMeta?.cover_image ? (
                    <img src={deckMeta.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>🎴</span>
                  )}
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">
                    {deckMeta?.title || 'Đang tải bộ thẻ...'}
                  </h1>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <span className="text-indigo-600 font-extrabold">{deckMeta?.questions_count ?? '--'} thẻ</span>
                    {deckMeta?.creator_name && (
                      <>
                        <span>•</span>
                        <span className="text-slate-600 truncate max-w-[120px]">
                          @{deckMeta.creator_name}{isOriginalCreator ? ' (Bạn)' : ''}
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

            {/* Right: Start Learning CTA */}
            <div className="flex items-center gap-1.5 shrink-0">
              {id && (
                <Link
                  to={`/flashcard/${id}/play`}
                  className="flex items-center gap-1.5 px-3.5 h-8.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Học ngay</span>
                </Link>
              )}
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
              {activeTab === 'settings' && isOwner && (
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
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 min-h-[36px]">
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

      {/* ═══════════ ONE-HAND BOTTOM DOCKED TAB BAR (4 TABS CĂN CHÍNH GIỮA) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3 sm:px-6 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-sm sm:max-w-md mx-auto flex items-center justify-center">
          {/* Tabs Segmented Switcher */}
          <div className="grid grid-flow-col auto-cols-fr w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
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
                  <span className="relative z-10 text-[11px] sm:text-xs truncate">{tab.label}</span>
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
