import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  BookOpen, 
  Brain, 
  Trophy, 
  Sparkles,
  SlidersHorizontal,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2
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

export interface MascotProfile {
  img: string
  headline: string
  alt: string
}

export const ACTIVE_MASCOTS: MascotProfile[] = [
  { img: '/mascot/excited.png', headline: 'Keep your memory burning! 🔥', alt: 'Hero Flame' },
  { img: '/mascot/ninja.png', headline: 'Fast as lightning, sharp as steel! ⚡', alt: 'Ninja Flame' },
  { img: '/mascot/detective.png', headline: 'Investigate and discover new words! 🔍', alt: 'Detective Flame' },
  { img: '/mascot/dj.png', headline: 'Groove to the rhythm of learning! 🎧', alt: 'DJ Flame' },
  { img: '/mascot/reading.png', headline: 'Deep focus, unstoppable growth! 📖', alt: 'Scholar Flame' },
]

export const CELEBRATING_MASCOTS: MascotProfile[] = [
  { img: '/mascot/celebrating.png', headline: 'All caught up! Magnificent! 🎉', alt: 'Victory Flame' },
  { img: '/mascot/dj.png', headline: 'Vibe time! Today review complete! 🎶', alt: 'Party DJ Flame' },
  { img: '/mascot/excited.png', headline: 'High score achievement unlocked! 🌟', alt: 'Super Flame' },
]

export const MASTERED_MASCOTS: MascotProfile[] = [
  { img: '/mascot/celebrating.png', headline: 'All Mastered! Legendary! 👑', alt: 'Crown Flame' },
  { img: '/mascot/ninja.png', headline: 'Complete Deck Mastery achieved! ⚡', alt: 'Ninja Master Flame' },
]

export const SLEEPY_MASCOTS: MascotProfile[] = [
  { img: '/mascot/sleepy.png', headline: 'Ready to study whenever you are! 💤', alt: 'Resting Flame' },
]

