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
  Globe,
  Share2,
  Trophy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

// Lazy load child sub-pages
const FlashcardDetail = lazy(() => import('./FlashcardDetail'))
const EditFlashcards = lazy(() => import('./EditFlashcards'))
const EditFlashcard = lazy(() => import('./EditFlashcard'))
const DeckRoadmap = lazy(() => import('./DeckRoadmap'))

export type DeckDetailTab = 'overview' | 'cards' | 'settings' | 'roadmap'

export default function DeckDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAppStore()

  const currentTabParam = searchParams.get('tab') as DeckDetailTab
  const activeTab: DeckDetailTab = ['overview', 'cards', 'settings', 'roadmap'].includes(currentTabParam)
    ? currentTabParam
    : 'overview'

  // Fetch basic deck metadata to determine role & display header (shares cache with FlashcardDetail)
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
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'cards', label: 'Cards', icon: Layers },
    { id: 'roadmap', label: 'Roadmap', icon: Compass },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, ownerOnly: true },
  ]

  const visibleTabs = allTabs.filter(t => !t.ownerOnly || isOwner)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="sticky top-0 md:top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row: Back Button & Deck Info */}
          <div className="flex items-center justify-between pt-2.5 pb-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate('/decks')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all active:scale-95 shrink-0"
                title="Back to all decks"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Decks</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
                  {deckMeta?.cover_image ? (
                    <img src={deckMeta.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>🎴</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">
                    {deckMeta?.title || 'Loading Deck...'}
                  </h1>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <span>{deckMeta?.questions_count ?? '--'} cards</span>
                    {deckMeta?.is_public !== undefined && (
                      <span className="flex items-center gap-0.5 text-slate-400">
                        {deckMeta.is_public ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        {deckMeta.is_public ? 'Public' : 'Private'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action: Start Learning */}
            {id && (
              <Link
                to={`/flashcard/${id}/play`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-xs active:scale-95 transition-all shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Study</span>
              </Link>
            )}
          </div>

          {/* Bottom Row: Tab Pills */}
          <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shrink-0">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all shrink-0 select-none",
                      isActive
                        ? "text-indigo-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDeckDetailTabPill"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <Icon className={cn("w-3.5 h-3.5 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TAB CONTENT AREA ═══════════ */}
      <div className="w-full">
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
                <FlashcardDetail embedded deckId={id} onNavigateTab={(t: string) => handleTabChange(t as DeckDetailTab)} />
              )}
              {activeTab === 'cards' && (
                <EditFlashcards embedded deckId={id} />
              )}
              {activeTab === 'settings' && isOwner && (
                <EditFlashcard embedded deckId={id} />
              )}
              {activeTab === 'roadmap' && (
                <DeckRoadmap embedded deckId={id} />
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>
    </div>
  )
}
