import React, { useState, useEffect } from 'react'
import { 
  BookOpen, 
  SlidersHorizontal, 
  Check, 
  ChevronRight, 
  Flame, 
  Sparkles,
  Layers
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
    avatarBg: 'bg-[#FFE6D9]',
    cardBorder: 'border-orange-200/90',
    cardBg: 'bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30',
    barTrack: 'bg-orange-100/70',
    barFill: 'bg-gradient-to-r from-orange-400 to-amber-500',
    badgeBg: 'bg-orange-50 text-orange-600 border-orange-200/70',
    pctText: 'text-orange-600',
    emoji: '🌸'
  },
  {
    theme: 'purple',
    avatarBg: 'bg-[#EDE9FE]',
    cardBorder: 'border-indigo-100/90',
    cardBg: 'bg-gradient-to-r from-indigo-50/40 via-white to-purple-50/25',
    barTrack: 'bg-indigo-100/70',
    barFill: 'bg-gradient-to-r from-indigo-400 to-purple-500',
    badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/70',
    pctText: 'text-indigo-600',
    emoji: '🦊'
  },
  {
    theme: 'green',
    avatarBg: 'bg-[#D1FAE5]',
    cardBorder: 'border-emerald-100/90',
    cardBg: 'bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/25',
    barTrack: 'bg-emerald-100/70',
    barFill: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
    pctText: 'text-emerald-600',
    emoji: '🍃'
  },
  {
    theme: 'blue',
    avatarBg: 'bg-[#E0F2FE]',
    cardBorder: 'border-sky-100/90',
    cardBg: 'bg-gradient-to-r from-sky-50/40 via-white to-blue-50/25',
    barTrack: 'bg-sky-100/70',
    barFill: 'bg-gradient-to-r from-sky-400 to-blue-500',
    badgeBg: 'bg-sky-50 text-sky-600 border-sky-200/70',
    pctText: 'text-sky-600',
    emoji: '⚡'
  }
]

