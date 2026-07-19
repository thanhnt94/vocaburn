import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { LayoutGrid, BookOpen, Brain, Trophy, Flame, Star, EyeOff, ChevronDown } from 'lucide-react'

interface Question {
  stats?: {
    total?: number
    again_count?: number
    hard_count?: number
    good_count?: number
    easy_count?: number
  }
  box_level?: number
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

  const activeFilterMode = filterMode !== undefined ? filterMode : internalFilterMode
  const activeSetFilterMode = setFilterMode !== undefined ? setFilterMode : setInternalFilterMode

  const getCardBoxId = (item: any) => {
    if (item.is_ignored) return 'ignored';
    if (item.is_starred) return 'starred';
    
    // Hard card check
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
      : (total >= 20 && (again + hard) >= 8 && ((again + hard) / total >= 0.4));
      
    if (isHard) return 'hard';
    if (item.box_level === 5 && total >= 4) return 'mastered';
    if (total === 0) return 'unseen';
    return 'learning';
  };

  // Filter logic
  const filteredQuestions = useMemo(() => {
    if (!questions) return []
    return questions
      .map((q, idx) => ({ ...q, originalIndex: idx }))
      .filter((item) => {
        if (activeFilterMode === 'all') return true;
        return getCardBoxId(item) === activeFilterMode;
      })
  }, [questions, activeFilterMode])

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Dynamic select-based filter pull-down */}
      {showFiltersInline && (
        <div className="relative w-full flex-shrink-0">
          <select
             value={activeFilterMode}
             onChange={(e) => activeSetFilterMode(e.target.value as any)}
             className="w-full h-10 pl-4 pr-10 bg-slate-100/80 border border-slate-200/50 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 outline-none appearance-none cursor-pointer focus:border-indigo-300 focus:bg-white transition-all shadow-sm"
          >
             <option value="all">📁 Tất cả</option>
             <option value="unseen">📖 Chưa học</option>
             <option value="learning">🧠 Đang học</option>
             <option value="mastered">🏆 Đã thuộc</option>
             <option value="hard">🔥 Thẻ khó</option>
             <option value="starred">⭐ Gắn sao</option>
             <option value="ignored">🚫 Bỏ qua</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}


      {/* Card Grid Container */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-xs font-black text-slate-400">
            Không có thẻ nào phù hợp bộ lọc...
          </div>
        ) : (
          <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-3 p-1 pb-4">
            {filteredQuestions.map((item) => {
              const i = item.originalIndex
              const q = item
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

              const isActive = currentIndex === i

              let fsrsClass = "border-slate-100 hover:border-indigo-200 bg-white text-slate-500 hover:bg-slate-50/50 font-bold"
              let fsrsStyle: any = {}

              const stats = q.stats || { total: 0, again_count: 0, hard_count: 0, good_count: 0, easy_count: 0 }
              const totalReviews = stats.total || 0

              if (q.is_ignored) {
                fsrsClass = "border-slate-300 bg-slate-200 text-slate-400 opacity-60 hover:opacity-100 font-bold cursor-not-allowed"
                fsrsStyle = {}
              } else if (q.is_starred) {
                fsrsClass = "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100/60 font-bold shadow-sm"
                fsrsStyle = {}
              } else if (totalReviews > 0) {
                const again = stats.again_count || 0
                const hard = stats.hard_count || 0
                const good = stats.good_count || 0
                const easy = stats.easy_count || 0
                const total = again + hard + good + easy

                if (total > 0) {
                  const segments: string[] = []
                  let currentPct = 0
                  if (again > 0) {
                    const nextPct = currentPct + (again / total) * 100
                    segments.push(`#ffe4e6 ${currentPct.toFixed(1)}%, #ffe4e6 ${nextPct.toFixed(1)}%`)
                    currentPct = nextPct
                  }
                  if (hard > 0) {
                    const nextPct = currentPct + (hard / total) * 100
                    segments.push(`#fef3c7 ${currentPct.toFixed(1)}%, #fef3c7 ${nextPct.toFixed(1)}%`)
                    currentPct = nextPct
                  }
                  if (good > 0) {
                    const nextPct = currentPct + (good / total) * 100
                    segments.push(`#e0e7ff ${currentPct.toFixed(1)}%, #e0e7ff ${nextPct.toFixed(1)}%`)
                    currentPct = nextPct
                  }
                  if (easy > 0) {
                    const nextPct = currentPct + (easy / total) * 100
                    segments.push(`#d1fae5 ${currentPct.toFixed(1)}%, #d1fae5 ${nextPct.toFixed(1)}%`)
                    currentPct = nextPct
                  }

                  fsrsStyle = {
                    background: `linear-gradient(to top, ${segments.join(', ')})`,
                    color: '#1e293b',
                    borderColor: '#cbd5e1'
                  }
                  fsrsClass = "shadow-sm animate-in zoom-in-95 duration-200 font-bold text-slate-800 border-slate-300"
                } else if (selectedOptIdx === -2) {
                  fsrsClass = "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100/60 font-bold shadow-sm animate-in zoom-in-95 duration-200"
                  fsrsStyle = {}
                } else {
                  const box = q.box_level || 1
                  if (box === 5) {
                    fsrsClass = "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60"
                  } else if (box === 4) {
                    fsrsClass = "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60"
                  } else if (box === 3 || box === 2) {
                    fsrsClass = "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100/60"
                  } else {
                    fsrsClass = "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/60"
                  }
                }
              } else if (selectedOptIdx === -2) {
                fsrsClass = "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100/60 font-bold shadow-sm animate-in zoom-in-95 duration-200"
                fsrsStyle = {}
              }

              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToQuestion(i)
                    setIsMapOpen(false)
                  }}
                  className={cn(
                    "relative aspect-square rounded-xl border flex flex-col items-center justify-center font-black text-[11px] transition-all duration-200",
                    isActive
                      ? "border-indigo-600 ring-4 ring-indigo-500/30 z-10 scale-105 shadow-md"
                      : "",
                    fsrsClass
                  )}
                  style={fsrsStyle}
                >
                  {q.is_starred && (
                    <span className="absolute top-0.5 right-1 text-[8px] text-amber-500 font-bold z-20">★</span>
                  )}
                  <span className={cn("relative z-10 text-[12px] text-slate-800")}>{i + 1}</span>
                  {hasAttemptedThisSession && (
                    <span className={cn(
                      "text-[6px] font-black tracking-tighter opacity-90 mt-0.5 uppercase z-10 relative",
                      isPractice
                        ? (selectedOptIdx === q.practice?.correct_index ? "text-emerald-600" : "text-rose-600")
                        : (selectedOptIdx === -2 ? "text-purple-600" :
                           selectedOptIdx === 0 ? "text-rose-600" :
                           selectedOptIdx === 1 ? "text-amber-600" :
                           selectedOptIdx === 2 ? "text-indigo-600" :
                           "text-emerald-600")
                    )}>
                      {isPractice
                        ? (selectedOptIdx === q.practice?.correct_index ? "CORRECT" : "WRONG")
                        : (selectedOptIdx === -2 ? "FLIP" :
                           selectedOptIdx === 0 ? "AGAIN" : selectedOptIdx === 1 ? "HARD" : selectedOptIdx === 2 ? "GOOD" : "EASY")}
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
