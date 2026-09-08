import React from 'react'
import { 
  BookOpen, 
  ChevronRight, 
  Flame, 
  Sparkles,
  Layers,
  Trophy,
  Play,
  Brain,
  SlidersHorizontal,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardQuickDecksWidgetProps {
  todayReview?: any
  activeDecks: any[]
  allDecksCount?: number
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  onJoinRoom?: (code: string) => void
  isJoiningRoom?: boolean
  navigate: (url: string) => void
  displayMode?: 'shortcuts' | 'grid' | 'compact'
  onOpenCustomize?: () => void
}

const DECK_PALETTES = [
  {
    theme: 'orange',
    avatarBg: 'bg-gradient-to-br from-orange-100 to-amber-100',
    cardBorder: 'border-orange-200/80 hover:border-orange-300',
    barFill: 'bg-gradient-to-r from-orange-400 to-amber-500',
    mascotImage: '/mascot/mascot_flame_sakura.jpg',
    accent: 'text-orange-600'
  },
  {
    theme: 'purple',
    avatarBg: 'bg-gradient-to-br from-indigo-100 to-purple-100',
    cardBorder: 'border-indigo-200/80 hover:border-indigo-300',
    barFill: 'bg-gradient-to-r from-indigo-400 to-purple-500',
    mascotImage: '/mascot/mascot_fox_reading.jpg',
    accent: 'text-indigo-600'
  },
  {
    theme: 'green',
    avatarBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
    cardBorder: 'border-emerald-200/80 hover:border-emerald-300',
    barFill: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    mascotImage: '/mascot/mascot_leaf_spirit.jpg',
    accent: 'text-emerald-600'
  },
  {
    theme: 'blue',
    avatarBg: 'bg-gradient-to-br from-sky-100 to-blue-100',
    cardBorder: 'border-sky-200/80 hover:border-sky-300',
    barFill: 'bg-gradient-to-r from-sky-400 to-blue-500',
    mascotImage: '/mascot/mascot_flame_sakura.jpg',
    accent: 'text-sky-600'
  }
]

export function DashboardQuickDecksWidget({
  activeDecks,
  allDecksCount = 0,
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: DashboardQuickDecksWidgetProps) {
  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden text-left select-none relative">
      {/* ═══════════ TOP HEADER: LEARNING TITLE ═══════════ */}
      <div className="flex items-center justify-between px-1 pt-0.5 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shadow-2xs">
            <BookOpen className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none italic uppercase">
                Study Decks
              </h3>
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                {activeDecks.length} Active
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Select a deck to start learning or practicing
            </p>
          </div>
        </div>

        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-slate-900 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Configure pinned decks"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Manage</span>
          </button>
        )}
      </div>

      {/* ═══════════ SCROLLABLE DECK SELECTION LIST ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
        {activeDecks.length === 0 ? (
          <div className="py-12 text-center bg-white/90 backdrop-blur-xs rounded-3xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center gap-3 p-6 shadow-xs my-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-100 via-orange-100 to-rose-100 text-orange-600 flex items-center justify-center text-2xl shadow-sm border border-orange-200/70">
              🎴
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                No Pinned Decks Yet ✨
              </h4>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                Customize your home shortcuts or enroll in new decks from the library!
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Manage Shortcuts
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/decks?tab=library')}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
              >
                Browse Library →
              </button>
            </div>
          </div>
        ) : (
          activeDecks.map((deck, idx) => {
            const deckId = deck.deck_id ?? deck.id
            const learned = deck.learned_cards || 0
            const total = deck.total_cards || deck.questions_count || 0
            const pct = deck.total_pct !== undefined 
              ? deck.total_pct 
              : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)
            
            const newRem = deck.new_remaining || 0
            const revRem = deck.review_remaining || 0
            const palette = DECK_PALETTES[idx % DECK_PALETTES.length]
            const mascotSrc = deck.cover_image || palette.mascotImage

            return (
              <div
                key={deckId}
                className={cn(
                  "bg-white rounded-3xl p-3 sm:p-3.5 border transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col gap-2.5",
                  palette.cardBorder
                )}
              >
                {/* Upper Row: Avatar + Title & Stats */}
                <div 
                  onClick={() => navigate(`/decks/${deckId}`)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  {/* Deck Mascot / Avatar */}
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xs border border-white/80 group-hover:scale-105 transition-transform",
                      palette.avatarBg
                    )}>
                      <img
                        src={mascotSrc}
                        alt={deck.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = palette.mascotImage;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-tight truncate group-hover:text-orange-600 transition-colors">
                        {deck.title}
                      </h4>
                      {deck.level && (
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black shrink-0">
                          {deck.level}
                        </span>
                      )}
                    </div>

                    {/* Word counts & Progress % */}
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mt-1">
                      <span>{learned}/{total} words</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-600 font-extrabold">{pct}%</span>
                      {revRem > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-orange-600 font-black flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                            {revRem} due
                          </span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full mt-1.5">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", palette.barFill)}
                        style={{ width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Lower Row: Direct 1-Tap Action Keys */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100/90">
                  {/* Key 1: Flashcard */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (navigator.vibrate) navigator.vibrate(8)
                      onOpenStudyModal(deck, 'flashcard')
                    }}
                    className="flex-1 h-9 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs tracking-wide shadow-xs shadow-orange-500/20 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Study Flashcards (FSRS)"
                  >
                    <Brain className="w-3.5 h-3.5 shrink-0" />
                    <span>Flashcard</span>
                    {revRem > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-black">
                        {revRem}
                      </span>
                    )}
                  </button>

                  {/* Key 2: Practice */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (navigator.vibrate) navigator.vibrate(8)
                      onOpenStudyModal(deck, 'practice')
                    }}
                    className="flex-1 h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/70 font-black text-xs tracking-wide shadow-2xs active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Practice Quiz & Typing"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Practice</span>
                  </button>

                  {/* Quick Detail Link */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/decks/${deckId}`)
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                    title="View deck details"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════════ SUBTLE BOTTOM FOOTER BAR ═══════════ */}
      {activeDecks.length > 0 && (
        <div className="pt-2 pb-0.5 flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 border-t border-slate-200/60 flex-shrink-0">
          <span>{activeDecks.length} of {allDecksCount || activeDecks.length} shortcuts shown</span>
          <button
            type="button"
            onClick={() => navigate('/decks')}
            className="text-orange-600 hover:underline font-black cursor-pointer"
          >
            All Decks →
          </button>
        </div>
      )}
    </div>
  )
}



