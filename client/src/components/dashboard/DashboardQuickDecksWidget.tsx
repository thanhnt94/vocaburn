import React, { useState, useEffect } from 'react'
import { 
  BookOpen, 
  SlidersHorizontal, 
  Check, 
  ChevronRight, 
  Flame, 
  Sparkles,
  Layers,
  Brain,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

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
    cardBorder: 'border-orange-500',
    cardBg: 'bg-gradient-to-r from-orange-50/90 via-white to-amber-50/50',
    barTrack: 'bg-orange-100',
    barFill: 'bg-gradient-to-r from-orange-400 to-[#FF7A00]',
    mascotImage: '/mascot/excited.png',
    accentColor: '#FF7A00'
  },
  {
    theme: 'purple',
    avatarBg: 'bg-gradient-to-br from-indigo-100 to-purple-100',
    cardBorder: 'border-indigo-200/90',
    cardBg: 'bg-gradient-to-r from-[#FAF8FF] via-white to-[#F5F3FF]',
    barTrack: 'bg-indigo-100/70',
    barFill: 'bg-gradient-to-r from-indigo-400 to-purple-500',
    mascotImage: '/mascot/dj.png',
    accentColor: '#7C3AED'
  },
  {
    theme: 'green',
    avatarBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
    cardBorder: 'border-emerald-200/90',
    cardBg: 'bg-gradient-to-r from-[#F4FBF7] via-white to-[#ECFDF5]',
    barTrack: 'bg-emerald-100/70',
    barFill: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    mascotImage: '/mascot/detective.png',
    accentColor: '#059669'
  },
  {
    theme: 'blue',
    avatarBg: 'bg-gradient-to-br from-sky-100 to-blue-100',
    cardBorder: 'border-sky-200/90',
    cardBg: 'bg-gradient-to-r from-[#F0F9FF] via-white to-[#E0F2FE]',
    barTrack: 'bg-sky-100/70',
    barFill: 'bg-gradient-to-r from-sky-400 to-blue-500',
    mascotImage: '/mascot/ninja.png',
    accentColor: '#0284C7'
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

  const userSettings = useAppStore(s => s.userSettings)

  const rawStudyMode = (
    currentSelectedDeck?.user_study_settings?.learning_mode ||
    currentSelectedDeck?.study_defaults?.learning_mode ||
    currentSelectedDeck?.practice_settings?.default_learning_mode ||
    currentSelectedDeck?.creator_settings?.learning_mode ||
    userSettings?.quiz_learning_mode ||
    'fsrs'
  )
  const activeStudyMode = (rawStudyMode === 'speed_skim' || rawStudyMode === 'flip') ? 'skim' : rawStudyMode

  const studyModeLabel = (() => {
    switch (activeStudyMode) {
      case 'skim':
        return 'Speed Skim'
      case 'autoplay':
        return 'AutoPlay'
      case 'review':
        return 'FSRS Review'
      case 'new':
        return 'Learn New'
      case 'fsrs':
      default:
        return 'FSRS v6'
    }
  })()

  const rawPracticeMode = (
    currentSelectedDeck?.practice_settings?.default_mode ||
    currentSelectedDeck?.practice_settings?.active_mode ||
    userSettings?.practice_submode ||
    'mcq'
  )
  const activePracticeMode = rawPracticeMode || 'mcq'

  const practiceModeLabel = (() => {
    switch (activePracticeMode) {
      case 'typing':
        return 'Typing'
      case 'listening':
      case 'listening_mcq':
        return 'Listening'
      case 'listening_typing':
        return 'Listen Typing'
      case 'mcq':
      default:
        return 'MCQ Quiz'
    }
  })()

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden text-left select-none relative pt-1">
      {/* ═══════════ SCROLLABLE DECK SELECTION LIST (Enlarged Card Proportions) ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-0.5 pb-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
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
                Vào cài đặt để chọn các bộ thẻ bạn muốn học nhé!
              </p>
            </div>
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
            const palette = DECK_PALETTES[idx % DECK_PALETTES.length]
            const mascotSrc = deck.cover_image || palette.mascotImage

            return (
              <div
                key={deckId}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setSelectedDeckId(deckId)
                }}
                className={cn(
                  "relative rounded-[28px] p-4 sm:p-4.5 flex items-center gap-4 transition-all duration-200 cursor-pointer select-none",
                  isSelected
                    ? "border-2 border-orange-500 bg-gradient-to-r from-orange-50/95 via-white to-amber-50/60 shadow-md shadow-orange-500/10 ring-2 ring-orange-400/25"
                    : cn("border border-slate-200/90 hover:border-slate-300 shadow-xs", palette.cardBg)
                )}
              >
                {/* Deck Mascot / Avatar */}
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-18 h-18 sm:w-20 sm:h-20 rounded-[24px] flex items-center justify-center overflow-hidden shadow-xs border-2 border-white",
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

                {/* Deck Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[15px] sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                      {deck.title}
                    </h4>

                    {/* Right Indicator: Checkmark if selected, Chevron if not */}
                    {isSelected ? (
                      <div className="w-6.5 h-6.5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-300 stroke-[2.5] shrink-0" />
                    )}
                  </div>

                  {/* High-density inline metrics */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{learned}/{total} words</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Review: <strong className={cn("font-black", isSelected ? "text-orange-600" : "text-slate-700")}>{revRem}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>New: <strong className={cn("font-black", isSelected ? "text-amber-600" : "text-slate-700")}>{newRem}</strong></span>
                  </div>

                  {/* Progress Bar with Percentage */}
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className={cn(
                      "flex-1 h-2 rounded-full overflow-hidden p-0.5 shadow-inner",
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
                      <span className="text-xs sm:text-[13px] font-black text-orange-600 shrink-0 leading-none">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════════ BOTTOM ACTION PANEL: "BẮT ĐẦU HỌC NGAY!" ═══════════ */}
      {currentSelectedDeck && (
        <div className="relative z-20 pt-3 pb-2.5 bg-gradient-to-b from-white/95 via-white to-white backdrop-blur-md rounded-t-[28px] border-t border-orange-100 shadow-[0_-10px_30px_rgba(255,145,50,0.08)] flex flex-col gap-2 -mx-1 px-3 sm:px-4 flex-shrink-0">
          {/* Peeking Mascot & Decorative Sparkles */}
          <div className="absolute -top-8 left-4 z-30 flex items-end select-none pointer-events-none">
            <div className="relative">
              <img
                src="/mascot/vocaburn_mascot_clean.png"
                alt="Vocaburn Mascot"
                className="w-12 h-12 object-contain drop-shadow-md -rotate-6"
              />
              <span className="absolute -top-1 -right-2 text-xs text-amber-400 animate-pulse select-none">✨</span>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-800 tracking-wide select-none">
            <span className="text-orange-500 font-black text-sm">≥</span>
            <span>Bắt đầu học ngay!</span>
            <span className="text-orange-500 font-black text-sm">≤</span>
          </div>

          {/* 2 Big Action Launch Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Button 1: Study Action */}
            <div className="h-14 rounded-[22px] bg-gradient-to-r from-[#FF7A00] to-[#FFA100] text-white shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-between border-b-[3px] border-[#c44e00] p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  if (currentSelectedDeck) {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(10)
                    const id = currentSelectedDeck.deck_id ?? currentSelectedDeck.id
                    navigate(`/flashcard/${id}/play?mode=${activeStudyMode}`)
                  }
                }}
                className="flex-1 h-full px-2.5 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                title={`Study: ${studyModeLabel}`}
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white">
                  <Brain className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black text-white leading-tight truncate">
                    Study
                  </span>
                  <span className="block text-[9.5px] font-bold text-amber-100 leading-tight mt-0.5 truncate">
                    {studyModeLabel}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentSelectedDeck) {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(6)
                    onOpenStudyModal(currentSelectedDeck, 'flashcard')
                  }
                }}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 cursor-pointer border border-white/25 transition-colors"
                title="Study Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Button 2: Practice Action */}
            <div className="h-14 rounded-[22px] bg-white hover:bg-teal-50/20 text-slate-800 border-2 border-teal-200/90 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between border-b-[3px] border-teal-300 p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  if (currentSelectedDeck) {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(10)
                    const id = currentSelectedDeck.deck_id ?? currentSelectedDeck.id
                    navigate(`/practice/${id}/${activePracticeMode}`)
                  }
                }}
                className="flex-1 h-full px-2.5 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                title={`Practice: ${practiceModeLabel}`}
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 border border-teal-200/80 text-teal-600">
                  <Trophy className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black text-slate-900 leading-tight truncate">
                    Practice
                  </span>
                  <span className="block text-[9.5px] font-bold text-teal-600 leading-tight mt-0.5 truncate">
                    {practiceModeLabel}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentSelectedDeck) {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(6)
                    onOpenStudyModal(currentSelectedDeck, 'practice')
                  }
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer border border-slate-200 transition-colors"
                title="Practice Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


