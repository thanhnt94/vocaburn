import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  X, 
  Settings2, 
  Layers, 
  BookOpen, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Check, 
  RotateCcw,
  LayoutGrid,
  SlidersHorizontal,
  Flame,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface HomeCustomizeModalProps {
  isOpen: boolean
  onClose: () => void
  roadmapDecks: any[]
  activeDecks: any[]
}

export function HomeCustomizeModal({
  isOpen,
  onClose,
  roadmapDecks,
  activeDecks
}: HomeCustomizeModalProps) {
  const { userSettings, updateUserSettings } = useAppStore()

  const [activeTab, setActiveTab] = useState<'display' | 'roadmap_order' | 'learning_order'>('display')
  const [defaultTab, setDefaultTab] = useState<'roadmap' | 'learning'>('roadmap')
  const [displayMode, setDisplayMode] = useState<'carousel' | 'vertical' | 'compact'>('carousel')
  const [orderedRoadmapDecks, setOrderedRoadmapDecks] = useState<any[]>([])
  const [orderedLearningDecks, setOrderedLearningDecks] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize state from userSettings and passed decks
  useEffect(() => {
    if (isOpen) {
      setDefaultTab(userSettings.home_active_tab || 'roadmap')
      setDisplayMode(userSettings.roadmap_display_mode || 'carousel')

      // Order roadmap decks
      const rmOrder = userSettings.roadmap_deck_order || []
      const sortedRm = [...roadmapDecks].sort((a, b) => {
        const idA = a.deck_id || a.id
        const idB = b.deck_id || b.id
        const idxA = rmOrder.indexOf(idA)
        const idxB = rmOrder.indexOf(idB)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return 0
      })
      setOrderedRoadmapDecks(sortedRm)

      // Order learning decks
      const lnOrder = userSettings.learning_deck_order || []
      const sortedLn = [...activeDecks].sort((a, b) => {
        const idA = a.deck_id || a.id
        const idB = b.deck_id || b.id
        const idxA = lnOrder.indexOf(idA)
        const idxB = lnOrder.indexOf(idB)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return 0
      })
      setOrderedLearningDecks(sortedLn)
      setSaveSuccess(false)
    }
  }, [isOpen, userSettings, roadmapDecks, activeDecks])

  // Move helpers
  const moveRoadmapDeck = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= orderedRoadmapDecks.length) return
    const next = [...orderedRoadmapDecks]
    const temp = next[index]
    next[index] = next[targetIdx]
    next[targetIdx] = temp
    setOrderedRoadmapDecks(next)
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(6)
    }
  }

  const moveLearningDeck = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= orderedLearningDecks.length) return
    const next = [...orderedLearningDecks]
    const temp = next[index]
    next[index] = next[targetIdx]
    next[targetIdx] = temp
    setOrderedLearningDecks(next)
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(6)
    }
  }

  const handleResetDefaults = () => {
    setDefaultTab('roadmap')
    setDisplayMode('carousel')
    setOrderedRoadmapDecks([...roadmapDecks])
    setOrderedLearningDecks([...activeDecks])
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const roadmapIds = orderedRoadmapDecks.map(d => d.deck_id || d.id).filter(Boolean)
      const learningIds = orderedLearningDecks.map(d => d.deck_id || d.id).filter(Boolean)

      await updateUserSettings({
        home_active_tab: defaultTab,
        roadmap_display_mode: displayMode,
        roadmap_deck_order: roadmapIds,
        learning_deck_order: learningIds
      })

      setSaveSuccess(true)
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate([15, 30, 15])
      }
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (e) {
      console.error('Failed to save home customization', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 font-sans select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-lg bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl relative z-10 border border-slate-200/80 flex flex-col max-h-[88vh] overflow-hidden text-left"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                    Customize Home & Order
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    Saved directly to database across your devices
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 pt-3 pb-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('display')}
                className={cn(
                  "flex-1 py-2 px-2.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === 'display'
                    ? "bg-white text-orange-600 shadow-sm border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Display & Tab</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roadmap_order')}
                className={cn(
                  "flex-1 py-2 px-2.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
                  activeTab === 'roadmap_order'
                    ? "bg-white text-orange-600 shadow-sm border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Roadmap ({orderedRoadmapDecks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('learning_order')}
                className={cn(
                  "flex-1 py-2 px-2.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
                  activeTab === 'learning_order'
                    ? "bg-white text-orange-600 shadow-sm border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Learning ({orderedLearningDecks.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
              {/* ══════════════ TAB 1: DISPLAY & TAB PREFERENCES ══════════════ */}
              {activeTab === 'display' && (
                <div className="space-y-5">
                  {/* Section A: Default Home Tab */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                      Default Home Tab
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDefaultTab('roadmap')}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-1",
                          defaultTab === 'roadmap'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-orange-500" />
                            Roadmap
                          </span>
                          {defaultTab === 'roadmap' && (
                            <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-tight">
                          Focus on daily scheduled goals & 3-step mastery
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDefaultTab('learning')}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-1",
                          defaultTab === 'learning'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                            Learning Decks
                          </span>
                          {defaultTab === 'learning' && (
                            <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-tight">
                          Show all your enrolled decks & FSRS due cards
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Section B: Roadmap Display Mode */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                      Roadmap Display Style
                    </label>
                    <div className="space-y-2">
                      {/* 1. Carousel */}
                      <div
                        onClick={() => setDisplayMode('carousel')}
                        className={cn(
                          "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          displayMode === 'carousel'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-100/70 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 text-base">
                            🎠
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">
                              Swipe Carousel (Single Card)
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500">
                              Full-height card with mascot, wheel swipe, and 3-step action cards
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                          displayMode === 'carousel' ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                        )}>
                          {displayMode === 'carousel' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* 2. Vertical Stack */}
                      <div
                        onClick={() => setDisplayMode('vertical')}
                        className={cn(
                          "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          displayMode === 'vertical'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 text-base">
                            📜
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">
                              Vertical Stack (Scroll All)
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500">
                              Display all active roadmap decks stacked vertically with quick access
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                          displayMode === 'vertical' ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                        )}>
                          {displayMode === 'vertical' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* 3. Compact Cards */}
                      <div
                        onClick={() => setDisplayMode('compact')}
                        className={cn(
                          "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          displayMode === 'compact'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 text-base">
                            ⚡
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">
                              Compact Cards (High Density)
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500">
                              Clean summary rows with daily step completion pills & 1-tap start
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                          displayMode === 'compact' ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                        )}>
                          {displayMode === 'compact' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ TAB 2: ROADMAP DECK ORDER ══════════════ */}
              {activeTab === 'roadmap_order' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Drag or use arrows to change sequence
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                      {orderedRoadmapDecks.length} Decks
                    </span>
                  </div>

                  {orderedRoadmapDecks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No active roadmap decks found.
                    </div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={orderedRoadmapDecks}
                      onReorder={setOrderedRoadmapDecks}
                      className="space-y-2"
                    >
                      {orderedRoadmapDecks.map((deck, idx) => {
                        const id = deck.deck_id || deck.id
                        const st = deck.status || {}
                        const streak = st.streak || deck.streak || 0
                        const isDone = st.all_done

                        return (
                          <Reorder.Item
                            key={id}
                            value={deck}
                            className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-2.5 touch-none"
                          >
                            {/* Drag Handle */}
                            <div className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Position Index */}
                            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
                              #{idx + 1}
                            </div>

                            {/* Deck Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {deck.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                                {streak > 0 && (
                                  <span className="text-orange-500 flex items-center gap-0.5 font-black">
                                    <Flame className="w-2.5 h-2.5 fill-current" />
                                    {streak}d
                                  </span>
                                )}
                                {isDone ? (
                                  <span className="text-emerald-600 font-black">✓ Done today</span>
                                ) : (
                                  <span>{st.new_target_today || 20} new / day</span>
                                )}
                              </div>
                            </div>

                            {/* Up / Down Arrow Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveRoadmapDeck(idx, 'up')}
                                disabled={idx === 0}
                                className={cn(
                                  "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                  idx === 0
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-700 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 cursor-pointer shadow-2xs active:scale-95"
                                )}
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => moveRoadmapDeck(idx, 'down')}
                                disabled={idx === orderedRoadmapDecks.length - 1}
                                className={cn(
                                  "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                  idx === orderedRoadmapDecks.length - 1
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-700 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 cursor-pointer shadow-2xs active:scale-95"
                                )}
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </Reorder.Item>
                        )
                      })}
                    </Reorder.Group>
                  )}
                </div>
              )}

              {/* ══════════════ TAB 3: LEARNING DECK ORDER ══════════════ */}
              {activeTab === 'learning_order' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Drag or use arrows to change sequence
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                      {orderedLearningDecks.length} Decks
                    </span>
                  </div>

                  {orderedLearningDecks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No active learning decks found.
                    </div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={orderedLearningDecks}
                      onReorder={setOrderedLearningDecks}
                      className="space-y-2"
                    >
                      {orderedLearningDecks.map((deck, idx) => {
                        const id = deck.deck_id || deck.id
                        const total = deck.total_cards || 0
                        const learned = deck.learned_cards || 0
                        const pct = deck.total_pct !== undefined 
                          ? deck.total_pct 
                          : (total > 0 ? Math.round((learned / total) * 100) : 0)

                        return (
                          <Reorder.Item
                            key={id}
                            value={deck}
                            className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-2.5 touch-none"
                          >
                            {/* Drag Handle */}
                            <div className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Position Index */}
                            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
                              #{idx + 1}
                            </div>

                            {/* Deck Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {deck.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                                <span>{learned}/{total} words</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-black">{pct}%</span>
                              </div>
                            </div>

                            {/* Up / Down Arrow Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveLearningDeck(idx, 'up')}
                                disabled={idx === 0}
                                className={cn(
                                  "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                  idx === 0
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-700 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 cursor-pointer shadow-2xs active:scale-95"
                                )}
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => moveLearningDeck(idx, 'down')}
                                disabled={idx === orderedLearningDecks.length - 1}
                                className={cn(
                                  "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                  idx === orderedLearningDecks.length - 1
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-700 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 cursor-pointer shadow-2xs active:scale-95"
                                )}
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </Reorder.Item>
                        )
                      })}
                    </Reorder.Group>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95",
                    saveSuccess
                      ? "bg-emerald-600 shadow-emerald-500/20"
                      : "bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25"
                  )}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
