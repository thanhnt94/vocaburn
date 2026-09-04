import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Layers, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  BookOpen, 
  Flame, 
  Brain, 
  Trophy, 
  Sparkles, 
  FileText, 
  Keyboard, 
  RotateCcw, 
  Play, 
  Compass 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardRoadmapSectionProps {
  roadmapDecks: any[] | undefined
  remainingTime: string
  selectedRoadmapIdx: number
  onSelectRoadmapIdx: (idx: number) => void
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
  isDesktop?: boolean
}

const CHEER_QUOTES = [
  "Keep it up! You're on fire with this streak! 🔥",
  "Every word learned today is a major leap forward! 🚀",
  "With dedication like this, you'll reach your goal in no time! 🌟",
  "I'm here cheering you on every single day! 💪",
  "Outstanding work! Let's conquer all today's steps! 🎉",
  "Your brain is absorbing vocabulary at lightning speed! 🧠⚡"
]

export function DashboardRoadmapSection({
  roadmapDecks,
  remainingTime,
  selectedRoadmapIdx,
  onSelectRoadmapIdx,
  onOpenStudyModal,
  navigate,
  isDesktop = false
}: DashboardRoadmapSectionProps) {
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const [slideDir, setSlideDir] = useState<'down' | 'up'>('down')
  const isScrollingRef = useRef(false)

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

  const hasRoadmapDecks = roadmapDecks && roadmapDecks.length > 0

  if (!hasRoadmapDecks) {
    return (
      <div className={cn(
        "flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto",
        isDesktop ? "h-full justify-center" : ""
      )}>
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 flex items-center justify-center border-2 border-orange-200/80 shadow-md">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md text-sm font-bold">
            ✨
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight italic leading-tight">
          Activate Learning Roadmap
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mt-1.5 mb-6 max-w-xs">
          Dashboard is your daily learning hub. Activate a roadmap to automatically schedule new vocabulary and FSRS reviews each day!
        </p>

        <div className="w-full space-y-2.5 mb-6 text-left">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
              1
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900">Go to "Decks" tab</h4>
              <p className="text-[11px] text-slate-500 font-medium">Choose a deck from the Library or create your custom deck.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
              2
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900">Turn on "Daily Roadmap"</h4>
              <p className="text-[11px] text-slate-500 font-medium">Set your daily target to activate intelligent spaced repetition.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
              3
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900">Complete 3 steps & Keep streak</h4>
              <p className="text-[11px] text-slate-500 font-medium">Master: 1. New words ➔ 2. MCQ Quiz ➔ 3. FSRS Review.</p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-2">
          <button
            onClick={() => {
              if (window.navigator?.vibrate) window.navigator.vibrate(10)
              navigate('/decks')
            }}
            className="w-full h-12 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Explore Decks & Activate Roadmap →</span>
          </button>
        </div>
      </div>
    )
  }

  const safeIdx = Math.min(Math.max(0, selectedRoadmapIdx), roadmapDecks.length - 1)
  const deck = roadmapDecks[safeIdx] || roadmapDecks[0]
  const totalDecks = roadmapDecks.length

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (totalDecks <= 1) return
    if (Math.abs(e.deltaY) < 25) return
    if (isScrollingRef.current) return

    if (e.deltaY > 0) {
      if (safeIdx < totalDecks - 1) {
        isScrollingRef.current = true
        setSlideDir('down')
        if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
        onSelectRoadmapIdx(safeIdx + 1)
        setTimeout(() => {
          isScrollingRef.current = false
        }, 350)
      }
    } else {
      if (safeIdx > 0) {
        isScrollingRef.current = true
        setSlideDir('up')
        if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
        onSelectRoadmapIdx(safeIdx - 1)
        setTimeout(() => {
          isScrollingRef.current = false
        }, 350)
      }
    }
  }

  const st = deck?.status || {}
  const nT = st.new_target_today || 0
  const nL = st.new_learned_today || 0
  const rDn = st.review_completed_today || 0
  const dueRemaining = st.review_due_today || 0
  const rD = rDn + dueRemaining
  const tT = nT + rD
  const tD = nL + rDn
  const pct = st.all_done ? 100 : (tT > 0 ? Math.min(100, Math.round((tD / tT) * 100)) : 0)
  const s1 = st.stage_1_done
  const s2 = st.stage_2_done
  const nUrl = st.next_action_url

  const newPct = nT > 0 ? Math.min(100, Math.round((nL / nT) * 100)) : 100
  const revPct = rD > 0 ? Math.min(100, Math.round((rDn / rD) * 100)) : 100
  const mcqStep = st.pipeline?.find((p: any) => p.type === 'mcq' || p.type === 'typing')
  const mcqTarget = mcqStep?.question_count || st.roadmap_daily_new || (nT > 0 ? nT : 20)
  const mcqDone = s2 
    ? mcqTarget 
    : (mcqStep?.progress?.answered_today !== undefined 
        ? Math.min(mcqTarget, mcqStep.progress.answered_today) 
        : (mcqStep?.progress?.best_score ? Math.round((mcqStep.progress.best_score / 100) * mcqTarget) : 0)
      )
  const mcqPct = mcqTarget > 0 ? Math.min(100, Math.round((mcqDone / mcqTarget) * 100)) : 0

  // Mascot selection
  const deckStreak = st.streak || deck.streak || 0
  let mascotImg = '/mascot/sleepy.png'
  let mascotLine1 = 'No cards learned yet today,'
  let mascotLine2 = "let's get started! 🚀"
  
  if (st.all_done) {
    mascotImg = '/mascot/celebrating.png'
    mascotLine1 = 'Brilliant!'
    mascotLine2 = "You've completed today's roadmap! 🎉"
  } else if (pct >= 30 || s1) {
    mascotImg = '/mascot/excited.png'
    mascotLine1 = 'On fire!'
    mascotLine2 = 'Keep up the great momentum 🔥'
  } else if (pct > 0 || nL > 0 || rDn > 0) {
    mascotImg = '/mascot/excited.png'
    mascotLine1 = 'Off to a great start!'
    mascotLine2 = "Let's conquer today's goals 💪"
  }

  // Estimated completion date computation
  const totalCards = st.total_cards || deck.questions_count || 0
  const learnedCards = st.learned_cards || 0
  const unlearnedCards = st.unlearned_cards !== undefined ? st.unlearned_cards : Math.max(0, totalCards - learnedCards)
  const isDeckAllLearned = totalCards > 0 && (unlearnedCards === 0 || learnedCards >= totalCards)

  let estimatedDateText = '—'
  if (isDeckAllLearned) {
    estimatedDateText = 'Mastered 🎉'
  } else if (st.roadmap_type === 'accumulation') {
    estimatedDateText = 'Endless'
  } else if (st.estimated_completion_date) {
    try {
      const d = new Date(st.estimated_completion_date)
      if (!isNaN(d.getTime())) {
        estimatedDateText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } else {
        estimatedDateText = st.estimated_completion_date
      }
    } catch {
      estimatedDateText = st.estimated_completion_date
    }
  } else {
    const dailyNew = st.roadmap_daily_new || st.new_target_today || 20
    if (dailyNew > 0 && unlearnedCards > 0) {
      const daysLeft = Math.ceil(unlearnedCards / dailyNew)
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + daysLeft)
      estimatedDateText = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const stepsCompletedCount = (s1 ? 1 : 0) + (s2 ? 1 : 0) + (st.all_done ? 1 : 0)

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-left select-none">
      {/* ═══════════ SUBHEADER BAR: DECK INDEX + COUNTDOWN + DETAILS ═══════════ */}
      <div className="px-3.5 sm:px-4 py-2 bg-white/95 backdrop-blur-xs flex items-center justify-between flex-shrink-0 text-xs font-semibold text-slate-500 border-b border-slate-100/90 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-slate-900 font-black tracking-tight text-xs shrink-0">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span>{totalDecks > 1 ? `Roadmap ${safeIdx + 1}/${totalDecks}` : 'Daily Roadmap'}</span>
          </div>

          {/* Quick Deck Switcher Controls if Multiple Decks */}
          {totalDecks > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => onSelectRoadmapIdx(Math.max(0, safeIdx - 1))}
                disabled={safeIdx === 0}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  safeIdx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-white cursor-pointer shadow-2xs"
                )}
                title="Previous roadmap"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onSelectRoadmapIdx(Math.min(totalDecks - 1, safeIdx + 1))}
                disabled={safeIdx === totalDecks - 1}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  safeIdx === totalDecks - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-white cursor-pointer shadow-2xs"
                )}
                title="Next roadmap"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {totalDecks > 1 && (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md hidden sm:inline-flex items-center gap-1" title="Roll mouse wheel over roadmap to switch">
              <span>Scroll</span>
              <span>🖱️</span>
            </span>
          )}

          {/* COUNTDOWN TIMER BADGE ON THE ROADMAP BAR */}
          {!st.all_done ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-950 border border-amber-300/80 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-700 shrink-0" />
              <span className="tabular-nums font-extrabold">{remainingTime} left</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-950 border border-emerald-300/80 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <span className="text-xs">✓</span>
              <span>Completed today</span>
            </div>
          )}
        </div>

        <Link 
          to={`/decks/${deck.deck_id}`}
          className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ml-auto"
        >
          <span>Details</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </Link>
      </div>

      {/* ═══════════ ROADMAP BODY (CONTAINER WITH DEDICATED INNER SCROLL & MOUSE WHEEL FLIP) ═══════════ */}
      <div 
        onWheel={handleWheel}
        className="flex-1 flex flex-col justify-between p-3 sm:p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden gap-3 min-h-0 w-full"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0, y: slideDir === 'down' ? 14 : -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: slideDir === 'down' ? -14 : 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex-1 flex flex-col justify-between gap-3 min-h-0 w-full"
          >
            {/* ═══════════ HERO MASCOT CARD (GENEROUS & HEROIC) ═══════════ */}
            <div className="bg-gradient-to-br from-amber-100/95 via-orange-50/70 to-amber-200/40 border border-orange-200/90 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xs flex flex-row items-center justify-between flex-1 min-h-[230px] sm:min-h-[260px] shrink-0">
              
              {/* LEFT SIDE: DECK TITLE, CLEAN PILLS & SLOGAN */}
              <div className="relative z-20 flex-1 max-w-[56%] sm:max-w-[58%] min-w-0 flex flex-col justify-center gap-3 py-1">
                
                {/* 1. DECK TITLE & LEVEL */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenStudyModal({
                      id: deck.deck_id,
                      title: deck.title,
                      questions_count: st.total_cards || deck.questions_count || 0,
                      practice_settings: deck.practice_settings
                    }, 'flashcard')
                  }}
                  className="inline-flex items-center gap-2 max-w-full text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-300/70 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-base sm:text-lg font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                    {deck.title}
                  </span>
                  {deck.level && (
                    <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-700 border border-orange-200/80 text-[11px] font-black shrink-0">
                      {deck.level}
                    </span>
                  )}
                </button>

                {/* 2. PROMINENT PILLS (STREAK, PROGRESS, EST DATE) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 🔥 STREAK */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-xs font-black shadow-xs shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
                    <span>{deckStreak} Day Streak</span>
                  </div>

                  {/* 🎓 WORDS PROGRESS BAR WITH GREEN FILL & % NUMBER OUTSIDE */}
                  <div className="inline-flex items-center gap-1.5 shrink-0">
                    <div className="relative h-6 sm:h-6.5 min-w-[135px] sm:min-w-[155px] bg-white/90 backdrop-blur-xs border border-orange-200/90 rounded-full p-0.5 shadow-2xs overflow-hidden flex items-center">
                      {/* Green Fill Bar */}
                      <div 
                        className="absolute inset-y-0.5 left-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 shadow-2xs"
                        style={{ width: `${Math.max(0, Math.min(100, (learnedCards / (totalCards || 1)) * 100))}%` }}
                      />
                      {/* Text inside the bar */}
                      <span className="relative z-10 font-black text-[11px] sm:text-xs text-slate-900 px-2.5 truncate">
                        {learnedCards.toLocaleString()}/{totalCards.toLocaleString()} words
                      </span>
                    </div>

                    {/* % Number Outside */}
                    <span className="font-black text-xs sm:text-sm text-emerald-600 tabular-nums shrink-0">
                      {totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0}%
                    </span>
                  </div>

                  {/* 📅 EST DATE */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/80 backdrop-blur-xs text-slate-600 border border-orange-200/70 rounded-full text-[11px] sm:text-xs font-semibold shadow-2xs shrink-0">
                    {isDeckAllLearned ? (
                      <span className="text-emerald-700 font-black">Mastered 🎉</span>
                    ) : (
                      <span>Est: {estimatedDateText}</span>
                    )}
                  </div>
                </div>

                {/* 3. INSPIRING SLOGAN */}
                <div className="flex flex-col gap-1 pt-1">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {mascotLine1}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 leading-snug">
                    {mascotLine2}
                  </p>
                </div>

              </div>

              {/* RIGHT SIDE: MASCOT WITH INTERACTIVE CHEER (BIG & HEROIC) */}
              <div 
                onClick={handleMascotTap}
                title="Tap the mascot for extra motivation! 🔥"
                className="w-[46%] max-w-[360px] absolute right-1 sm:right-3 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group"
              >
                {/* FLOATING SPEECH BUBBLE ON TAP */}
                <AnimatePresence>
                  {mascotCheer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.85 }}
                      className="absolute top-2 right-2 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[11px] font-black p-2.5 rounded-2xl shadow-xl z-30 max-w-[190px] pointer-events-none text-center"
                    >
                      <div className="relative">
                        {mascotCheer}
                        <div className="absolute -bottom-4 right-6 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-white" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.img 
                  key={mascotImg}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={`${mascotImg}?v=exact_blackbg_v11`} 
                  alt="Vocaburn Mascot" 
                  className="h-[110%] sm:h-[118%] max-h-[360px] w-auto max-w-none object-contain object-bottom drop-shadow-2xl translate-y-1 sm:translate-y-2 transition-transform group-hover:scale-105 active:scale-95 select-none"
                />
              </div>

          {/* 2 ACTION BUTTONS: FLASHCARD (BRAIN) & PRACTICE (TROPHY) */}
          {!st.all_done && (
            <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 z-30 flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenStudyModal({
                    id: deck.deck_id,
                    title: deck.title,
                    questions_count: st.total_cards || deck.questions_count || 0,
                    practice_settings: deck.practice_settings
                  }, 'flashcard')
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 border border-white/50 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                title="Study Flashcards"
              >
                <Brain className="w-4.5 h-4.5 text-white" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenStudyModal({
                    id: deck.deck_id,
                    title: deck.title,
                    questions_count: st.total_cards || deck.questions_count || 0,
                    practice_settings: deck.practice_settings
                  }, 'practice')
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-white/50 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                title="Practice Quiz"
              >
                <Trophy className="w-4.5 h-4.5 text-white" />
              </button>
            </div>
          )}

        </div>

        {/* ═══════════ SECTION TITLE: TODAY'S STEPS ═══════════ */}
        <div className="px-1 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
              Today's Steps
            </h3>
          </div>

          <div className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70 text-[10px] sm:text-[11px] font-bold">
            <span>{stepsCompletedCount}/3 completed</span>
          </div>
        </div>

        {/* ═══════════ 3 STEPS CONTAINER (TIMELINE CONNECTORS) ═══════════ */}
        <div className="flex flex-col gap-2.5 relative pt-0.5 shrink-0">
          
          {/* Step 1 Item */}
          <div className="flex items-center gap-3.5 relative">
            <div className={cn(
              "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
              s1 ? "bg-emerald-500" : "bg-gradient-to-tr from-orange-500 to-amber-500 scale-105 ring-2 ring-orange-200"
            )}>
              {s1 ? '✓' : '1'}
            </div>

            <div 
              onClick={() => {
                if (window.navigator?.vibrate) window.navigator.vibrate(8)
                navigate(st.pipeline?.[0]?.url || nUrl || `/flashcard/${deck.deck_id}/play?mode=roadmap`)
              }}
              title={s1 ? "Goal completed. Tap to review or learn more words!" : "Start learning new words today"}
              className={cn(
                "flex-1 bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3 relative transition-all cursor-pointer hover:shadow-sm active:scale-[0.99]",
                s1 ? "border-emerald-200/90 bg-emerald-50/20" : "border-orange-300/90 bg-orange-50/20 hover:border-orange-400"
              )}
            >
              <div className={cn(
                "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                s1 ? "border-r-emerald-100" : "border-r-orange-200"
              )} />

              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center shrink-0 text-orange-500">
                <BookOpen className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">Learn New Words</span>
                  {s1 && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">✓ Done</span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                  <span className={cn("text-sm font-black", !s1 ? "text-orange-600" : "text-slate-500")}>{nL}</span>
                  <span className="text-slate-400 font-medium text-xs">/ {nT} new words</span>
                </div>

                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                  <div className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${newPct}%` }} />
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Connecting Line 1 -> 2 */}
          <div className="absolute top-[34px] bottom-[110px] left-[16px] w-0.5 bg-slate-200 z-0 pointer-events-none" />

          {/* Step 2 Item */}
          <div className="flex items-center gap-3.5 relative">
            <div className={cn(
              "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
              s2 ? "bg-emerald-500" : s1 ? "bg-gradient-to-tr from-amber-500 to-orange-500 scale-105 ring-2 ring-amber-200" : "bg-slate-200 text-slate-400"
            )}>
              {s2 ? '✓' : '2'}
            </div>

            <div 
              onClick={() => {
                if (!s1) return
                if (window.navigator?.vibrate) window.navigator.vibrate(8)
                const testUrl = mcqStep?.url || `/practice/${deck.deck_id}/roadmap_mcq`
                navigate(testUrl)
              }}
              title={!s1 ? "Complete Step 1 (Learn New Words) first" : s2 ? "Target achieved! Tap to review or retake test" : "Start MCQ test"}
              className={cn(
                "flex-1 bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3 relative transition-all",
                !s1 ? "cursor-not-allowed opacity-60 bg-slate-50/60 border-slate-200/60" : "cursor-pointer hover:shadow-sm active:scale-[0.99]",
                s2 ? "border-emerald-200/90 bg-emerald-50/20" : s1 ? "border-amber-300/90 bg-amber-50/20 hover:border-amber-400" : ""
              )}
            >
              <div className={cn(
                "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                s2 ? "border-r-emerald-100" : s1 ? "border-r-amber-200" : "border-r-slate-200/60"
              )} />

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                s2 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : s1 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-100 border-slate-200/60 text-slate-400"
              )}>
                {mcqStep?.type === 'typing' ? (
                  <Keyboard className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {mcqStep?.type === 'typing' ? 'Typing Test' : 'MCQ Quiz'}
                  </span>
                  {s2 && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">✓ Done</span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                  <span className={cn("text-sm font-black", s1 ? "text-amber-600" : "text-slate-400")}>{mcqDone}</span>
                  <span className="text-slate-400 font-medium text-xs">/ {mcqTarget} questions</span>
                </div>

                {s1 && (
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${mcqPct}%` }} />
                  </div>
                )}
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Connecting Line 2 -> 3 */}
          <div className="absolute top-[110px] bottom-[34px] left-[16px] w-0.5 bg-slate-200 z-0 pointer-events-none" />

          {/* Step 3 Item */}
          <div className="flex items-center gap-3.5 relative">
            <div className={cn(
              "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
              st.all_done ? "bg-emerald-500" : s2 ? "bg-gradient-to-tr from-purple-500 to-indigo-600 scale-105 ring-2 ring-purple-200" : "bg-slate-200 text-slate-400"
            )}>
              {st.all_done ? '✓' : '3'}
            </div>

            <div 
              onClick={() => {
                if (!s1 || !s2) return
                if (window.navigator?.vibrate) window.navigator.vibrate(8)
                const fsrsStep = st.pipeline?.find((p: any) => p.type === 'fsrs_review')
                const fsrsUrl = fsrsStep?.url || `/flashcard/${deck.deck_id}/play?mode=roadmap&step=fsrs_review`
                navigate(fsrsUrl)
              }}
              title={!s1 ? "Complete Step 1 (Learn New Words) first" : !s2 ? "Complete Step 2 (MCQ Quiz) first" : st.all_done ? "FSRS review finished! Tap to review or study more" : "Start FSRS review"}
              className={cn(
                "flex-1 bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3 relative transition-all",
                (!s1 || !s2) ? "cursor-not-allowed opacity-60 bg-slate-50/60 border-slate-200/60" : "cursor-pointer hover:shadow-sm active:scale-[0.99]",
                st.all_done ? "border-emerald-200/90 bg-emerald-50/20" : (s1 && s2) ? "border-purple-300/90 bg-purple-50/20 hover:border-purple-400" : ""
              )}
            >
              <div className={cn(
                "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                st.all_done ? "border-r-emerald-100" : (s1 && s2) ? "border-r-purple-200" : "border-r-slate-200/60"
              )} />

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                st.all_done ? "bg-emerald-50 border-emerald-100 text-emerald-600" : s2 ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-slate-100 border-slate-200/60 text-slate-400"
              )}>
                <RotateCcw className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">FSRS Review</span>
                  {st.all_done && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">✓ Done</span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                  <span className={cn("text-sm font-black", s2 ? "text-purple-600" : "text-slate-400")}>{rDn}</span>
                  <span className="text-slate-400 font-medium text-xs">/ {rD} cards due</span>
                </div>

                {s2 && (
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all" style={{ width: `${revPct}%` }} />
                  </div>
                )}
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* ═══════════ CTA ACTION AREA ═══════════ */}
        <div className="pt-0.5 flex-shrink-0">
          {st.all_done ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
              {/* BUTTON 1: CONTINUE FSRS */}
              <button
                type="button"
                onClick={() => {
                  if (window.navigator?.vibrate) window.navigator.vibrate(12)
                  onOpenStudyModal({
                    id: deck.deck_id,
                    title: deck.title,
                    questions_count: st.total_cards || deck.questions_count || 0,
                    practice_settings: deck.practice_settings
                  }, 'flashcard')
                }}
                className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer group text-left"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white block truncate">
                    Continue FSRS
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-orange-100 font-medium block truncate mt-0.5">
                    Review / Learn cards
                  </span>
                </div>
              </button>

              {/* BUTTON 2: PRACTICE QUIZ */}
              <button
                type="button"
                onClick={() => {
                  if (window.navigator?.vibrate) window.navigator.vibrate(12)
                  onOpenStudyModal({
                    id: deck.deck_id,
                    title: deck.title,
                    questions_count: st.total_cards || deck.questions_count || 0,
                    practice_settings: deck.practice_settings
                  }, 'practice')
                }}
                className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer group text-left"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white block truncate">
                    Practice Quiz
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-100 font-medium block truncate mt-0.5">
                    MCQ / Typing test
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => { 
                if (window.navigator?.vibrate) window.navigator.vibrate(12)
                if (nUrl) navigate(nUrl)
                else navigate(`/decks/${deck.deck_id}`)
              }}
              className="w-full relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
            >
              <div className="w-8.5 h-8.5 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center px-3">
                <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white leading-tight">
                  {!s1
                    ? 'LEARN NEW WORDS'
                    : !s2
                    ? 'TAKE MCQ QUIZ'
                    : 'FSRS REVIEW'}
                </span>
                <span className="text-[11px] sm:text-xs text-orange-100 font-medium mt-0.5">
                  {!s1
                    ? `Step 1: ${nT - nL} new cards remaining today`
                    : !s2
                    ? `Step 2: Score >= 80% to pass`
                    : `Step 3: ${dueRemaining} cards due for review`}
                </span>
              </div>

              <div className="text-xs font-black uppercase tracking-wider text-orange-100 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                <span>Start</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          )}
        </div>

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
