import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Brain, 
  Trophy, 
  ChevronRight, 
  BookOpen, 
  CheckCircle2, 
  Flame, 
  SlidersHorizontal,
  Sparkles,
  Play,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardQuickDecksWidgetProps {
  todayReview: any
  activeDecks: any[]
  allDecksCount?: number
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  onJoinRoom?: (code: string) => void
  isJoiningRoom?: boolean
  navigate: (url: string) => void
  displayMode?: 'shortcuts' | 'grid' | 'compact'
  onOpenCustomize?: () => void
}

export function DashboardQuickDecksWidget({
  todayReview,
  activeDecks,
  allDecksCount = 0,
  onOpenStudyModal,
  navigate,
  displayMode = 'shortcuts',
  onOpenCustomize
}: DashboardQuickDecksWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDecks = useMemo(() => {
    if (!searchTerm.trim()) return activeDecks
    const q = searchTerm.toLowerCase()
    return activeDecks.filter(d => d.title?.toLowerCase().includes(q))
  }, [activeDecks, searchTerm])

  const dueCount = todayReview?.due_cards_count || 0
  const estMinutes = todayReview?.estimated_minutes || 0
  const streakAtRisk = todayReview?.streak_at_risk || false
  const totalAvailable = allDecksCount || activeDecks.length

  return (
    <div className="h-full w-full flex flex-col gap-3 overflow-hidden text-left select-none">
      {/* ═══════════ CARD 1: QUICK FSRS REVIEW ALERT ═══════════ */}
      {dueCount > 0 ? (
        <div className="rounded-2xl p-3 sm:p-3.5 bg-slate-900 text-white border border-indigo-500/25 shadow-sm relative overflow-hidden flex-shrink-0">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                  ⚡ FSRS REVIEW
                </span>
                {streakAtRisk && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/40 animate-pulse">
                    🔥 Streak at risk
                  </span>
                )}
                <span className="text-[9px] font-black text-slate-400">
                  ⏱️ ~{estMinutes} min
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate leading-snug">
                <span className="text-indigo-400">{dueCount} cards</span> due across decks
              </h3>
            </div>

            <button
              type="button"
              onClick={() => navigate('/flashcard/quick/play')}
              className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Quick Play</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 text-slate-800 border border-emerald-500/20 shadow-2xs flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 block w-fit">
                ALL CAUGHT UP
              </span>
              <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">
                No due cards for today! Excellent work! 🎉
              </p>
            </div>
          </div>
          <Link
            to="/decks?tab=library"
            className="text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 shrink-0 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            Library →
          </Link>
        </div>
      )}

      {/* ═══════════ CARD 2: MY SHORTCUT DECKS HUB ═══════════ */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden text-left">
        {/* Header with Search, Customize, & Library link */}
        <div className="flex flex-col gap-2.5 pb-2.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-none">
                  Quick Shortcuts
                </h3>
                <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                  {activeDecks.length} of {totalAvailable} pinned • 1-tap launchers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 flex items-center gap-1 text-[10px] font-black transition-all cursor-pointer active:scale-95 border border-slate-200/70"
                  title="Choose which decks to pin & customize display"
                >
                  <SlidersHorizontal className="w-3 h-3 text-orange-500" />
                  <span>Option</span>
                </button>
              )}

              <Link
                to="/decks?tab=library"
                className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                <span>Library</span>
                <ChevronRight className="w-3 h-3 stroke-[2.5]" />
              </Link>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search shortcut decks..."
              className="w-full h-8 bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:bg-white focus:border-orange-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Decks Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-2.5 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
          {filteredDecks.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/80 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl shadow-xs">
                ⚡
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  {searchTerm ? `No shortcuts matching "${searchTerm}"` : 'No Shortcut Decks Pinned'}
                </h4>
                <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                  {searchTerm 
                    ? 'Try searching for another deck title or reset search.'
                    : 'Choose your favorite vocabulary decks in Option to display them here for fast 1-tap study launching.'}
                </p>
              </div>
              {onOpenCustomize && !searchTerm && (
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="mt-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Choose Shortcut Decks</span>
                </button>
              )}
            </div>
          ) : displayMode === 'shortcuts' ? (
            /* ═══════════ STYLE 1: LUXURY TACTILE SHORTCUT CARDS (HERO VIEW) ═══════════ */
            <>
              {filteredDecks.map((deck) => {
                const deckId = deck.deck_id ?? deck.id
                const learned = deck.learned_cards || 0
                const total = deck.total_cards || deck.questions_count || 0
                const pct = deck.total_pct !== undefined 
                  ? deck.total_pct 
                  : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)
                
                const newRem = deck.new_remaining || 0
                const revRem = deck.review_remaining || 0
                const totalDue = revRem + newRem
                const hasDue = deck.has_due || totalDue > 0

                return (
                  <div
                    key={deckId}
                    className="group relative rounded-3xl bg-gradient-to-b from-white via-white to-orange-50/20 border border-slate-200/90 hover:border-orange-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(249,115,22,0.18)] transition-all duration-300 p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden text-left"
                  >
                    {/* Ambient Corner Glow Accent */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-orange-400/10 to-amber-300/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-indigo-500 opacity-90" />

                    {/* Top Deck Info Bar */}
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div 
                        onClick={() => navigate(`/decks/${deckId}`)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        {/* Deck Hero Icon / Cover Art */}
                        <div className="relative shrink-0">
                          {deck.cover_image ? (
                            <img
                              src={deck.cover_image}
                              alt={deck.title}
                              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-white shadow-md"
                            />
                          ) : (
                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 text-white flex items-center justify-center text-2xl font-black ring-2 ring-white shadow-md shadow-orange-500/25">
                              🎴
                            </div>
                          )}
                          {hasDue && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 ring-2 ring-white" />
                            </span>
                          )}
                        </div>

                        {/* Title & Word Counts */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug group-hover:text-orange-600 transition-colors truncate">
                            {deck.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold">
                              {learned}/{total} words
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={cn(
                              "font-black text-[11px]",
                              pct === 100 ? "text-emerald-600" : "text-orange-600"
                            )}>
                              {pct}% mastered
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Badge */}
                      <div className="shrink-0 pt-0.5">
                        {hasDue ? (
                          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 text-rose-600 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                            <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                            <span>{totalDue} due</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ready</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Review Metrics */}
                    <div className="space-y-1.5 relative z-10">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 rounded-full transition-all duration-700 shadow-xs"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                        <span>Cần ôn: <strong className="text-rose-600 font-black">{revRem}</strong></span>
                        <span>Từ mới: <strong className="text-amber-600 font-black">{newRem}</strong></span>
                        <span>Đã thuộc: <strong className="text-emerald-600 font-black">{learned}</strong></span>
                      </div>
                    </div>

                    {/* ═══════════ LARGE 1-TAP MODE SHORTCUT BUTTONS ═══════════ */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100/80 relative z-10">
                      {/* Flashcard Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenStudyModal(deck, 'flashcard')
                        }}
                        className="h-12 px-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/25 border border-white/20 flex items-center justify-between active:scale-[0.97] transition-all cursor-pointer group/btn"
                        title="Study Flashcard (FSRS / Leitner)"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                            <Brain className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-white leading-none truncate">Flashcard</span>
                            <span className="block text-[8px] font-bold text-amber-100/90 leading-none mt-1">FSRS Mode</span>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover/btn:translate-x-0.5 transition-transform">
                          <Play className="w-2.5 h-2.5 fill-white text-white translate-x-0.5" />
                        </div>
                      </button>

                      {/* Practice Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenStudyModal(deck, 'practice')
                        }}
                        className="h-12 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 hover:from-indigo-700 hover:to-purple-800 text-white shadow-md shadow-indigo-500/25 border border-white/20 flex items-center justify-between active:scale-[0.97] transition-all cursor-pointer group/btn"
                        title="Practice Quiz & Test"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                            <Trophy className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-white leading-none truncate">Practice</span>
                            <span className="block text-[8px] font-bold text-indigo-100/90 leading-none mt-1">Quiz & MCQ</span>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover/btn:translate-x-0.5 transition-transform">
                          <Play className="w-2.5 h-2.5 fill-white text-white translate-x-0.5" />
                        </div>
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Bottom Card to Manage / Reorder Shortcuts */}
              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="w-full py-3.5 px-4 rounded-3xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50/25 text-slate-500 hover:text-orange-600 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-2xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                  <span>Customize Shortcuts ({activeDecks.length} pinned of {totalAvailable})</span>
                </button>
              )}
            </>
          ) : displayMode === 'grid' ? (
            /* ═══════════ STYLE 2: APP GRID (2-COLUMN TILES) ═══════════ */
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {filteredDecks.map((deck) => {
                  const deckId = deck.deck_id ?? deck.id
                  const learned = deck.learned_cards || 0
                  const total = deck.total_cards || deck.questions_count || 0
                  const pct = deck.total_pct !== undefined 
                    ? deck.total_pct 
                    : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)
                  const revRem = deck.review_remaining || 0
                  const newRem = deck.new_remaining || 0
                  const totalDue = revRem + newRem
                  const hasDue = deck.has_due || totalDue > 0

                  return (
                    <div
                      key={deckId}
                      className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col justify-between gap-2 relative overflow-hidden group"
                    >
                      <div 
                        onClick={() => navigate(`/decks/${deckId}`)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-black">
                            🎴
                          </div>
                          {hasDue ? (
                            <span className="px-1.5 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-[9px] font-black flex items-center gap-0.5">
                              🔥 {totalDue}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200">
                              {pct}%
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors">
                          {deck.title}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">
                          {learned}/{total} words
                        </p>
                      </div>

                      {/* Compact Mode Launchers */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenStudyModal(deck, 'flashcard')
                          }}
                          className="py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-black flex items-center justify-center gap-1 border border-orange-200/60 active:scale-95 transition-all cursor-pointer"
                          title="Flashcard"
                        >
                          <Brain className="w-3 h-3" />
                          <span>Card</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenStudyModal(deck, 'practice')
                          }}
                          className="py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center gap-1 border border-indigo-200/60 active:scale-95 transition-all cursor-pointer"
                          title="Practice Quiz"
                        >
                          <Trophy className="w-3 h-3" />
                          <span>Quiz</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-orange-300 text-slate-500 hover:text-orange-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                  <span>Customize Shortcuts ({activeDecks.length} pinned)</span>
                </button>
              )}
            </>
          ) : (
            /* ═══════════ STYLE 3: COMPACT ROWS ═══════════ */
            <>
              <div className="space-y-2">
                {filteredDecks.map((deck) => {
                  const deckId = deck.deck_id ?? deck.id
                  const learned = deck.learned_cards || 0
                  const total = deck.total_cards || deck.questions_count || 0
                  const pct = deck.total_pct !== undefined 
                    ? deck.total_pct 
                    : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)
                  const revRem = deck.review_remaining || 0
                  const newRem = deck.new_remaining || 0
                  const totalDue = revRem + newRem
                  const hasDue = deck.has_due || totalDue > 0

                  return (
                    <div
                      key={deckId}
                      className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-orange-200 hover:bg-orange-50/15 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div 
                          onClick={() => navigate(`/decks/${deckId}`)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                              {deck.title}
                            </h4>
                            {hasDue && (
                              <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 text-[8px] font-black">
                                +{totalDue} due
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1">
                            <span>{learned}/{total} words</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-black">{pct}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenStudyModal(deck, 'flashcard')
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-orange-500 hover:text-white border border-slate-200 text-slate-700 text-[10px] font-black transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Brain className="w-3 h-3" />
                            <span>Card</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenStudyModal(deck, 'practice')
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 text-[10px] font-black transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Trophy className="w-3 h-3" />
                            <span>Quiz</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-orange-300 text-slate-500 hover:text-orange-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                  <span>Customize Shortcuts ({activeDecks.length} pinned)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
