import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Trophy, BrainCircuit, LayoutGrid, Zap, Play, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export interface PracticeModeModalProps {
  isOpen: boolean
  onClose: () => void
  deck?: any
  selectedPracticeQuiz?: any
  onSelectMode?: (mode: string) => void
}

export function PracticeModeModal({
  isOpen,
  onClose,
  deck: propDeck,
  selectedPracticeQuiz,
  onSelectMode
}: PracticeModeModalProps) {
  const navigate = useNavigate()
  const { updateUserSettings } = useAppStore()
  const deck = propDeck || selectedPracticeQuiz

  if (!isOpen || !deck) return null

  const disabledModes = deck.practice_settings?.disabled_modes || []

  const practiceModes = [
    {
      mode: 'mcq',
      icon: LayoutGrid,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      hoverColor: 'hover:border-indigo-500/40 hover:bg-indigo-50/15',
      title: 'Multiple Choice (MCQ)',
      desc: 'Quick 4-choice response reflex training',
      badge: 'Reflex'
    },
    {
      mode: 'typing',
      icon: Zap,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-100',
      hoverColor: 'hover:border-purple-500/40 hover:bg-purple-50/15',
      title: 'Vocabulary Typing',
      desc: 'Type vocabulary characters for deep spelling recall',
      badge: 'Spelling'
    },
    {
      mode: 'listening',
      icon: Play,
      iconColor: 'text-sky-600 bg-sky-50 border-sky-100',
      hoverColor: 'hover:border-sky-500/40 hover:bg-sky-50/15',
      title: 'Listening Test',
      desc: 'Listen to native audio and select the correct answer',
      badge: 'Audio'
    },
  ].filter(item => !disabledModes.includes(item.mode))

  const handleSelect = (mode: string) => {
    onClose()
    updateUserSettings({ practice_submode: mode as any })
    if (onSelectMode) {
      onSelectMode(mode)
    } else {
      navigate(`/practice/${deck.id}/${mode}`)
    }
  }

  return (
    <AnimatePresence>
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
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative z-10 p-5 sm:p-6 border border-slate-100 text-left overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 relative z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                <Trophy className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight leading-tight">
                  Practice Console
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Select interactive practice exercise
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Deck Info Banner */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-4 shrink-0 text-left">
            <h4 className="text-xs sm:text-sm font-black text-emerald-700 tracking-wide line-clamp-1">
              {deck.title}
            </h4>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
              {deck.questions_count ?? '--'} questions available
            </p>
          </div>

          {/* Practice Modes List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0">
            <div className="space-y-2.5">
              {practiceModes.map(item => {
                const IconComp = item.icon
                return (
                  <button
                    key={item.mode}
                    onClick={() => handleSelect(item.mode)}
                    className={cn(
                      "group w-full flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-slate-100 bg-white hover:shadow-xs active:scale-[0.99] transition-all text-left shadow-2xs cursor-pointer",
                      item.hoverColor
                    )}
                  >
                    <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-all shrink-0", item.iconColor)}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-emerald-600 transition-colors truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PracticeModeModal
