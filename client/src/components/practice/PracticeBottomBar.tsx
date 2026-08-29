import React from 'react'
import { Settings, Volume2, Lightbulb, ChevronRight, RefreshCw, LayoutGrid, BookOpen, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeBottomBarProps {
  isFeedbackOpen: boolean
  activeBottomTab: 'map' | 'flashcard' | 'stats'
  mainTab: 'practice' | 'fsrs'
  currentIndex: number
  practiceAnswers: Record<number, number>
  sessionAnswers: Record<number, number | number[]>
  currentQuestion: Question | null
  currentPracticeData?: PracticeQuestionData | null
  isRoadmapTestMode: boolean
  isFlipped: boolean
  hasRated: boolean
  justAnswered: boolean
  showFeedback: boolean
  onOpenSettings: () => void
  onPlayAudio: () => void
  onOpenFeedback: () => void
  onNext: () => void
  onFlip: () => void
  onTabChange: (tab: 'map' | 'flashcard' | 'stats') => void
}

export const PracticeBottomBar: React.FC<PracticeBottomBarProps> = ({
  isFeedbackOpen,
  activeBottomTab,
  mainTab,
  currentIndex,
  practiceAnswers,
  sessionAnswers,
  currentQuestion,
  currentPracticeData,
  isRoadmapTestMode,
  isFlipped,
  hasRated,
  justAnswered,
  showFeedback,
  onOpenSettings,
  onPlayAudio,
  onOpenFeedback,
  onNext,
  onFlip,
  onTabChange
}) => {
  const hasAnsweredPractice = showFeedback || practiceAnswers[currentIndex] !== undefined

  return (
    <footer className="relative w-full flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-0 pt-0 pb-0 z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        {activeBottomTab === 'flashcard' && !isFeedbackOpen && (
          <div className="w-full flex items-center gap-1.5 sm:gap-3 px-3 sm:px-4 pt-1 pb-2">
            {/* Settings Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenSettings()
              }}
              className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl shadow-sm active:scale-95 hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer"
              title="Cấu hình học tập"
            >
              <Settings className="w-5.5 h-5.5 text-indigo-600" />
            </button>

            {/* Audio Button */}
            {currentQuestion && (mainTab !== 'practice' || hasAnsweredPractice) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayAudio()
                }}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600 shadow-sm active:scale-95 transition-all hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer"
                title="Phát âm"
              >
                <Volume2 className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
              </button>
            )}

            {/* Explanation / Lightbulb Button */}
            {((mainTab === 'practice' ? hasAnsweredPractice : (isFlipped || showFeedback))) && (
              <button
                onClick={() => onOpenFeedback()}
                className={cn(
                  "xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm active:scale-95 transition-all relative cursor-pointer",
                  justAnswered
                    ? "bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                    : "bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                )}
                title="Xem giải thích và hướng dẫn"
              >
                <Lightbulb className="w-5.5 h-5.5" />
                {justAnswered && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            )}

            {/* Main Action Buttons */}
            {mainTab === 'practice' ? (
              hasAnsweredPractice ? (
                <button
                  onClick={() => onNext()}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
                >
                  <span>Continue</span>
                  <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex-1 flex gap-2 h-12">
                  {!isRoadmapTestMode && (
                    <button
                      onClick={() => onNext()}
                      className="flex-1 h-12 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Skip <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex-[2] h-12 bg-slate-100/70 border border-slate-200/50 text-slate-400 font-extrabold text-xs rounded-2xl flex items-center justify-center uppercase tracking-widest pointer-events-none select-none">
                    {isRoadmapTestMode ? "Chọn 1 đáp án bên trên 🎯" : "Waiting..."}
                  </div>
                </div>
              )
            ) : (
              !hasRated ? (
                <button
                  onClick={() => onFlip()}
                  className="flex-1 h-12 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-indigo-400/60 hover:shadow-xl cursor-pointer"
                >
                  {isFlipped ? (
                    <>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span>FLIP BACK</span>
                      <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                    </>
                  ) : (
                    <>
                      <span>FLIP CARD</span>
                      <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 flex gap-3 h-12">
                  <button
                    onClick={() => onFlip()}
                    className="w-12 h-12 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-indigo-100/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-600 border border-indigo-200/50 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                    title={isFlipped ? "Flip to Front" : "Flip to Back"}
                  >
                    <RefreshCw className="w-5 h-5 text-indigo-600 animate-[spin_4s_linear_infinite]" />
                  </button>
                  <button
                    onClick={() => onNext()}
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
                  >
                    <span>NEXT CARD</span>
                    <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Mobile bottom navigation tabs (Map / Flashcard / Stats) */}
        <div className="w-full grid grid-cols-3 bg-white border-t border-slate-100 p-0 relative md:hidden">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTabChange('map')
            }}
            className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
            title="Mở bản đồ thẻ"
          >
            {activeBottomTab === 'map' && (
              <motion.div
                layoutId="activeBottomTabBgPractice"
                className="absolute inset-0 bg-amber-500/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
              activeBottomTab === 'map' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
            )}>
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              MAP
            </span>
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation()
              onTabChange('flashcard')
            }}
            className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
            title="Tiến trình học tập hiện tại"
          >
            {activeBottomTab === 'flashcard' && (
              <motion.div
                layoutId="activeBottomTabBgPractice"
                className="absolute inset-0 bg-amber-500/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
              activeBottomTab === 'flashcard' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
            )}>
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              PLAY
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onTabChange('stats')
            }}
            className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
            title="Mở thống kê tiến trình"
          >
            {activeBottomTab === 'stats' && (
              <motion.div
                layoutId="activeBottomTabBgPractice"
                className="absolute inset-0 bg-amber-500/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
              activeBottomTab === 'stats' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
            )}>
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              STATS
            </span>
          </button>
        </div>
      </div>
    </footer>
  )
}