export function DashboardQuickDecksWidget({
  activeDecks,
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: DashboardQuickDecksWidgetProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<number | string | null>(null)

  // Auto-select first deck if none selected or if list changes
  useEffect(() => {
    if (activeDecks && activeDecks.length > 0) {
      const firstId = activeDecks[0].deck_id ?? activeDecks[0].id
      if (!selectedDeckId || !activeDecks.some(d => (d.deck_id ?? d.id) === selectedDeckId)) {
        setSelectedDeckId(firstId)
      }
    }
  }, [activeDecks])

  const currentSelectedDeck = activeDecks.find(
    d => (d.deck_id ?? d.id) === selectedDeckId
  ) || activeDecks[0]

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden text-left select-none relative">
      {/* ═══════════ TOP HEADER: LEARNING TITLE + SORT BUTTON ═══════════ */}
      <div className="flex items-center justify-between px-1 pt-1 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-2xl bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shadow-2xs">
            <BookOpen className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-none">
              Learning
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
              <span>Chọn bộ thẻ bạn muốn học</span>
              <span className="text-amber-500">✨</span>
            </p>
          </div>
        </div>

        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort</span>
          </button>
        )}
      </div>

      {/* ═══════════ SCROLLABLE DECK SELECTION LIST ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
        {activeDecks.length === 0 ? (
          <div className="py-12 text-center bg-white/90 backdrop-blur-xs rounded-3xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center gap-2.5 p-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-200 via-orange-300 to-rose-300 text-white flex items-center justify-center text-2xl shadow-sm animate-bounce">
              🎴
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                Chưa có bộ thẻ nào được ghim ✨
              </h4>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                Bấm nút Sort ở trên để chọn các bộ thẻ bạn muốn học nhé!
              </p>
            </div>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={onOpenCustomize}
                className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer border-b-2 border-orange-700"
              >
                Chọn bộ thẻ học
              </button>
            )}
          </div>
        ) : (
          activeDecks.map((deck, idx) => {
            const deckId = deck.deck_id ?? deck.id
            const isSelected = (currentSelectedDeck?.deck_id ?? currentSelectedDeck?.id) === deckId
            const learned = deck.learned_cards || 0
            const total = deck.total_cards || deck.questions_count || 0
            const pct = deck.total_pct !== undefined 
              ? deck.total_pct 
              : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)
            
            const newRem = deck.new_remaining || 0
            const revRem = deck.review_remaining || 0
            const totalDue = revRem + newRem
            const hasDue = deck.has_due || totalDue > 0
            const palette = DECK_PALETTES[idx % DECK_PALETTES.length]

            return (
              <div
                key={deckId}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setSelectedDeckId(deckId)
                }}
                className={cn(
                  "relative rounded-[26px] p-3 sm:p-3.5 flex items-center gap-3 transition-all duration-200 cursor-pointer select-none",
                  isSelected
                    ? "border-2 border-orange-500 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/40 shadow-sm ring-1 ring-orange-400/20"
                    : cn("border border-slate-200/80 hover:border-slate-300 shadow-2xs", palette.cardBg)
                )}
              >
                {/* Deck Mascot / Avatar */}
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center p-0.5 overflow-hidden shadow-2xs border-2 border-white",
                    isSelected ? "bg-[#FFE6D9]" : palette.avatarBg
                  )}>
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
                      {palette.emoji}
                    </span>
                  </div>
                </div>

                {/* Deck Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-sm sm:text-[14.5px] font-black text-slate-900 tracking-tight leading-tight truncate">
                      {deck.title}
                    </h4>

                    {/* Right Indicator: Checkmark if selected, or Due Badge / Chevron if not */}
                    {isSelected ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        {hasDue ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full border text-[9.5px] font-black flex items-center gap-0.5",
                            palette.badgeBg
                          )}>
                            <Flame className="w-3 h-3 fill-current" />
                            <span>{totalDue} due</span>
                          </span>
                        ) : null}
                        <ChevronRight className="w-4 h-4 text-slate-300 stroke-[2.5]" />
                      </div>
                    )}
                  </div>

                  {/* Progress Bar with Percentage */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={cn(
                      "flex-1 h-1.5 rounded-full overflow-hidden p-0.2 shadow-inner",
                      isSelected ? "bg-orange-100" : palette.barTrack
                    )}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isSelected ? "bg-gradient-to-r from-orange-400 to-amber-500" : palette.barFill
                        )}
                        style={{ width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-black text-orange-600 shrink-0 leading-none">
                        {pct}%
                      </span>
                    )}
                  </div>

                  {/* High-density inline metrics */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-slate-400" />
                      <span>{learned}/{total} words</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Review: <strong className={cn("font-black", isSelected ? "text-orange-600" : "text-slate-700")}>{revRem}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>New: <strong className={cn("font-black", isSelected ? "text-amber-600" : "text-slate-700")}>{newRem}</strong></span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════════ BOTTOM ACTION PANEL: "BẮT ĐẦU HỌC NGAY!" ═══════════ */}
      {currentSelectedDeck && (
        <div className="relative z-20 pt-3.5 pb-2 bg-gradient-to-b from-white/95 to-white/100 backdrop-blur-md rounded-t-[30px] border-t border-orange-100 shadow-[0_-10px_35px_rgba(255,145,50,0.1)] flex flex-col gap-2.5 -mx-2.5 -mb-2.5 px-3 sm:px-4 flex-shrink-0">
          {/* Peeking Mascot & Decorative Sparkles */}
          <div className="absolute -top-7 left-5 z-30 flex items-end select-none pointer-events-none">
            <div className="relative">
              <span className="text-3xl leading-none drop-shadow-sm">🔥</span>
              <span className="absolute -top-1 -right-2 text-xs text-amber-400 animate-pulse">✨</span>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-800 tracking-wide">
            <span className="text-orange-500 font-extrabold text-sm">≥</span>
            <span>Bắt đầu học ngay!</span>
            <span className="text-orange-500 font-extrabold text-sm">≤</span>
          </div>

          {/* 2 Big Action Launch Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Button 1: Học Flashcard */}
            <button
              type="button"
              onClick={() => {
                if (currentSelectedDeck) {
                  onOpenStudyModal(currentSelectedDeck, 'flashcard')
                }
              }}
              className="h-14 px-3.5 rounded-[22px] bg-gradient-to-r from-[#FF7A00] to-[#FFA100] hover:from-[#f36b00] hover:to-[#ff9100] text-white shadow-md shadow-orange-500/25 active:scale-[0.97] transition-all flex items-center justify-between cursor-pointer border-b-[3px] border-[#c44e00]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg shadow-inner shrink-0">
                  🎴
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs font-black text-white leading-tight truncate">
                    Học Flashcard
                  </span>
                  <span className="block text-[9.5px] font-bold text-amber-100 leading-tight mt-0.5 truncate">
                    Ghi nhớ nhanh chóng
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white shrink-0 stroke-[3]" />
            </button>

            {/* Button 2: Practice */}
            <button
              type="button"
              onClick={() => {
                if (currentSelectedDeck) {
                  onOpenStudyModal(currentSelectedDeck, 'practice')
                }
              }}
              className="h-14 px-3.5 rounded-[22px] bg-white hover:bg-orange-50/30 text-slate-800 border-2 border-orange-100 hover:border-orange-300 shadow-sm active:scale-[0.97] transition-all flex items-center justify-between cursor-pointer border-b-[3px] border-orange-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-orange-50 flex items-center justify-center text-lg shadow-inner shrink-0 border border-orange-200/60 text-orange-500">
                  🎯
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs font-black text-slate-900 leading-tight truncate">
                    Practice
                  </span>
                  <span className="block text-[9.5px] font-bold text-slate-400 leading-tight mt-0.5 truncate">
                    Luyện tập, kiểm tra
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 stroke-[3]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


