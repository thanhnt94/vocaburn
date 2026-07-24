import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { LayoutGrid, BookOpen, Brain, Trophy, Flame, Star, EyeOff, ChevronDown } from 'lucide-react'

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

              const isCorrectAnswer = (() => {
                if (selectedOptIdx === undefined || selectedOptIdx === null) return false;
                if (q.practice?.correct_index !== undefined && q.practice.correct_index !== null) {
                  return Number(selectedOptIdx) === Number(q.practice.correct_index);
                }
                if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                  const chosen = q.options.find((o: any) => o.id === selectedOptIdx) || q.options[selectedOptIdx];
                  if (chosen && chosen.is_correct !== undefined) return chosen.is_correct;
                }
                return Number(selectedOptIdx) === 3;
              })();

              const isActive = currentIndex === i

              let fsrsClass = "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50 font-bold"
              let fsrsStyle: any = {}

              if (q.is_ignored) {
                fsrsClass = "border-slate-300 bg-slate-200 text-slate-400 opacity-60 font-bold cursor-not-allowed"
              } else if (hasAttemptedThisSession) {
                if (isPractice) {
                  if (isCorrectAnswer) {
                    fsrsClass = "bg-emerald-500 border-emerald-600 text-white font-black shadow-md shadow-emerald-200/50"
                  } else {
                    fsrsClass = "bg-rose-500 border-rose-600 text-white font-black shadow-md shadow-rose-200/50"
                  }
                } else {
                  fsrsClass = "bg-indigo-500 border-indigo-600 text-white font-black shadow-md shadow-indigo-200/50"
                }
              } else if (q.is_starred) {
                fsrsClass = "border-amber-300 bg-amber-50 text-amber-700 font-bold shadow-sm"
              } else {
                fsrsClass = "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50 font-bold shadow-xs"
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
                  <span className={cn("relative z-10 text-[12px] font-black", hasAttemptedThisSession ? "text-white" : "text-slate-800")}>{i + 1}</span>
                  {hasAttemptedThisSession && (
                    <span className="text-[6px] font-black tracking-tighter opacity-90 mt-0.5 uppercase z-10 relative text-white">
                      {isPractice
                        ? (isCorrectAnswer ? "CORRECT" : "WRONG")
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
