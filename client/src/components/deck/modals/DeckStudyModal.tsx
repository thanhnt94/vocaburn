import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Brain, BrainCircuit, ChevronRight, X, Trophy } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export interface DeckStudyModalProps {
  isOpen: boolean
  onClose: () => void
  deck: {
    id: number
    title: string
    questions_count?: number
    practice_settings?: any
  } | null
  initialTab?: 'flashcard' | 'practice'
}

export function DeckStudyModal({
  isOpen,
  onClose,
  deck,
  initialTab = 'flashcard'
}: DeckStudyModalProps) {
  const [activeTab, setActiveTab] = React.useState<'flashcard' | 'practice'>(initialTab)
  const navigate = useNavigate()
  const { updateUserSettings } = useAppStore()

  React.useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, isOpen])

  if (!isOpen || !deck) return null

  const disabledModes = deck.practice_settings?.disabled_modes || []

  const flashcardModes = [
    { mode: 'fsrs', icon: '🧠', title: 'FSRS Spaced Repetition', desc: 'Intelligent spaced repetition algorithm' },
    { mode: 'roadmap', icon: '🗺️', title: 'Roadmap Mode', desc: 'Daily step-by-step learning targets' },
    { mode: 'flip', icon: '🔄', title: 'Flip Card', desc: 'Free flip flashcard rapid recall' },
    { mode: 'review', icon: '📚', title: 'Review Only', desc: 'Review previously learned cards only' },
    { mode: 'new', icon: '✨', title: 'New Only', desc: 'Study new unlearned cards only' },
  ].filter(item => !disabledModes.includes(item.mode))

  const practiceModes = [
    { mode: 'mcq', icon: '🎯', title: 'MCQ Test', desc: '4-choice reflex multiple choice quiz' },
    { mode: 'typing', icon: '⌨️', title: 'Typing Test', desc: 'Type out words for deep retention' },
    { mode: 'listening', icon: '🎧', title: 'Listening Test', desc: 'Listen to audio and select correct answer' },
  ].filter(item => !disabledModes.includes(item.mode))

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
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight leading-tight">
                  {activeTab === 'flashcard' ? 'Study Console' : 'Practice Console'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {activeTab === 'flashcard' ? 'Choose flashcard learning method' : 'Choose practice exercise'}
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

          {/* Tab Pill Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('flashcard')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'flashcard'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Flashcards</span>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'practice'
                  ? 'bg-white text-emerald-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Practice</span>
            </button>
          </div>

          {/* Deck Info Banner */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-3 shrink-0 text-left">
            <h4 className="text-xs sm:text-sm font-black text-indigo-700 tracking-wide line-clamp-1">
              {deck.title}
            </h4>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
              {deck.questions_count ?? '--'} cards in deck
            </p>
          </div>

          {/* Mode Options List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0">
            {activeTab === 'flashcard' && (
              <div className="space-y-2">
                {flashcardModes.map(item => (
                  <button
                    key={item.mode}
                    onClick={() => {
                      onClose()
                      updateUserSettings({ quiz_learning_mode: item.mode as any })
                      navigate(`/flashcard/${deck.id}/play?mode=${item.mode}`)
                    }}
                    className="group w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-indigo-500/35 hover:bg-indigo-50/10 hover:shadow-xs active:scale-[0.99] transition-all text-left shadow-2xs cursor-pointer"
                  >
                    <span className="text-lg w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-indigo-600 transition-colors truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'practice' && (
              <div className="space-y-2">
                {practiceModes.map(item => (
                  <button
                    key={item.mode}
                    onClick={() => {
                      onClose()
                      updateUserSettings({ practice_submode: item.mode as any })
                      navigate(`/practice/${deck.id}/${item.mode}`)
                    }}
                    className="group w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-emerald-500/35 hover:bg-emerald-50/10 hover:shadow-xs active:scale-[0.99] transition-all text-left shadow-2xs cursor-pointer"
                  >
                    <span className="text-lg w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-emerald-600 transition-colors truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckStudyModal
