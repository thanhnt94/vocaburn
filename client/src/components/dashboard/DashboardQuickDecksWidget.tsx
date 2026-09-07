import React from 'react'
import { 
  Play
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

const CARD_THEMES = [
  {
    bg: 'bg-gradient-to-br from-[#FFF5EB] via-[#FFEADB] to-[#FFD8C2]',
    border: 'border-[#FFC299]',
    shadow: 'shadow-[0_6px_20px_rgba(255,145,77,0.12)]',
    emoji: '🌸',
    watermark: '🌸'
  },
  {
    bg: 'bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-[#DDD6FE]',
    border: 'border-[#C4B5FD]',
    shadow: 'shadow-[0_6px_20px_rgba(139,92,246,0.12)]',
    emoji: '🦊',
    watermark: '✨'
  },
  {
    bg: 'bg-gradient-to-br from-[#F0FDF4] via-[#DCFCE7] to-[#BBF7D0]',
    border: 'border-[#86EFAC]',
    shadow: 'shadow-[0_6px_20px_rgba(34,197,94,0.12)]',
    emoji: '🍡',
    watermark: '🍀'
  },
  {
    bg: 'bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD]',
    border: 'border-[#7DD3FC]',
    shadow: 'shadow-[0_6px_20px_rgba(14,165,233,0.12)]',
    emoji: '⚡',
    watermark: '⭐'
  }
]

export function DashboardQuickDecksWidget({
  activeDecks,
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: DashboardQuickDecksWidgetProps) {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-left select-none">
      {/* ═══════════ MAIN CONTENT: PLAYFUL COLORFUL STUDY DECKS ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-20 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
        {activeDecks.length === 0 ? (
          <div className="py-10 text-center bg-white/80 backdrop-blur-xs rounded-3xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center gap-2.5 p-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-200 via-orange-300 to-rose-300 text-white flex items-center justify-center text-2xl shadow-sm animate-bounce">
              🎴
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                No Learning Decks Pinned Yet ✨
              </h4>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                Tap the Option button in the top right to pin your favorite decks for 1-tap study!
              </p>
            </div>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={onOpenCustomize}
                className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer border-b-2 border-orange-700"
              >
                Choose Decks to Pin
              </button>
            )}
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
            const totalDue = revRem + newRem
            const hasDue = deck.has_due || totalDue > 0
            const theme = CARD_THEMES[idx % CARD_THEMES.length]

            return (
              <div
                key={deckId}
                className={cn(
                  "group relative rounded-[24px] border-2 p-3 sm:p-3.5 flex flex-col gap-2.5 overflow-hidden text-left transition-all duration-200",
                  theme.bg,
                  theme.border,
                  theme.shadow
                )}
              >
                {/* Decorative Faint Emoji Watermark in Background */}
                <span className="absolute -bottom-2 -right-1 text-7xl opacity-[0.09] select-none pointer-events-none rotate-12">
                  {theme.watermark}
                </span>

                {/* Ambient Soft Glow Circle */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/40 rounded-full blur-xl pointer-events-none" />

                {/* ═══════════ ROW 1: MASCOT + DECK INFO + DUE BADGE ═══════════ */}
                <div className="flex items-center gap-3 relative z-10">
                  {/* Playful Squircle Mascot Frame */}
                  <div 
                    onClick={() => navigate(`/decks/${deckId}`)}
                    className="relative shrink-0 cursor-pointer"
                  >
                    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/95 shadow-sm border-2 border-white flex items-center justify-center p-0.5 overflow-hidden group-hover:scale-105 transition-transform">
                      {deck.cover_image ? (
                        <img
                          src={deck.cover_image}
                          alt={deck.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fallback = (e.currentTarget.parentElement?.querySelector('.emoji-fallback') as HTMLElement);
                            if (fallback) fallback.style.display = 'block';
                          }}
                          className="w-full h-full rounded-[14px] object-cover"
                        />
                      ) : null}
                      <span className={cn(
                        "text-2xl select-none emoji-fallback",
                        deck.cover_image ? "hidden" : "block"
                      )}>
                        {theme.emoji}
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

                  {/* Deck Title & High-Density Progress Details */}
                  <div 
                    onClick={() => navigate(`/decks/${deckId}`)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight leading-tight truncate group-hover:text-orange-600 transition-colors">
                        {deck.title}
                      </h4>
                      {hasDue && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow-2xs flex items-center gap-0.5">
                          🔥 {totalDue} due
                        </span>
                      )}
                    </div>

                    {/* Compact Candy Progress bar with percentage */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-2 bg-white/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-700 shadow-xs"
                          style={{ width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 bg-white/80 px-1.5 py-0.2 rounded-md leading-none shrink-0 shadow-2xs">
                        {pct}%
                      </span>
                    </div>

                    {/* High-density inline metrics */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 mt-1 flex-wrap">
                      <span>{learned}/{total} words</span>
                      <span className="text-slate-400">•</span>
                      <span>Review: <strong className="font-black text-rose-600">{revRem}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span>New: <strong className="font-black text-amber-600">{newRem}</strong></span>
                    </div>
                  </div>
                </div>

                {/* ═══════════ ROW 2: 2 COMPACT 3D GAMING PUSH-DOWN BUTTONS ═══════════ */}
                <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                  {/* Flashcard 3D Push-down Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenStudyModal(deck, 'flashcard')
                    }}
                    className="relative h-10 px-3 rounded-xl bg-gradient-to-b from-[#ff9f1c] via-[#ff8800] to-[#f36b00] border-b-[3px] border-[#c44e00] hover:brightness-105 active:border-b-0 active:translate-y-0.5 shadow-sm transition-all flex items-center justify-between cursor-pointer group/btn select-none overflow-hidden"
                    title="Study Flashcard"
                  >
                    <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent rounded-t-lg pointer-events-none" />
                    <div className="flex items-center gap-1.5 relative z-10 min-w-0">
                      <span className="text-sm">🎴</span>
                      <span className="text-xs font-black uppercase tracking-wider text-white drop-shadow-xs truncate">
                        Flashcard
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0 shadow-xs relative z-10">
                      <Play className="w-2 h-2 fill-white text-white translate-x-0.5" />
                    </div>
                  </button>

                  {/* Practice 3D Push-down Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenStudyModal(deck, 'practice')
                    }}
                    className="relative h-10 px-3 rounded-xl bg-gradient-to-b from-[#818cf8] via-[#6366f1] to-[#4f46e5] border-b-[3px] border-[#3730a3] hover:brightness-105 active:border-b-0 active:translate-y-0.5 shadow-sm transition-all flex items-center justify-between cursor-pointer group/btn select-none overflow-hidden"
                    title="Practice Quiz & Game"
                  >
                    <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent rounded-t-lg pointer-events-none" />
                    <div className="flex items-center gap-1.5 relative z-10 min-w-0">
                      <span className="text-sm">🎮</span>
                      <span className="text-xs font-black uppercase tracking-wider text-white drop-shadow-xs truncate">
                        Practice
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0 shadow-xs relative z-10">
                      <Play className="w-2 h-2 fill-white text-white translate-x-0.5" />
                    </div>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

