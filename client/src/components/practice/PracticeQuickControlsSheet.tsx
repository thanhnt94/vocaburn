import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { 
  Sliders, 
  X, 
  Shuffle, 
  ListOrdered, 
  HelpCircle, 
  Keyboard, 
  Volume2, 
  Headphones, 
  Layers, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  VolumeX, 
  Music, 
  Zap, 
  Image, 
  Eye, 
  EyeOff, 
  Pencil, 
  Copy, 
  Check, 
  RotateCcw, 
  LogOut, 
  Settings, 
  BookOpen, 
  CheckCircle,
  FolderTree
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/flashcard'

export type PracticeScope = 'all' | 'review' | 'new' | 'learned'
export type PracticeSubMode = 'mcq' | 'typing' | 'listening_mcq' | 'listening_typing'

export interface PracticeQuickControlsSheetProps {
  isOpen: boolean
  onClose: () => void
  practiceSubMode: PracticeSubMode
  onSelectPracticeMode: (mode: PracticeSubMode) => void
  cardScope: PracticeScope
  onSelectCardScope: (scope: PracticeScope) => void
  scopeCounts: { all: number; review: number; new: number; learned: number }
  randomEnabled: boolean
  onToggleRandom: (enabled: boolean) => void
  autoPlayAudio: string
  setAutoPlayAudio: (val: string) => void
  audioSpeed?: number
  onChangeAudioSpeed?: (speed: number) => void
  sfxEnabled: boolean
  setSfxEnabled: (val: boolean) => void
  hapticEnabled: boolean
  setHapticEnabled: (val: boolean) => void
  fontSize?: string
  setFontSize?: (val: string) => void
  showImages?: string | boolean
  setShowImages?: (val: any) => void
  currentQuestion?: Question | null
  currentPracticeData?: any
  canEdit?: boolean
  onOpenEditModal?: () => void
  onToggleIgnoreCard?: () => void
  isIgnored?: boolean
  deckId?: string
  onRestartSession?: () => void
  onExitSession?: () => void
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  subLessons?: string[]
  selectedSubLesson?: string | null
  onSelectSubLesson?: (subLesson: string | null) => void
}

export const PracticeQuickControlsSheet: React.FC<PracticeQuickControlsSheetProps> = ({
  isOpen,
  onClose,
  practiceSubMode,
  onSelectPracticeMode,
  cardScope,
  onSelectCardScope,
  scopeCounts,
  randomEnabled,
  onToggleRandom,
  autoPlayAudio,
  setAutoPlayAudio,
  audioSpeed = 1.0,
  onChangeAudioSpeed,
  sfxEnabled,
  setSfxEnabled,
  hapticEnabled,
  setHapticEnabled,
  fontSize = '100%',
  setFontSize,
  showImages = 'always',
  setShowImages,
  currentQuestion,
  currentPracticeData,
  canEdit = false,
  onOpenEditModal,
  onToggleIgnoreCard,
  isIgnored = false,
  deckId,
  onRestartSession,
  onExitSession,
  showLocalToast,
  subLessons = [],
  selectedSubLesson = null,
  onSelectSubLesson,
}) => {
  const [copiedQuestion, setCopiedQuestion] = useState(false)
  const [copiedAnswer, setCopiedAnswer] = useState(false)
  const [quickTab, setQuickTab] = useState<'actions' | 'preferences'>('preferences')
  const dragControls = useDragControls()

  const handleCopyQuestion = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = currentPracticeData?.question || currentQuestion?.content || (currentQuestion as any)?.front
    if (!text) {
      showLocalToast?.('No question text to copy', 'warning')
      return
    }
    navigator.clipboard.writeText(String(text).trim()).then(() => {
      setCopiedQuestion(true)
      setTimeout(() => setCopiedQuestion(false), 2000)
      showLocalToast?.('Question copied to clipboard! ✓', 'success')
    }).catch(() => {
      showLocalToast?.('Failed to copy to clipboard', 'warning')
    })
  }

  const handleCopyAnswer = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = currentPracticeData?.correct_answer || currentQuestion?.explanation || (currentQuestion as any)?.back
    if (!text) {
      showLocalToast?.('No answer text to copy', 'warning')
      return
    }
    navigator.clipboard.writeText(String(text).trim()).then(() => {
      setCopiedAnswer(true)
      setTimeout(() => setCopiedAnswer(false), 2000)
      showLocalToast?.('Answer copied to clipboard! ✓', 'success')
    }).catch(() => {
      showLocalToast?.('Failed to copy to clipboard', 'warning')
    })
  }

  // Cycle Mode handler
  const handleCycleMode = () => {
    const modes: PracticeSubMode[] = ['mcq', 'typing', 'listening_mcq', 'listening_typing']
    const nextIdx = (modes.indexOf(practiceSubMode) + 1) % modes.length
    const nextMode = modes[nextIdx]
    onSelectPracticeMode(nextMode)
    const labels: Record<PracticeSubMode, string> = {
      mcq: 'Multiple Choice (MCQ)',
      typing: 'Typing Recall',
      listening_mcq: 'Audio MCQ',
      listening_typing: 'Listening Typing'
    }
    showLocalToast?.(`Mode: ${labels[nextMode]}`, 'info')
  }

  // Cycle Scope handler
  const handleCycleScope = () => {
    const scopes: PracticeScope[] = ['all', 'review', 'new', 'learned']
    const nextIdx = (scopes.indexOf(cardScope) + 1) % scopes.length
    const nextScope = scopes[nextIdx]
    onSelectCardScope(nextScope)
    const labels: Record<PracticeScope, string> = {
      all: `All Questions (${scopeCounts.all})`,
      review: `Review Due (${scopeCounts.review})`,
      new: `New Cards (${scopeCounts.new})`,
      learned: `Learned Cards (${scopeCounts.learned})`
    }
    showLocalToast?.(`Filter: ${labels[nextScope]}`, 'info')
  }

  // Toggle order handler
  const handleToggleOrder = () => {
    const nextVal = !randomEnabled
    onToggleRandom(nextVal)
    showLocalToast?.(`Queue Order: ${nextVal ? 'Random Shuffle' : 'Sequential'}`, 'info')
  }

  // Mode badge metadata
  const modeMeta = (() => {
    switch (practiceSubMode) {
      case 'typing':
        return {
          label: 'TYPING',
          color: 'text-violet-600',
          container: 'bg-violet-50 border-violet-300 text-violet-700 shadow-2xs',
          iconBox: 'bg-violet-600 text-white shadow-2xs',
          icon: <Keyboard className="w-3.5 h-3.5" />,
          title: 'Mode: Typing Recall (Click to cycle)'
        }
      case 'listening_mcq':
        return {
          label: 'L-MCQ',
          color: 'text-sky-600',
          container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
          iconBox: 'bg-sky-600 text-white shadow-2xs',
          icon: <Volume2 className="w-3.5 h-3.5" />,
          title: 'Mode: Audio MCQ (Click to cycle)'
        }
      case 'listening_typing':
        return {
          label: 'L-TYP',
          color: 'text-amber-600',
          container: 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs',
          iconBox: 'bg-amber-600 text-white shadow-2xs',
          icon: <Headphones className="w-3.5 h-3.5" />,
          title: 'Mode: Listening Typing (Click to cycle)'
        }
      case 'mcq':
      default:
        return {
          label: 'MCQ',
          color: 'text-indigo-600',
          container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
          iconBox: 'bg-indigo-600 text-white shadow-2xs',
          icon: <HelpCircle className="w-3.5 h-3.5" />,
          title: 'Mode: Multiple Choice (Click to cycle)'
        }
    }
  })()

  // Scope badge metadata
  const scopeMeta = (() => {
    switch (cardScope) {
      case 'review':
        return {
          label: `DUE • ${scopeCounts.review}`,
          color: 'text-rose-600',
          container: 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs',
          iconBox: 'bg-rose-600 text-white shadow-2xs',
          icon: <Clock className="w-3.5 h-3.5" />,
          title: `Filter: Review Due Only (${scopeCounts.review})`
        }
      case 'new':
        return {
          label: `NEW • ${scopeCounts.new}`,
          color: 'text-emerald-600',
          container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
          iconBox: 'bg-emerald-600 text-white shadow-2xs',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          title: `Filter: New Cards Only (${scopeCounts.new})`
        }
      case 'learned':
        return {
          label: `LEARNED • ${scopeCounts.learned}`,
          color: 'text-purple-600',
          container: 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs',
          iconBox: 'bg-purple-600 text-white shadow-2xs',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          title: `Filter: Learned Cards (${scopeCounts.learned})`
        }
      case 'all':
      default:
        return {
          label: `ALL • ${scopeCounts.all}`,
          color: 'text-indigo-600',
          container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
          iconBox: 'bg-indigo-600 text-white shadow-2xs',
          icon: <Layers className="w-3.5 h-3.5" />,
          title: `Filter: All Questions (${scopeCounts.all})`
        }
    }
  })()

  // Order badge metadata
  const orderMeta = randomEnabled
    ? {
        label: 'RAND',
        color: 'text-violet-600',
        container: 'bg-violet-50 border-violet-300 text-violet-700 shadow-2xs',
        iconBox: 'bg-violet-600 text-white shadow-2xs',
        title: 'Queue Order: Random Shuffle'
      }
    : {
        label: 'SEQ',
        color: 'text-slate-500',
        container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
        iconBox: 'bg-white text-slate-400 border border-slate-200/60',
        title: 'Queue Order: Sequential Order'
      }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end pointer-events-auto">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />

          {/* Bottom Drawer Container with Swipe-Down Gesture */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 60 || info.velocity.y > 250) {
                onClose()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2rem] border-t border-slate-200/90 shadow-2xl p-3 sm:p-4 pb-5 sm:pb-6 flex flex-col gap-2.5 select-none z-10 max-h-[88vh] overflow-y-auto touch-pan-y"
          >
            {/* Drag Handle Bar */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="w-full flex items-center justify-center pt-0 pb-1.5 -mt-1 cursor-grab active:cursor-grabbing touch-none select-none"
              title="Swipe down to close"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors shadow-2xs" />
            </div>

            {/* Header Bar */}
            <div 
              onPointerDown={(e) => {
                const target = e.target as HTMLElement
                if (!target.closest('button')) {
                  dragControls.start(e)
                }
              }}
              className="flex items-center justify-between px-1 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Practice Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mode & Filter Preferences</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {deckId && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        window.location.href = `/decks/${deckId}?tab=cards`
                      }}
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-slate-200/60 shadow-2xs"
                      title="Deck Cards Hub"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        window.location.href = `/decks/${deckId}?tab=settings`
                      }}
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-slate-200/60 shadow-2xs group"
                      title="Deck Settings"
                    >
                      <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
                    </button>
                  </>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Top 3-Button Quick Setup Summary (Mode, Filter Scope, Queue Order) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs">
              {/* Button 1: Mode Cycle */}
              <button
                type="button"
                onClick={handleCycleMode}
                className={cn(
                  "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                  modeMeta.container
                )}
                title={modeMeta.title}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", modeMeta.iconBox)}>
                  {modeMeta.icon}
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Mode</span>
                  <span className={cn("text-[8.5px] font-black uppercase tracking-wider", modeMeta.color)}>
                    {modeMeta.label}
                  </span>
                </div>
              </button>

              {/* Button 2: Filter Scope Cycle */}
              <button
                type="button"
                onClick={handleCycleScope}
                className={cn(
                  "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                  scopeMeta.container
                )}
                title={scopeMeta.title}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", scopeMeta.iconBox)}>
                  {scopeMeta.icon}
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Filter</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-tight", scopeMeta.color)}>
                    {scopeMeta.label}
                  </span>
                </div>
              </button>

              {/* Button 3: Queue Order Toggle */}
              <button
                type="button"
                onClick={handleToggleOrder}
                className={cn(
                  "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                  orderMeta.container
                )}
                title={orderMeta.title}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", orderMeta.iconBox)}>
                  <Shuffle className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Order</span>
                  <span className={cn("text-[8.5px] font-black uppercase tracking-wider", orderMeta.color)}>
                    {orderMeta.label}
                  </span>
                </div>
              </button>
            </div>

            {/* Section 1: Practice Mode Selector (4 Direct Interactive Buttons) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 text-left">
                Select Practice Mode
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'mcq', label: 'MCQ', sub: 'Choice', icon: HelpCircle },
                  { id: 'typing', label: 'Typing', sub: 'Recall', icon: Keyboard },
                  { id: 'listening_mcq', label: 'Audio MCQ', sub: 'Listen', icon: Volume2 },
                  { id: 'listening_typing', label: 'Audio Type', sub: 'Dictate', icon: Headphones },
                ].map((m) => {
                  const Icon = m.icon
                  const isActive = practiceSubMode === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectPracticeMode(m.id as PracticeSubMode)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer text-center min-h-[54px] gap-1",
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-md font-bold scale-[1.02]"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-indigo-600")} />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] font-black">{m.label}</span>
                        <span className={cn("text-[8px] font-medium opacity-80", isActive ? "text-indigo-100" : "text-slate-400")}>
                          {m.sub}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Card Scope Filter Selector (4 Direct Filter Pills with counts) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                  Filter Question Scope
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {scopeCounts[cardScope]} active
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label: 'All', count: scopeCounts.all, icon: Layers, activeColor: 'bg-indigo-600 border-indigo-700' },
                  { id: 'review', label: 'Due', count: scopeCounts.review, icon: Clock, activeColor: 'bg-rose-600 border-rose-700' },
                  { id: 'new', label: 'New', count: scopeCounts.new, icon: Sparkles, activeColor: 'bg-emerald-600 border-emerald-700' },
                  { id: 'learned', label: 'Learned', count: scopeCounts.learned, icon: CheckCircle2, activeColor: 'bg-purple-600 border-purple-700' },
                ].map((s) => {
                  const Icon = s.icon
                  const isActive = cardScope === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectCardScope(s.id as PracticeScope)}
                      className={cn(
                        "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer text-center min-h-[50px] gap-0.5",
                        isActive
                          ? cn(s.activeColor, "text-white shadow-md font-bold scale-[1.02]")
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className={cn("w-3 h-3", isActive ? "text-white" : "text-slate-500")} />
                        <span className="text-[10px] font-black">{s.label}</span>
                      </div>
                      <span className={cn("text-[9px] font-extrabold", isActive ? "text-white/90" : "text-slate-500")}>
                        {s.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sub-lesson Filter (if deck has sub-lessons) */}
            {subLessons.length > 0 && onSelectSubLesson && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 text-left flex items-center gap-1">
                  <FolderTree className="w-3 h-3 text-slate-400" />
                  Sub-Lesson Scope
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => onSelectSubLesson(null)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer",
                      selectedSubLesson === null
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs font-black"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/70"
                    )}
                  >
                    All Sub-lessons
                  </button>
                  {subLessons.map((sub) => {
                    const isSelected = selectedSubLesson === sub
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => onSelectSubLesson(sub)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer truncate max-w-[160px]",
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs font-black"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/70"
                        )}
                        title={sub}
                      >
                        {sub}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Segmented Sub-Tab Switcher (Preferences vs Card Actions) */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80 mt-1">
              <button
                type="button"
                onClick={() => setQuickTab('preferences')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none",
                  quickTab === 'preferences'
                    ? "bg-white text-indigo-700 shadow-xs scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Preferences</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickTab('actions')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none",
                  quickTab === 'actions'
                    ? "bg-white text-indigo-700 shadow-xs scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Card Actions</span>
              </button>
            </div>

            {/* ══════ TAB 1: PREFERENCES ══════ */}
            {quickTab === 'preferences' && (
              <div className="flex flex-col gap-2.5 text-left px-0.5">
                {/* Audio Pronunciation Playback */}
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">TTS Pronunciation</span>
                    <span className="text-[9px] text-slate-400 font-medium">Automatic voice playback</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'none', label: 'OFF' },
                      { id: 'front', label: 'Q' },
                      { id: 'back', label: 'A' },
                      { id: 'always', label: 'BOTH' }
                    ].map((opt) => {
                      const isSelected = autoPlayAudio === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setAutoPlayAudio(opt.id)
                            showLocalToast?.(`Audio Autoplay: ${opt.label}`, 'info')
                          }}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-600 text-white shadow-2xs font-black scale-105"
                              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Audio Speed */}
                {onChangeAudioSpeed && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold text-slate-800 leading-tight">Audio Speed</span>
                      <span className="text-[9px] text-slate-400 font-medium">Playback rate for speech</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0.8, 1.0, 1.2, 1.5].map((speed) => {
                        const isSelected = Math.abs(audioSpeed - speed) < 0.05
                        return (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => {
                              onChangeAudioSpeed(speed)
                              showLocalToast?.(`Audio Speed: ${speed}x`, 'info')
                            }}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                              isSelected
                                ? "bg-indigo-600 text-white shadow-2xs font-black scale-105"
                                : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                            )}
                          >
                            {speed}x
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* SFX and Haptic Controls */}
                <div className="grid grid-cols-2 gap-2">
                  {/* SFX */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !sfxEnabled
                      setSfxEnabled(nextVal)
                      showLocalToast?.(`Sound Effects: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-2xs",
                      sfxEnabled
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-800"
                        : "bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", sfxEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>
                        <Music className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold">Sound SFX</span>
                    </div>
                    <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md", sfxEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600")}>
                      {sfxEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {/* Haptic */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !hapticEnabled
                      setHapticEnabled(nextVal)
                      showLocalToast?.(`Haptic Vibration: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-2xs",
                      hapticEnabled
                        ? "bg-indigo-50/70 border-indigo-300 text-indigo-800"
                        : "bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", hapticEnabled ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold">Haptic</span>
                    </div>
                    <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md", hapticEnabled ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600")}>
                      {hapticEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Font Size & Image Display */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Font Size */}
                  {setFontSize && (
                    <div className="flex flex-col gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-600">Font Scale</span>
                      <div className="flex items-center justify-between gap-1">
                        {[
                          { val: '85%', label: 'S' },
                          { val: '100%', label: 'M' },
                          { val: '115%', label: 'L' },
                          { val: '130%', label: 'XL' }
                        ].map((sz) => {
                          const isSelected = fontSize === sz.val
                          return (
                            <button
                              key={sz.val}
                              type="button"
                              onClick={() => {
                                setFontSize(sz.val)
                                showLocalToast?.(`Font Scale: ${sz.label} (${sz.val})`, 'info')
                              }}
                              className={cn(
                                "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center",
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-2xs font-black"
                                  : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                              )}
                            >
                              {sz.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Card Images */}
                  {setShowImages && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = showImages === 'none' ? 'always' : 'none'
                        setShowImages(nextVal)
                        showLocalToast?.(`Card Images: ${nextVal === 'always' ? 'Shown' : 'Hidden'}`, 'info')
                      }}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-2xs h-full",
                        showImages !== 'none'
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-800"
                          : "bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", showImages !== 'none' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>
                          <Image className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold">Images</span>
                      </div>
                      <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md", showImages !== 'none' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600")}>
                        {showImages !== 'none' ? 'SHOW' : 'HIDE'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ══════ TAB 2: CARD ACTIONS ══════ */}
            {quickTab === 'actions' && (
              <div className="flex flex-col gap-2 text-left px-0.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {/* 1. Edit Card */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      onClose()
                      onOpenEditModal?.()
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs",
                      canEdit
                        ? "bg-slate-50 hover:bg-blue-50/70 border-slate-200/80 hover:border-blue-300 cursor-pointer"
                        : "bg-slate-50/60 border-slate-200/50 opacity-60 cursor-not-allowed"
                    )}
                    title={canEdit ? "Open Card Editor" : "Card editing not permitted"}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                      canEdit ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                    )}>
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[11px] font-bold text-slate-800 truncate">Edit Card</span>
                      <span className="text-[9px] text-slate-400 truncate">{canEdit ? "Open Editor" : "Locked"}</span>
                    </div>
                  </button>

                  {/* 2. Ignore / Skip Card */}
                  {onToggleIgnoreCard && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleIgnoreCard()
                        showLocalToast?.(isIgnored ? "Card un-ignored" : "Card ignored from practice", "info")
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer",
                        isIgnored
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                      )}
                      title={isIgnored ? "Unignore Card" : "Ignore / Skip Card"}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                        isIgnored ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"
                      )}>
                        {isIgnored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-[11px] font-bold truncate">
                          {isIgnored ? "Unignore" : "Ignore Card"}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate">
                          {isIgnored ? "Active in queue" : "Skip in practice"}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* 3. Copy Question */}
                  <button
                    type="button"
                    onClick={handleCopyQuestion}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer",
                      copiedQuestion
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                    )}
                    title="Copy Question to clipboard"
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                      copiedQuestion ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                    )}>
                      {copiedQuestion ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[11px] font-bold truncate">
                        {copiedQuestion ? "Copied!" : "Copy Question"}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate">Question text</span>
                    </div>
                  </button>

                  {/* 4. Copy Answer */}
                  <button
                    type="button"
                    onClick={handleCopyAnswer}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer",
                      copiedAnswer
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                    )}
                    title="Copy Answer to clipboard"
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                      copiedAnswer ? "bg-emerald-600 text-white" : "bg-purple-600 text-white"
                    )}>
                      {copiedAnswer ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[11px] font-bold truncate">
                        {copiedAnswer ? "Copied!" : "Copy Answer"}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate">Correct answer</span>
                    </div>
                  </button>
                </div>

                {/* Session Actions (Restart & Exit) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {onRestartSession && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onRestartSession()
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Restart Practice</span>
                    </button>
                  )}
                  {onExitSession && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onExitSession()
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-rose-200/60"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Exit Session</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
