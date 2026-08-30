import { motion } from 'framer-motion'
import { X, Brain, BrainCircuit, ChevronRight } from 'lucide-react'

interface StudyModeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedStudyQuiz: any
  studyModalTab: 'flashcard' | 'practice'
  onSelectFlashcardMode: (mode: string) => void
  onSelectPracticeMode: (mode: string) => void
}

export function StudyModeModal({
  isOpen,
  onClose,
  selectedStudyQuiz,
  studyModalTab,
  onSelectFlashcardMode,
  onSelectPracticeMode
}: StudyModeModalProps) {
  if (!isOpen || !selectedStudyQuiz) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-6 sm:p-9 border border-slate-100 text-left overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-100/40 blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6 relative z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
                {studyModalTab === 'flashcard' ? 'Study Console' : 'Practice Console'}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {studyModalTab === 'flashcard' ? 'Choose learning method' : 'Choose practice mode'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all"
          >
             <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 mb-5 flex-shrink-0 text-left">
          <h4 className="text-xs sm:text-sm font-black text-indigo-650 tracking-wide line-clamp-1">{selectedStudyQuiz.title}</h4>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1 flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-slate-350" />
            {selectedStudyQuiz.questions_count} cards in this deck
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-0">
          {/* ── FLASHCARD MODES ── */}
          {studyModalTab === 'flashcard' && (
            <div className="space-y-3">
              {[
                { mode: 'fsrs', icon: '🧠', title: 'FSRS Spaced Repetition', desc: 'Intelligent spaced repetition scheduling' },
                { mode: 'roadmap', icon: '🗺️', title: 'Roadmap Mode', desc: 'Daily goal-oriented learning pipeline' },
                { mode: 'flip', icon: '🔄', title: 'Flip Card', desc: 'Freestyle flashcard flipping & quick review' },
                { mode: 'review', icon: '📚', title: 'Review Due Cards', desc: 'Only review cards that are due' },
                { mode: 'new', icon: '✨', title: 'Learn New Words', desc: 'Only learn new unlearned cards' },
              ].filter(item => {
                const disabled = (selectedStudyQuiz as any).practice_settings?.disabled_modes || [];
                return !disabled.includes(item.mode);
              }).map(item => (
                <button
                  key={item.mode}
                  onClick={() => onSelectFlashcardMode(item.mode)}
                  className="group w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-500/35 hover:bg-indigo-50/5 hover:shadow-lg active:scale-[0.99] hover:scale-[1.01] transition-all text-left shadow-sm"
                >
                  <span className="text-xl w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-indigo-600 transition-colors truncate">{item.title}</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block mt-0.5 leading-relaxed">{item.desc}</span>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* ── PRACTICE MODES ── */}
          {studyModalTab === 'practice' && (
            <div className="space-y-3">
              {[
                { mode: 'mcq', icon: '🎯', title: 'MCQ Quiz', desc: '4-choice multiple choice reflex test' },
                { mode: 'typing', icon: '⌨️', title: 'Typing Test', desc: 'Type vocabulary for deep spelling recall' },
                { mode: 'listening', icon: '🎧', title: 'Listening Test', desc: 'Listen to native audio and select answers' },
              ].filter(item => {
                const disabled = (selectedStudyQuiz as any).practice_settings?.disabled_modes || [];
                return !disabled.includes(item.mode);
              }).map(item => (
                <button
                  key={item.mode}
                  onClick={() => onSelectPracticeMode(item.mode)}
                  className="group w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white hover:border-emerald-500/35 hover:bg-emerald-50/5 hover:shadow-lg active:scale-[0.99] hover:scale-[1.01] transition-all text-left shadow-sm"
                >
                  <span className="text-xl w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-emerald-600 transition-colors truncate">{item.title}</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block mt-0.5 leading-relaxed">{item.desc}</span>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
