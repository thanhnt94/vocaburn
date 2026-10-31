import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh'
import { 
  Sliders, 
  X, 
  Shuffle, 
  HelpCircle, 
  Keyboard, 
  Volume2, 
  Headphones, 
  Layers, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  VolumeX, 
  Zap, 
  Pencil, 
  Copy, 
  Check, 
  ClipboardCopy,
  RotateCcw, 
  LogOut, 
  Settings, 
  BookOpen, 
  FolderTree,
  Image as ImageIcon,
  Type,
  LayoutGrid,
  TrendingUp,
  Gauge,
  EyeOff
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
  setShowImages?: (val: string) => void
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
  showBottomNavTabs?: boolean
  onToggleBottomNavTabs?: () => void
  onOpenMap?: () => void
  onOpenStats?: () => void
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
  showBottomNavTabs = false,
  onToggleBottomNavTabs,
  onOpenMap,
  onOpenStats,
}) => {
  const [copiedQuestion, setCopiedQuestion] = useState(false)
  const [copiedAnswer, setCopiedAnswer] = useState(false)
  const dragControls = useDragControls()
  const drawerRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number>(0)
  const backdropTouchStartY = useRef<number | null>(null)

  // Prevent mobile browser pull-to-refresh strictly while sheet is open and handle swipe-down to close
  usePreventPullToRefresh({
    isOpen,
    drawerRef,
    backdropRef,
    onClose,
  })

  const handleBackdropTouchStart = (e: React.TouchEvent) => {
    backdropTouchStartY.current = e.touches[0].clientY
  }

  const handleBackdropTouchEnd = (e: React.TouchEvent) => {
    if (backdropTouchStartY.current !== null) {
      const deltaY = e.changedTouches[0].clientY - backdropTouchStartY.current
      if (deltaY > 25) {
        onClose()
      }
      backdropTouchStartY.current = null
    }
  }

  // Drawer downward swipe to dismiss when scrolled to top
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    if (drawerRef.current && drawerRef.current.scrollTop <= 0) {
      touchStartYRef.current = e.touches[0].clientY
      touchStartTimeRef.current = Date.now()
    } else {
      touchStartYRef.current = null
    }
  }

  const handleDrawerTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null && drawerRef.current && drawerRef.current.scrollTop <= 0) {
      const currentY = e.changedTouches[0].clientY
      const deltaY = currentY - touchStartYRef.current
      const duration = Date.now() - touchStartTimeRef.current
      const velocity = deltaY / Math.max(1, duration)

      if (deltaY > 50 || (deltaY > 25 && velocity > 0.3)) {
        onClose()
      }
    }
    touchStartYRef.current = null
  }

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

  if (typeof document === 'undefined') return null

  // 1. Practice Mode Cycles: mcq -> typing -> listening_mcq -> listening_typing
  const PRACTICE_MODES: { id: PracticeSubMode; short: string; label: string; icon: any }[] = [
    { id: 'mcq', short: 'MCQ', label: 'Multiple Choice', icon: HelpCircle },
    { id: 'typing', short: 'TYPE', label: 'Type Recall', icon: Keyboard },
    { id: 'listening_mcq', short: 'A-MCQ', label: 'Listen & Pick', icon: Volume2 },
    { id: 'listening_typing', short: 'A-TYPE', label: 'Listen & Type', icon: Headphones },
  ]

  const handleCycleMode = () => {
    const curIdx = PRACTICE_MODES.findIndex(m => m.id === practiceSubMode)
    const nextIdx = (curIdx + 1) % PRACTICE_MODES.length
    const nextMode = PRACTICE_MODES[nextIdx]
    onSelectPracticeMode(nextMode.id)
    showLocalToast?.(`Mode: ${nextMode.label}`, 'info')
  }

  const currentModeInfo = PRACTICE_MODES.find(m => m.id === practiceSubMode) || PRACTICE_MODES[0]

  // 2. Question Scope Cycle: all -> review -> new -> learned
  const SCOPE_CYCLE: PracticeScope[] = ['all', 'review', 'new', 'learned']
  const handleCycleScope = () => {
    const curIdx = SCOPE_CYCLE.indexOf(cardScope)
    const nextIdx = (curIdx + 1) % SCOPE_CYCLE.length
    const nextScope = SCOPE_CYCLE[nextIdx]
    onSelectCardScope(nextScope)
    const count = scopeCounts[nextScope] || 0
    showLocalToast?.(`Filter: ${nextScope.toUpperCase()} (${count} cards)`, 'info')
  }

  const scopeMeta = (() => {
    if (cardScope === 'review') {
      return {
        label: `DUE • ${scopeCounts.review ?? 0}`,
        color: 'text-rose-600',
        container: 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs',
        iconBox: 'bg-rose-600 text-white shadow-2xs',
        icon: <Clock className="w-3.5 h-3.5" />,
        title: `Filter: Due Review Cards (${scopeCounts.review ?? 0})`
      }
    }
    if (cardScope === 'new') {
      return {
        label: `NEW • ${scopeCounts.new ?? 0}`,
        color: 'text-emerald-600',
        container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
        iconBox: 'bg-emerald-600 text-white shadow-2xs',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        title: `Filter: New Cards Only (${scopeCounts.new ?? 0})`
      }
    }
    if (cardScope === 'learned') {
      return {
        label: `LRN • ${scopeCounts.learned ?? 0}`,
        color: 'text-purple-600',
        container: 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs',
        iconBox: 'bg-purple-600 text-white shadow-2xs',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        title: `Filter: Learned Cards (${scopeCounts.learned ?? 0})`
      }
    }
    return {
      label: `ALL • ${scopeCounts.all ?? 0}`,
      color: 'text-indigo-600',
      container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
      iconBox: 'bg-indigo-600 text-white shadow-2xs',
      icon: <Layers className="w-3.5 h-3.5" />,
      title: `Filter: All Deck Cards (${scopeCounts.all ?? 0})`
    }
  })()

  // 3. Queue Order (RAND vs SEQ)
  const handleToggleOrder = () => {
    const nextVal = !randomEnabled
    onToggleRandom(nextVal)
    showLocalToast?.(`Order: ${nextVal ? 'Random Shuffle' : 'Sequential Order'}`, 'info')
  }

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

  // 4. Voice / Autoplay Feedback (ANSWER vs BOTH vs OFF)
  const isAudioActive = autoPlayAudio !== 'none' && autoPlayAudio !== 'off'
  const isAudioBoth = autoPlayAudio === 'always' || autoPlayAudio === 'both'
  const handleCycleAutoplay = () => {
    let nextVal = 'back'
    let msg = 'Voice Play: Answer Only'
    if (autoPlayAudio === 'none' || autoPlayAudio === 'off') {
      nextVal = 'back'
      msg = 'Voice Play: Answer Only'
    } else if (autoPlayAudio === 'back' || autoPlayAudio === 'answer') {
      nextVal = 'always'
      msg = 'Voice Play: Both (Q & A)'
    } else {
      nextVal = 'off'
      msg = 'Voice Play: OFF'
    }
    setAutoPlayAudio(nextVal)
    showLocalToast?.(msg, 'info')
  }

  const voiceMeta = (() => {
    if (isAudioBoth) {
      return {
        label: 'BOTH',
        color: 'text-emerald-600',
        container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
        iconBox: 'bg-emerald-500 text-white shadow-2xs',
        icon: <Volume2 className="w-3.5 h-3.5" />,
        title: 'Voice Play: Both (Question & Answer)'
      }
    }
    if (isAudioActive) {
      return {
        label: 'ANS',
        color: 'text-sky-600',
        container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
        iconBox: 'bg-sky-500 text-white shadow-2xs',
        icon: <Volume2 className="w-3.5 h-3.5" />,
        title: 'Voice Play: Answer Only'
      }
    }
    return {
      label: 'OFF',
      color: 'text-slate-400',
      container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
      iconBox: 'bg-white text-slate-400 border border-slate-200/60',
      icon: <VolumeX className="w-3.5 h-3.5" />,
      title: 'Voice Play: OFF'
    }
  })()

  // Audio Speed Cycle
  const handleCycleSpeed = () => {
    const SPEEDS = [0.8, 1.0, 1.2, 1.5]
    const curSpeed = audioSpeed ?? 1.0
    const curIdx = SPEEDS.findIndex(s => Math.abs(s - curSpeed) < 0.05)
    const nextIdx = (curIdx + 1) % SPEEDS.length
    const nextSpeed = SPEEDS[nextIdx]
    onChangeAudioSpeed?.(nextSpeed)
    showLocalToast?.(`Speed: ${nextSpeed}x`, 'info')
  }

  // Card Images Toggle
  const isImgShown = showImages !== 'none' && showImages !== 'off' && showImages !== false && showImages !== 'false'
  const handleCycleImages = () => {
    const nextVal = isImgShown ? 'off' : 'always'
    setShowImages?.(nextVal)
    showLocalToast?.(`Images: ${!isImgShown ? 'SHOW' : 'HIDE'}`, 'info')
  }

  // Font Scale Cycle
  const FONT_SCALES = [
    { val: '85%', alias: 'S' },
    { val: '100%', alias: 'M' },
    { val: '125%', alias: 'L' },
    { val: '150%', alias: 'XL' }
  ]
  const currentFontAlias = (() => {
    if (fontSize === '85%' || fontSize === 'S' || fontSize === 'small') return 'S'
    if (fontSize === '125%' || fontSize === 'L' || fontSize === 'large') return 'L'
    if (fontSize === '150%' || fontSize === 'XL' || fontSize === 'xlarge') return 'XL'
    return 'M'
  })()
  const handleCycleFont = () => {
    const curIdx = FONT_SCALES.findIndex(s => s.alias === currentFontAlias)
    const nextIdx = (curIdx + 1) % FONT_SCALES.length
    const nextSize = FONT_SCALES[nextIdx]
    setFontSize?.(nextSize.val)
    showLocalToast?.(`Font Scale: ${nextSize.alias} (${nextSize.val})`, 'info')
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end pointer-events-auto">
          {/* Dimmed Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onTouchStart={handleBackdropTouchStart}
            onTouchEnd={handleBackdropTouchEnd}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs overscroll-none touch-none"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />

          {/* Bottom Drawer Container */}
          <motion.div
            ref={drawerRef}
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
            onTouchStart={handleDrawerTouchStart}
            onTouchEnd={handleDrawerTouchEnd}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2rem] border-t border-slate-200/90 shadow-2xl p-3 sm:p-4 pb-5 sm:pb-6 flex flex-col gap-2.5 select-none z-10 max-h-[88vh] overflow-y-auto overscroll-contain overscroll-none touch-pan-y"
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
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Quick Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Practice Preferences</p>
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

            {/* Top 4-Button Quick Setup Bar (Mode, Filter, Order, Voice) */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs">
              {/* Button 1: Mode */}
              <button
                type="button"
                onClick={handleCycleMode}
                className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none"
                title={`Practice Mode: ${currentModeInfo.label} (Tap to cycle)`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-600 text-white shadow-2xs">
                  <currentModeInfo.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Mode</span>
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-indigo-600">
                    {currentModeInfo.short}
                  </span>
                </div>
              </button>

              {/* Button 2: Filter */}
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

              {/* Button 3: Queue Order */}
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

              {/* Button 4: Voice Play */}
              <button
                type="button"
                onClick={handleCycleAutoplay}
                className={cn(
                  "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                  voiceMeta.container
                )}
                title={voiceMeta.title}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", voiceMeta.iconBox)}>
                  {voiceMeta.icon}
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Voice</span>
                  <span className={cn("text-[8.5px] font-black uppercase tracking-wider", voiceMeta.color)}>
                    {voiceMeta.label}
                  </span>
                </div>
              </button>
            </div>

            {/* Direct 4 Practice Mode Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {PRACTICE_MODES.map((m) => {
                const Icon = m.icon
                const isActive = practiceSubMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectPracticeMode(m.id)}
                    className={cn(
                      "flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl border transition-all active:scale-95 cursor-pointer text-center select-none shadow-2xs",
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-700 font-black shadow-xs scale-[1.02]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 font-bold"
                    )}
                    title={m.label}
                  >
                    <Icon className={cn("w-3 h-3 shrink-0", isActive ? "text-white" : "text-indigo-600")} />
                    <span className="text-[10px] leading-tight truncate">{m.short}</span>
                  </button>
                )
              })}
            </div>

            {/* Sub-lesson Filter (if deck has sub-lessons) */}
            {subLessons.length > 0 && onSelectSubLesson && (
              <div className="flex flex-col gap-1 px-0.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 text-left flex items-center gap-1">
                  <FolderTree className="w-3 h-3 text-slate-400" />
                  Sub-Lesson Scope
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => onSelectSubLesson(null)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9.5px] font-bold border transition-all shrink-0 cursor-pointer",
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
                          "px-2.5 py-1 rounded-lg text-[9.5px] font-bold border transition-all shrink-0 cursor-pointer truncate max-w-[150px]",
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

            {/* ══════ PREFERENCES SECTION (DIRECT, NO TAB SWITCHER) ══════ */}
            <div className="flex flex-col gap-2.5 text-left">
              {/* 1. Audio & Haptics (Unified 4-Button Grid) */}
              <div className="flex flex-col gap-1 text-left px-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Audio & Haptics
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Sound & Feedback
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {/* 1. Voice Play */}
                  <button
                    type="button"
                    onClick={handleCycleAutoplay}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                      voiceMeta.container
                    )}
                    title={voiceMeta.title}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", voiceMeta.iconBox)}>
                      {voiceMeta.icon}
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Voice Play</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-wider", voiceMeta.color)}>
                        {voiceMeta.label}
                      </span>
                    </div>
                  </button>

                  {/* 2. Speed */}
                  {(() => {
                    const currentSpeed = audioSpeed ?? 1.0
                    const speedMeta = (() => {
                      if (Math.abs(currentSpeed - 0.8) < 0.05) {
                        return {
                          label: '0.8x',
                          color: 'text-amber-600',
                          container: 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs',
                          iconBox: 'bg-amber-500 text-white shadow-2xs',
                          title: 'Audio Speed: 0.8x (Slow)'
                        }
                      }
                      if (Math.abs(currentSpeed - 1.2) < 0.05) {
                        return {
                          label: '1.2x',
                          color: 'text-indigo-600',
                          container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                          iconBox: 'bg-indigo-600 text-white shadow-2xs',
                          title: 'Audio Speed: 1.2x (Fast)'
                        }
                      }
                      if (Math.abs(currentSpeed - 1.5) < 0.05) {
                        return {
                          label: '1.5x',
                          color: 'text-purple-600',
                          container: 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs',
                          iconBox: 'bg-purple-600 text-white shadow-2xs',
                          title: 'Audio Speed: 1.5x (Super Fast)'
                        }
                      }
                      return {
                        label: '1.0x',
                        color: 'text-slate-500',
                        container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
                        iconBox: 'bg-white text-slate-400 border border-slate-200/60',
                        title: 'Audio Speed: 1.0x (Normal)'
                      }
                    })()

                    return (
                      <button
                        type="button"
                        onClick={handleCycleSpeed}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          speedMeta.container
                        )}
                        title={speedMeta.title}
                      >
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", speedMeta.iconBox)}>
                          <Gauge className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[9.5px] font-bold tracking-tight">Speed</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", speedMeta.color)}>
                            {speedMeta.label}
                          </span>
                        </div>
                      </button>
                    )
                  })()}

                  {/* 3. SFX Audio */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !sfxEnabled
                      setSfxEnabled(nextVal)
                      showLocalToast?.(`SFX Audio: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                      sfxEnabled
                        ? "bg-purple-50 border-purple-300 text-purple-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                    )}
                    title={`SFX Audio: ${sfxEnabled ? 'ON' : 'OFF'}`}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", sfxEnabled ? "bg-purple-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">SFX Audio</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-wider", sfxEnabled ? "text-purple-600" : "text-slate-400")}>
                        {sfxEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  </button>

                  {/* 4. Haptic */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !hapticEnabled
                      setHapticEnabled(nextVal)
                      showLocalToast?.(`Haptic Feedback: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                      hapticEnabled
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                    )}
                    title={`Haptic Feedback: ${hapticEnabled ? 'ON' : 'OFF'}`}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", hapticEnabled ? "bg-emerald-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Haptic</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-wider", hapticEnabled ? "text-emerald-600" : "text-slate-400")}>
                        {hapticEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Display & Layout (Unified Grid) */}
              <div className="flex flex-col gap-1 text-left px-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Display & Gestures
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Visuals & Interaction
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {/* 1. Images */}
                  <button
                    type="button"
                    onClick={handleCycleImages}
                    className={cn(
                      "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                      isImgShown
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                    )}
                    title={`Images: ${isImgShown ? 'SHOWN' : 'HIDDEN'}`}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isImgShown ? "bg-emerald-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Images</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-wider", isImgShown ? "text-emerald-600" : "text-slate-400")}>
                        {isImgShown ? "SHOW" : "HIDE"}
                      </span>
                    </div>
                  </button>

                  {/* 2. Font Scale */}
                  <button
                    type="button"
                    onClick={handleCycleFont}
                    className={cn(
                      "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                      currentFontAlias !== 'M'
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                    )}
                    title={`Font Scale: ${currentFontAlias}`}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", currentFontAlias !== 'M' ? "bg-indigo-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Font Scale</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-wider", currentFontAlias !== 'M' ? "text-indigo-600" : "text-slate-400")}>
                        {currentFontAlias}
                      </span>
                    </div>
                  </button>

                  {/* 3. Bottom Tabs */}
                  {onToggleBottomNavTabs !== undefined && (
                    <button
                      type="button"
                      onClick={onToggleBottomNavTabs}
                      className={cn(
                        "flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                        showBottomNavTabs
                          ? "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                      )}
                      title={`Bottom Navigation Tabs: ${showBottomNavTabs ? 'SHOWN' : 'HIDDEN'}`}
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", showBottomNavTabs ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col items-center leading-none gap-0.5">
                        <span className="text-[9.5px] font-bold tracking-tight">Bottom Tabs</span>
                        <span className={cn("text-[8px] font-black uppercase tracking-wider", showBottomNavTabs ? "text-amber-600" : "text-slate-400")}>
                          {showBottomNavTabs ? "SHOW" : "HIDE"}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Card Actions (Lightweight Icon Toolbar at Bottom) */}
              <div className="flex flex-col gap-1 text-left px-0.5 pt-1.5 border-t border-slate-100">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Card & Session Actions
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Quick Utilities
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {/* 1. Copy Question */}
                  <button
                    type="button"
                    onClick={handleCopyQuestion}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none",
                      copiedQuestion
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-emerald-50/70 border-slate-200/80 text-slate-600 hover:text-emerald-700 hover:border-emerald-200"
                    )}
                    title="Copy Question to clipboard"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                      copiedQuestion ? "bg-emerald-600 text-white" : "bg-white text-slate-500 border border-slate-200/60"
                    )}>
                      {copiedQuestion ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                      {copiedQuestion ? "Copied" : "Copy Q"}
                    </span>
                  </button>

                  {/* 2. Copy Answer */}
                  <button
                    type="button"
                    onClick={handleCopyAnswer}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none",
                      copiedAnswer
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-indigo-50/70 border-slate-200/80 text-slate-600 hover:text-indigo-700 hover:border-indigo-200"
                    )}
                    title="Copy Answer to clipboard"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                      copiedAnswer ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200/60"
                    )}>
                      {copiedAnswer ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                      {copiedAnswer ? "Copied" : "Copy A"}
                    </span>
                  </button>

                  {/* 3. Ignore Card */}
                  {onToggleIgnoreCard ? (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleIgnoreCard()
                        showLocalToast?.(isIgnored ? "Card un-ignored" : "Card ignored from practice", "info")
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none",
                        isIgnored
                          ? "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                          : "bg-slate-50 hover:bg-amber-50/70 border-slate-200/80 text-slate-600 hover:text-amber-700 hover:border-amber-200"
                      )}
                      title={isIgnored ? "Unignore Card" : "Ignore Card from Practice"}
                    >
                      <div className="w-6 h-6 rounded-lg bg-white text-slate-500 border border-slate-200/60 flex items-center justify-center">
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                        {isIgnored ? "Restore" : "Ignore"}
                      </span>
                    </button>
                  ) : (
                    <div className="opacity-0 pointer-events-none" />
                  )}

                  {/* 4. Edit Card */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      onClose()
                      onOpenEditModal?.()
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 text-center min-h-[46px] gap-1 select-none",
                      canEdit
                        ? "bg-slate-50 hover:bg-blue-50/70 border-slate-200/80 hover:border-blue-200 text-slate-600 hover:text-blue-700 cursor-pointer"
                        : "bg-slate-50/50 border-slate-200/40 text-slate-300 opacity-50 cursor-not-allowed"
                    )}
                    title={canEdit ? "Edit Card Content" : "Editing locked"}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center",
                      canEdit ? "bg-white text-slate-500 border border-slate-200/60" : "bg-slate-100 text-slate-300 border border-slate-200/40"
                    )}>
                      <Pencil className={cn("w-3.5 h-3.5", canEdit && "text-blue-500")} />
                    </div>
                    <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                      Edit
                    </span>
                  </button>

                  {/* 5. Restart Session */}
                  {onRestartSession ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onRestartSession()
                      }}
                      className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-slate-800 transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none"
                      title="Restart Practice Session"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white text-slate-500 border border-slate-200/60 flex items-center justify-center">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                        Restart
                      </span>
                    </button>
                  ) : (
                    <div className="opacity-0 pointer-events-none" />
                  )}

                  {/* 6. Exit Session */}
                  {onExitSession ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onExitSession()
                      }}
                      className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-rose-50/60 hover:bg-rose-100 border border-rose-200/70 text-rose-600 hover:text-rose-700 transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none"
                      title="Exit Practice Session"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white text-rose-500 border border-rose-200/60 flex items-center justify-center">
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                        Exit
                      </span>
                    </button>
                  ) : (
                    <div className="opacity-0 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* 4. Quick Jump: Map & Stats Shortcuts */}
              {(onOpenMap || onOpenStats) && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {onOpenMap && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMap();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-amber-700 border border-slate-200/80 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                      <span>Question Map</span>
                    </button>
                  )}
                  {onOpenStats && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStats();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-indigo-700 border border-slate-200/80 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Session Stats</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
