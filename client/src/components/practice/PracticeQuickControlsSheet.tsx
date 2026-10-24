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
  Pencil, 
  Copy, 
  Check, 
  RotateCcw, 
  LogOut, 
  Settings, 
  BookOpen, 
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
  const [quickTab, setQuickTab] = useState<'preferences' | 'actions'>('preferences')
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

  // Resolved TTS feedback mode: 'none' (OFF) | 'answer' (default) | 'both'
  const currentTtsFeedback = (() => {
    if (autoPlayAudio === 'none' || autoPlayAudio === 'off') return 'none'
    if (autoPlayAudio === 'always' || autoPlayAudio === 'both') return 'both'
    return 'answer'
  })()

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
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2rem] border-t border-slate-200/90 shadow-2xl p-3 sm:p-4 pb-6 flex flex-col gap-3 select-none z-10 max-h-[88vh] overflow-y-auto touch-pan-y"
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
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Practice Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mode, Scope & Audio Preferences</p>
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

            {/* ── 1. SELECT PRACTICE MODE (Direct 4-Grid, No Duplicates) ── */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 text-left">
                Select Practice Mode
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'mcq', label: 'MCQ', sub: 'Multiple Choice', icon: HelpCircle },
                  { id: 'typing', label: 'Typing', sub: 'Type Recall', icon: Keyboard },
                  { id: 'listening_mcq', label: 'Audio MCQ', sub: 'Listen & Pick', icon: Volume2 },
                  { id: 'listening_typing', label: 'Audio Type', sub: 'Listen & Type', icon: Headphones },
                ].map((m) => {
                  const Icon = m.icon
                  const isActive = practiceSubMode === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectPracticeMode(m.id as PracticeSubMode)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer text-center min-h-[58px] gap-1",
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-md font-bold scale-[1.02]"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-indigo-600")} />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] font-black">{m.label}</span>
                        <span className={cn("text-[8px] font-medium opacity-80 mt-0.5", isActive ? "text-indigo-100" : "text-slate-400")}>
                          {m.sub}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 2. FILTER QUESTION SCOPE (4 Direct Pills with Live Counts) ── */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                  Filter Question Scope
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {scopeCounts[cardScope]} active questions
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

            {/* ── 3. QUEUE ORDER (Direct 2-Segmented Selector) ── */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 text-left">
                Queue Order & Flow
              </span>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onToggleRandom(false)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                    !randomEnabled
                      ? "bg-white text-indigo-700 shadow-xs scale-[1.01] font-black"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Sequential (Thứ tự)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleRandom(true)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                    randomEnabled
                      ? "bg-white text-indigo-700 shadow-xs scale-[1.01] font-black"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Random Shuffle (Ngẫu nhiên)</span>
                </button>
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

            {/* ── Segmented Sub-Tab Switcher (Preferences vs Card Actions) ── */}
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
                {/* TTS Pronunciation On Answer (Logical Practice Audio) */}
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">Pronounce on Answer</span>
                    <span className="text-[9px] text-slate-400 font-medium">Auto-read answer after submitting</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'none', label: 'OFF', title: 'Do not pronounce after answer' },
                      { id: 'answer', label: 'ANSWER', title: 'Pronounce correct answer on submit' },
                      { id: 'both', label: 'BOTH', title: 'Pronounce question & answer on submit' }
                    ].map((opt) => {
                      const isSelected = currentTtsFeedback === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setAutoPlayAudio(opt.id)
                            showLocalToast?.(`Pronounce on Answer: ${opt.label}`, 'info')
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-600 text-white shadow-2xs font-black scale-105"
                              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                          )}
                          title={opt.title}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Audio Playback Speed */}
                {onChangeAudioSpeed && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold text-slate-800 leading-tight">Voice Speed</span>
                      <span className="text-[9px] text-slate-400 font-medium">Audio pronunciation rate</span>
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
                              showLocalToast?.(`Voice Speed: ${speed}x`, 'info')
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

                {/* Font Size */}
                {setFontSize && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold text-slate-800 leading-tight">Question Font Scale</span>
                      <span className="text-[9px] text-slate-400 font-medium">Text size for questions</span>
                    </div>
                    <div className="flex items-center gap-1">
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
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center",
                              isSelected
                                ? "bg-indigo-600 text-white shadow-2xs font-black scale-105"
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
                        <VolumeX className="w-3.5 h-3.5" />
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
