import React, { useState, useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { LayoutGrid, BookOpen, Brain, Trophy, Flame, Star, EyeOff, Search, Sparkles } from 'lucide-react'

interface Question {
  options?: any[]
  stats?: {
    total?: number
    again_count?: number
    hard_count?: number
    good_count?: number
    easy_count?: number
  }
  box_level?: number
  fsrs?: {
    state?: number
    stability?: number | null
    difficulty?: number | null
    due?: string | null
  }
  practice?: {
    correct_index?: number
  }
  is_ignored?: boolean
  is_starred?: boolean
}

interface QuestionMapGridProps {
  questions: Question[]
  mainTab: 'fsrs' | 'practice'
  practiceAnswers: Record<number, number>
  sessionAnswers: Record<number, number | number[]>
  currentIndex: number
  navigateToQuestion: (index: number) => void
  setIsMapOpen: (open: boolean) => void
  filterMode?: 'all' | 'unseen' | 'learning' | 'mastered' | 'hard' | 'starred' | 'ignored'
  setFilterMode?: (mode: 'all' | 'unseen' | 'learning' | 'mastered' | 'hard' | 'starred' | 'ignored') => void
  showFiltersInline?: boolean
}

export const QuestionMapGrid: React.FC<QuestionMapGridProps> = ({
  questions,
  mainTab,
  practiceAnswers,
  sessionAnswers,
  currentIndex,
  navigateToQuestion,
  setIsMapOpen,
  filterMode,
  setFilterMode,
  showFiltersInline = true,
}) => {
  const isPractice = mainTab === 'practice'
  const [internalFilterMode, setInternalFilterMode] = useState<'all' | 'unseen' | 'learning' | 'mastered' | 'hard' | 'starred' | 'ignored'>('all')
  const [jumpInput, setJumpInput] = useState('')
  const activeCardRef = useRef<HTMLButtonElement | null>(null)

  const activeFilterMode = filterMode !== undefined ? filterMode : internalFilterMode
  const activeSetFilterMode = setFilterMode !== undefined ? setFilterMode : setInternalFilterMode

  // Automatically scroll to active card when map is viewed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeCardRef.current) {
        activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [currentIndex, activeFilterMode])

  const getCardStatus = (item: Question): 'ignored' | 'starred' | 'hard' | 'mastered' | 'unseen' | 'learning' => {
    if (item.is_ignored) return 'ignored'
    if (item.is_starred) return 'starred'

    const stats = item.stats || { total: 0, again_count: 0, hard_count: 0 }
    const total = stats.total || 0
    const again = stats.again_count || 0
    const hard = stats.hard_count || 0
    const isHard = (item.fsrs?.difficulty !== undefined && item.fsrs.difficulty !== null)
      ? (
          item.fsrs.difficulty >= 8.0 &&
          (item.fsrs.stability === undefined || item.fsrs.stability === null || item.fsrs.stability < 5.0) &&
          total >= 20 &&
          ((again + hard) / total >= 0.4)
        )
      : (total >= 20 && (again + hard) >= 8 && ((again + hard) / total >= 0.4))

    if (isHard) return 'hard'
    if ((item.box_level === 5 && total >= 4) || item.fsrs?.state === 2) return 'mastered'
    if (total === 0 && (!item.fsrs?.state || item.fsrs.state === 0)) return 'unseen'
    return 'learning'
  }

  // Pre-calculate status distribution for retention bar and filter pills
  const statusCounts = useMemo(() => {
    let mastered = 0
    let learning = 0
    let unseen = 0
    let hard = 0
    let starred = 0
    let ignored = 0

    if (questions) {
      questions.forEach((q) => {
        if (q.is_starred) starred++
        if (q.is_ignored) ignored++
        const st = getCardStatus(q)
        if (st === 'mastered') mastered++
        else if (st === 'hard') hard++
        else if (st === 'unseen') unseen++
        else learning++
      })
    }

    return {
      all: questions?.length || 0,
      mastered,
      learning,
      unseen,
      hard,
      starred,
      ignored,
    }
  }, [questions])

  const totalCards = questions?.length || 0
  const masteredPct = totalCards > 0 ? Math.round((statusCounts.mastered / totalCards) * 100) : 0
  const learningPct = totalCards > 0 ? Math.round((statusCounts.learning / totalCards) * 100) : 0
  const unseenPct = Math.max(0, 100 - masteredPct - learningPct)

  // Filtered list of questions with original 0-indexed position
  const filteredQuestions = useMemo(() => {
    if (!questions) return []
    return questions
      .map((q, idx) => ({ ...q, originalIndex: idx }))
      .filter((item) => {
        if (activeFilterMode === 'all') return true
        return getCardStatus(item) === activeFilterMode
      })
  }, [questions, activeFilterMode])

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetIdx = parseInt(jumpInput, 10)
    if (!isNaN(targetIdx) && targetIdx >= 1 && targetIdx <= totalCards) {
      navigateToQuestion(targetIdx - 1)
      setIsMapOpen(false)
      setJumpInput('')
    }
  }

  const FILTER_PILLS = [
    { id: 'all' as const, label: 'All', icon: LayoutGrid, count: statusCounts.all, activeColor: 'bg-slate-900 text-white shadow-xs' },
    { id: 'mastered' as const, label: 'Mastered', icon: Trophy, count: statusCounts.mastered, activeColor: 'bg-emerald-600 text-white shadow-xs' },
    { id: 'learning' as const, label: 'Learning', icon: Brain, count: statusCounts.learning, activeColor: 'bg-indigo-600 text-white shadow-xs' },
    { id: 'unseen' as const, label: 'Unseen', icon: BookOpen, count: statusCounts.unseen, activeColor: 'bg-slate-600 text-white shadow-xs' },
    { id: 'hard' as const, label: 'Hard', icon: Flame, count: statusCounts.hard, activeColor: 'bg-rose-600 text-white shadow-xs' },
    { id: 'starred' as const, label: 'Starred', icon: Star, count: statusCounts.starred, activeColor: 'bg-amber-500 text-white shadow-xs' },
    ...(statusCounts.ignored > 0 ? [{ id: 'ignored' as const, label: 'Ignored', icon: EyeOff, count: statusCounts.ignored, activeColor: 'bg-slate-500 text-white shadow-xs' }] : []),
  ]

  return (
    <div className="space-y-3.5 flex flex-col h-full">
      {/* ── Retention Progress Distribution Bar ── */}
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-3 shadow-xs flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between text-[10.5px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" />
            <span>Mastered</span>
            <span className="font-extrabold text-slate-800">{statusCounts.mastered}</span>
            <span className="text-slate-400 font-medium">({masteredPct}%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-indigo-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-xs shadow-indigo-500/40" />
            <span>Learning</span>
            <span className="font-extrabold text-slate-800">{statusCounts.learning}</span>
            <span className="text-slate-400 font-medium">({learningPct}%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>Unseen</span>
            <span className="font-extrabold text-slate-800">{statusCounts.unseen}</span>
            <span className="text-slate-400 font-medium">({unseenPct}%)</span>
          </span>
        </div>

        {/* Multi-Segment Track */}
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner gap-0.5 p-0.5">
          <div
            style={{ width: `${masteredPct}%` }}
            className="bg-emerald-500 rounded-full transition-all duration-500 min-w-[3px]"
            title={`Mastered: ${statusCounts.mastered} cards`}
          />
          <div
            style={{ width: `${learningPct}%` }}
            className="bg-indigo-500 rounded-full transition-all duration-500 min-w-[3px]"
            title={`Learning: ${statusCounts.learning} cards`}
          />
          <div
            style={{ width: `${unseenPct}%` }}
            className="bg-slate-300 rounded-full transition-all duration-500 min-w-[3px]"
            title={`Unseen: ${statusCounts.unseen} cards`}
          />
        </div>
      </div>

      {/* ── Filter Chips & Quick Jump Input ── */}
      {showFiltersInline && (
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Horizontal Filter Chips */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {FILTER_PILLS.map((pill) => {
                const isSelected = activeFilterMode === pill.id
                const IconComponent = pill.icon
                return (
                  <button
                    key={pill.id}
                    onClick={() => activeSetFilterMode(pill.id)}
                    className={cn(
                      "h-7.5 px-2.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer shrink-0 border",
                      isSelected
                        ? cn(pill.activeColor, "border-transparent")
                        : "bg-white/90 text-slate-600 hover:bg-slate-50 border-slate-200/80 hover:text-slate-900"
                    )}
                  >
                    <IconComponent className="w-3 h-3 shrink-0" />
                    <span>{pill.label}</span>
                    <span className={cn(
                      "text-[9.5px] font-black px-1.5 py-0.2 rounded-md",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {pill.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Jump to Card Input */}
            <form onSubmit={handleJumpSubmit} className="relative flex items-center w-24 shrink-0">
              <input
                type="number"
                min="1"
                max={totalCards}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={`#1-${totalCards}`}
                className="w-full h-7.5 pl-6 pr-1.5 text-[10.5px] font-bold bg-white/90 border border-slate-200/80 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
            </form>
          </div>
        </div>
      )}

      {/* ── Modern Squircle Card Grid ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 custom-scrollbar">
        {filteredQuestions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl shadow-xs">
              🔍
            </div>
            <p className="text-xs font-bold text-slate-600">No cards match this filter</p>
            <button
              onClick={() => activeSetFilterMode('all')}
              className="text-xs font-black text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
            >
              Reset to All Cards
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 p-1 pb-6">
            {filteredQuestions.map((item) => {
              const i = item.originalIndex
              const q = item
              const isActive = currentIndex === i
              const st = getCardStatus(q)

              const hasAttemptedThisSession = isPractice
                ? practiceAnswers[i] !== undefined
                : sessionAnswers[i] !== undefined

              const selectedOptIdx = isPractice
                ? practiceAnswers[i]
                : (() => {
                    const attemptedRatings = Array.isArray(sessionAnswers[i])
                      ? (sessionAnswers[i] as number[])
                      : (typeof sessionAnswers[i] === 'number' ? [sessionAnswers[i] as number] : [])
                    return attemptedRatings.length > 0 ? attemptedRatings[attemptedRatings.length - 1] : null
                  })()

              const isCorrectAnswer = (() => {
                if (selectedOptIdx === undefined || selectedOptIdx === null) return false
                if (q.practice?.correct_index !== undefined && q.practice.correct_index !== null) {
                  return Number(selectedOptIdx) === Number(q.practice.correct_index)
                }
                if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                  const chosen = q.options.find((o: any) => o.id === selectedOptIdx) || q.options[selectedOptIdx]
                  if (chosen && chosen.is_correct !== undefined) return chosen.is_correct
                }
                return Number(selectedOptIdx) === 3
              })()

              // Tile Styling Decision
              let tileClass = "bg-white border-slate-200/90 text-slate-800 hover:border-indigo-300 hover:bg-slate-50/80 shadow-2xs"
              if (q.is_ignored) {
                tileClass = "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 line-through cursor-not-allowed"
              } else if (hasAttemptedThisSession) {
                if (isPractice) {
                  tileClass = isCorrectAnswer
                    ? "bg-emerald-500 border-emerald-600 text-white shadow-sm font-black"
                    : "bg-rose-500 border-rose-600 text-white shadow-sm font-black"
                } else {
                  tileClass = "bg-indigo-50 border-indigo-300 text-indigo-950 font-black shadow-2xs"
                }
              } else if (st === 'mastered') {
                tileClass = "bg-emerald-50/70 border-emerald-200/90 text-emerald-950 hover:bg-emerald-100/70 hover:border-emerald-300 shadow-2xs"
              } else if (st === 'learning') {
                tileClass = "bg-indigo-50/60 border-indigo-200/80 text-indigo-950 hover:bg-indigo-100/60 hover:border-indigo-300 shadow-2xs"
              } else if (st === 'hard') {
                tileClass = "bg-rose-50/60 border-rose-200/80 text-rose-950 hover:bg-rose-100/60 hover:border-rose-300 shadow-2xs"
              }

              return (
                <button
                  key={i}
                  ref={isActive ? activeCardRef : null}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToQuestion(i)
                    setIsMapOpen(false)
                  }}
                  className={cn(
                    "relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-1 transition-all duration-150 active:scale-95 group cursor-pointer select-none",
                    isActive
                      ? "bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 scale-105 z-20 ring-4 ring-indigo-500/25"
                      : tileClass
                  )}
                >
                  {/* Star Badge */}
                  {q.is_starred && (
                    <span className="absolute top-1 right-1 text-[9px] text-amber-500 leading-none drop-shadow-xs">
                      ★
                    </span>
                  )}

                  {/* Card Number */}
                  <span className={cn(
                    "font-black text-xs sm:text-sm tracking-tight leading-none",
                    isActive
                      ? "text-white text-sm"
                      : (hasAttemptedThisSession && isPractice ? "text-white" : "text-slate-800")
                  )}>
                    {i + 1}
                  </span>

                  {/* Micro Status Indicator */}
                  {isActive ? (
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-indigo-200 mt-1 leading-none">
                      HERE
                    </span>
                  ) : hasAttemptedThisSession ? (
                    isPractice ? (
                      <span className="text-[7.5px] font-black uppercase tracking-tight text-white mt-1 leading-none">
                        {isCorrectAnswer ? "✓ OK" : "✕ FAIL"}
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-extrabold uppercase tracking-tight text-indigo-700 mt-1 leading-none">
                        {selectedOptIdx === -2 ? "FLIP" :
                         selectedOptIdx === 0 ? "AGAIN" :
                         selectedOptIdx === 1 ? "HARD" :
                         selectedOptIdx === 2 ? "GOOD" : "EASY"}
                      </span>
                    )
                  ) : st === 'mastered' ? (
                    <span className="flex items-center gap-0.5 text-[7.5px] font-extrabold uppercase tracking-tight text-emerald-700 mt-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Done
                    </span>
                  ) : st === 'learning' ? (
                    <span className="flex items-center gap-0.5 text-[7.5px] font-extrabold uppercase tracking-tight text-indigo-600 mt-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      Learn
                    </span>
                  ) : st === 'hard' ? (
                    <span className="flex items-center gap-0.5 text-[7.5px] font-extrabold uppercase tracking-tight text-rose-600 mt-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      Hard
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[7.5px] font-bold tracking-tight text-slate-400 mt-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                      New
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
