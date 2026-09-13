import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Sparkles, Trophy } from 'lucide-react'

interface PlaySessionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  sessionAnswers: Record<number, number | number[]>;
  questions: any[];
  sessionXP: number;
  milestonesHit: Set<number>;
  onNavigateToDeck: () => void;
}

export const PlaySessionSummary: React.FC<PlaySessionSummaryProps> = ({
  isOpen,
  onClose,
  sessionAnswers,
  questions,
  sessionXP,
  milestonesHit,
  onNavigateToDeck
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 65,
        spread: 65,
        origin: { y: 0.55 },
        colors: ['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ec4899']
      })
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (() => {
        const answeredCount = Object.keys(sessionAnswers).length;
        const correctCount = Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
          const q = questions[Number(idx)];
          if (!q) return false;
          const ratingVal = Array.isArray(optIdx) 
            ? optIdx[optIdx.length - 1] 
            : (typeof optIdx === 'number' ? optIdx : 0);
          return q.options && q.options.length > 0
            ? q.options[ratingVal]?.is_correct
            : ratingVal > 0;
        }).length;

        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        const grade = accuracy >= 90 ? { label: 'S', color: 'from-amber-400 via-orange-500 to-rose-500', text: 'OUTSTANDING!' } :
                      accuracy >= 75 ? { label: 'A', color: 'from-emerald-400 to-teal-500', text: 'EXCELLENT!' } :
                      accuracy >= 60 ? { label: 'B', color: 'from-indigo-400 to-blue-500', text: 'WELL DONE!' } :
                      accuracy >= 45 ? { label: 'C', color: 'from-amber-400 to-orange-500', text: 'KEEP IT UP!' } :
                                       { label: 'D', color: 'from-rose-400 to-pink-500', text: 'KEEP PRACTICING!' };

        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
              onClick={onClose} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.85, y: 25 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 25 }} 
              transition={{ type: 'spring', bounce: 0.3 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              {/* Grade Header Banner */}
              <div className={`bg-gradient-to-br ${grade.color} p-7 flex flex-col items-center text-white relative overflow-hidden`}>
                <div className="text-[9px] font-black uppercase tracking-[0.35em] opacity-90 mb-2 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>SESSION COMPLETE</span>
                </div>
                <div className="w-22 h-22 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl font-black mb-2 border-2 border-white/30 shadow-inner">
                  {grade.label}
                </div>
                <h2 className="text-xl font-black tracking-tight">{grade.text}</h2>
                <p className="text-xs opacity-90 mt-0.5">{accuracy}% accuracy rate</p>
              </div>

              {/* Stats Grid */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{answeredCount}</div>
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Answered</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{correctCount}</div>
                    <div className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase">Correct</div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">+{sessionXP}</div>
                    <div className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase">XP Earned</div>
                  </div>
                </div>

                {/* Mascot Encouragement */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/50 flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Great retention! Your deliberate practice keeps your streak blazing.</span>
                </div>

                {/* Milestones Unlocked */}
                {milestonesHit.size > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                    <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Milestones Unlocked</div>
                    <div className="flex gap-2.5">
                      {milestonesHit.has(25) && <span className="text-2xl" title="25%">🎖</span>}
                      {milestonesHit.has(50) && <span className="text-2xl" title="50%">🏆</span>}
                      {milestonesHit.has(75) && <span className="text-2xl" title="75%">🌟</span>}
                      {milestonesHit.has(100) && <span className="text-2xl" title="100%">🎊</span>}
                    </div>
                  </div>
                )}

                {/* Large Thumb Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button 
                    onClick={onClose}
                    className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer"
                  >
                    Keep Going
                  </button>
                  <button 
                    onClick={onNavigateToDeck}
                    className="py-3.5 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Finish &amp; Exit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
};

export default PlaySessionSummary;
