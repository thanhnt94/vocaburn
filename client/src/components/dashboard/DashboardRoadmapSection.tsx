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
  Compass,
  Settings
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
  displayMode?: 'carousel' | 'vertical' | 'compact'
  onOpenCustomize?: () => void
}

const CHEER_QUOTES = [
  "Keep it up! You're on fire with this streak! 🔥",
  "Every word learned today is a major leap forward! 🚀",
  "With dedication like this, you'll reach your goal in no time! 🌟",
  "I'm here cheering you on every single day! 💪",
  "Outstanding work! Let's conquer all today's steps! 🎉",
  "Your brain is absorbing vocabulary at lightning speed! 🧠⚡"
]

// ─── Compact Roadmap Card Component ──────────────────────────────────────────
function CompactRoadmapCard({
  deck,
  idx,
  onOpenStudyModal,
  navigate
}: {
  deck: any
  idx: number
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
}) {
  const st = deck?.status || {}
  const nT = st.new_target_today || 0
  const nL = st.new_learned_today || 0
  const rDn = st.review_completed_today || 0
  const dueRemaining = st.review_due_today || 0
  const rD = rDn + dueRemaining
  const s1 = st.stage_1_done
  const s2 = st.stage_2_done
  const nUrl = st.next_action_url
  const deckStreak = st.streak || deck.streak || 0
  const mcqStep = st.pipeline?.find((p: any) => p.type === 'mcq' || p.type === 'typing')
  const mcqTarget = mcqStep?.question_count || st.roadmap_daily_new || (nT > 0 ? nT : 20)
  const mcqDone = s2 
    ? mcqTarget 
    : (mcqStep?.progress?.answered_today !== undefined 
        ? Math.min(mcqTarget, mcqStep.progress.answered_today) 
        : (mcqStep?.progress?.best_score ? Math.round((mcqStep.progress.best_score / 100) * mcqTarget) : 0)
      )

  const totalCards = st.total_cards || deck.questions_count || 0
  const learnedCards = st.learned_cards || 0
  const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:border-orange-300 transition-all flex flex-col gap-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div 
          onClick={() => navigate(`/decks/${deck.deck_id}`)}
          className="flex items-center gap-2 min-w-0 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-xl bg-orange-100/70 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
              {deck.title}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-0.5">
              {deck.level && <span className="text-orange-600 font-extrabold">{deck.level} •</span>}
              <span>{learnedCards}/{totalCards} words</span>
              <span>•</span>
              <span className="text-emerald-600 font-black">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deckStreak > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/80 text-[10px] font-black flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 fill-current text-orange-500" />
              {deckStreak}d
            </span>
          )}
          <Link to={`/decks/${deck.deck_id}`} className="text-slate-400 hover:text-orange-600 p-1">
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* Mini Progress Bar */}
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden w-full">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* 3 Step Badges */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (nUrl) navigate(nUrl)
            else navigate(`/flashcard/${deck.deck_id}/play?mode=roadmap`)
          }}
          className={cn(
            "px-2 py-1 rounded-xl text-[10px] font-extrabold border flex items-center justify-center gap-1 cursor-pointer transition-all",
            s1 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50/70 text-orange-700 border-orange-200 hover:bg-orange-100"
          )}
        >
          <span>{s1 ? '✓' : '1.'} New</span>
          <span className="text-[9px] opacity-80">({nL}/{nT})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!s1) return
            const testUrl = mcqStep?.url || `/practice/${deck.deck_id}/roadmap_mcq`
            navigate(testUrl)
          }}
          className={cn(
            "px-2 py-1 rounded-xl text-[10px] font-extrabold border flex items-center justify-center gap-1 transition-all",
            s2 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer" 
              : s1 
              ? "bg-amber-50/70 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer" 
              : "bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-60"
          )}
        >
          <span>{s2 ? '✓' : '2.'} Quiz</span>
          <span className="text-[9px] opacity-80">({mcqDone}/{mcqTarget})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!s1 || !s2) return
            navigate(`/flashcard/${deck.deck_id}/play?mode=roadmap`)
          }}
          className={cn(
            "px-2 py-1 rounded-xl text-[10px] font-extrabold border flex items-center justify-center gap-1 transition-all",
            st.all_done 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer" 
              : s2 
              ? "bg-purple-50/70 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer" 
              : "bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-60"
          )}
        >
          <span>{st.all_done ? '✓' : '3.'} FSRS</span>
          <span className="text-[9px] opacity-80">({rDn}/{rD})</span>
        </button>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => {
            if (nUrl) navigate(nUrl)
            else navigate(`/decks/${deck.deck_id}`)
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-xs hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="truncate">
            {st.all_done 
              ? "Completed Today 🎉" 
              : !s1 
              ? "Learn New Words" 
              : !s2 
              ? "Take MCQ Quiz" 
              : "FSRS Review"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenStudyModal({
            id: deck.deck_id,
            title: deck.title,
            questions_count: st.total_cards || deck.questions_count || 0,
            practice_settings: deck.practice_settings
          }, 'flashcard')}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Flashcards"
        >
          <Brain className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onOpenStudyModal({
            id: deck.deck_id,
            title: deck.title,
            questions_count: st.total_cards || deck.questions_count || 0,
            practice_settings: deck.practice_settings
          }, 'practice')}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Practice Quiz"
        >
          <Trophy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Single Detailed Roadmap Card Body ────────────────────────────────────────
