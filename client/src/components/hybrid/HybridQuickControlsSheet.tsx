import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import {
  Sliders,
  X,
  Shuffle,
  ListOrdered,
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
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '@/components/common/study/SegmentedControl'
import { ToggleRow } from '@/components/common/study/ToggleRow'
import type { HybridSettings } from '@/pages/HybridPlay'
import type { HybridScope, HybridOrder } from '@/utils/cardLifecycle'

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
}) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'display'>('workflow')
  const dragControls = useDragControls()
  const drawerRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number>(0)
  const backdropTouchStartY = useRef<number | null>(null)

  // Prevent mobile browser pull-to-refresh while sheet is open
  useEffect(() => {
    if (!isOpen) return
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
    }
  }, [isOpen])

  const handleBackdropTouchStart = (e: React.TouchEvent) => {
    backdropTouchStartY.current = e.touches[0].clientY
  }

  const handleBackdropTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault()
    }
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

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null && drawerRef.current && drawerRef.current.scrollTop <= 0) {
      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartYRef.current
      // If user drags downward at the top of drawer, suppress browser pull-to-refresh
      if (deltaY > 0 && e.cancelable) {
        e.preventDefault()
      }
    }
  }

  const handleDrawerTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null && drawerRef.current && drawerRef.current.scrollTop <= 0) {
      const currentY = e.changedTouches[0].clientY
      const deltaY = currentY - touchStartYRef.current
      const duration = Date.now() - touchStartTimeRef.current
      const velocity = deltaY / Math.max(1, duration)

      if (deltaY > 60 || (deltaY > 25 && velocity > 0.3)) {
        onClose()
      }
    }
    touchStartYRef.current = null
  }

  if (typeof document === 'undefined') return null

  const SCOPE_OPTIONS: { id: HybridScope; label: string; count: number; desc: string; icon: any }[] = [
    { id: 'all', label: 'All Cards', count: scopeCounts.all, desc: 'Entire deck collection', icon: Layers },
    { id: 'new', label: 'New Only', count: scopeCounts.new, desc: 'Cards not yet in FSRS', icon: Sparkles },
    { id: 'undrilled', label: 'Undrilled', count: scopeCounts.undrilled, desc: 'Pending mastery target', icon: Target },
    { id: 'review', label: 'Learned', count: scopeCounts.review, desc: 'All learned cards', icon: RefreshCw },
    { id: 'due', label: 'Due Only', count: scopeCounts.due, desc: 'Cards due for FSRS review', icon: Clock },
  ]

  const FONT_SIZE_OPTIONS = [
    { id: '85%', label: '85%' },
    { id: '100%', label: '100%' },
    { id: '115%', label: '115%' },
    { id: '130%', label: '130%' },
  ]

  const AUTOPLAY_OPTIONS = [
    { id: 'none', label: 'Off' },
    { id: 'front', label: 'Front' },
    { id: 'back', label: 'Back' },
    { id: 'always', label: 'Both' },
  ]

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
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs overscroll-none touch-none"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            onTouchStart={handleBackdropTouchStart}
            onTouchMove={handleBackdropTouchMove}
            onTouchEnd={handleBackdropTouchEnd}
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
              if (info.offset.y > 50 || info.velocity.y > 220) {
                onClose()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2rem] border-t border-slate-200/90 shadow-2xl p-3 sm:p-4 pb-6 flex flex-col gap-3 select-none z-10 max-h-[88vh] overflow-y-auto overscroll-contain overscroll-none touch-pan-y"
          >
            {/* Drag Handle Bar */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="w-full flex items-center justify-center pt-0 pb-1 -mt-1 cursor-grab active:cursor-grabbing touch-none select-none"
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
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Hybrid Quick Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pre-Learning & Active Drill Preferences</p>
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

            {/* Sub-Tab Switcher */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('workflow')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none",
                  activeTab === 'workflow'
                    ? "bg-white text-rose-600 shadow-xs scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Zap className="w-3.5 h-3.5 text-rose-500" />
                <span>Drill & Scope</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('display')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none",
                  activeTab === 'display'
                    ? "bg-white text-indigo-600 shadow-xs scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Display & Audio</span>
              </button>
            </div>

            {/* ═══════════ TAB 1: WORKFLOW & DRILL ═══════════ */}
            {activeTab === 'workflow' && (
              <div className="flex flex-col gap-3 text-left">
                {/* 1. Card Scope Filter */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-rose-500" />
                      <span>Card Scope Filter</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Total: {scopeCounts.all} Cards
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {SCOPE_OPTIONS.map((opt) => {
                      const isSelected = settings.scope === opt.id
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onUpdateHybridSettings({ scope: opt.id })
                            showLocalToast?.(`Scope set to ${opt.label}`, 'info')
                          }}
                          className={cn(
                            "flex flex-col p-2 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer select-none",
                            isSelected
                              ? "bg-rose-50 border-rose-300 text-rose-900 shadow-2xs"
                              : "bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-rose-600" : "text-slate-400")} />
                              <span className="text-[11px] font-black">{opt.label}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-extrabold px-1.5 py-0.2 rounded-full",
                              isSelected ? "bg-rose-200/70 text-rose-800" : "bg-slate-200/70 text-slate-500"
                            )}>
                              {opt.count}
                            </span>
                          </div>
                          <span className="text-[9px] font-medium text-slate-400 mt-1 truncate">
                            {opt.desc}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Queue Order */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Card Queue Order</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateHybridSettings({ order: 'sequential' })
                        showLocalToast?.('Order set to Sequential', 'info')
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer text-left select-none",
                        settings.order === 'sequential'
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                        settings.order === 'sequential' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        <ListOrdered className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black">Sequential</span>
                        <span className="text-[9px] text-slate-400 font-medium">Smart Cursor</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateHybridSettings({ order: 'random' })
                        showLocalToast?.('Order set to Random Shuffle', 'info')
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer text-left select-none",
                        settings.order === 'random'
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                        settings.order === 'random' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        <Shuffle className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black">Random</span>
                        <span className="text-[9px] text-slate-400 font-medium">Shuffle Cards</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Batch Size & Pass Target */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Batch Size */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Batch Size
                      </span>
                      <span className="text-[10px] font-bold text-rose-600">
                        {settings.batch_size} Cards
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 3, 5, 10, 15].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            onUpdateHybridSettings({ batch_size: size })
                            showLocalToast?.(`Batch size set to ${size}`, 'info')
                          }}
                          className={cn(
                            "py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 text-center",
                            settings.batch_size === size
                              ? "bg-rose-600 text-white shadow-2xs font-black"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pass Target */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Pass Target
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {settings.required_correct}x Correct
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 5].map(req => (
                        <button
                          key={req}
                          type="button"
                          onClick={() => {
                            onUpdateHybridSettings({ required_correct: req })
                            showLocalToast?.(`Pass target set to ${req}x`, 'info')
                          }}
                          className={cn(
                            "py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 text-center",
                            settings.required_correct === req
                              ? "bg-emerald-600 text-white shadow-2xs font-black"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                          )}
                        >
                          {req}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Active Practice Types in Drill */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 px-1">
                    Active Practice Types in Drill
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'mcq', label: 'MCQ', sub: '4 Choices' },
                      { id: 'typing', label: 'Typing', sub: 'Spelling' },
                      { id: 'listening', label: 'Listening', sub: 'Audio' },
                    ].map(item => {
                      const isSelected = (settings.allowed_practices || []).includes(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => togglePracticeType(item.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all active:scale-95 cursor-pointer select-none",
                            isSelected
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs"
                              : "bg-slate-50/80 border-slate-200 text-slate-400 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black">{item.label}</span>
                            {isSelected && <Check className="w-3 h-3 text-indigo-600 stroke-[3]" />}
                          </div>
                          <span className="text-[9px] font-medium text-slate-400 mt-0.5">{item.sub}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB 2: DISPLAY & AUDIO ═══════════ */}
            {activeTab === 'display' && (
              <div className="flex flex-col gap-3 text-left">
                {/* Horizontal Alignment */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Front Alignment
                    </span>
                    <SegmentedControl<'left' | 'center'>
                      value={frontHalign || 'left'}
                      onChange={(val) => {
                        setFrontHalign(val)
                        showLocalToast?.(`Front text: ${val.toUpperCase()}`, 'info')
                      }}
                      options={[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                      ]}
                      compact
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Back Alignment
                    </span>
                    <SegmentedControl<'left' | 'center'>
                      value={backHalign || 'left'}
                      onChange={(val) => {
                        setBackHalign(val)
                        showLocalToast?.(`Back text: ${val.toUpperCase()}`, 'info')
                      }}
                      options={[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                      ]}
                      compact
                    />
                  </div>
                </div>

                {/* Font Size Scale */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Font Size Scale</span>
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600">
                      {frontFontSize || '100%'}
                    </span>
                  </div>
                  <SegmentedControl<string>
                    value={frontFontSize || '100%'}
                    onChange={(val) => {
                      setFrontFontSize(val)
                      setBackFontSize(val)
                      showLocalToast?.(`Font size: ${val}`, 'info')
                    }}
                    options={FONT_SIZE_OPTIONS}
                    compact
                  />
                </div>

                {/* Autoplay Audio */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Autoplay Audio</span>
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 uppercase">
                      {autoPlayAudio === 'always' ? 'Both' : (autoPlayAudio || 'Off')}
                    </span>
                  </div>
                  <SegmentedControl<string>
                    value={autoPlayAudio === 'always' ? 'always' : (autoPlayAudio || 'none')}
                    onChange={(val) => {
                      setAutoPlayAudio(val)
                      showLocalToast?.(`Autoplay Audio: ${val.toUpperCase()}`, 'info')
                    }}
                    options={AUTOPLAY_OPTIONS}
                    compact
                  />
                </div>

                {/* Toggles: SFX & Haptic */}
                <div className="flex flex-col gap-2">
                  <ToggleRow
                    icon={Volume2}
                    label="Sound Effects (SFX)"
                    desc="Audio tones for flips, correct answers & celebrations"
                    checked={sfxEnabled}
                    onChange={(val) => {
                      setSfxEnabled(val)
                      showLocalToast?.(`SFX ${val ? 'Enabled' : 'Disabled'}`, 'info')
                    }}
                    compact
                  />

                  <ToggleRow
                    icon={Zap}
                    label="Haptic Feedback"
                    desc="Vibration cues on touches and mastery completions"
                    checked={hapticEnabled}
                    onChange={(val) => {
                      setHapticEnabled(val)
                      showLocalToast?.(`Haptic ${val ? 'Enabled' : 'Disabled'}`, 'info')
                    }}
                    compact
                  />
                </div>
              </div>
            )}

            {/* Footer Status Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-saved to cloud</span>
              </div>

              {canEdit && onSaveAsCreatorBaseline && (
                <button
                  type="button"
                  onClick={() => {
                    onSaveAsCreatorBaseline()
                    showLocalToast?.('Saved as creator baseline for learners! ✓', 'success')
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Save as Deck Baseline
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
