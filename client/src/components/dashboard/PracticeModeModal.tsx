import { motion } from 'framer-motion'
import { X, Trophy, BrainCircuit, LayoutGrid, Zap, Play, ChevronRight } from 'lucide-react'

interface PracticeModeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPracticeQuiz: any
  onSelectMode: (mode: string) => void
}

export function PracticeModeModal({
  isOpen,
  onClose,
  selectedPracticeQuiz,
  onSelectMode
}: PracticeModeModalProps) {
  if (!isOpen || !selectedPracticeQuiz) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-100/40 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Practice Mode</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Choose practice mode</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 mb-2">
            <h4 className="text-xs font-black text-indigo-600 leading-snug line-clamp-1">{selectedPracticeQuiz.title}</h4>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black mt-0.5 flex items-center gap-1">
              <BrainCircuit className="w-3 h-3 text-slate-400" />
              {selectedPracticeQuiz.questions_count} questions available
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onSelectMode('mcq')}
              className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all flex-shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-indigo-600 transition-colors">Multiple Choice (MCQ)</span>
                <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Quick 4-choice response training</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>

            <button
              onClick={() => onSelectMode('typing')}
              className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-rose-600 transition-colors">Vocabulary Typing</span>
                <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Type vocabulary characters for deep memory recall</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>

            <button
              onClick={() => onSelectMode('listening')}
              className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all flex-shrink-0">
                <Play className="w-5 h-5 fill-amber-600 group-hover:fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-amber-600 transition-colors">Listening Test</span>
                <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Listen to native audio and select the correct answer</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