function DetailedRoadmapCard({
  deck,
  idx,
  totalDecks,
  onOpenStudyModal,
  navigate,
  onMascotTap,
  mascotCheer
}: {
  deck: any
  idx: number
  totalDecks: number
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
  onMascotTap: () => void
  mascotCheer: string | null
}) {
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
    <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 w-full">
      {/* ═══════════ REFINED EXECUTIVE HERO CARD ═══════════ */}
      <div className="bg-gradient-to-br from-orange-50/90 via-white to-amber-50/70 border border-orange-200/80 rounded-3xl p-3.5 sm:p-4 relative overflow-hidden shadow-xs flex flex-col gap-2.5 shrink-0">
        {/* Ambient Top Glow */}
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-orange-400/10 blur-xl pointer-events-none" />

        {/* Header Row: Title, Level & Streak */}
        <div className="flex items-center justify-between gap-2 relative z-10">
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
            className="inline-flex items-center gap-2 min-w-0 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-300/70 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors uppercase tracking-tight">
                  {deck.title}
                </span>
                {deck.level && (
                  <span className="px-1.5 py-0.2 rounded-md bg-orange-100/80 text-orange-700 text-[10px] font-black shrink-0">
                    {deck.level}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Streak pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            {deckStreak > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-[11px] font-black shadow-2xs">
                <Flame className="w-3 h-3 fill-amber-200 text-amber-200" />
                <span>{deckStreak}d streak</span>
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 shadow-2xs hidden sm:inline">
              {isDeckAllLearned ? 'Mastered 🎉' : `Est: ${estimatedDateText}`}
            </span>
          </div>
        </div>

        {/* Content Row: Progress stats & Mascot */}
        <div className="flex items-center justify-between gap-3 relative z-10 pt-0.5">
          {/* Progress Details */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {learnedCards.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  / {totalCards.toLocaleString()} words
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums">
                {pct}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-500 transition-all duration-500 shadow-2xs"
                style={{ width: `${Math.max(pct, totalCards > 0 ? 3 : 0)}%` }}
              />
            </div>

            {/* Mascot message */}
            <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
              <span className="text-slate-700 font-extrabold">{mascotLine1}</span> {mascotLine2}
            </p>
          </div>

          {/* Tap-able Mascot Illustration */}
          <div 
            onClick={onMascotTap}
            title="Tap mascot for encouragement! 🔥"
            className="relative shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <AnimatePresence>
              {mascotCheer && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.85 }}
                  className="absolute -top-10 right-0 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[10px] font-black py-1 px-2 rounded-xl shadow-lg z-30 whitespace-nowrap pointer-events-none"
                >
                  {mascotCheer}
                  <div className="absolute -bottom-1.5 right-4 w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-white" />
                </motion.div>
              )}
            </AnimatePresence>
            <img
              src={`${mascotImg}?v=exact_blackbg_v11`}
              alt="Vocaburn Mascot"
              className="w-16 h-16 sm:w-18 sm:h-18 object-contain drop-shadow-md select-none"
            />
          </div>
        </div>
      </div>

      {/* ═══════════ CONNECTED 3-STEP PIPELINE ═══════════ */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="px-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Today's Plan
            </h3>
          </div>
          <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70 text-[10px] font-black">
            {stepsCompletedCount}/3 completed
          </span>
        </div>

        {/* Pipeline Steps List */}
        <div className="flex flex-col gap-2 relative">
          {/* Step 1: New Words */}
          <div
            onClick={() => {
              if (window.navigator?.vibrate) window.navigator.vibrate(8)
              navigate(st.pipeline?.[0]?.url || nUrl || `/flashcard/${deck.deck_id}/play?mode=roadmap`)
            }}
            className={cn(
              "p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 shadow-2xs active:scale-[0.99]",
              s1
                ? "bg-emerald-50/30 border-emerald-200/80"
                : "bg-white border-orange-300 shadow-xs ring-2 ring-orange-400/20"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white",
              s1 ? "bg-emerald-500" : "bg-gradient-to-tr from-orange-500 to-amber-500"
            )}>
              {s1 ? '✓' : '1'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  1. Learn New Words
                </span>
                <span className={cn(
                  "px-2 py-0.2 text-[10px] font-black rounded-full shrink-0",
                  s1 ? "bg-emerald-100/80 text-emerald-700" : "bg-orange-100/80 text-orange-700"
                )}>
                  {s1 ? 'Done' : `${nL}/${nT}`}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all"
                  style={{ width: `${newPct}%` }}
                />
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Step 2: MCQ Quiz */}
          <div
            onClick={() => {
              if (!s1) return
              if (window.navigator?.vibrate) window.navigator.vibrate(8)
              const testUrl = mcqStep?.url || `/practice/${deck.deck_id}/roadmap_mcq`
              navigate(testUrl)
            }}
            className={cn(
              "p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center gap-3 shadow-2xs",
              !s1
                ? "bg-slate-50/60 border-slate-200/60 opacity-60 cursor-not-allowed"
                : s2
                ? "bg-emerald-50/30 border-emerald-200/80 cursor-pointer active:scale-[0.99]"
                : "bg-white border-amber-300 shadow-xs ring-2 ring-amber-400/20 cursor-pointer active:scale-[0.99]"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white",
              s2 ? "bg-emerald-500" : s1 ? "bg-gradient-to-tr from-amber-500 to-orange-500" : "bg-slate-300 text-slate-500"
            )}>
              {s2 ? '✓' : '2'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  2. {mcqStep?.type === 'typing' ? 'Typing Test' : 'MCQ Quiz'}
                </span>
                <span className={cn(
                  "px-2 py-0.2 text-[10px] font-black rounded-full shrink-0",
                  s2 ? "bg-emerald-100/80 text-emerald-700" : s1 ? "bg-amber-100/80 text-amber-700" : "bg-slate-100 text-slate-400"
                )}>
                  {s2 ? 'Passed' : s1 ? `${mcqDone}/${mcqTarget}` : 'Locked'}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${s1 ? mcqPct : 0}%` }}
                />
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Step 3: FSRS Review */}
          <div
            onClick={() => {
              if (!s1 || !s2) return
              if (window.navigator?.vibrate) window.navigator.vibrate(8)
              navigate(`/flashcard/${deck.deck_id}/play?mode=roadmap`)
            }}
            className={cn(
              "p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center gap-3 shadow-2xs",
              !s1 || !s2
                ? "bg-slate-50/60 border-slate-200/60 opacity-60 cursor-not-allowed"
                : st.all_done
                ? "bg-emerald-50/30 border-emerald-200/80 cursor-pointer active:scale-[0.99]"
                : "bg-white border-purple-300 shadow-xs ring-2 ring-purple-400/20 cursor-pointer active:scale-[0.99]"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white",
              st.all_done ? "bg-emerald-500" : s2 ? "bg-gradient-to-tr from-purple-500 to-indigo-600" : "bg-slate-300 text-slate-500"
            )}>
              {st.all_done ? '✓' : '3'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  3. FSRS Review
                </span>
                <span className={cn(
                  "px-2 py-0.2 text-[10px] font-black rounded-full shrink-0",
                  st.all_done ? "bg-emerald-100/80 text-emerald-700" : s2 ? "bg-purple-100/80 text-purple-700" : "bg-slate-100 text-slate-400"
                )}>
                  {st.all_done ? 'Done' : s2 ? `${rDn}/${rD}` : 'Locked'}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${s2 ? revPct : 0}%` }}
                />
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* ═══════════ SMART PRIMARY DOCKED CTA ═══════════ */}
      <div className="pt-1 shrink-0">
        {st.all_done ? (
          <div className="grid grid-cols-2 gap-2">
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
              className="h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl px-3 flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer font-black text-xs uppercase tracking-wide"
            >
              <Brain className="w-4 h-4" />
              <span>Continue FSRS</span>
            </button>

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
              className="h-11 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-2xl px-3 flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer font-black text-xs uppercase tracking-wide"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Practice Quiz</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => { 
              if (window.navigator?.vibrate) window.navigator.vibrate(12)
              if (nUrl) navigate(nUrl)
              else navigate(`/decks/${deck.deck_id}`)
            }}
            className="w-full h-12 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl px-4 flex items-center justify-between shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white leading-tight">
                {!s1
                  ? 'Start Step 1: Learn New Words'
                  : !s2
                  ? 'Start Step 2: Take MCQ Quiz'
                  : 'Start Step 3: FSRS Review'}
              </span>
              <span className="text-[10px] text-orange-100 font-medium">
                {!s1
                  ? `${nT - nL} new words remaining today`
                  : !s2
                  ? 'Pass with score >= 80%'
                  : `${dueRemaining} review cards due`}
              </span>
            </div>

            <ChevronRight className="w-4 h-4 stroke-[3] text-orange-100 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Roadmap Section ─────────────────────────────────────────────────────
export function DashboardRoadmapSection({
  roadmapDecks,
  remainingTime,
  selectedRoadmapIdx,
  onSelectRoadmapIdx,
  onOpenStudyModal,
  navigate,
  isDesktop = false,
  displayMode = 'carousel',
  onOpenCustomize
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
  const st = deck?.status || {}

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

  // ══════════════ COMPACT CARDS VIEW ══════════════
  if (displayMode === 'compact') {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden text-left select-none">
        {/* Header Bar */}
        <div className={cn(
          "px-3.5 sm:px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs font-semibold text-slate-500 gap-2",
          isDesktop ? "bg-white/95 backdrop-blur-xs border-b border-slate-100/90" : "bg-transparent"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-slate-900 font-black tracking-tight text-xs shrink-0 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              <span>{totalDecks} Roadmap Decks</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
              <span className="tabular-nums font-extrabold">{remainingTime} left</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {onOpenCustomize && isDesktop && (
              <button
                type="button"
                onClick={onOpenCustomize}
                className="w-7 h-7 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Customize Roadmap & Layout"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Compact List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
          {roadmapDecks.map((d: any, i: number) => (
            <CompactRoadmapCard
              key={d.deck_id || i}
              deck={d}
              idx={i}
              onOpenStudyModal={onOpenStudyModal}
              navigate={navigate}
            />
          ))}
        </div>
      </div>
    )
  }

  // ══════════════ VERTICAL STACK VIEW ══════════════
  if (displayMode === 'vertical') {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden text-left select-none">
        {/* Header Bar */}
        <div className={cn(
          "px-3.5 sm:px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs font-semibold text-slate-500 gap-2",
          isDesktop ? "bg-white/95 backdrop-blur-xs border-b border-slate-100/90" : "bg-transparent"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-slate-900 font-black tracking-tight text-xs shrink-0 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              <span>{totalDecks} Roadmap Decks</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
              <span className="tabular-nums font-extrabold">{remainingTime} left</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {onOpenCustomize && isDesktop && (
              <button
                type="button"
                onClick={onOpenCustomize}
                className="w-7 h-7 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Customize Roadmap & Layout"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Stack List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
          {roadmapDecks.map((d: any, i: number) => (
            <div key={d.deck_id || i} className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-4 shadow-sm">
              <DetailedRoadmapCard
                deck={d}
                idx={i}
                totalDecks={totalDecks}
                onOpenStudyModal={onOpenStudyModal}
                navigate={navigate}
                onMascotTap={handleMascotTap}
                mascotCheer={mascotCheer}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ══════════════ CAROUSEL (SWIPE SINGLE CARD) VIEW ══════════════
  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-left select-none">
      {/* Subheader Bar */}
      <div className={cn(
        "px-3.5 sm:px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs font-semibold text-slate-500 gap-2",
        isDesktop ? "bg-white/95 backdrop-blur-xs border-b border-slate-100/90" : "bg-transparent"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Deck Switcher */}
          {totalDecks > 1 ? (
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-slate-200/70 shadow-2xs">
              <button
                type="button"
                onClick={() => onSelectRoadmapIdx(Math.max(0, safeIdx - 1))}
                disabled={safeIdx === 0}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  safeIdx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90"
                )}
                title="Previous deck"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="text-[11px] font-black text-slate-800 px-1 tabular-nums">
                {safeIdx + 1}/{totalDecks}
              </span>
              <button
                type="button"
                onClick={() => onSelectRoadmapIdx(Math.min(totalDecks - 1, safeIdx + 1))}
                disabled={safeIdx === totalDecks - 1}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  safeIdx === totalDecks - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90"
                )}
                title="Next deck"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-900 font-black tracking-tight text-xs shrink-0 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              <span>Daily Roadmap</span>
            </div>
          )}

          {totalDecks > 1 && (
            <span className="text-[9px] font-bold text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 hidden sm:inline-flex items-center gap-1" title="Roll mouse wheel over roadmap to switch">
              <span>Scroll</span>
              <span>🖱️</span>
            </span>
          )}

          {!st.all_done ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
              <span className="tabular-nums font-extrabold">{remainingTime} left</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-900 border border-emerald-500/20 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <span className="text-xs">✓</span>
              <span>Completed today</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {onOpenCustomize && isDesktop && (
            <button
              type="button"
              onClick={onOpenCustomize}
              className="w-7 h-7 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="Customize Roadmap & Layout"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          <Link 
            to={`/decks/${deck.deck_id}`}
            className="text-xs font-black text-orange-600 hover:text-orange-700 bg-white/90 hover:bg-white border border-slate-200/70 hover:border-orange-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* Roadmap Body with Mouse Wheel Flip */}
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
            <DetailedRoadmapCard
              deck={deck}
              idx={safeIdx}
              totalDecks={totalDecks}
              onOpenStudyModal={onOpenStudyModal}
              navigate={navigate}
              onMascotTap={handleMascotTap}
              mascotCheer={mascotCheer}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
