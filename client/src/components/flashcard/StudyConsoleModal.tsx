import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, X, ChevronRight } from 'lucide-react'

export interface StudyConsoleModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
  deckId: string | undefined
  onSelectMode: (mode: string) => void
}

export const StudyConsoleModal: React.FC<StudyConsoleModalProps> = ({
  isOpen,
  onClose,
  session,
  onSelectMode
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md pointer-events-auto"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-6 sm:p-8 border border-slate-100 text-left overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto text-slate-800"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-100/40 blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 relative z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Brain className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
                    STUDY CONSOLE
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Chọn phương pháp học tập
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                 <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {session && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 flex-shrink-0 text-left">
                <h4 className="text-xs sm:text-sm font-black text-indigo-950 tracking-wide line-clamp-1">{session.title}</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-slate-400" />
                  {session.questions?.length || 0} câu hỏi trong bộ thẻ
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0">
              {[
                { mode: 'fsrs', icon: '🧠', title: 'FSRS Spaced Repetition', desc: 'Học lặp lại ngắt quãng thông minh' },
                { mode: 'roadmap', icon: '🗺️', title: 'Roadmap Mode', desc: 'Học theo lộ trình mục tiêu mỗi ngày' },
                { mode: 'flip', icon: '🔄', title: 'Flip Card', desc: 'Lật thẻ ghi nhớ phản xạ tự do' },
                { mode: 'review', icon: '📚', title: 'Review Only', desc: 'Chỉ ôn tập lại các thẻ cũ' },
                { mode: 'new', icon: '✨', title: 'New Only', desc: 'Chỉ học các thẻ mới chưa biết' },
              ].map(item => (
                <button
                  key={item.mode}
                  onClick={() => onSelectMode(item.mode)}
                  className="group w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-500/35 hover:bg-indigo-50/10 hover:shadow-md active:scale-[0.99] transition-all text-left shadow-sm cursor-pointer"
                >
                  <span className="text-xl w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-indigo-600 transition-colors truncate">{item.title}</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block mt-0.5 leading-relaxed">{item.desc}</span>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
