import React from 'react'
import { Link } from 'react-router-dom'
import { 
  ChevronRight, 
  CheckCircle2, 
  Flame, 
  SlidersHorizontal,
  Play
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

const CUTE_EMOJIS = ['🎴', '🌸', '🦊', '⚡', '🍡', '🍵', '🍙', '🎯', '🚀', '⭐', '🍀', '🐾']

export function DashboardQuickDecksWidget({
  todayReview,
  activeDecks,
  allDecksCount = 0,
  onOpenStudyModal,
  navigate,
  displayMode = 'shortcuts',
  onOpenCustomize
}: DashboardQuickDecksWidgetProps) {
  const dueCount = todayReview?.due_cards_count || 0
  const totalAvailable = allDecksCount || activeDecks.length

  return (
    <div className="h-full w-full flex flex-col gap-2.5 overflow-hidden text-left select-none">
      {/* ═══════════ TOP SINGLE ROW: TITLE + DUE BADGE + 1 OPTION BUTTON ═══════════ */}
      <div className="flex items-center justify-between px-1 py-0.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-400 text-white flex items-center justify-center text-sm shadow-sm shadow-orange-500/25">
            ✨
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">
              Shortcuts
            </h3>
            <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
              {activeDecks.length} {activeDecks.length === 1 ? 'deck' : 'decks'} pinned
            </span>
          </div>

          {dueCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/flashcard/quick/play')}
              className="ml-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="FSRS Quick Play all due cards"
            >
              <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>{dueCount} due</span>
              <ChevronRight className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          )}
        </div>

        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="px-3.5 py-1.5 rounded-2xl bg-white hover:bg-orange-50 text-orange-600 border-2 border-orange-200/90 hover:border-orange-300 text-xs font-black shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Customize shortcut decks & layout"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />
            <span>Option</span>
          </button>
        )}
      </div>

      {/* ═══════════ MAIN CONTENT: CUTE STUDY DECKS ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
        {activeDecks.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-orange-200/80 flex flex-col items-center justify-center gap-3 p-6 shadow-xs">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-amber-200 via-orange-300 to-rose-300 text-white flex items-center justify-center text-3xl shadow-sm animate-bounce">
              🎴
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                No Shortcuts Pinned Yet ✨
              </h4>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                Tap Option above to choose your favorite vocabulary decks for instant 1-tap study!
              </p>
            </div>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={onOpenCustomize}
                className="mt-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-b-2 border-orange-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Choose Decks to Pin</span>
              </button>
            )}
          </div>
        ) : displayMode === 'shortcuts' ? (
          /* ═══════════ STYLE 1: CUTE TACTILE 3D SHORTCUT CARDS ═══════════ */
          <>
            {activeDecks.map((deck, idx) => {
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
              const cuteEmoji = CUTE_EMOJIS[Math.abs(Number(deckId) || idx) % CUTE_EMOJIS.length]

              return (
                <div
                  key={deckId}
                  className="group relative rounded-[28px] bg-white border-2 border-orange-100/70 hover:border-orange-300 shadow-[0_8px_25px_rgba(251,146,60,0.06)] hover:shadow-[0_12px_32px_rgba(251,146,60,0.14)] transition-all duration-300 p-4 sm:p-4.5 flex flex-col gap-3.5 overflow-hidden text-left"
                >
                  {/* Ambient Soft Glow */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-amber-200/30 via-orange-200/20 to-rose-200/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                  {/* Top Deck Info Bar */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div 
                      onClick={() => navigate(`/decks/${deckId}`)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      {/* Deck Mascot / Cute Cover Squircle */}
                      <div className="relative shrink-0">
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-400 p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center text-white overflow-hidden">
                          {deck.cover_image ? (
                            <img
                              src={deck.cover_image}
                              alt={deck.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                const fallback = (e.currentTarget.parentElement?.querySelector('.emoji-fallback') as HTMLElement);
                                if (fallback) fallback.style.display = 'block';
                              }}
                              className="w-full h-full rounded-[18px] object-cover"
                            />
                          ) : null}
                          <span className={cn(
                            "text-2xl select-none emoji-fallback",
                            deck.cover_image ? "hidden" : "block"
                          )}>
                            {cuteEmoji}
                          </span>
                        </div>
                        {hasDue && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 ring-2 ring-white items-center justify-center text-[8px] text-white font-black">
                              🔥
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Title & Word Counts */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-[15px] font-black text-slate-800 tracking-tight leading-snug group-hover:text-orange-600 transition-colors truncate">
                          {deck.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-md">
                            {learned}/{total} words
                          </span>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-md",
                            pct === 100 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60" 
                              : "bg-orange-50 text-orange-600 border border-orange-200/60"
                          )}>
                            {pct}% mastered ✨
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Status Badge */}
                    <div className="shrink-0 pt-0.5">
                      {hasDue ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                          <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          <span>{totalDue} due</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Candy Progress Bar & Review Metrics */}
                  <div className="space-y-2 relative z-10">
                    <div className="h-2.5 bg-amber-50/80 rounded-full overflow-hidden p-0.5 border border-amber-200/50 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[9.5px] font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50/80 border border-rose-150/70 text-rose-700">
                        Review: <strong className="font-black text-rose-600">{revRem}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50/80 border border-amber-150/70 text-amber-700">
                        New: <strong className="font-black text-amber-600">{newRem}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50/80 border border-emerald-150/70 text-emerald-700">
                        Mastered: <strong className="font-black text-emerald-600">{learned}</strong>
                      </span>
                    </div>
                  </div>

                  {/* ═══════════ CUTE 3D TACTILE PUSH-DOWN BUTTONS (GAMIFIED) ═══════════ */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1 relative z-10">
                    {/* Button 1: Flashcard 3D Push-down */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenStudyModal(deck, 'flashcard')
                      }}
                      className="relative h-13 px-3 rounded-2xl bg-gradient-to-b from-[#ff9f1c] via-[#ff8800] to-[#f36b00] border-b-[4px] border-[#c44e00] hover:brightness-105 active:border-b-0 active:translate-y-1 active:shadow-none shadow-[0_4px_12px_rgba(243,107,0,0.3)] transition-all duration-75 flex items-center justify-between cursor-pointer group/btn select-none overflow-hidden"
                      title="Study Flashcard (FSRS / Leitner)"
                    >
                      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent rounded-t-xl pointer-events-none" />

                      <div className="flex items-center gap-2 min-w-0 relative z-10">
                        <div className="w-8 h-8 rounded-xl bg-white/25 backdrop-blur-xs flex items-center justify-center text-base shadow-inner shrink-0 group-hover/btn:scale-110 transition-transform">
                          🎴
                        </div>
                        <div className="text-left min-w-0">
                          <span className="block text-xs font-black uppercase tracking-wider text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] leading-none truncate">
                            Flashcard
                          </span>
                          <span className="block text-[9px] font-extrabold text-amber-100 leading-none mt-1">
                            FSRS Mode ✨
                          </span>
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform shadow-xs relative z-10">
                        <Play className="w-2.5 h-2.5 fill-white text-white translate-x-0.5" />
                      </div>
                    </button>

                    {/* Button 2: Practice 3D Push-down */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenStudyModal(deck, 'practice')
                      }}
                      className="relative h-13 px-3 rounded-2xl bg-gradient-to-b from-[#818cf8] via-[#6366f1] to-[#4f46e5] border-b-[4px] border-[#3730a3] hover:brightness-105 active:border-b-0 active:translate-y-1 active:shadow-none shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-75 flex items-center justify-between cursor-pointer group/btn select-none overflow-hidden"
                      title="Practice Quiz & Test"
                    >
                      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent rounded-t-xl pointer-events-none" />

                      <div className="flex items-center gap-2 min-w-0 relative z-10">
                        <div className="w-8 h-8 rounded-xl bg-white/25 backdrop-blur-xs flex items-center justify-center text-base shadow-inner shrink-0 group-hover/btn:scale-110 transition-transform">
                          🎮
                        </div>
                        <div className="text-left min-w-0">
                          <span className="block text-xs font-black uppercase tracking-wider text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] leading-none truncate">
                            Practice
                          </span>
                          <span className="block text-[9px] font-extrabold text-indigo-100 leading-none mt-1">
                            Quiz & Game 🏆
                          </span>
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform shadow-xs relative z-10">
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
                className="w-full py-3.5 px-4 rounded-[22px] border-2 border-dashed border-orange-200/90 hover:border-orange-300 hover:bg-orange-50/40 text-orange-600 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                <span>Customize Shortcuts ({activeDecks.length} pinned of {totalAvailable})</span>
              </button>
            )}
          </>
        ) : displayMode === 'grid' ? (
          /* ═══════════ STYLE 2: CUTE APP GRID (2-COLUMN) ═══════════ */
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {activeDecks.map((deck, idx) => {
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
                const cuteEmoji = CUTE_EMOJIS[Math.abs(Number(deckId) || idx) % CUTE_EMOJIS.length]

                return (
                  <div
                    key={deckId}
                    className="p-3 rounded-2xl bg-white border-2 border-orange-100/70 shadow-xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col justify-between gap-2 relative overflow-hidden group"
                  >
                    <div 
                      onClick={() => navigate(`/decks/${deckId}`)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-black shadow-2xs">
                          {cuteEmoji}
                        </div>
                        {hasDue ? (
                          <span className="px-1.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-black flex items-center gap-0.5">
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

                    {/* Cute 3D Tactile Buttons for Grid */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenStudyModal(deck, 'flashcard')
                        }}
                        className="py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 border-b-2 border-orange-700 text-white text-[10px] font-black flex items-center justify-center gap-1 active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer shadow-xs"
                        title="Flashcard"
                      >
                        <span>🎴 Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenStudyModal(deck, 'practice')
                        }}
                        className="py-1.5 rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 border-b-2 border-indigo-800 text-white text-[10px] font-black flex items-center justify-center gap-1 active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer shadow-xs"
                        title="Practice Quiz"
                      >
                        <span>🎮 Quiz</span>
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
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-orange-200/90 hover:border-orange-300 text-orange-600 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                <span>Customize Shortcuts ({activeDecks.length} pinned)</span>
              </button>
            )}
          </>
        ) : (
          /* ═══════════ STYLE 3: CUTE COMPACT ROWS ═══════════ */
          <>
            <div className="space-y-2">
              {activeDecks.map((deck, idx) => {
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
                const cuteEmoji = CUTE_EMOJIS[Math.abs(Number(deckId) || idx) % CUTE_EMOJIS.length]

                return (
                  <div
                    key={deckId}
                    className="p-3 rounded-2xl bg-white border border-slate-150 hover:border-orange-300 shadow-2xs transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div 
                        onClick={() => navigate(`/decks/${deckId}`)}
                        className="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5"
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-black shrink-0">
                          {cuteEmoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                              {deck.title}
                            </h4>
                            {hasDue && (
                              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[8px] font-black shrink-0">
                                +{totalDue}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                            <span>{learned}/{total} words</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-black">{pct}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenStudyModal(deck, 'flashcard')
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 border-b-2 border-orange-700 text-white text-[10px] font-black transition-all shadow-xs flex items-center gap-1 cursor-pointer active:border-b-0 active:translate-y-0.5"
                        >
                          <span>🎴 Card</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenStudyModal(deck, 'practice')
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-indigo-400 to-indigo-600 border-b-2 border-indigo-800 text-white text-[10px] font-black transition-all shadow-xs flex items-center gap-1 cursor-pointer active:border-b-0 active:translate-y-0.5"
                        >
                          <span>🎮 Quiz</span>
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
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-orange-200/90 hover:border-orange-300 text-orange-600 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                <span>Customize Shortcuts ({activeDecks.length} pinned)</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

