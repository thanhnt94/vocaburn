import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
        const grade = accuracy >= 90 ? { label: 'S', color: 'from-yellow-400 to-amber-500', text: 'OUTSTANDING!' } :
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
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
              onClick={onClose} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }} 
              transition={{ type: 'spring', bounce: 0.35 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Grade header */}
              <div className={`bg-gradient-to-br ${grade.color} p-8 flex flex-col items-center text-white`}>
                <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-80 mb-2">SESSION COMPLETE</div>
                <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl font-black mb-3 border-2 border-white/30">
                  {grade.label}
                </div>
                <h2 className="text-xl font-black">{grade.text}</h2>
                <p className="text-sm opacity-80 mt-1">{accuracy}% accuracy</p>
              </div>

              {/* Stats grid */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-2xl">
                    <div className="text-2xl font-black text-slate-800">{answeredCount}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase">Answered</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-2xl">
                    <div className="text-2xl font-black text-emerald-600">{correctCount}</div>
                    <div className="text-[9px] font-black text-emerald-400 uppercase">Correct</div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-2xl">
                    <div className="text-2xl font-black text-indigo-600">+{sessionXP}</div>
                    <div className="text-[9px] font-black text-indigo-400 uppercase">XP Earned</div>
                  </div>
                </div>

                {/* Milestones unlocked */}
                {milestonesHit.size > 0 && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Milestones Unlocked</div>
                    <div className="flex gap-3">
                      {milestonesHit.has(25) && <span className="text-2xl" title="25%">🎖</span>}
                      {milestonesHit.has(50) && <span className="text-2xl" title="50%">🏆</span>}
                      {milestonesHit.has(75) && <span className="text-2xl" title="75%">🌟</span>}
                      {milestonesHit.has(100) && <span className="text-2xl" title="100%">🎊</span>}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={onClose}
                    className="py-3.5 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Keep Going
                  </button>
                  <button 
                    onClick={onNavigateToDeck}
                    className="py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all"
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
