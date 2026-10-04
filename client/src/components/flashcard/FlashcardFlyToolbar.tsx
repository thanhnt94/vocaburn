import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  Shuffle,
  MousePointer,
  Star,
  RefreshCw,
  Settings,
  X,
  Sliders,
  Clock,
  RotateCcw,
  Hand,
  Layers,
  MoveHorizontal,
  Vibrate,
  VibrateOff,
  Pencil,
  PenLine,
  Type,
  FileText,
  Brain,
  BrainCircuit,
  Lightbulb,
  ChevronRight,
  TrendingUp,
  Lock,
  AlignLeft,
  AlignCenter,
  Copy,
  Check,
  ClipboardCopy
} from 'lucide-react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FlashcardFlyToolbarProps {
  isCardSlot?: boolean
  isFlyToolbarOpen?: boolean
  setIsFlyToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerPlayAudio: (e: React.MouseEvent) => void
  isLoadingAudio?: boolean
  isPlayingAudio?: boolean
  autoPlayAudio?: string
  setAutoPlayAudio?: (val: any) => void
  sfxEnabled?: boolean
  setSfxEnabled?: (val: boolean) => void
  effectiveAutoAdvance?: boolean
  autoNextSec?: number
  onCycleAutoNext?: (nextSec: number) => void
  setIsAutoAdvance?: (val: boolean) => void
  setQuickLearnEnabled?: (val: boolean) => void
  showImages?: any
  setShowImages?: (val: any) => void
  randomEnabled?: boolean
  setRandomEnabled?: (val: boolean) => void
  onToggleRandom?: (nextVal: boolean) => void
  isSpeedSkimMode?: boolean
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void
  isSelectMode?: boolean
  setIsSelectMode?: React.Dispatch<React.SetStateAction<boolean>>
  currentQuestion?: any
  handleStarQuestion?: () => void
  showHintBtn?: boolean
  showingHint?: boolean
  setShowingHint?: React.Dispatch<React.SetStateAction<boolean>>
  showExplainBtn?: boolean
  justAnswered?: boolean
  mainTab?: string
  setShowFeedback?: (val: boolean) => void
  setIsFeedbackOpen?: (val: boolean) => void
  showFlipBackBtn?: boolean
  isFlipped?: boolean
  setIsFlipped?: (val: boolean) => void
  setIsSettingsModalOpen?: (val: boolean) => void
  onOpenCardHub?: (subTab?: 'stats' | 'insight' | 'note' | 'community') => void
}

/**
 * Utility helpers to cleanly extract card content for AI assistance
 */