export function computeDeckData(deck: any, userSettings: any, user: any) {
  const st = deck?.status || {}
  const totalCards = Number(st.total_cards || deck?.total_cards || deck?.questions_count || 0)
  const learnedCards = Number(st.learned_cards || deck?.learned_cards || 0)
  const unlearnedCards = Math.max(0, totalCards - learnedCards)
  const dueRemaining = Number(st.review_due_today ?? deck?.review_remaining ?? 0)
  const streak = Number(st.streak || deck?.streak || 0)
  const masteredCount = Number(st.mastered_count ?? st.mastered ?? deck?.mastered_count ?? 0)
  const hasExplicitMastered = masteredCount > 0
  const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0
  const isMastered = (hasExplicitMastered && masteredCount >= totalCards) || (totalCards > 0 && learnedCards >= totalCards)
  const estimatedMins = Math.max(2, Math.round(dueRemaining * 0.12))
  const retentionRate = Math.min(100, Math.max(70, Number(st.retention_rate || 90)))

  const authorName = deck?.creator_name || deck?.creator_username || deck?.creator?.username || user?.username || 'tnhnaht'
  const createdAtStr = deck?.created_at 
    ? new Date(deck.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'Oct 2026'
  const deckDescription = deck?.description || (
    deck?.title?.includes('Danh Động Từ') 
      ? 'Tổng hợp danh động từ N2 thường gặp trong đề thi JLPT kèm ví dụ và câu hỏi luyện tập FSRS.' 
      : 'Bộ thẻ từ vựng & ngữ pháp tối ưu hóa theo chu kỳ ngắt quãng FSRS v6 giúp ghi nhớ sâu.'
  )

  const disabledModes = (st.disabled_modes || deck?.practice_settings?.disabled_modes || deck?.disabled_modes || []) as string[]
  const isPracticeDisabled = Boolean(
    st.is_practice_disabled ||
    deck?.is_practice_disabled ||
    disabledModes.includes('practice') ||
    disabledModes.includes('all_practice') ||
    ['mcq', 'typing', 'listening_mcq', 'listening_typing'].every(m => disabledModes.includes(m))
  )

  const rawStudyMode = (
    deck?.user_study_settings?.learning_mode ||
    deck?.study_defaults?.learning_mode ||
    deck?.practice_settings?.default_learning_mode ||
    deck?.creator_settings?.learning_mode ||
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
    deck?.practice_settings?.default_mode ||
    deck?.practice_settings?.active_mode ||
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

  return {
    st,
    totalCards,
    learnedCards,
    unlearnedCards,
    dueRemaining,
    streak,
    masteredCount,
    hasExplicitMastered,
    pct,
    isMastered,
    estimatedMins,
    retentionRate,
    authorName,
    createdAtStr,
    deckDescription,
    isPracticeDisabled,
    activeStudyMode,
    studyModeLabel,
    activePracticeMode,
    practiceModeLabel
  }
}

export function DashboardRoadmapSection({
  roadmapDecks,
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: DashboardRoadmapSectionProps) {
  const user = useAppStore(s => s.user)
  const userSettings = useAppStore(s => s.userSettings)
  const [mascotCheer, setMascotCheer] = useState<{ id: number; text: string } | null>(null)

  const safeDecks = roadmapDecks || []

  const handleMascotTap = (deckId: number) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([15, 30, 15])
    }
    const randomQuote = CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)]
    setMascotCheer({ id: deckId, text: randomQuote })
    setTimeout(() => {
      setMascotCheer(null)
    }, 3800)
  }

  // Dual actions: Study & Practice
  const renderDualActions = (targetDeck: any, data: ReturnType<typeof computeDeckData>) => {
    return (
      <div className={cn("grid gap-2", data.isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
        {/* Flashcard Action Group */}
        <div className="flex items-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-sm p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
              navigate(`/flashcard/${targetDeck.deck_id ?? targetDeck.id}/play?mode=${data.activeStudyMode}`)
            }}
            className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
            title={`Start studying with ${data.studyModeLabel}`}
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                Study
              </span>
              <span className="text-[9.5px] text-orange-100 font-bold block leading-tight truncate">
                {data.studyModeLabel}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
              onOpenStudyModal?.(targetDeck, 'flashcard')
            }}
            className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
            title="Quick Study Mode Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Practice Action Group */}
        {!data.isPracticeDisabled && (
          <div className="flex items-center rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 shadow-sm p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                navigate(`/practice/${targetDeck.deck_id ?? targetDeck.id}/${data.activePracticeMode}`)
              }}
              className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
              title={`Start practice with ${data.practiceModeLabel}`}
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                  Practice
                </span>
                <span className="text-[9.5px] text-teal-100 font-bold block leading-tight truncate">
                  {data.practiceModeLabel}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
                onOpenStudyModal?.(targetDeck, 'practice')
              }}
              className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
              title="Quick Practice Mode Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Empty state
  if (safeDecks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl shadow-xs mb-3">
          🎴
        </div>
        <h4 className="text-sm font-black text-slate-800">No active learning decks</h4>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-1 mb-4">
          Pin decks in deck manager to start your daily study routine!
        </p>
        <button
          type="button"
          onClick={onOpenCustomize}
          className="px-4 py-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-sm transition-all"
        >
          Manage Decks
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-3 sm:p-4 pb-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
      {safeDecks.map((deck, idx) => {
        const deckData = computeDeckData(deck, userSettings, user)
        const {
          totalCards,
          learnedCards,
          unlearnedCards,
          dueRemaining,
          masteredCount,
          hasExplicitMastered,
          pct,
          isMastered,
          authorName,
          createdAtStr,
          deckDescription
        } = deckData

        // Mascot profile for this deck
        const deckSeed = Math.abs(Number(deck.deck_id ?? deck.id ?? idx))
        let baseMascot: MascotProfile = SLEEPY_MASCOTS[0]
        if (isMastered) {
          baseMascot = MASTERED_MASCOTS[deckSeed % MASTERED_MASCOTS.length]
        } else if (dueRemaining === 0 && learnedCards > 0) {
          baseMascot = CELEBRATING_MASCOTS[deckSeed % CELEBRATING_MASCOTS.length]
        } else if (dueRemaining > 0) {
          baseMascot = ACTIVE_MASCOTS[deckSeed % ACTIVE_MASCOTS.length]
        }

        const isShowingCheer = mascotCheer && mascotCheer.id === (deck.deck_id ?? deck.id)

        return (
          <div
            key={deck.deck_id ?? deck.id ?? idx}
            className="bg-white rounded-3xl border border-slate-200/90 hover:border-orange-300/80 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col gap-3.5 relative overflow-hidden"
          >
            {/* Top warm accent strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400" />

            {/* 1. Header Row: Title, Creator, Level, Details CTA */}
            <div className="flex items-start justify-between gap-3 pt-0.5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-100 to-amber-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={`/decks/${deck.deck_id ?? deck.id}`}
                      className="text-[15px] sm:text-base font-black text-slate-900 hover:text-orange-600 transition-colors truncate"
                    >
                      {deck.title}
                    </Link>
                    {deck.level && (
                      <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black shrink-0">
                        {deck.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold mt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Uploaded by <strong className="text-slate-700 font-bold">{authorName}</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{createdAtStr}</span>
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to={`/decks/${deck.deck_id ?? deck.id}`}
                className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-orange-50/80 hover:bg-orange-100/90 border border-orange-200/70 px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-all shrink-0 shadow-2xs active:scale-95"
              >
                <span>Details</span>
                <ChevronRight className="w-3 h-3 stroke-[2.5]" />
              </Link>
            </div>

            {/* 2. Mastery & Learning Goal Section (Unified & Elegant) */}
            <div className="bg-gradient-to-br from-slate-50/90 via-amber-50/20 to-orange-50/30 border border-slate-200/70 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs relative">
              {/* Goal row: Headline & % pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                    🔥
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-600 block leading-tight">
                      Daily Learning Goal
                    </span>
                    <span className="text-xs sm:text-[13px] font-black text-slate-800 truncate block leading-tight">
                      {baseMascot.headline}
                    </span>
                  </div>
                </div>

                {/* High impact Percentage pill */}
                <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-xs flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{pct}% Learned</span>
                </div>
              </div>

              {/* Sleek Modern Progress Bar */}
              <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 transition-all duration-500 shadow-2xs"
                  style={{ width: `${Math.max(pct, totalCards > 0 ? 3 : 0)}%` }}
                />
              </div>

              {/* Metrics footer */}
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 px-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Overall Mastery Progress</span>
                </span>
                <span className="font-extrabold text-slate-700">
                  <strong>{hasExplicitMastered ? masteredCount : learnedCards}</strong> / <strong>{totalCards}</strong> cards memorized
                </span>
              </div>
            </div>

            {/* 3. Three Stat Badges (Due, Unlearned, Learned) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Due for Review */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-2 text-center shadow-2xs">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Due for Review
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className={cn(
                    "text-base sm:text-lg font-black tabular-nums",
                    dueRemaining > 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {dueRemaining}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">cards</span>
                </div>
              </div>

              {/* Unlearned */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-2 text-center shadow-2xs">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Unlearned
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className="text-base sm:text-lg font-black text-amber-600 tabular-nums">
                    {unlearnedCards}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">cards</span>
                </div>
              </div>

              {/* Learned / Mastered */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-2 text-center shadow-2xs">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {hasExplicitMastered ? 'Mastered' : 'Learned'}
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
                    {hasExplicitMastered ? masteredCount : learnedCards}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">cards</span>
                </div>
              </div>
            </div>

            {/* 4. Mascot & Deck Description (Compact Inline) */}
            <div className="flex items-center justify-between gap-3 bg-slate-50/60 rounded-2xl p-2.5 border border-slate-100">
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-2 flex-1">
                {deckDescription}
              </p>

              {/* Interactive Peeking Mascot */}
              <div 
                onClick={() => handleMascotTap(deck.deck_id ?? deck.id)}
                className="relative shrink-0 cursor-pointer group active:scale-95 transition-transform"
                title="Tap for motivation! 🔥"
              >
                <AnimatePresence>
                  {isShowingCheer && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.85 }}
                      className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg z-30 whitespace-nowrap pointer-events-none"
                    >
                      {mascotCheer.text}
                      <div className="absolute -bottom-1 right-3 w-2 h-2 bg-slate-900 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <img
                  src={baseMascot.img}
                  alt={baseMascot.alt}
                  className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                />
              </div>
            </div>

            {/* 5. Dual Action Buttons */}
            <div className="pt-0.5">
              {renderDualActions(deck, deckData)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
