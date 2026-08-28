import React, { Suspense, lazy, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ChevronLeft, 
  BookOpen, 
  Layers, 
  Settings as SettingsIcon, 
  Compass, 
  Sparkles,
  Lock,
  Globe
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { DeckPagination } from '@/components/deck'

// Lazy load child sub-page tabs from modular deck package
const DeckOverviewTab = lazy(() => import('@/components/deck/tabs/DeckOverviewTab'))
const DeckCardsTab = lazy(() => import('@/components/deck/tabs/DeckCardsTab'))
const DeckRoadmapTab = lazy(() => import('@/components/deck/tabs/DeckRoadmapTab'))
const DeckSettingsTab = lazy(() => import('@/components/deck/tabs/DeckSettingsTab'))

export type DeckDetailTab = 'overview' | 'cards' | 'settings' | 'roadmap'

export default function DeckDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAppStore()

  // Cards Pagination State (controlled from detail page)
  const [cardsPage, setCardsPage] = useState(1)
  const [cardsTotalPages, setCardsTotalPages] = useState(1)
  const [hasCardSelection, setHasCardSelection] = useState(false)

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
    (user && deckMeta?.owner_id === user.id) ||
    (user?.role === 'admin')
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
          <div className="flex items-center justify-between pt-2.5 pb-2.5">
            {/* Left: Back Button & Deck Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => navigate('/decks')}
                className="w-8.5 h-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                title="Quay lại danh sách bộ thẻ"
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
                    {deckMeta?.title || 'Đang tải bộ thẻ...'}
                  </h1>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                    <span className="text-indigo-600 font-extrabold">{deckMeta?.questions_count ?? '--'} thẻ</span>
                    {deckMeta?.creator_name && (
                      <>
                        <span>•</span>
                        <span className="text-slate-600 truncate max-w-[120px]">
                          @{deckMeta.creator_name}{isOwner ? ' (Bạn)' : ''}
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

            {/* Quick Action: Start Learning CTA */}
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

      {/* ═══════════ DRAGGABLE FLOATING PAGINATION ("NÚT BAY BAY KÉO THẢ ĐƯỢC") ═══════════ */}
      <AnimatePresence>
        {activeTab === 'cards' && !hasCardSelection && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-[72px] md:bottom-20 right-3 sm:right-6 z-40 touch-none cursor-grab active:cursor-grabbing"
            title="Kéo thả để di chuyển vị trí bất kỳ"
          >
            <DeckPagination
              currentPage={cardsPage}
              totalPages={cardsTotalPages}
              onPageChange={setCardsPage}
              className="bg-white/95 backdrop-blur-xl shadow-xl border border-slate-200/90 rounded-2xl p-1 shadow-indigo-500/15"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ ONE-HAND BOTTOM DOCKED CONTROL BAR (4 TABS CĂN CHÍNH GIỮA) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3 sm:px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-sm sm:max-w-md mx-auto flex items-center justify-center">
          {/* Tabs Segmented Switcher (Thumb Zone) */}
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
