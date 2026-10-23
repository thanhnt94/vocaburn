import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronLeft,
  BookOpen, 
  Flame, 
  Brain, 
  Trophy, 
  Sparkles,
  SlidersHorizontal,
  User,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface DashboardRoadmapSectionProps {
  roadmapDecks: any[] | undefined
  remainingTime?: string
  selectedRoadmapIdx?: number
  onSelectRoadmapIdx?: (idx: number) => void
  onOpenStudyModal?: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
  isDesktop?: boolean
  displayMode?: string
  onOpenCustomize?: () => void
}

const CHEER_QUOTES = [
  "Keep it up! You're on fire with this streak! 🔥",
  "Every word learned today is a major leap forward! 🚀",
  "With dedication like this, you'll reach your goal in no time! 🌟",
  "I'm here cheering you on every single day! 💪",
  "Outstanding work! Let's conquer all your flashcards! 🎉",
  "Your brain is absorbing vocabulary at lightning speed! 🧠⚡"
]

export function DashboardRoadmapSection({
  roadmapDecks,
  selectedRoadmapIdx,
  onSelectRoadmapIdx,
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: DashboardRoadmapSectionProps) {
  const user = useAppStore(s => s.user)
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const [internalIdx, setInternalIdx] = useState(0)

  // Touch swipe handling for 1-deck-per-page swiping
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const safeDecks = roadmapDecks || []
  const totalDecks = safeDecks.length
  const currentIdx = selectedRoadmapIdx !== undefined ? selectedRoadmapIdx : internalIdx
  const safeIdx = totalDecks > 0 ? Math.min(Math.max(0, currentIdx), totalDecks - 1) : 0
  const deck = safeDecks[safeIdx] || null

  const setIndex = (idx: number) => {
    setInternalIdx(idx)
    if (onSelectRoadmapIdx) onSelectRoadmapIdx(idx)
  }

  const prevDeck = () => {
    if (safeIdx > 0) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      setIndex(safeIdx - 1)
    }
  }

  const nextDeck = () => {
    if (safeIdx < totalDecks - 1) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      setIndex(safeIdx + 1)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current
      const threshold = 35 // min swipe distance
      if (diff > threshold && safeIdx < totalDecks - 1) {
        nextDeck()
      } else if (diff < -threshold && safeIdx > 0) {
        prevDeck()
      }
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  // Wheel scroll handling (mouse wheel & trackpad swipe)
  const wheelCooldown = useRef(false)
  const handleWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(delta) > 18) {
      wheelCooldown.current = true
      if (delta > 0 && safeIdx < totalDecks - 1) {
        nextDeck()
      } else if (delta < 0 && safeIdx > 0) {
        prevDeck()
      }
      setTimeout(() => {
        wheelCooldown.current = false
      }, 350)
    }
  }

  const handleMascotTap = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([15, 30, 15])
    }
    const randomQuote = CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)]
    setMascotCheer(randomQuote)
    setTimeout(() => {
      setMascotCheer(null)
    }, 4000)
  }

  // Empty state if no decks are active on Home
  if (totalDecks === 0 || !deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto my-auto select-none">
        <div className="w-18 h-18 rounded-3xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-500 mb-4 shadow-2xs">
          <BookOpen className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h3 className="text-base font-black text-slate-800 tracking-tight">No Active Decks on Home</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Select decks from your Library or turn on decks in Manage to display them here!
        </p>
        <div className="flex items-center gap-2">
          {onOpenCustomize && (
            <button
              type="button"
              onClick={onOpenCustomize}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:border-orange-300 transition-all cursor-pointer shadow-2xs"
            >
              Manage Decks
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/decks')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Explore Library →
          </button>
        </div>
      </div>
    )
  }

  // ══════════════ STATS CALCULATION FOR CURRENT DECK ══════════════
  const st = deck.status || {}
  const totalCards = Number(st.total_cards || deck.total_cards || deck.questions_count || 0)
  const learnedCards = Number(st.learned_cards || deck.learned_cards || 0)
  const unlearnedCards = Math.max(0, totalCards - learnedCards)
  const dueRemaining = Number(st.review_due_today ?? deck.review_remaining ?? 0)
  const streak = Number(st.streak || deck.streak || 0)
  const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0
  const isMastered = totalCards > 0 && learnedCards >= totalCards

  // Author & Creation Info: Prioritize uploader/creator (tnhnaht)
  const authorName = deck.creator_name || deck.creator_username || deck.creator?.username || user?.username || 'tnhnaht'
  const createdAtStr = deck.created_at 
    ? new Date(deck.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'Oct 2026'
  const deckDescription = deck.description || (
    deck.title?.includes('Danh Động Từ') 
      ? 'Tổng hợp danh động từ N2 thường gặp trong đề thi JLPT kèm ví dụ và câu hỏi luyện tập FSRS.' 
      : 'Bộ thẻ từ vựng & ngữ pháp tối ưu hóa theo chu kỳ ngắt quãng FSRS v6 giúp ghi nhớ sâu.'
  )

  // Check if practice quiz disabled
  const disabledModes = (st.disabled_modes || deck.practice_settings?.disabled_modes || deck.disabled_modes || []) as string[]
  const isPracticeDisabled = Boolean(
    st.is_practice_disabled ||
    deck.is_practice_disabled ||
    disabledModes.includes('practice') ||
    disabledModes.includes('all_practice') ||
    ['mcq', 'typing', 'listening_mcq', 'listening_typing'].every(m => disabledModes.includes(m))
  )

  // Mascot expression & speech
  let mascotImg = '/mascot/sleepy.png'
  let mascotHeadline = 'Ready to study!'
  let mascotSubline = "Let's learn new words today."

  if (isMastered) {
    mascotImg = '/mascot/celebrating.png'
    mascotHeadline = 'All Mastered! 🎉'
    mascotSubline = 'Outstanding achievement!'
  } else if (dueRemaining === 0 && learnedCards > 0) {
    mascotImg = '/mascot/celebrating.png'
    mascotHeadline = 'All caught up! ✨'
    mascotSubline = 'Zero reviews pending today.'
  } else if (dueRemaining > 0) {
    mascotImg = '/mascot/excited.png'
    mascotHeadline = `${dueRemaining} cards due for review!`
    mascotSubline = 'Keep your memory strong with FSRS.'
  }

  return (
    <div 
      className="flex-1 flex flex-col justify-between min-h-0 w-full p-2.5 sm:p-3 select-none touch-pan-y"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* ── 1. TOP CAROUSEL NAVIGATOR (SWIPE INDICATOR) ── */}
      <div className="flex items-center justify-between shrink-0 px-0.5 pb-1">
        {/* Left: Previous / Next & Page Count */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white px-2 py-0.5 rounded-full border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={prevDeck}
              disabled={safeIdx === 0}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                safeIdx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-orange-50 cursor-pointer active:scale-90"
              )}
              title="Previous deck"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="text-[11px] font-black text-slate-800 px-1.5 tabular-nums">
              {safeIdx + 1} / {totalDecks}
            </span>
            <button
              type="button"
              onClick={nextDeck}
              disabled={safeIdx === totalDecks - 1}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                safeIdx === totalDecks - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-orange-50 cursor-pointer active:scale-90"
              )}
              title="Next deck"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Dot Indicators */}
          {totalDecks > 1 && (
            <div className="flex items-center gap-1">
              {safeDecks.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    i === safeIdx ? "w-4 bg-orange-500" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                  )}
                  title={`Go to deck ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Deck Details Link */}
        <Link 
          to={`/decks/${deck.deck_id ?? deck.id}`}
          className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-slate-200/90 hover:border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs active:scale-95 transition-all shrink-0"
        >
          <span>Deck Details</span>
          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
        </Link>
      </div>

      {/* ── 2. ANIMATED DECK SLIDE (HERO STAGE + STATS + ACTIONS) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={deck.deck_id ?? deck.id ?? safeIdx}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const swipeThreshold = 35
            const velocityThreshold = 300
            if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
              if (safeIdx < totalDecks - 1) nextDeck()
            } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
              if (safeIdx > 0) prevDeck()
            }
          }}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {/* ── 2A. HERO STAGE (FULL-WIDTH TOP PROGRESS + RICH LEFT METRICS + ANCHORED MASCOT) ── */}
          <div className="bg-gradient-to-br from-amber-100/95 via-orange-50/85 to-amber-200/40 border border-orange-200/90 rounded-3xl p-3.5 sm:p-4.5 relative overflow-hidden shadow-2xs flex-1 flex flex-col justify-between min-h-0">
            
            {/* 1. TOP HEADER & FULL-WIDTH PROGRESS (Chiếm trọn bề ngang màn hình theo yêu cầu) */}
            <div className="relative z-20 w-full shrink-0 space-y-2">
              {/* Deck Title, Level & Creator */}
              <div>
                <Link
                  to={`/decks/${deck.deck_id ?? deck.id}`}
                  className="inline-flex items-center gap-1.5 max-w-full group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-orange-500/15 border border-orange-300/70 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <BookOpen className="w-4 h-4 stroke-[2.4]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                    {deck.title}
                  </h3>
                  {deck.level && (
                    <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black shrink-0">
                      {deck.level}
                    </span>
                  )}
                </Link>

                {/* Creator & Creation Date Info */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Uploaded by <strong className="text-slate-800 font-black">{authorName}</strong></span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{createdAtStr}</span>
                  </span>
                </div>
              </div>

              {/* GAMIFIED MASTERY & QUEST HUD (Khung tiến độ game hóa siêu đẹp, nổi bật) */}
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-400/15 to-emerald-500/15 border-2 border-orange-300/80 rounded-2xl p-2.5 sm:p-3 shadow-xs relative overflow-hidden backdrop-blur-xs">
                {/* Decorative background glow */}
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-emerald-400/15 rounded-full blur-xl pointer-events-none" />

                {/* Top Row: Fiery Quest Badge + Status + Glowing Percentage */}
                <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white flex items-center justify-center font-black shadow-md shadow-orange-500/30 shrink-0 text-sm">
                      🔥
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 block leading-tight">
                        Daily Mastery Goal
                      </span>
                      <span className="text-xs sm:text-[13px] font-black text-slate-900 truncate block leading-tight">
                        {mascotHeadline}
                      </span>
                    </div>
                  </div>

                  {/* High-impact Vibrant Percentage Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs sm:text-[13px] font-black shadow-sm shadow-emerald-500/25 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{pct}%</span>
                  </div>
                </div>
                
                {/* 3D Chunky Video Game XP Bar */}
                <div className="h-3.5 w-full bg-white/90 rounded-full overflow-hidden p-0.5 border border-orange-200/80 shadow-inner relative z-10">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 transition-all duration-500 relative shadow-xs"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  >
                    {/* Gloss Reflection Top Layer for Juicy 3D Feel */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-white/40 rounded-t-full pointer-events-none" />
                  </div>
                </div>

                {/* Bottom Row: Milestone Metrics Summary */}
                <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-bold text-slate-600 mt-1.5 px-0.5 relative z-10">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <strong>{learnedCards}</strong> mastered
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                    <strong>{dueRemaining}</strong> due today
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <strong>{totalCards}</strong> total
                  </span>
                </div>
              </div>
            </div>

            {/* 2. LOWER BODY (LEFT: Description & 4-Metric Grid | RIGHT: Mascot Anchored Bottom-Right) */}
            <div className="relative z-10 flex-1 flex flex-row items-end justify-between min-h-0 pt-2 gap-2">
              
              {/* Left Column (~58% - 62% width): Balanced Center Stack to Eliminate Gaps */}
              <div className="flex-1 max-w-[58%] sm:max-w-[62%] min-w-0 flex flex-col justify-center h-full py-1 text-left gap-2">
                
                {/* Deck Description Box */}
                <div className="bg-white/90 backdrop-blur-xs border border-orange-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-600 mb-0.5">
                    <span>📖</span>
                    <span>About this deck</span>
                  </div>
                  <p className="text-[10.5px] sm:text-[11px] text-slate-700 font-medium leading-relaxed line-clamp-2">
                    {deckDescription}
                  </p>
                </div>

                {/* Rich 4-Metric Grid */}
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      📚
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Total Vocab</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">{totalCards.toLocaleString()} words</span>
                    </div>
                  </div>

                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      ⚡
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Algorithm</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">FSRS v6</span>
                    </div>
                  </div>

                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      🔥
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Streak</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">{streak > 0 ? `${streak} Days` : 'Active'}</span>
                    </div>
                  </div>

                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      🎯
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Remaining</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">{unlearnedCards} new</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Large 3D Mascot anchored to bottom right */}
              <div 
                onClick={handleMascotTap}
                title="Tap Vocaburn mascot for extra motivation! 🔥"
                className="w-[42%] max-w-[280px] absolute right-0 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group pointer-events-auto"
              >
                {/* Tap Speech Bubble */}
                <AnimatePresence>
                  {mascotCheer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.85 }}
                      className="absolute top-2 right-2 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[10.5px] font-black p-2.5 rounded-2xl shadow-xl z-30 max-w-[170px] pointer-events-none text-center"
                    >
                      <div className="relative">
                        {mascotCheer}
                        <div className="absolute -bottom-4 right-6 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-white" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Large, Beautiful Mascot anchored right as originally designed */}
                <motion.img 
                  key={mascotImg}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  src={`${mascotImg}?v=clean_v21`} 
                  alt="Vocaburn Mascot" 
                  className="h-[105%] max-h-[220px] sm:max-h-[250px] w-auto max-w-none object-contain object-bottom drop-shadow-2xl translate-y-1 transition-transform group-hover:scale-105 active:scale-95 select-none"
                />
              </div>
            </div>
          </div>

          {/* ── 2B. 3 TRUTH STAT BOXES (DUE, NEW, MASTERED) ── */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {/* Due for Review */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Due for Review
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className={cn(
                  "text-base sm:text-lg font-black tabular-nums",
                  dueRemaining > 0 ? "text-purple-600" : "text-emerald-600"
                )}>
                  {dueRemaining}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>

            {/* Unlearned / New Cards */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Unlearned
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-black text-orange-600 tabular-nums">
                  {unlearnedCards}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>

            {/* Mastered Cards */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Mastered
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
                  {learnedCards}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>
          </div>

          {/* ── 2C. DUAL STUDY ACTIONS (INSTANT PLAY + QUICK MODE POPUP) ── */}
          <div className="shrink-0">
            <div className={cn("grid gap-2", isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
              
              {/* Flashcard Action Group */}
              <div className="flex items-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-xs p-1 gap-1">
                {/* Primary: Study Flashcards Instant Play */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                    navigate(`/flashcard/${deck.deck_id ?? deck.id}/play`)
                  }}
                  className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
                  title="Start studying with FSRS spaced repetition"
                >
                  <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                      Study Flashcards
                    </span>
                    <span className="text-[9.5px] text-orange-100 font-bold block leading-tight truncate">
                      {dueRemaining > 0 ? `${dueRemaining} reviews waiting` : 'Review & Learn'}
                    </span>
                  </div>
                </button>

                {/* Secondary: Quick Mode Select Popup */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
                    onOpenStudyModal?.(deck, 'flashcard')
                  }}
                  className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
                  title="Quick Study Mode Settings (FSRS, Leitner, Skim...)"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Practice Action Group */}
              {!isPracticeDisabled && (
                <div className="flex items-center rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 shadow-xs p-1 gap-1">
                  {/* Primary: Practice Quiz Instant Play */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                      navigate(`/practice/${deck.deck_id ?? deck.id}`)
                    }}
                    className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
                    title="Start practice quiz"
                  >
                    <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                        Practice Quiz
                      </span>
                      <span className="text-[9.5px] text-teal-100 font-bold block leading-tight truncate">
                        MCQ, Typing & Tests
                      </span>
                    </div>
                  </button>

                  {/* Secondary: Quick Practice Mode Select Popup */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
                      onOpenStudyModal?.(deck, 'practice')
                    }}
                    className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
                    title="Quick Practice Mode Settings (MCQ, Typing, Listening...)"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
