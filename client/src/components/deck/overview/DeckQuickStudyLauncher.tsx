import React from 'react'
import { Link } from 'react-router-dom'
import { Brain, Trophy, RotateCcw, Sparkles, Compass, Headphones, Keyboard, CheckCircle2 } from 'lucide-react'

export interface DeckQuickStudyLauncherProps {
  deckId: string | number
  totalCards: number
  dueCount?: number
  practiceSettings?: any
}

export function DeckQuickStudyLauncher({
  deckId,
  totalCards,
  dueCount = 0,
  practiceSettings
}: DeckQuickStudyLauncherProps) {
  const disabledModes = practiceSettings?.disabled_modes || []

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Start Learning & Practice
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Choose flashcard study method or practice session
          </p>
        </div>
      </div>

      {/* 3 Core Learn Modes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
        {/* 1. FSRS Spaced Repetition */}
        {!disabledModes.includes('fsrs') && (
          <Link
            to={`/flashcard/${deckId}/play?mode=fsrs`}
            className="group relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-200/50 active:scale-[0.98] transition-all overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-base sm:text-lg shrink-0 group-hover:scale-110 transition-transform">
                🧠
              </div>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black tracking-tight block">FSRS Mode</span>
              <p className="text-[10px] sm:text-[11px] text-indigo-100 font-medium mt-0.5 line-clamp-1">
                {dueCount > 0 ? `${dueCount} cards due` : 'Spaced repetition'}
              </p>
            </div>
          </Link>
        )}

        {/* 2. Speed Skim */}
        {!disabledModes.includes('skim') && (
          <Link
            to={`/flashcard/${deckId}/play?mode=skim`}
            className="group relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200/50 active:scale-[0.98] transition-all overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-base sm:text-lg shrink-0 group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                +3 XP
              </span>
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black tracking-tight block">Speed Skim</span>
              <p className="text-[10px] sm:text-[11px] text-amber-100 font-medium mt-0.5 line-clamp-1">
                Rapid 1-tap card preview
              </p>
            </div>
          </Link>
        )}

        {/* 3. Memrise Deep Study */}
        {!disabledModes.includes('memrise') && (
          <Link
            to={`/memrise/${deckId}/plant`}
            className="group relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-200/50 active:scale-[0.98] transition-all overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-base sm:text-lg shrink-0 group-hover:scale-110 transition-transform">
                🌱
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                Deep
              </span>
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black tracking-tight block">Memrise Mode</span>
              <p className="text-[10px] sm:text-[11px] text-emerald-100 font-medium mt-0.5 line-clamp-1">
                Plant seeds & water step-by-step
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Practice Tests Row */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {!disabledModes.includes('mcq') && (
          <Link
            to={`/practice/${deckId}/mcq`}
            className="p-3 rounded-2xl border border-slate-200/80 hover:border-emerald-500/40 hover:bg-emerald-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95 cursor-pointer"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🎯</span>
            <span className="text-xs font-black text-slate-800 group-hover:text-emerald-600">MCQ Test</span>
            <span className="text-[9px] text-slate-400 font-bold">4 choices reflex</span>
          </Link>
        )}

        {!disabledModes.includes('typing') && (
          <Link
            to={`/practice/${deckId}/typing`}
            className="p-3 rounded-2xl border border-slate-200/80 hover:border-purple-500/40 hover:bg-purple-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95 cursor-pointer"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">⌨️</span>
            <span className="text-xs font-black text-slate-800 group-hover:text-purple-600">Typing Test</span>
            <span className="text-[9px] text-slate-400 font-bold">Deep recall spelling</span>
          </Link>
        )}

        {!disabledModes.includes('listening') && (
          <Link
            to={`/practice/${deckId}/listening`}
            className="p-3 rounded-2xl border border-slate-200/80 hover:border-sky-500/40 hover:bg-sky-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95 cursor-pointer"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🎧</span>
            <span className="text-xs font-black text-slate-800 group-hover:text-sky-600">Listening Test</span>
            <span className="text-[9px] text-slate-400 font-bold">Audio comprehension</span>
          </Link>
        )}
      </div>
    </div>
  )
}

export default DeckQuickStudyLauncher
