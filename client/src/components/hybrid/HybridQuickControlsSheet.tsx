import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh'
import {
  Sliders,
  X,
  Shuffle,
  Layers,
  Sparkles,
  Target,
  RefreshCw,
  Clock,
  Check,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlignLeft,
  AlignCenter,
  Type,
  Zap,
  Settings,
  BookOpen,
  Copy,
  ClipboardCopy,
  Brain,
  Pencil,
  Gauge,
  Bookmark
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HybridSettings } from '@/pages/HybridPlay'
import type { HybridScope } from '@/utils/cardLifecycle'

export interface HybridQuickControlsSheetProps {
  isOpen: boolean
  onClose: () => void
  settings: HybridSettings
  onUpdateHybridSettings: (partial: Partial<HybridSettings>) => void
  scopeCounts: { all: number; new: number; undrilled: number; review: number; due: number }
  frontHalign: 'left' | 'center'
  setFrontHalign: (val: 'left' | 'center') => void
  backHalign: 'left' | 'center'
  setBackHalign: (val: 'left' | 'center') => void
  frontFontSize: string
  setFrontFontSize: (val: string) => void
  backFontSize: string
  setBackFontSize: (val: string) => void
  autoPlayAudio: string
  setAutoPlayAudio: (val: any) => void
  sfxEnabled: boolean
  setSfxEnabled: (val: boolean) => void
  hapticEnabled: boolean
  setHapticEnabled: (val: boolean) => void
  deckId?: string
  canEdit?: boolean
  onSaveAsCreatorBaseline?: () => void
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  currentQuestion?: any
  onOpenCardInsight?: (card: any) => void
  onOpenEditModal?: () => void
}