export const cleanTextForAi = (raw: string): string => {
  if (!raw) return ''
  return raw
    .replace(/\[\/?(b|i|u|s|color|size|url|align|font|center|quote|code)[^\]]*\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export const getCardFrontText = (q: any): string => {
  if (!q) return ''
  const front = q.content || q.others?.front || q.front || ''
  return cleanTextForAi(front)
}

export const getCardBackText = (q: any): string => {
  if (!q) return ''
  const correctOpt = q.options?.find((o: any) => o.is_correct)?.content || ''
  const explanation = q.explanation || ''
  const backOther = q.others?.back || q.back || ''
  const mnemonic = q.mnemonic || ''

  const parts: string[] = []
  const cleanedCorrect = cleanTextForAi(correctOpt)
  const cleanedExplanation = cleanTextForAi(explanation)
  const cleanedBackOther = cleanTextForAi(backOther)

  if (cleanedCorrect && cleanedCorrect !== "Definition revealed.") {
    parts.push(cleanedCorrect)
  }
  if (cleanedExplanation && cleanedExplanation !== cleanedCorrect) {
    parts.push(cleanedExplanation)
  }
  if (parts.length === 0 && cleanedBackOther) {
    parts.push(cleanedBackOther)
  }
  if (mnemonic) {
    parts.push(`💡 Mnemonic: ${cleanTextForAi(mnemonic)}`)
  }
  return parts.join('\n\n').trim()
}

export const getCardFullText = (q: any): string => {
  if (!q) return ''
  const front = getCardFrontText(q)
  const back = getCardBackText(q)
  if (front && back) {
    return `[Front]\n${front}\n\n[Back]\n${back}`
  }
  return front || back || ''
}

/**
 * Collapsed micro-pill rendered on the card corner (or floating island in Practice mode)
 */
export const FlashcardFlyToolbar: React.FC<FlashcardFlyToolbarProps> = ({
  isCardSlot = false,
  setIsFlyToolbarOpen,
  triggerPlayAudio,
  isLoadingAudio = false,
  isPlayingAudio = false,
  currentQuestion,
  isFlipped = false,
  showLocalToast,
}) => {
  const [copiedMini, setCopiedMini] = useState(false)

  const handleMiniCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = isFlipped ? getCardBackText(currentQuestion) : getCardFrontText(currentQuestion)
    if (!text) {
      showLocalToast?.("No content on this face to copy", "warning")
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMini(true)
      setTimeout(() => setCopiedMini(false), 1500)
      showLocalToast?.(isFlipped ? "Copied Back Face to clipboard! ✓" : "Copied Front Face to clipboard! ✓", "success")
    }).catch(() => {
      showLocalToast?.("Failed to copy to clipboard", "warning")
    })
  }

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isCardSlot
          ? "relative z-30"
          : "fixed bottom-[84px] md:bottom-[90px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full border border-slate-200/90 shadow-[0_2px_12px_rgba(99,102,241,0.08)] p-1 pointer-events-auto transition-all duration-200 hover:shadow-md">
        {/* 1. Audio Button */}
        <button
          type="button"
          onClick={triggerPlayAudio}
          className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs group",
            isPlayingAudio
              ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
              : isLoadingAudio
              ? "bg-indigo-100 text-indigo-700 animate-pulse"
              : "bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white"
          )}
          title={isLoadingAudio ? "Generating audio..." : isPlayingAudio ? "Playing audio (Click to replay)" : "Play Pronunciation (Audio)"}
        >
          {isLoadingAudio ? (
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-indigo-600" />
          ) : (
            <Volume2 className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform", isPlayingAudio && "animate-pulse")} />
          )}
        </button>

        <div className="w-[1px] h-3 bg-slate-200/80" />

        {/* 2. One-Tap Quick Copy Button (Front if !isFlipped, Back if isFlipped) */}
        <button
          type="button"
          onClick={handleMiniCopy}
          className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs group",
            copiedMini
              ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
              : "bg-slate-50 hover:bg-emerald-600 text-slate-500 hover:text-white"
          )}
          title={copiedMini ? "Copied!" : (isFlipped ? "Copy Back Face (for AI)" : "Copy Front Face (for AI)")}
        >
          {copiedMini ? (
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          ) : (
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
          )}
        </button>

        <div className="w-[1px] h-3 bg-slate-200/80" />

        {/* 3. Quick Options Menu Button (Opens Bottom Sheet) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFlyToolbarOpen(true);
          }}
          className="h-7 sm:h-8 px-2 rounded-full flex items-center gap-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 transition-all duration-150 active:scale-95 cursor-pointer text-[11px] font-bold"
          title="Quick Controls"
        >
          <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[10px] text-slate-400 font-bold leading-none">›</span>
        </button>
      </div>
    </div>
  )
}

export interface FlashcardQuickControlsSheetProps {
  isOpen: boolean
  onClose: () => void
  autoPlayAudio: string
  setAutoPlayAudio: (val: any) => void
  sfxEnabled: boolean
  setSfxEnabled: (val: boolean) => void
  effectiveAutoAdvance: boolean
  autoNextSec?: number
  onCycleAutoNext?: (nextSec: number) => void
  setIsAutoAdvance: (val: boolean) => void
  setQuickLearnEnabled?: (val: boolean) => void
  showImages: any
  setShowImages: (val: any) => void
  randomEnabled: boolean
  setRandomEnabled: (val: boolean) => void
  onToggleRandom?: (nextVal: boolean) => void
  isSpeedSkimMode?: boolean
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void
  isSelectMode: boolean
  setIsSelectMode: React.Dispatch<React.SetStateAction<boolean>>
  currentQuestion: any
  handleStarQuestion: () => void
  showFlipBackBtn?: boolean
  isFlipped?: boolean
  setIsFlipped?: (val: boolean) => void
  setIsSettingsModalOpen: (val: boolean) => void
  activeMode?: string
  onSelectMode?: (mode: string) => void
  ratingMode?: 'both' | 'swipe_4way' | 'buttons'
  onCycleRatingMode?: () => void
  swipeToRate?: boolean
  onToggleSwipeToRate?: () => void
  showActionDock?: boolean
  onToggleActionDock?: () => void
  hapticEnabled?: boolean
  setHapticEnabled?: (val: boolean) => void
  triggerHaptic?: (type?: any) => void
  frontFontSize?: string
  setFrontFontSize?: (size: string) => void
  frontHalign?: 'left' | 'center'
  setFrontHalign?: (val: 'left' | 'center') => void
  canEdit?: boolean
  onOpenEditModal?: () => void
  onOpenCardHub?: (subTab: 'stats' | 'insight' | 'note' | 'community') => void
  handleToggleHint?: (e?: React.MouseEvent) => void
  showingHint?: boolean
  showFsrs?: boolean
  setShowFsrs?: (val: boolean) => void
  cardScope?: 'all' | 'review' | 'new'
  onSelectCardScope?: (scope: 'all' | 'review' | 'new') => void
  scopeCounts?: { all: number; review: number; new: number }
  autoFrontDelay?: number
  autoBackDelay?: number
  onChangeAutoFrontDelay?: (val: number) => void
  onChangeAutoBackDelay?: (val: number) => void
}

const FLASHCARD_MODES = [
  { id: 'fsrs', short: 'FSRS', name: 'FSRS Repetition', icon: '🧠', activeClass: 'bg-emerald-600 text-white shadow-xs font-black' },
  { id: 'skim', short: 'SKIM', name: 'Speed Skim', icon: '⚡', activeClass: 'bg-amber-500 text-white shadow-xs font-black' },
  { id: 'autoplay', short: 'AUTO', name: 'Auto Play (Hands-Free)', icon: '🎧', activeClass: 'bg-cyan-600 text-white shadow-xs font-black' },
  { id: 'review', short: 'REV', name: 'Review Due', icon: '📚', activeClass: 'bg-sky-600 text-white shadow-xs font-black' },
  { id: 'new', short: 'NEW', name: 'Learn New', icon: '✨', activeClass: 'bg-indigo-600 text-white shadow-xs font-black' },
]

/**
 * Standalone, root-level bottom sheet attached via Portal to document.body
 * Completely immune to 3D card CSS transform / perspective containment bugs.
 */
export const FlashcardQuickControlsSheet: React.FC<FlashcardQuickControlsSheetProps> = ({
  isOpen,
  onClose,
  autoPlayAudio,
  setAutoPlayAudio,
  sfxEnabled,
  setSfxEnabled,
  effectiveAutoAdvance,
  autoNextSec,
  onCycleAutoNext,
  setIsAutoAdvance,
  setQuickLearnEnabled,
  showImages,
  setShowImages,
  randomEnabled,
  setRandomEnabled,
  onToggleRandom,
  isSpeedSkimMode,
  showLocalToast,
  isSelectMode,
  setIsSelectMode,
  currentQuestion,
  handleStarQuestion,
  showFlipBackBtn,
  isFlipped = false,
  setIsFlipped,
  setIsSettingsModalOpen,
  activeMode,
  onSelectMode,
  ratingMode,
  onCycleRatingMode,
  swipeToRate = true,
  onToggleSwipeToRate,
  showActionDock = true,
  onToggleActionDock,
  hapticEnabled = true,
  setHapticEnabled,
  triggerHaptic,
  frontFontSize = '100%',
  setFrontFontSize,
  frontHalign = 'center',
  setFrontHalign,
  canEdit = false,
  onOpenEditModal,
  onOpenCardHub,
  handleToggleHint,
  showingHint = false,
  showFsrs = true,
  setShowFsrs,
  cardScope = 'all',
  onSelectCardScope,
  scopeCounts,
  autoFrontDelay = 2.0,
  autoBackDelay = 3.0,
  onChangeAutoFrontDelay,
  onChangeAutoBackDelay,
}) => {
  const [copiedFace, setCopiedFace] = useState(false)
  const [copiedFull, setCopiedFull] = useState(false)
  const dragControls = useDragControls()

  const handleCopyCurrentFace = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = isFlipped ? getCardBackText(currentQuestion) : getCardFrontText(currentQuestion)
    if (!text) {
      showLocalToast?.(`No content on ${isFlipped ? 'back' : 'front'} face to copy`, 'warning')
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFace(true)
      setTimeout(() => setCopiedFace(false), 2000)
      showLocalToast?.(isFlipped ? "Copied Back Face to clipboard! ✓" : "Copied Front Face to clipboard! ✓", "success")
    }).catch(() => {
      showLocalToast?.("Failed to copy to clipboard", "warning")
    })
  }

  const handleCopyFullCard = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = getCardFullText(currentQuestion)
    if (!text) {
      showLocalToast?.("No card content to copy", "warning")
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFull(true)
      setTimeout(() => setCopiedFull(false), 2000)
      showLocalToast?.("Copied Full Card (Front & Back) to clipboard! ✓", "success")
    }).catch(() => {
      showLocalToast?.("Failed to copy to clipboard", "warning")
    })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end pointer-events-auto">
          {/* Fullscreen Uniform Dimmed Backdrop */}
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
            {/* Drag Handle Bar & Pull-down Dismiss Area */}
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
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Quick Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Flashcard Preferences</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* All Deck Settings Button (Compact Header Icon) */}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    setIsSettingsModalOpen(true)
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-slate-200/60 shadow-2xs group"
                  title="All Deck Settings"
                >
                  <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
                </button>

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

            {/* 5 Flashcard Modes Quick Switcher */}
            {onSelectMode && (
              <div className="flex flex-col gap-1 text-left px-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Flashcard Study Mode
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    5 Modes Available
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
                  {FLASHCARD_MODES.map((m) => {
                    const isActive = activeMode === m.id || (m.id === 'skim' && (activeMode === 'speed_skim' || activeMode === 'flip'));
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectMode(m.id);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all cursor-pointer select-none",
                          isActive
                            ? cn(m.activeClass, "scale-[1.02]")
                            : "bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        )}
                        title={m.name}
                      >
                        <span className="text-base leading-none mb-1">{m.icon}</span>
                        <span className="text-[9.5px] font-black tracking-tight uppercase leading-tight">{m.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditional Scope Filter for Skim & AutoPlay */}
            {(activeMode === 'skim' || activeMode === 'speed_skim' || activeMode === 'flip' || activeMode === 'autoplay') && (
              <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {activeMode === 'autoplay' ? '🎧 AutoPlay Target Scope' : '⚡ Skim Target Scope'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Filter Cards
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onSelectCardScope?.('all')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      cardScope === 'all'
                        ? (activeMode === 'autoplay' ? "bg-cyan-600 text-white shadow-xs font-black" : "bg-amber-500 text-white shadow-xs font-black")
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span>All Cards</span>
                    <span className={cn("text-[9.5px] px-1.5 py-0.2 rounded-full", cardScope === 'all' ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500")}>
                      {scopeCounts?.all ?? 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCardScope?.('review')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      cardScope === 'review'
                        ? (activeMode === 'autoplay' ? "bg-cyan-600 text-white shadow-xs font-black" : "bg-amber-500 text-white shadow-xs font-black")
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span>Review Due</span>
                    <span className={cn("text-[9.5px] px-1.5 py-0.2 rounded-full", cardScope === 'review' ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500")}>
                      {scopeCounts?.review ?? 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCardScope?.('new')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      cardScope === 'new'
                        ? (activeMode === 'autoplay' ? "bg-cyan-600 text-white shadow-xs font-black" : "bg-amber-500 text-white shadow-xs font-black")
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span>Learn New</span>
                    <span className={cn("text-[9.5px] px-1.5 py-0.2 rounded-full", cardScope === 'new' ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500")}>
                      {scopeCounts?.new ?? 0}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* AutoPlay Pacing Controls — ONLY VISIBLE WHEN activeMode === 'autoplay' */}
            {activeMode === 'autoplay' && (
              <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-cyan-50/60 border border-cyan-200/90 shadow-2xs">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-900">
                      AutoPlay Pacing (Delays)
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-cyan-600/80">
                    Hands-Free Speed
                  </span>
                </div>

                {/* Front Delay Row */}
                <div className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-xl border border-cyan-100 shadow-2xs">
                  <div className="flex flex-col text-left pl-1">
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">Front Delay</span>
                    <span className="text-[9px] text-slate-400 font-medium">Read before flip</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 1.5, 2, 3, 5].map((val) => {
                      const isSelected = Math.abs((autoFrontDelay ?? 2.0) - val) < 0.05;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            onChangeAutoFrontDelay?.(val);
                            showLocalToast?.(`Front Delay set to ${val}s`, 'info');
                          }}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer",
                            isSelected
                              ? "bg-cyan-600 text-white shadow-2xs font-black scale-105"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          {val}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Back Delay Row */}
                <div className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-xl border border-cyan-100 shadow-2xs">
                  <div className="flex flex-col text-left pl-1">
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">Back Delay</span>
                    <span className="text-[9px] text-slate-400 font-medium">Read before next card</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1.5, 2, 3, 4, 6].map((val) => {
                      const isSelected = Math.abs((autoBackDelay ?? 3.0) - val) < 0.05;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            onChangeAutoBackDelay?.(val);
                            showLocalToast?.(`Back Delay set to ${val}s`, 'info');
                          }}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer",
                            isSelected
                              ? "bg-cyan-600 text-white shadow-2xs font-black scale-105"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          {val}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Action Grid (Structured iOS Control Center Layout) */}
            {(() => {
              // 1. Autoplay cycle & meta
              const autoplayMeta = (() => {
                switch (autoPlayAudio) {
                  case 'always':
                    return {
                      label: 'BOTH',
                      color: 'text-emerald-600',
                      container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
                      iconBox: 'bg-emerald-500 text-white shadow-2xs',
                      icon: <Volume2 className="w-4 h-4" />,
                      title: 'Autoplay: Both Sides'
                    }
                  case 'front':
                    return {
                      label: 'FRONT',
                      color: 'text-sky-600',
                      container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
                      iconBox: 'bg-sky-500 text-white shadow-2xs',
                      icon: <Volume2 className="w-4 h-4" />,
                      title: 'Autoplay: Front Only'
                    }
                  case 'back':
                    return {
                      label: 'BACK',
                      color: 'text-indigo-600',
                      container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                      iconBox: 'bg-indigo-600 text-white shadow-2xs',
                      icon: <Volume2 className="w-4 h-4" />,
                      title: 'Autoplay: Back Only'
                    }
                  default:
                    return {
                      label: 'OFF',
                      color: 'text-slate-400',
                      container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
                      iconBox: 'bg-white text-slate-400 border border-slate-200/60',
                      icon: <VolumeX className="w-4 h-4" />,
                      title: 'Autoplay: OFF'
                    }
                }
              })()

              const handleCycleAutoplay = () => {
                let nextVal = 'always'
                let toastMsg = 'Autoplay: Both (Front & Back)'
                if (autoPlayAudio === 'always') {
                  nextVal = 'front'
                  toastMsg = 'Autoplay: Front Only'
                } else if (autoPlayAudio === 'front') {
                  nextVal = 'back'
                  toastMsg = 'Autoplay: Back Only'
                } else if (autoPlayAudio === 'back') {
                  nextVal = 'none'
                  toastMsg = 'Autoplay: OFF'
                } else {
                  nextVal = 'always'
                  toastMsg = 'Autoplay: Both (Front & Back)'
                }
                setAutoPlayAudio(nextVal)
                showLocalToast?.(toastMsg, 'info')
              }

              // 2. Rating mode cycle & meta
              const currentRatingMode: 'both' | 'swipe_4way' | 'buttons' = ratingMode || (
                showActionDock && swipeToRate
                  ? 'both'
                  : showActionDock
                  ? 'buttons'
                  : 'swipe_4way'
              )

              const ratingModeMeta = (() => {
                switch (currentRatingMode) {
                  case 'both':
                    return {
                      label: 'BOTH',
                      color: 'text-emerald-600',
                      container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
                      iconBox: 'bg-emerald-600 text-white shadow-2xs',
                      icon: <Sparkles className="w-4 h-4" />,
                      title: 'Rating: Both (Swipe + Buttons)'
                    }
                  case 'swipe_4way':
                    return {
                      label: 'SWIPE',
                      color: 'text-indigo-600',
                      container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                      iconBox: 'bg-indigo-600 text-white shadow-2xs',
                      icon: <MoveHorizontal className="w-4 h-4" />,
                      title: 'Rating: Swipe Gestures Only'
                    }
                  case 'buttons':
                    return {
                      label: 'BUTTONS',
                      color: 'text-teal-600',
                      container: 'bg-teal-50 border-teal-300 text-teal-700 shadow-2xs',
                      iconBox: 'bg-teal-600 text-white shadow-2xs',
                      icon: <Layers className="w-4 h-4" />,
                      title: 'Rating: On-Screen Buttons Only'
                    }
                }
              })()

              const handleCycleRating = () => {
                if (onCycleRatingMode) {
                  onCycleRatingMode()
                  return
                }
                if (currentRatingMode === 'both') {
                  onToggleActionDock?.()
                } else if (currentRatingMode === 'swipe_4way') {
                  onToggleSwipeToRate?.()
                  onToggleActionDock?.()
                } else {
                  onToggleSwipeToRate?.()
                }
              }

              // 3. Card Images cycle & meta (Both -> Front -> Back -> Off)
              const imagesMeta = (() => {
                const str = String(showImages)
                if (str === 'always' || showImages === true || str === 'true') {
                  return {
                    label: 'BOTH',
                    color: 'text-emerald-600',
                    container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
                    iconBox: 'bg-emerald-500 text-white shadow-2xs',
                    icon: <Eye className="w-4 h-4" />,
                    title: 'Card Images: Both Sides'
                  }
                }
                if (str === 'front') {
                  return {
                    label: 'FRONT',
                    color: 'text-sky-600',
                    container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
                    iconBox: 'bg-sky-500 text-white shadow-2xs',
                    icon: <Eye className="w-4 h-4" />,
                    title: 'Card Images: Front Only'
                  }
                }
                if (str === 'back') {
                  return {
                    label: 'BACK',
                    color: 'text-indigo-600',
                    container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                    iconBox: 'bg-indigo-600 text-white shadow-2xs',
                    icon: <Eye className="w-4 h-4" />,
                    title: 'Card Images: Back Only'
                  }
                }
                return {
                  label: 'OFF',
                  color: 'text-slate-400',
                  container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
                  iconBox: 'bg-white text-slate-400 border border-slate-200/60',
                  icon: <EyeOff className="w-4 h-4" />,
                  title: 'Card Images: Hidden'
                }
              })()

              const handleCycleImages = () => {
                const str = String(showImages)
                let nextVal: 'always' | 'front' | 'back' | 'none' = 'always'
                let toastMsg = 'Card Images: Both Sides'
                if (str === 'always' || showImages === true || str === 'true') {
                  nextVal = 'front'
                  toastMsg = 'Card Images: Front Only'
                } else if (str === 'front') {
                  nextVal = 'back'
                  toastMsg = 'Card Images: Back Only'
                } else if (str === 'back') {
                  nextVal = 'none'
                  toastMsg = 'Card Images: OFF'
                } else {
                  nextVal = 'always'
                  toastMsg = 'Card Images: Both Sides'
                }
                setShowImages(nextVal)
                showLocalToast?.(toastMsg, 'info')
              }

              // 4. Font Size cycle & meta (100% Normal -> 125% Large -> 150% XL -> 85% Compact)
              const fontSizeMeta = (() => {
                const match = String(frontFontSize || '100%').match(/\d+/)
                const pct = match ? parseInt(match[0], 10) : 100
                if (pct <= 85) return { label: '85%', sub: 'Compact', active: true, color: 'text-amber-600', container: 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs', iconBox: 'bg-amber-500 text-white shadow-2xs', icon: <Type className="w-4 h-4" />, title: 'Font Size: 85% (Compact)' }
                if (pct <= 105) return { label: '100%', sub: 'Normal', active: false, color: 'text-slate-500', container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500', iconBox: 'bg-white text-slate-400 border border-slate-200/60', icon: <Type className="w-4 h-4" />, title: 'Font Size: 100% (Normal)' }
                if (pct <= 135) return { label: '125%', sub: 'Large', active: true, color: 'text-indigo-600', container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs', iconBox: 'bg-indigo-600 text-white shadow-2xs', icon: <Type className="w-4 h-4" />, title: 'Font Size: 125% (Large)' }
                return { label: '150%', sub: 'XL', active: true, color: 'text-purple-600', container: 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs', iconBox: 'bg-purple-600 text-white shadow-2xs', icon: <Type className="w-4 h-4" />, title: 'Font Size: 150% (Extra Large)' }
              })()

              const handleCycleFontSize = () => {
                const match = String(frontFontSize || '100%').match(/\d+/)
                const pct = match ? parseInt(match[0], 10) : 100
                let nextVal = '100%'
                let toastMsg = 'Font Size: 100% (Normal)'
                if (pct <= 85) {
                  nextVal = '100%'
                  toastMsg = 'Font Size: 100% (Normal)'
                } else if (pct <= 105) {
                  nextVal = '125%'
                  toastMsg = 'Font Size: 125% (Large)'
                } else if (pct <= 135) {
                  nextVal = '150%'
                  toastMsg = 'Font Size: 150% (Extra Large)'
                } else {
                  nextVal = '85%'
                  toastMsg = 'Font Size: 85% (Compact)'
                }
                setFrontFontSize?.(nextVal)
                showLocalToast?.(toastMsg, 'info')
              }

              // 5. Text Align cycle & meta
              const textAlignMeta = (() => {
                if (frontHalign === 'left') {
                  return {
                    label: 'LEFT',
                    color: 'text-sky-600',
                    container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
                    iconBox: 'bg-sky-500 text-white shadow-2xs',
                    icon: <AlignLeft className="w-4 h-4" />,
                    title: 'Text Alignment: Left'
                  }
                }
                return {
                  label: 'CENTER',
                  color: 'text-indigo-600',
                  container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                  iconBox: 'bg-indigo-600 text-white shadow-2xs',
                  icon: <AlignCenter className="w-4 h-4" />,
                  title: 'Text Alignment: Center'
                }
              })()

              const handleCycleTextAlign = () => {
                if (!setFrontHalign) return
                if (frontHalign === 'center') {
                  setFrontHalign('left')
                  showLocalToast?.('Text Align: Left', 'info')
                } else {
                  setFrontHalign('center')
                  showLocalToast?.('Text Align: Center', 'info')
                }
              }

              return (
                <div className="flex flex-col gap-2.5">
                  {/* ══════ SECTION 1: AUDIO & FLOW ══════ */}
                  <div className="flex flex-col gap-1 text-left px-0.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Audio & Flow
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Sound & Pacing
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {/* 1. Autoplay */}
                      <button
                        type="button"
                        onClick={handleCycleAutoplay}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          autoplayMeta.container
                        )}
                        title={autoplayMeta.title}
                      >
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", autoplayMeta.iconBox)}>
                          {autoplayMeta.icon}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[9.5px] font-bold tracking-tight">Autoplay</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", autoplayMeta.color)}>
                            {autoplayMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 2. SFX Sounds */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !sfxEnabled
                          setSfxEnabled(nextVal)
                          showLocalToast?.(`SFX Sounds: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          sfxEnabled
                            ? "bg-purple-50 border-purple-300 text-purple-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`SFX Sounds: ${sfxEnabled ? 'ON' : 'OFF'}`}
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

                      {/* 3. Haptic Feedback */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !hapticEnabled
                          setHapticEnabled?.(nextVal)
                          if (nextVal) triggerHaptic?.('success')
                          showLocalToast?.(`Haptic Feedback: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          hapticEnabled
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`Haptic Vibration: ${hapticEnabled ? 'ON' : 'OFF'}`}
                      >
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", hapticEnabled ? "bg-emerald-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          {hapticEnabled ? <Vibrate className="w-3.5 h-3.5" /> : <VibrateOff className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[9.5px] font-bold tracking-tight">Haptic</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", hapticEnabled ? "text-emerald-600" : "text-slate-400")}>
                            {hapticEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>

                      {/* 4. Auto Next (Cycle: OFF -> 1s -> 2s -> 3s -> 5s -> OFF) */}
                      {(() => {
                        const isAutoOn = autoNextSec !== undefined ? autoNextSec > 0 : effectiveAutoAdvance
                        const autoBadgeText = autoNextSec !== undefined
                          ? (autoNextSec > 0 ? `${autoNextSec}s` : 'OFF')
                          : (effectiveAutoAdvance ? 'ON' : 'OFF')

                        const handleClick = () => {
                          if (onCycleAutoNext) {
                            const currentSec = autoNextSec !== undefined ? autoNextSec : (effectiveAutoAdvance ? 2 : 0)
                            let nextSec = 0
                            if (currentSec === 0) nextSec = 1
                            else if (currentSec === 1) nextSec = 2
                            else if (currentSec === 2) nextSec = 3
                            else if (currentSec === 3) nextSec = 5
                            else nextSec = 0
                            onCycleAutoNext(nextSec)
                          } else {
                            const nextVal = !effectiveAutoAdvance
                            setIsAutoAdvance(nextVal)
                            if (setQuickLearnEnabled) setQuickLearnEnabled(nextVal)
                            showLocalToast?.(`Auto Next: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                          }
                        }

                        return (
                          <button
                            type="button"
                            onClick={handleClick}
                            className={cn(
                              "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                              isAutoOn
                                ? "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                                : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                            )}
                            title={`Auto Next: ${autoBadgeText}`}
                          >
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center",
                              isAutoOn
                                ? "bg-amber-500 text-white shadow-2xs"
                                : "bg-white text-slate-400 border border-slate-200/60"
                            )}>
                              <Zap className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col items-center leading-none gap-0.5">
                              <span className="text-[9.5px] font-bold tracking-tight">Auto Next</span>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-wider",
                                isAutoOn ? "text-amber-600" : "text-slate-400"
                              )}>
                                {autoBadgeText}
                              </span>
                            </div>
                          </button>
                        )
                      })()}
                    </div>
                  </div>

                  {/* ══════ SECTION 2: DISPLAY & GESTURES (Compact 3x2 Grid) ══════ */}
                  <div className="flex flex-col gap-1 text-left px-0.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Display & Gestures
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Visuals & Controls
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {/* 1. Rating Mode */}
                      {onCycleRatingMode !== undefined ? (
                        <button
                          type="button"
                          onClick={handleCycleRating}
                          className={cn(
                            "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                            ratingModeMeta.container
                          )}
                          title={ratingModeMeta.title}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", ratingModeMeta.iconBox)}>
                            {ratingModeMeta.icon}
                          </div>
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[9.5px] font-bold tracking-tight">Rate Mode</span>
                            <span className={cn("text-[8px] font-black uppercase tracking-wider", ratingModeMeta.color)}>
                              {ratingModeMeta.label}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <button type="button" className="flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all text-center min-h-[58px] gap-1 select-none bg-slate-50 border-slate-200/70 opacity-50 pointer-events-none">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-400 border border-slate-200/60">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[9.5px] font-bold tracking-tight text-slate-500">Rate Mode</span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">OFF</span>
                          </div>
                        </button>
                      )}

                      {/* 2. Card Images (Cycles: BOTH -> FRONT -> BACK -> OFF) */}
                      <button
                        type="button"
                        onClick={handleCycleImages}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          imagesMeta.container
                        )}
                        title={imagesMeta.title}
                      >
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", imagesMeta.iconBox)}>
                          {imagesMeta.icon}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[9.5px] font-bold tracking-tight">Images</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", imagesMeta.color)}>
                            {imagesMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 3. Font Size (Cycles: 100% -> 125% -> 150% -> 85%) */}
                      <button
                        type="button"
                        onClick={handleCycleFontSize}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          fontSizeMeta.container
                        )}
                        title={fontSizeMeta.title}
                      >
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", fontSizeMeta.iconBox)}>
                          {fontSizeMeta.icon}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[9.5px] font-bold tracking-tight">Font Size</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", fontSizeMeta.color)}>
                            {fontSizeMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 4. Text Alignment */}
                      {setFrontHalign !== undefined ? (
                        <button
                          type="button"
                          onClick={handleCycleTextAlign}
                          className={cn(
                            "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                            textAlignMeta.container
                          )}
                          title={textAlignMeta.title}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", textAlignMeta.iconBox)}>
                            {textAlignMeta.icon}
                          </div>
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[9.5px] font-bold tracking-tight">Alignment</span>
                            <span className={cn("text-[8px] font-black uppercase tracking-wider", textAlignMeta.color)}>
                              {textAlignMeta.label}
                            </span>
                          </div>
                        </button>
                      ) : null}

                      {/* 5. Shuffle Order */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !randomEnabled
                          if (onToggleRandom) {
                            onToggleRandom(nextVal)
                          } else {
                            setRandomEnabled(nextVal)
                          }
                          showLocalToast?.(`Shuffle: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                          randomEnabled
                            ? "bg-violet-50 border-violet-300 text-violet-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`Shuffle Order: ${randomEnabled ? 'ON' : 'OFF'}`}
                      >
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", randomEnabled ? "bg-violet-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          <Shuffle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[9.5px] font-bold tracking-tight">Shuffle</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", randomEnabled ? "text-violet-600" : "text-slate-400")}>
                            {randomEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>

                      {/* 6. FSRS Badges (Moved here from Study Shortcuts) */}
                      {setShowFsrs !== undefined ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !showFsrs
                            setShowFsrs?.(nextVal)
                            showLocalToast?.(`FSRS Badges: ${nextVal ? 'SHOWN' : 'HIDDEN'}`, 'info')
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none",
                            showFsrs
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                          )}
                          title={`FSRS Badges: ${showFsrs ? 'SHOWN' : 'HIDDEN'}`}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", showFsrs ? "bg-emerald-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[9.5px] font-bold tracking-tight">FSRS Badges</span>
                            <span className={cn("text-[8px] font-black uppercase tracking-wider", showFsrs ? "text-emerald-600" : "text-slate-400")}>
                              {showFsrs ? "SHOWN" : "OFF"}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <button type="button" className="flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all text-center min-h-[58px] gap-1 select-none bg-slate-50 border-slate-200/70 opacity-50 pointer-events-none">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-400 border border-slate-200/60">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[9.5px] font-bold tracking-tight text-slate-500">FSRS Badges</span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">OFF</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ══════ SECTION 3: CARD ACTIONS & DRAWERS (Compact 3x2 Grid) ══════ */}
                  <div className="flex flex-col gap-1 text-left px-0.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Card Actions & Drawers
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Actions & Hub
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {/* 1. Edit Card */}
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          onClose()
                          onOpenEditModal?.()
                        }}
                        className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs min-h-[38px]",
                          canEdit
                            ? "bg-slate-50 hover:bg-blue-50/70 border-slate-200/80 hover:border-blue-300 cursor-pointer"
                            : "bg-slate-50/60 border-slate-200/50 opacity-60 cursor-not-allowed"
                        )}
                        title={canEdit ? "Open Card Editor Modal" : "Card editing locked"}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                          canEdit ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                        )}>
                          <Pencil className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[10px] font-bold text-slate-800 tracking-tight truncate">Edit Card</span>
                          <span className="text-[8px] text-slate-400 font-medium truncate">{canEdit ? "Editor" : "Locked"}</span>
                        </div>
                      </button>

                      {/* 2. Card Note */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenCardHub?.('note')
                        }}
                        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-300 transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer min-h-[38px]"
                        title="Open Personal Notes Drawer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[10px] font-bold text-slate-800 tracking-tight truncate">Card Note</span>
                          <span className="text-[8px] text-slate-400 font-medium truncate">Notes</span>
                        </div>
                      </button>

                      {/* 3. AI Explain */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenCardHub?.('insight')
                        }}
                        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer min-h-[38px]"
                        title="Open AI Explanations Drawer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Brain className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[10px] font-bold text-slate-800 tracking-tight truncate">AI Explain</span>
                          <span className="text-[8px] text-slate-400 font-medium truncate">Insights</span>
                        </div>
                      </button>

                      {/* 4. Card Stats */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenCardHub?.('stats')
                        }}
                        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer min-h-[38px]"
                        title="Open Detailed Card Stats & History"
                      >
                        <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[10px] font-bold text-slate-800 tracking-tight truncate">Card Stats</span>
                          <span className="text-[8px] text-slate-400 font-medium truncate">FSRS</span>
                        </div>
                      </button>

                      {/* 5. Copy Current Face */}
                      <button
                        type="button"
                        onClick={handleCopyCurrentFace}
                        className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer min-h-[38px]",
                          copiedFace
                            ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300"
                            : "bg-slate-50 hover:bg-emerald-50/70 border-slate-200/80 hover:border-emerald-300"
                        )}
                        title={isFlipped ? "Copy Back Face to clipboard (for AI Prompt)" : "Copy Front Face to clipboard (for AI Prompt)"}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-all",
                          copiedFace
                            ? "bg-emerald-600 text-white scale-105"
                            : "bg-emerald-500 text-white"
                        )}>
                          {copiedFace ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[10px] font-bold text-slate-800 tracking-tight truncate">
                            {copiedFace ? "Copied!" : isFlipped ? "Copy Back" : "Copy Front"}
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium truncate">
                            {copiedFace ? "Ready" : isFlipped ? "Back Face" : "Front Face"}
                          </span>
                        </div>
                      </button>

                      {/* 6. Copy Full Card */}
                      <button
                        type="button"
                        onClick={handleCopyFullCard}
                        className={cn(
                          "flex items-center gap-1.5 p-1.5 rounded-xl border transition-all active:scale-95 text-left select-none shadow-2xs cursor-pointer min-h-[38px]",
                          copiedFull
                            ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300"
                            : "bg-slate-50 hover:bg-indigo-50/70 border-slate-200/80 hover:border-indigo-300"
                        )}
                        title="Copy both Front and Back content to clipboard (for AI Prompt)"
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-all",
                          copiedFull
                            ? "bg-indigo-600 text-white scale-105"
                            : "bg-indigo-500 text-white"
                        )}>
                          {copiedFull ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[10px] font-bold text-slate-800 tracking-tight truncate">
                            {copiedFull ? "Copied!" : "Copy Full"}
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium truncate">
                            {copiedFull ? "Ready" : "Front & Back"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
