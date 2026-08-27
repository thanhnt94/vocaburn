import React, { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FolderKanban, Globe, Upload, Plus, Layers, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Lazy load child tabs
const ManageFlashcards = lazy(() => import('./ManageFlashcards'))
const Library = lazy(() => import('./Library'))
const ImportFlashcard = lazy(() => import('./ImportFlashcard'))

export type DecksTabType = 'my-decks' | 'library' | 'import'

const TABS: { id: DecksTabType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: 'my-decks', label: 'My Decks', icon: FolderKanban, desc: 'Your personal flashcard collections' },
  { id: 'library', label: 'Library', icon: Globe, desc: 'Explore public community decks' },
  { id: 'import', label: 'Import', icon: Upload, desc: 'Import from Excel, CSV, or Text' },
]

export default function DecksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = (searchParams.get('tab') as DecksTabType) || 'my-decks'

  const activeTab: DecksTabType = TABS.some(t => t.id === currentTab) ? currentTab : 'my-decks'

  const handleTabChange = (tab: DecksTabType) => {
    setSearchParams({ tab }, { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ═══════════ TOP SEGMENTED TAB BAR ═══════════ */}
      <div className="sticky top-0 md:top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5">
            {/* Left: Tab Segmented Control */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all shrink-0 select-none",
                      isActive
                        ? "text-indigo-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDecksTabPill"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 relative z-10", isActive ? "text-indigo-600" : "text-slate-400")} />
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
              {activeTab === 'my-decks' && <ManageFlashcards embedded />}
              {activeTab === 'library' && <Library embedded />}
              {activeTab === 'import' && <ImportFlashcard embedded />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>
    </div>
  )
}