export const HybridQuickControlsSheet: React.FC<HybridQuickControlsSheetProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateHybridSettings,
  scopeCounts,
  frontHalign,
  setFrontHalign,
  backHalign,
  setBackHalign,
  frontFontSize,
  setFrontFontSize,
  backFontSize,
  setBackFontSize,
  autoPlayAudio,
  setAutoPlayAudio,
  sfxEnabled,
  setSfxEnabled,
  hapticEnabled,
  setHapticEnabled,
  deckId,
  canEdit = false,
  onSaveAsCreatorBaseline,
  showLocalToast,
  currentQuestion,
  onOpenCardInsight,
  onOpenEditModal,
}) => {
  const [copiedFace, setCopiedFace] = useState(false)
  const [copiedFull, setCopiedFull] = useState(false)
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

  // Helpers to copy question content
  const handleCopyFace = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = currentQuestion?.content || currentQuestion?.others?.front || currentQuestion?.front || ''
    if (!text) {
      showLocalToast?.('No front content to copy', 'warning')
      return
    }
    navigator.clipboard.writeText(String(text).trim()).then(() => {
      setCopiedFace(true)
      setTimeout(() => setCopiedFace(false), 2000)
      showLocalToast?.('Copied Front Face to clipboard! ✓', 'success')
    }).catch(() => {
      showLocalToast?.('Failed to copy to clipboard', 'warning')
    })
  }

  const handleCopyFull = (e: React.MouseEvent) => {
    e.stopPropagation()
    const front = currentQuestion?.content || currentQuestion?.others?.front || currentQuestion?.front || ''
    const back = currentQuestion?.explanation || currentQuestion?.others?.back || currentQuestion?.back || ''
    const combined = front && back ? `[Front]\n${front}\n\n[Back]\n${back}` : front || back || ''
    if (!combined) {
      showLocalToast?.('No card content to copy', 'warning')
      return
    }
    navigator.clipboard.writeText(combined.trim()).then(() => {
      setCopiedFull(true)
      setTimeout(() => setCopiedFull(false), 2000)
      showLocalToast?.('Copied Full Card to clipboard! ✓', 'success')
    }).catch(() => {
      showLocalToast?.('Failed to copy to clipboard', 'warning')
    })
  }

  if (typeof document === 'undefined') return null

  // 1. Scope cycle: all -> new -> undrilled -> review -> due
  const SCOPE_CYCLE: HybridScope[] = ['all', 'new', 'undrilled', 'review', 'due']
  const handleCycleScope = () => {
    const curIdx = SCOPE_CYCLE.indexOf(settings.scope)
    const nextIdx = (curIdx + 1) % SCOPE_CYCLE.length
    const nextScope = SCOPE_CYCLE[nextIdx]
    onUpdateHybridSettings({ scope: nextScope })
    const count = scopeCounts[nextScope] || 0
    showLocalToast?.(`Scope: ${nextScope.toUpperCase()} (${count} cards)`, 'info')
  }

  const scopeMeta = (() => {
    switch (settings.scope) {
      case 'new':
        return {
          label: `NEW • ${scopeCounts.new ?? 0}`,
          color: 'text-emerald-600',
          container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
          iconBox: 'bg-emerald-600 text-white shadow-2xs',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          title: `Scope: New Cards Only (${scopeCounts.new ?? 0})`
        }
      case 'undrilled':
        return {
          label: `UNDRILLED • ${scopeCounts.undrilled ?? 0}`,
          color: 'text-rose-600',
          container: 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs',
          iconBox: 'bg-rose-600 text-white shadow-2xs',
          icon: <Target className="w-3.5 h-3.5" />,
          title: `Scope: Undrilled Cards (${scopeCounts.undrilled ?? 0})`
        }
      case 'review':
        return {
          label: `LRN • ${scopeCounts.review ?? 0}`,
          color: 'text-purple-600',
          container: 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs',
          iconBox: 'bg-purple-600 text-white shadow-2xs',
          icon: <RefreshCw className="w-3.5 h-3.5" />,
          title: `Scope: Learned Cards (${scopeCounts.review ?? 0})`
        }
      case 'due':
        return {
          label: `DUE • ${scopeCounts.due ?? 0}`,
          color: 'text-amber-600',
          container: 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs',
          iconBox: 'bg-amber-500 text-white shadow-2xs',
          icon: <Clock className="w-3.5 h-3.5" />,
          title: `Scope: Due for Review (${scopeCounts.due ?? 0})`
        }
      default:
        return {
          label: `ALL • ${scopeCounts.all ?? 0}`,
          color: 'text-indigo-600',
          container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
          iconBox: 'bg-indigo-600 text-white shadow-2xs',
          icon: <Layers className="w-3.5 h-3.5" />,
          title: `Scope: All Cards (${scopeCounts.all ?? 0})`
        }
    }
  })()

  // 2. Queue Order (RAND vs SEQ)
  const isRandom = settings.order === 'random'
  const handleToggleOrder = () => {
    const nextOrder = isRandom ? 'sequential' : 'random'
    onUpdateHybridSettings({ order: nextOrder })
    showLocalToast?.(`Order: ${isRandom ? 'Sequential' : 'Random Shuffle'}`, 'info')
  }

  const orderMeta = isRandom
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

  // 3. Batch Size Cycle: 1 -> 3 -> 5 -> 10 -> 15
  const BATCH_SIZES = [1, 3, 5, 10, 15]
  const handleCycleBatch = () => {
    const curIdx = BATCH_SIZES.indexOf(settings.batch_size)
    const nextIdx = (curIdx + 1) % BATCH_SIZES.length
    const nextBatch = BATCH_SIZES[nextIdx]
    onUpdateHybridSettings({ batch_size: nextBatch })
    showLocalToast?.(`Batch Size: ${nextBatch} cards`, 'info')
  }

  // 4. Pass Target Cycle: 1 -> 2 -> 3 -> 5
  const PASS_TARGETS = [1, 2, 3, 5]
  const handleCycleTarget = () => {
    const curIdx = PASS_TARGETS.indexOf(settings.required_correct)
    const nextIdx = (curIdx + 1) % PASS_TARGETS.length
    const nextTarget = PASS_TARGETS[nextIdx]
    onUpdateHybridSettings({ required_correct: nextTarget })
    showLocalToast?.(`Pass Target: ${nextTarget}x Correct`, 'info')
  }

  // Toggle drill practice type
  const togglePracticeType = (typeId: string) => {
    const curr = settings.allowed_practices || []
    if (curr.includes(typeId)) {
      if (curr.length <= 1) {
        showLocalToast?.('At least one drill type must remain active', 'warning')
        return
      }
      onUpdateHybridSettings({ allowed_practices: curr.filter(x => x !== typeId) })
    } else {
      onUpdateHybridSettings({ allowed_practices: [...curr, typeId] })
    }
  }

  // Autoplay Audio Cycle
  const handleCycleAutoplay = () => {
    let nextVal = 'always'
    let msg = 'Voice Play: Both (Front & Back)'
    if (autoPlayAudio === 'always') {
      nextVal = 'front'
      msg = 'Voice Play: Front Only'
    } else if (autoPlayAudio === 'front') {
      nextVal = 'back'
      msg = 'Voice Play: Back Only'
    } else if (autoPlayAudio === 'back') {
      nextVal = 'none'
      msg = 'Voice Play: OFF'
    } else {
      nextVal = 'always'
      msg = 'Voice Play: Both (Front & Back)'
    }
    setAutoPlayAudio(nextVal)
    showLocalToast?.(msg, 'info')
  }

  const autoplayMeta = (() => {
    switch (autoPlayAudio) {
      case 'always':
        return {
          label: 'BOTH',
          color: 'text-emerald-600',
          container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
          iconBox: 'bg-emerald-500 text-white shadow-2xs',
          icon: <Volume2 className="w-3.5 h-3.5" />,
          title: 'Autoplay: Both Sides'
        }
      case 'front':
        return {
          label: 'FRONT',
          color: 'text-sky-600',
          container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
          iconBox: 'bg-sky-500 text-white shadow-2xs',
          icon: <Volume2 className="w-3.5 h-3.5" />,
          title: 'Autoplay: Front Only'
        }
      case 'back':
        return {
          label: 'BACK',
          color: 'text-indigo-600',
          container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
          iconBox: 'bg-indigo-600 text-white shadow-2xs',
          icon: <Volume2 className="w-3.5 h-3.5" />,
          title: 'Autoplay: Back Only'
        }
      default:
        return {
          label: 'OFF',
          color: 'text-slate-400',
          container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
          iconBox: 'bg-white text-slate-400 border border-slate-200/60',
          icon: <VolumeX className="w-3.5 h-3.5" />,
          title: 'Autoplay: OFF'
        }
    }
  })()

  // Front & Back Font Sizes
  const FONT_OPTIONS = ['85%', '100%', '115%', '130%']
  const handleCycleFrontFont = () => {
    const curIdx = FONT_OPTIONS.indexOf(frontFontSize || '100%')
    const nextIdx = (curIdx + 1) % FONT_OPTIONS.length
    const nextSize = FONT_OPTIONS[nextIdx]
    setFrontFontSize(nextSize)
    showLocalToast?.(`Front Font Size: ${nextSize}`, 'info')
  }

  const handleCycleBackFont = () => {
    const curIdx = FONT_OPTIONS.indexOf(backFontSize || '100%')
    const nextIdx = (curIdx + 1) % FONT_OPTIONS.length
    const nextSize = FONT_OPTIONS[nextIdx]
    setBackFontSize(nextSize)
    showLocalToast?.(`Back Font Size: ${nextSize}`, 'info')
  }

  // Front & Back Alignment
  const handleToggleFrontAlign = () => {
    const nextVal = frontHalign === 'center' ? 'left' : 'center'
    setFrontHalign(nextVal)
    showLocalToast?.(`Front Align: ${nextVal.toUpperCase()}`, 'info')
  }

  const handleToggleBackAlign = () => {
    const nextVal = backHalign === 'center' ? 'left' : 'center'
    setBackHalign(nextVal)
    showLocalToast?.(`Back Align: ${nextVal.toUpperCase()}`, 'info')
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
                <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Quick Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hybrid Drill Preferences</p>
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
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-slate-200/60 shadow-2xs group"
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

            {/* Top 4-Button Quick Setup Bar (Scope, Order, Batch, Target) */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 shadow-2xs">
              {/* Button 1: Scope */}
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
                  <span className="text-[9.5px] font-bold tracking-tight">Scope</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-tight", scopeMeta.color)}>
                    {scopeMeta.label}
                  </span>
                </div>
              </button>

              {/* Button 2: Queue Order */}
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

              {/* Button 3: Batch Size */}
              <button
                type="button"
                onClick={handleCycleBatch}
                className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border bg-rose-50 border-rose-300 text-rose-700 shadow-2xs transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none"
                title={`Batch Size: ${settings.batch_size} Cards (Tap to cycle)`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-600 text-white shadow-2xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Batch</span>
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-600">
                    {settings.batch_size} CARDS
                  </span>
                </div>
              </button>

              {/* Button 4: Pass Target */}
              <button
                type="button"
                onClick={handleCycleTarget}
                className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none"
                title={`Pass Target: ${settings.required_correct}x Correct (Tap to cycle)`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-600 text-white shadow-2xs">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[9.5px] font-bold tracking-tight">Target</span>
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600">
                    {settings.required_correct}X PASS
                  </span>
                </div>
              </button>
            </div>

            {/* Direct Active Practice Types Chips */}
            <div className="flex flex-col gap-1 px-0.5">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 text-left">
                Active Drill Question Types
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'mcq', label: 'MCQ', sub: 'Multiple Choice' },
                  { id: 'typing', label: 'Typing', sub: 'Spelling Recall' },
                  { id: 'listening', label: 'Listening', sub: 'Audio Recall' },
                ].map(item => {
                  const isSelected = (settings.allowed_practices || []).includes(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePracticeType(item.id)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-center transition-all active:scale-95 cursor-pointer select-none shadow-2xs",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-700 font-black shadow-xs scale-[1.01]"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 font-bold opacity-60"
                      )}
                    >
                      <span className="text-[10px] leading-tight">{item.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  )
                })}
              </div>
            </div>

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
                      autoplayMeta.container
                    )}
                    title={autoplayMeta.title}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", autoplayMeta.iconBox)}>
                      {autoplayMeta.icon}
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Voice Play</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-wider", autoplayMeta.color)}>
                        {autoplayMeta.label}
                      </span>
                    </div>
                  </button>

                  {/* 2. Speed */}
                  <button
                    type="button"
                    onClick={() => {
                      showLocalToast?.('Audio Speed: Standard 1.0x', 'info')
                    }}
                    className="flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                    title="Audio Speed: 1.0x"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-400 border border-slate-200/60">
                      <Gauge className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Speed</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                        1.0X
                      </span>
                    </div>
                  </button>

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

              {/* 2. Display & Layout (Unified 4-Button Grid) */}
              <div className="flex flex-col gap-1 text-left px-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Display & Typography
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Visuals & Alignment
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {/* 1. Front Size */}
                  <button
                    type="button"
                    onClick={handleCycleFrontFont}
                    className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-600"
                    title={`Front Font Size: ${frontFontSize || '100%'}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-500 border border-slate-200/60">
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Front Size</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600">
                        {frontFontSize || '100%'}
                      </span>
                    </div>
                  </button>

                  {/* 2. Front Align */}
                  <button
                    type="button"
                    onClick={handleToggleFrontAlign}
                    className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-600"
                    title={`Front Text Align: ${frontHalign.toUpperCase()}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-500 border border-slate-200/60">
                      {frontHalign === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Front Align</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600">
                        {frontHalign.toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {/* 3. Back Size */}
                  <button
                    type="button"
                    onClick={handleCycleBackFont}
                    className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-600"
                    title={`Back Font Size: ${backFontSize || '100%'}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-500 border border-slate-200/60">
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Back Size</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">
                        {backFontSize || '100%'}
                      </span>
                    </div>
                  </button>

                  {/* 4. Back Align */}
                  <button
                    type="button"
                    onClick={handleToggleBackAlign}
                    className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border transition-all active:scale-95 text-center min-h-[58px] gap-1 cursor-pointer select-none bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-600"
                    title={`Back Text Align: ${backHalign.toUpperCase()}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white text-slate-500 border border-slate-200/60">
                      {backHalign === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9.5px] font-bold tracking-tight">Back Align</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">
                        {backHalign.toUpperCase()}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Card Actions (Lightweight Icon Toolbar at Bottom) */}
              <div className="flex flex-col gap-1 text-left px-0.5 pt-1.5 border-t border-slate-100">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Card & Creator Actions
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Quick Utilities
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {/* 1. Copy Face */}
                  <button
                    type="button"
                    onClick={handleCopyFace}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none",
                      copiedFace
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-emerald-50/70 border-slate-200/80 text-slate-600 hover:text-emerald-700 hover:border-emerald-200"
                    )}
                    title="Copy Front Face to clipboard"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                      copiedFace ? "bg-emerald-600 text-white" : "bg-white text-slate-500 border border-slate-200/60"
                    )}>
                      {copiedFace ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                      {copiedFace ? "Copied" : "Front"}
                    </span>
                  </button>

                  {/* 2. Copy Full */}
                  <button
                    type="button"
                    onClick={handleCopyFull}
                    className={cn(
                      "flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none",
                      copiedFull
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-indigo-50/70 border-slate-200/80 text-slate-600 hover:text-indigo-700 hover:border-indigo-200"
                    )}
                    title="Copy Full Card (Front & Back)"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                      copiedFull ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200/60"
                    )}>
                      {copiedFull ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                      {copiedFull ? "Copied" : "Full"}
                    </span>
                  </button>

                  {/* 3. AI Explain / Insights */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (currentQuestion) onOpenCardInsight?.(currentQuestion)
                    }}
                    className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-slate-600 hover:text-purple-700 transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none"
                    title="Open Learning Insights Drawer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-white text-slate-500 border border-slate-200/60 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                      Insight
                    </span>
                  </button>

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

                  {/* 5. Save as Creator Baseline */}
                  {canEdit && onSaveAsCreatorBaseline ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSaveAsCreatorBaseline()
                        showLocalToast?.('Saved as creator baseline! ✓', 'success')
                      }}
                      className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-200 text-slate-600 hover:text-amber-700 transition-all active:scale-90 text-center min-h-[46px] gap-1 cursor-pointer select-none"
                      title="Save current config as default baseline for learners"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white text-slate-500 border border-slate-200/60 flex items-center justify-center">
                        <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="text-[8.5px] font-bold tracking-tight leading-none truncate max-w-full">
                        Baseline
                      </span>
                    </button>
                  ) : (
                    <div className="opacity-0 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Status bar */}
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Auto-saved to cloud</span>
                </div>
                <span className="text-[9.5px] font-medium text-slate-400">
                  Vocaburn FSRS Engine
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
