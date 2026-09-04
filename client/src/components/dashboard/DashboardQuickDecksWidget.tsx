import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Layers, 
  Search, 
  Brain, 
  Trophy, 
  ChevronRight, 
  BookOpen, 
  Plus, 
  Swords, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Zap,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardQuickDecksWidgetProps {
  todayReview: any
  activeDecks: any[]
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  onJoinRoom: (code: string) => void
  isJoiningRoom?: boolean
  navigate: (url: string) => void
}

export function DashboardQuickDecksWidget({
  todayReview,
  activeDecks,
  onOpenStudyModal,
  onJoinRoom,
  isJoiningRoom = false,
  navigate
}: DashboardQuickDecksWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roomCode, setRoomCode] = useState('')

  const filteredDecks = useMemo(() => {
    if (!searchTerm.trim()) return activeDecks
    const q = searchTerm.toLowerCase()
    return activeDecks.filter(d => d.title?.toLowerCase().includes(q))
  }, [activeDecks, searchTerm])

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) return
    onJoinRoom(roomCode.trim().toUpperCase())
  }

  const dueCount = todayReview?.due_cards_count || 0
  const estMinutes = todayReview?.estimated_minutes || 0
  const streakAtRisk = todayReview?.streak_at_risk || false

  return (
    <div className="h-full w-full flex flex-col gap-3 overflow-hidden text-left select-none">
      {/* ═══════════ CARD 1: QUICK FSRS REVIEW ALERT ═══════════ */}
      {dueCount > 0 ? (
        <div className="rounded-2xl p-3.5 bg-slate-900 text-white border border-indigo-500/25 shadow-sm relative overflow-hidden flex-shrink-0">
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

      {/* ═══════════ CARD 2: MY ACTIVE DECKS HUB ═══════════ */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden text-left">
        {/* Header with Search & Link */}
        <div className="flex flex-col gap-2.5 pb-2.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-500 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider leading-none">
                  My Decks
                </h3>
                <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                  {activeDecks.length} active learning sets
                </span>
              </div>
            </div>

            <Link
              to="/decks?tab=library"
              className="text-[10px] font-black text-orange-600 hover:text-orange-700 flex items-center gap-0.5 uppercase tracking-wider transition-colors"
            >
              <span>Library</span>
              <ChevronRight className="w-3 h-3 stroke-[2.5]" />
            </Link>
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search active decks..."
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

        {/* Scrollable Decks List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mt-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
          {filteredDecks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
              {searchTerm ? `No decks matching "${searchTerm}"` : 'No active decks yet.'}
            </div>
          ) : (
            filteredDecks.map((deck) => {
              const learned = deck.learned_cards || 0
              const total = deck.total_cards || 0
              const pct = deck.total_pct !== undefined 
                ? deck.total_pct 
                : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)
              
              const newRem = deck.new_remaining || 0
              const revRem = deck.review_remaining || 0
              const hasDue = deck.has_due || (newRem > 0 || revRem > 0)

              return (
                <div
                  key={deck.deck_id}
                  className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-orange-200 hover:bg-orange-50/15 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Deck Info */}
                    <div 
                      onClick={() => navigate(`/decks/${deck.deck_id}`)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                          {deck.title}
                        </h4>
                        {hasDue && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                        )}
                      </div>

                      {/* Stats & Mini Progress Bar */}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1">
                        <span className="text-slate-600">
                          <strong className="text-slate-900">{learned}</strong>/{total} words
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-black">{pct}%</span>
                      </div>

                      {/* Progress Line */}
                      <div className="h-1 bg-slate-200/70 rounded-full overflow-hidden w-full mt-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Badges & Direct Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Due Pills */}
                      <div className="hidden sm:flex flex-col items-end gap-0.5 text-right mr-1">
                        {revRem > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200/60 text-[8px] font-black leading-none">
                            +{revRem} due
                          </span>
                        )}
                        {newRem > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200/60 text-[8px] font-black leading-none">
                            +{newRem} new
                          </span>
                        )}
                      </div>

                      {/* Flashcard Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenStudyModal(deck, 'flashcard')
                        }}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-orange-500 hover:text-white border border-slate-200 flex items-center justify-center text-slate-600 transition-all shadow-2xs cursor-pointer"
                        title="Study Flashcards"
                      >
                        <Brain className="w-3.5 h-3.5" />
                      </button>

                      {/* Practice Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenStudyModal(deck, 'practice')
                        }}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 flex items-center justify-center text-slate-600 transition-all shadow-2xs cursor-pointer"
                        title="Practice Quiz"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══════════ CARD 3: MULTIPLAYER ARENA ═══════════ */}
      <div className="rounded-2xl p-3 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/5 border border-purple-200/60 shadow-2xs flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Swords className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
              Multiplayer Arena
            </span>
          </div>
          <span className="text-[9px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
            Realtime
          </span>
        </div>

        <form onSubmit={handleRoomSubmit} className="flex items-center gap-2">
          <input
            type="text"
            maxLength={6}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ENTER ROOM CODE..."
            className="flex-1 h-8 bg-white border border-purple-200 rounded-xl px-2.5 text-[11px] font-black text-slate-800 placeholder:text-slate-400 placeholder:font-bold focus:border-purple-500 outline-none uppercase tracking-wider"
          />
          <button
            type="submit"
            disabled={!roomCode.trim() || isJoiningRoom}
            className={cn(
              "h-8 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs",
              roomCode.trim()
                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {isJoiningRoom ? "..." : "Join"}
          </button>
        </form>
      </div>
    </div>
  )
}
