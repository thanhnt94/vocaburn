import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, X, ChevronRight, Shuffle, ArrowUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StudyConsoleModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
  deckId: string | undefined
  currentMode?: string
  currentOrder?: 'sequential' | 'random'
  onSelectMode: (mode: string, order: 'sequential' | 'random') => void
}

export const StudyConsoleModal: React.FC<StudyConsoleModalProps> = ({
  isOpen,
  onClose,
  session,
  currentMode = 'fsrs',
  currentOrder = 'sequential',
  onSelectMode
}) => {
  const [cardOrder, setCardOrder] = useState<'sequential' | 'random'>(currentOrder)

  useEffect(() => {
    if (isOpen) {
      setCardOrder(currentOrder)
    }
  }, [isOpen, currentOrder])

  const modes = [
    { 
      mode: 'fsrs', 
      icon: '🧠', 
      title: 'FSRS Spaced Repetition', 
      desc: 'Intelligent spaced repetition with 4 rating buttons' 
    },
    { 
      mode: 'skim', 
      icon: '⚡', 
      title: 'Speed Skim (1-Tap)', 
      desc: 'Rapid 1-tap/Space scanning without rating buttons (+3 XP)' 
    },
    { 
      mode: 'autoplay', 
      icon: '🎧', 
      title: 'Auto Play (Hands-Free)', 
      desc: 'Hands-free automatic card flipping with Screen Wake Lock' 
    },
    { 
      mode: 'review', 
      icon: '📚', 
      title: 'Review Mode', 
      desc: 'Focused review of due & previously learned cards only' 
    },
    { 
      mode: 'new', 
      icon: '✨', 
      title: 'Learn New Cards', 
      desc: 'Study brand-new unlearned cards only' 
    },
  ]

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
            
            <div className="flex items-center justify-between mb-4 relative z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Brain className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
                    STUDY CONSOLE
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Select flashcard study mode
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
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-3.5 flex-shrink-0 text-left">
                <h4 className="text-xs sm:text-sm font-black text-indigo-950 tracking-wide line-clamp-1">{session.title}</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-slate-400" />
                  {session.questions?.length || 0} cards in deck
                </p>
              </div>
            )}

            {/* Quick Option: Card Order (Sequential vs Random) */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 mb-3 flex-shrink-0">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider pl-1.5 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                Card Order
              </span>
              <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setCardOrder('sequential')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                    cardOrder === 'sequential'
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  📋 Sequential
                </button>
                <button
                  type="button"
                  onClick={() => setCardOrder('random')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1",
                    cardOrder === 'random'
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Shuffle className="w-3 h-3" />
                  Random
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0">
              {modes.map(item => {
                const isCurrent = (currentMode === item.mode) || (currentMode === 'speed_skim' && item.mode === 'skim')
                return (
                  <button
                    key={item.mode}
                    onClick={() => onSelectMode(item.mode, cardOrder)}
                    className={cn(
                      "group w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all text-left shadow-2xs cursor-pointer",
                      isCurrent
                        ? "border-indigo-500/50 bg-indigo-50/20 ring-1 ring-indigo-500/30"
                        : "border-slate-100 bg-white hover:border-indigo-500/35 hover:bg-indigo-50/10 hover:shadow-xs active:scale-[0.99]"
                    )}
                  >
                    <span className="text-xl w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-indigo-600 transition-colors truncate">
                          {item.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-auto flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
