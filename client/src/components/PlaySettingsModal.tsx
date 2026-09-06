import React, { useState, useEffect, useRef } from 'react'
import { 
  Sliders, 
  SlidersHorizontal,
  Brain, 
  Route, 
  Sparkles, 
  Shuffle, 
  AlertCircle, 
  TrendingUp, 
  Copy, 
  EyeOff, 
  Edit3, 
  LogOut, 
  Volume2, 
  VolumeX,
  Music, 
  Zap, 
  Image as ImageIcon, 
  ImageOff,
  Layers,
  Check, 
  X,
  User,
  ShieldCheck,
  RotateCcw,
  Settings,
  BookOpen,
  AlignLeft,
  AlignCenter,
  MousePointerClick,
  BookmarkPlus,
  BookmarkCheck,
  Headphones,
  Book
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { StudyProfile } from '@/store/useSettingsStore'

interface PlaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: string;
  applyLearningMode: (mode: string) => void;
  autoPlayAudio: 'always' | 'front' | 'back' | 'none';
  setAutoPlayAudio: (mode: 'always' | 'front' | 'back' | 'none') => void;
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => void;
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
  showFeedback?: boolean;
  copyQuestionToClipboard?: () => void;
  currentQuestion?: any;
  handleIgnoreQuestion?: () => void;
  openEditModal?: () => void;
  setIsQuitModalOpen?: (open: boolean) => void;
  quickLearnEnabled?: boolean;
  setQuickLearnEnabled?: (enabled: boolean) => void;
  showImages: any;
  setShowImages: (mode: any) => void;
  showFsrs?: boolean;
  setShowFsrs?: (enabled: boolean) => void;
  randomEnabled?: boolean;
  setRandomEnabled?: (enabled: boolean) => void;
  isCustomized?: boolean;
  settingOrigin?: string;
  studyProfiles?: StudyProfile[];
  activeProfileId?: string | null;
  onApplyProfile?: (profileId: string) => Promise<void> | void;
  onCreateCustomProfile?: (name: string, icon?: string) => Promise<void> | void;
  onDeleteCustomProfile?: (profileId: string) => Promise<void> | void;
  onResetToCreatorDefaults?: () => Promise<void> | void;
  onSaveAsCreatorDefaults?: () => Promise<void> | void;
  frontHalign?: 'center' | 'left';
  setFrontHalign?: (val: 'center' | 'left') => void;
  backHalign?: 'center' | 'left';
  setBackHalign?: (val: 'center' | 'left') => void;
  frontValign?: 'center' | 'top';
  setFrontValign?: (val: 'center' | 'top') => void;
  backValign?: 'center' | 'top';
  setBackValign?: (val: 'center' | 'top') => void;
  cardFlipTrigger?: 'both' | 'tap' | 'button_only';
  setCardFlipTrigger?: (val: 'both' | 'tap' | 'button_only') => void;
  cardRatingMode?: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way';
  setCardRatingMode?: (val: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way') => void;
  isCreator?: boolean;
}

export const PlaySettingsModal: React.FC<PlaySettingsModalProps> = ({
  isOpen,
  onClose,
  activeMode,
  applyLearningMode,
  autoPlayAudio,
  setAutoPlayAudio,
  sfxEnabled,
  setSfxEnabled,
  hapticEnabled,
  setHapticEnabled,
  copyQuestionToClipboard,
  handleIgnoreQuestion,
  openEditModal,
  setIsQuitModalOpen,
  quickLearnEnabled = false,
  setQuickLearnEnabled,
  showImages,
  setShowImages,
  showFsrs = true,
  setShowFsrs,
  randomEnabled = false,
  setRandomEnabled,
  isCustomized = false,
  settingOrigin = 'deck_default',
  studyProfiles = [],
  activeProfileId = null,
  onApplyProfile,
  onCreateCustomProfile,
  onResetToCreatorDefaults,
  onSaveAsCreatorDefaults,
  frontHalign = 'left',
  setFrontHalign,
  backHalign = 'left',
  setBackHalign,
  frontValign = 'center',
  setFrontValign,
  backValign = 'center',
  setBackValign,
  cardFlipTrigger = 'both',
  setCardFlipTrigger,
  cardRatingMode = 'both',
  setCardRatingMode,
  isCreator = false
}) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  // View Mode: Simple Mode (Templates) vs Advanced Mode (Detailed Tabs)
  const [modalViewMode, setModalViewMode] = useState<'simple' | 'advanced'>('simple')
  const [activeTab, setActiveTab] = useState<'modes' | 'audio' | 'display' | 'gestures'>('modes')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false)
  const [newProfileName, setNewProfileName] = useState<string>('')

  // Track selected template id
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    if (activeProfileId) return activeProfileId
    if (!isCustomized && settingOrigin === 'deck_default') return 'deck-default'
    if (isCustomized) return 'current-custom'
    return 'deck-default'
  })

  // Snapshot of custom settings to allow switching back to "Current Customization"
  const customSnapshotRef = useRef<any>(null)

  useEffect(() => {
    if (isOpen && (isCustomized || selectedProfileId === 'current-custom') && !customSnapshotRef.current) {
      customSnapshotRef.current = {
        learningMode: activeMode,
        autoPlayAudio,
        showImages,
        frontValign,
        frontHalign,
        backValign,
        backHalign,
        randomEnabled,
        sfxEnabled,
        hapticEnabled,
        quickLearnEnabled,
        showFsrs,
        cardFlipTrigger,
        cardRatingMode
      }
    }
    if (!isOpen) {
      customSnapshotRef.current = null
    }
  }, [isOpen, isCustomized, selectedProfileId, activeMode, autoPlayAudio, showImages, frontValign, frontHalign, backValign, backHalign, randomEnabled, sfxEnabled, hapticEnabled, quickLearnEnabled, showFsrs, cardFlipTrigger, cardRatingMode])

  useEffect(() => {
    if (activeProfileId) {
      setSelectedProfileId(activeProfileId)
    } else if (!isCustomized && settingOrigin === 'deck_default') {
      setSelectedProfileId('deck-default')
    } else if (isCustomized && selectedProfileId === 'deck-default') {
      setSelectedProfileId('current-custom')
    }
  }, [activeProfileId, isCustomized, settingOrigin])

  // Deduplicate profiles strictly by id
  const systemProfilesList = React.useMemo(() => {
    const seen = new Set<string>()
    return (studyProfiles || []).filter(p => {
      if (!p || !p.id || !p.is_system || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [studyProfiles])

  const customProfilesList = React.useMemo(() => {
    const seen = new Set<string>()
    return (studyProfiles || []).filter(p => {
      if (!p || !p.id || p.is_system || String(p.id).startsWith('preset-') || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [studyProfiles])

  // Parse audio mode
  const currentAudioMode: 'always' | 'front' | 'back' | 'none' = autoPlayAudio || 'none'
  
  // Parse image mode
  const currentImageMode: 'always' | 'front' | 'back' | 'none' = (() => {
    if (showImages === 'always' || showImages === true || showImages === 'true') return 'always'
    if (showImages === 'front') return 'front'
    if (showImages === 'back') return 'back'
    return 'none'
  })()

  const MODES_LIST = [
    { id: 'fsrs', label: 'FSRS v6', desc: 'Spaced repetition algorithm', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50/80', border: 'border-indigo-200' },
    { id: 'roadmap', label: 'Roadmap', desc: 'Step-by-step daily journey', icon: Route, color: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-200' },
    { id: 'new', label: 'New Cards', desc: 'Cards never studied before', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50/80', border: 'border-amber-200' },
    { id: 'review', label: 'Review', desc: 'Cards due for revision', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/80', border: 'border-rose-200' },
    { id: 'hardest', label: 'Hardest', desc: 'Frequently forgotten cards', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50/80', border: 'border-purple-200' },
    { id: 'flip', label: 'Quick Flip', desc: 'Free-form flashcard flip', icon: RotateCcw, color: 'text-sky-600', bg: 'bg-sky-50/80', border: 'border-sky-200' }
  ]

  const handleSelectCurrentCustom = () => {
    setSelectedProfileId('current-custom')
    if (customSnapshotRef.current) {
      const s = customSnapshotRef.current
      if (applyLearningMode && s.learningMode) applyLearningMode(s.learningMode)
      if (setAutoPlayAudio && s.autoPlayAudio) setAutoPlayAudio(s.autoPlayAudio)
      if (setShowImages && s.showImages) setShowImages(s.showImages)
      if (setFrontValign && s.frontValign) setFrontValign(s.frontValign)
      if (setFrontHalign && s.frontHalign) setFrontHalign(s.frontHalign)
      if (setBackValign && s.backValign) setBackValign(s.backValign)
      if (setBackHalign && s.backHalign) setBackHalign(s.backHalign)
      if (setRandomEnabled && s.randomEnabled !== undefined) setRandomEnabled(s.randomEnabled)
      if (setSfxEnabled && s.sfxEnabled !== undefined) setSfxEnabled(s.sfxEnabled)
      if (setHapticEnabled && s.hapticEnabled !== undefined) setHapticEnabled(s.hapticEnabled)
      if (setQuickLearnEnabled && s.quickLearnEnabled !== undefined) setQuickLearnEnabled(s.quickLearnEnabled)
      if (setShowFsrs && s.showFsrs !== undefined) setShowFsrs(s.showFsrs)
      if (setCardFlipTrigger && s.cardFlipTrigger) setCardFlipTrigger(s.cardFlipTrigger)
      if (setCardRatingMode && s.cardRatingMode) setCardRatingMode(s.cardRatingMode)
    }
  }

  const handleSelectDeckDefault = async () => {
    setSelectedProfileId('deck-default')
    if (onResetToCreatorDefaults) {
      setIsSyncing(true)
      try {
        await onResetToCreatorDefaults()
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const handleApplyTemplateInstant = async (profileId: string) => {
    setSelectedProfileId(profileId)
    if (!onApplyProfile) return
    setIsSyncing(true)
    try {
      await onApplyProfile(profileId)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!onCreateCustomProfile || !newProfileName.trim()) return
    setIsSyncing(true)
    try {
      await onCreateCustomProfile(newProfileName.trim())
      setIsSaveModalOpen(false)
      setNewProfileName('')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResetToCreator = async () => {
    if (!onResetToCreatorDefaults) return
    if (window.confirm("Reset all study preferences for this deck back to the creator's default?")) {
      setIsSyncing(true)
      try {
        await onResetToCreatorDefaults()
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const handleSaveAsCreator = async () => {
    if (!onSaveAsCreatorDefaults) return
    if (window.confirm("Save the current study configuration as the OFFICIAL DECK DEFAULT for all learners?")) {
      setIsSyncing(true)
      try {
        await onSaveAsCreatorDefaults()
        alert("Saved as default deck configuration!")
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const ToggleSwitch = ({ checked, onChange, label, sub, icon: Icon, color = 'text-indigo-600', bg = 'bg-indigo-50' }: any) => (
    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        {Icon && (
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-100/60", bg)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-xs font-black text-slate-800 block truncate">{label}</span>
          {sub && <span className="text-[10px] font-bold text-slate-400 block truncate">{sub}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "w-11 h-6 rounded-full transition-all duration-300 relative p-0.5 shrink-0 cursor-pointer",
          checked ? "bg-indigo-600 shadow-xs" : "bg-slate-200"
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )

  const SegmentedGroup = ({ 
    label, 
    sub,
    value, 
    onChange, 
    options 
  }: { 
    label?: string; 
    sub?: string;
    value: string; 
    onChange: (val: any) => void; 
    options: { id: string; label: string; sub?: string; icon?: any }[] 
  }) => (
    <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-2">
      {(label || sub) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs font-black text-slate-800">{label}</span>}
          {sub && <span className="text-[10px] font-bold text-slate-400">{sub}</span>}
        </div>
      )}
      <div className={cn(
        "grid gap-1 p-1 bg-slate-100/80 rounded-xl",
        options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-4"
      )}>
        {options.map(opt => {
          const active = value === opt.id
          const IconComp = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "py-2 px-1 rounded-lg text-[10.5px] font-black tracking-tight transition-all text-center flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer",
                active 
                  ? "bg-white text-indigo-600 shadow-sm font-black" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <div className="flex items-center gap-1">
                {IconComp && <IconComp className={cn("w-3 h-3 shrink-0", active ? "text-indigo-600" : "text-slate-400")} />}
                <span className="truncate">{opt.label}</span>
              </div>
              {opt.sub && <span className="text-[8.5px] font-medium text-slate-400 truncate">{opt.sub}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )

  const isDeckDefaultActive = selectedProfileId === 'deck-default'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            className="relative w-full max-w-lg bg-[#F8FAFC] rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden text-slate-800 max-h-[88vh] flex flex-col"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-500" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                      Study Settings
                    </h3>
                    {isDeckDefaultActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                        Deck Default
                      </span>
                    ) : selectedProfileId === 'current-custom' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        Customized
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        Template Active
                      </span>
                    )}
                  </div>
                  <p className="text-[9.5px] font-bold text-slate-400 leading-none mt-0.5">
                    Configure gestures, display & flow for this session
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Simple / Advanced Switch */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setModalViewMode('simple')}
                    className={cn(
                      "py-1 px-2.5 rounded-lg text-[10.5px] font-black transition-all flex items-center gap-1 cursor-pointer",
                      modalViewMode === 'simple'
                        ? "bg-white text-orange-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <BookmarkCheck className="w-3 h-3" />
                    <span>Simple</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('advanced')}
                    className={cn(
                      "py-1 px-2.5 rounded-lg text-[10.5px] font-black transition-all flex items-center gap-1 cursor-pointer",
                      modalViewMode === 'advanced'
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Advanced</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-100 active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* ═══════════ VIEW A: SIMPLE MODE (CIRCULAR RADIO TEMPLATES) ═══════════ */}
              {modalViewMode === 'simple' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Choose a study template (instant apply)
                    </span>
                    {onCreateCustomProfile && (
                      <button
                        type="button"
                        onClick={() => setIsSaveModalOpen(true)}
                        className="text-[10.5px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        <span>Save Current as New Template</span>
                      </button>
                    )}
                  </div>

                  {/* 0. Current Customization Card (if customized or currently active) */}
                  {(isCustomized || selectedProfileId === 'current-custom') && (
                    <div
                      onClick={handleSelectCurrentCustom}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                        selectedProfileId === 'current-custom'
                          ? "bg-amber-50/60 border-amber-500 shadow-xs ring-1 ring-amber-400/30"
                          : "bg-white border-slate-200/80 hover:border-slate-300"
                      )}
                    >
                      <div className="pt-0.5 shrink-0">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selectedProfileId === 'current-custom' ? "border-amber-600 bg-amber-600" : "border-slate-300 bg-white"
                        )}>
                          {selectedProfileId === 'current-custom' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-xs font-black truncate", selectedProfileId === 'current-custom' ? "text-amber-950" : "text-slate-800")}>
                            Current Customization
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            Active Custom
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mb-1.5">
                          Your personalized active study configuration for this deck.
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-slate-100/80 rounded-md text-[9px] font-bold text-slate-600">
                            Flip: {cardFlipTrigger === 'button_only' ? 'Button Only' : cardFlipTrigger === 'tap' ? 'Tap Only' : 'Tap & Swipe'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100/80 rounded-md text-[9px] font-bold text-slate-600">
                            Rating: {cardRatingMode === 'buttons' ? '4 Buttons' : cardRatingMode === 'swipe_4way' ? '4-Way Swipe' : 'Both'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100/80 rounded-md text-[9px] font-bold text-slate-600">
                            Audio: {currentAudioMode === 'always' ? 'Always' : currentAudioMode === 'back' ? 'Back' : currentAudioMode === 'front' ? 'Front' : 'Off'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1. Deck Creator Default Card */}
                  <div
                    onClick={handleSelectDeckDefault}
                    className={cn(
                      "p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                      selectedProfileId === 'deck-default'
                        ? "bg-emerald-50/50 border-emerald-500 shadow-xs ring-1 ring-emerald-400/30"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                    )}
                  >
                    <div className="pt-0.5 shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedProfileId === 'deck-default' ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                      )}>
                        {selectedProfileId === 'deck-default' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-xs font-black truncate", selectedProfileId === 'deck-default' ? "text-emerald-950" : "text-slate-800")}>
                          Deck Creator Default
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Original
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                        Original baseline settings designed specifically for this deck by the author.
                      </p>
                    </div>
                  </div>

                  {/* 2. System Presets */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block px-1">
                      System Presets
                    </span>
                    {systemProfilesList.map((p) => {
                      const isSelected = selectedProfileId === p.id
                      const s = p.settings || {}
                      const flipText = s.card_flip_trigger === 'button_only' ? 'Button Only' : s.card_flip_trigger === 'tap' ? 'Tap Only' : 'Tap & Swipe'
                      const ratingText = s.card_rating_mode === 'buttons' ? '4 Buttons' : s.card_rating_mode === 'swipe_4way' ? '4-Way Swipe' : 'Both'
                      const audioText = s.autoplay_audio === 'always' ? 'Always' : s.autoplay_audio === 'back' ? 'Back' : s.autoplay_audio === 'front' ? 'Front' : 'Off'

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleApplyTemplateInstant(p.id)}
                          className={cn(
                            "p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                            isSelected
                              ? "bg-orange-50/50 border-orange-500 shadow-xs ring-1 ring-orange-400/30"
                              : "bg-white border-slate-200/80 hover:border-slate-300"
                          )}
                        >
                          <div className="pt-0.5 shrink-0">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn("text-xs font-black truncate", isSelected ? "text-orange-950" : "text-slate-800")}>
                                {p.name}
                              </span>
                              {p.badge && (
                                <span className={cn(
                                  "px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                  isSelected ? "bg-orange-100 text-orange-800 border-orange-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mb-1.5">
                              {p.description}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 bg-slate-100/80 rounded-md text-[9px] font-bold text-slate-600">
                                Flip: {flipText}
                              </span>
                              <span className="px-1.5 py-0.5 bg-slate-100/80 rounded-md text-[9px] font-bold text-slate-600">
                                Rating: {ratingText}
                              </span>
                              <span className="px-1.5 py-0.5 bg-slate-100/80 rounded-md text-[9px] font-bold text-slate-600">
                                Audio: {audioText}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 3. My Custom Templates */}
                  {customProfilesList.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block px-1">
                        My Saved Templates
                      </span>
                      {customProfilesList.map((p) => {
                        const isSelected = selectedProfileId === p.id
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleApplyTemplateInstant(p.id)}
                            className={cn(
                              "p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                              isSelected
                                ? "bg-indigo-50/50 border-indigo-500 shadow-xs ring-1 ring-indigo-400/30"
                                : "bg-white border-slate-200/80 hover:border-slate-300"
                            )}
                          >
                            <div className="pt-0.5 shrink-0">
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={cn("text-xs font-black truncate block", isSelected ? "text-indigo-950" : "text-slate-800")}>
                                {p.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">User custom profile</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* ═══════════ VIEW B: ADVANCED MODE (DETAILED TABS) ═══════════ */
                <div className="space-y-4">
                  {/* Segmented Top Tabs */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setActiveTab('modes')}
                      className={cn(
                        "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer",
                        activeTab === 'modes' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Modes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('audio')}
                      className={cn(
                        "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer",
                        activeTab === 'audio' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Audio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('display')}
                      className={cn(
                        "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer",
                        activeTab === 'display' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Display</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('gestures')}
                      className={cn(
                        "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-1 cursor-pointer",
                        activeTab === 'gestures' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>Gestures</span>
                    </button>
                  </div>

                  {/* TAB 1: MODES */}
                  {activeTab === 'modes' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Learning Mode & Queue Flow
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {MODES_LIST.map((mode) => {
                            const Icon = mode.icon
                            const isSelected = activeMode === mode.id
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => applyLearningMode(mode.id)}
                                className={cn(
                                  "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer active:scale-95 shadow-2xs",
                                  isSelected 
                                    ? cn("bg-white border-2 shadow-sm ring-1 ring-orange-400/30", mode.border) 
                                    : "bg-white border-slate-100 hover:border-slate-200"
                                )}
                              >
                                <div className="flex items-center justify-between w-full mb-1.5">
                                  <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-slate-100", mode.bg)}>
                                    <Icon className={cn("w-3.5 h-3.5", mode.color)} />
                                  </div>
                                  {isSelected && <span className="w-2 h-2 rounded-full bg-orange-500 ring-4 ring-orange-100" />}
                                </div>
                                <div>
                                  <span className={cn("text-xs font-black block truncate", isSelected ? "text-slate-900" : "text-slate-700")}>
                                    {mode.label}
                                  </span>
                                  <span className="text-[9.5px] font-bold text-slate-400 block truncate">
                                    {mode.desc}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Queue Controls
                        </span>

                        {setRandomEnabled && (
                          <ToggleSwitch 
                            checked={randomEnabled}
                            onChange={() => setRandomEnabled(!randomEnabled)}
                            label="Shuffle Questions"
                            sub="Randomize order of cards in this study session"
                            icon={Shuffle}
                            color="text-amber-600"
                            bg="bg-amber-50"
                          />
                        )}

                        {setQuickLearnEnabled && (
                          <ToggleSwitch 
                            checked={quickLearnEnabled}
                            onChange={() => setQuickLearnEnabled(!quickLearnEnabled)}
                            label="Quick Learn Mode"
                            sub="Automatically score Good and advance quickly"
                            icon={Zap}
                            color="text-orange-600"
                            bg="bg-orange-50"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: AUDIO */}
                  {activeTab === 'audio' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          TTS Audio Autoplay
                        </span>
                        <SegmentedGroup 
                          sub="Automatically pronounce text on card flip"
                          value={currentAudioMode}
                          onChange={(val) => setAutoPlayAudio(val)}
                          options={[
                            { id: 'none', label: 'Off', icon: VolumeX },
                            { id: 'front', label: 'Front', icon: Volume2 },
                            { id: 'back', label: 'Back', icon: Volume2 },
                            { id: 'always', label: 'Both', icon: Volume2 }
                          ]}
                        />
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Sensory Feedback
                        </span>

                        <ToggleSwitch 
                          checked={sfxEnabled}
                          onChange={() => setSfxEnabled(!sfxEnabled)}
                          label="Sound Effects (SFX)"
                          sub="Audio feedback on flip and grading"
                          icon={Music}
                          color="text-indigo-600"
                          bg="bg-indigo-50"
                        />

                        <ToggleSwitch 
                          checked={hapticEnabled}
                          onChange={() => setHapticEnabled(!hapticEnabled)}
                          label="Haptic Touch Feedback"
                          sub="Vibration response on tap and swipe"
                          icon={Zap}
                          color="text-emerald-600"
                          bg="bg-emerald-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DISPLAY & ALIGNMENT */}
                  {activeTab === 'display' && (
                    <div className="space-y-4">
                      {setShowFsrs && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Card Metrics Indicator
                          </span>
                          <ToggleSwitch 
                            checked={showFsrs}
                            onChange={() => setShowFsrs(!showFsrs)}
                            label="FSRS v6 Metrics Badge"
                            sub="Show Stability (S), Difficulty (D), and Days due on card"
                            icon={Brain}
                            color="text-indigo-600"
                            bg="bg-indigo-50"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Front Card Alignment
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {setFrontValign && (
                            <SegmentedGroup 
                              label="Vertical"
                              value={frontValign}
                              onChange={(v) => setFrontValign(v)}
                              options={[
                                { id: 'center', label: 'Center' },
                                { id: 'top', label: 'Top' }
                              ]}
                            />
                          )}
                          {setFrontHalign && (
                            <SegmentedGroup 
                              label="Horizontal"
                              value={frontHalign}
                              onChange={(v) => setFrontHalign(v)}
                              options={[
                                { id: 'left', label: 'Left', icon: AlignLeft },
                                { id: 'center', label: 'Center', icon: AlignCenter }
                              ]}
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Back Card Alignment
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {setBackValign && (
                            <SegmentedGroup 
                              label="Vertical"
                              value={backValign}
                              onChange={(v) => setBackValign(v)}
                              options={[
                                { id: 'center', label: 'Center' },
                                { id: 'top', label: 'Top' }
                              ]}
                            />
                          )}
                          {setBackHalign && (
                            <SegmentedGroup 
                              label="Horizontal"
                              value={backHalign}
                              onChange={(v) => setBackHalign(v)}
                              options={[
                                { id: 'left', label: 'Left', icon: AlignLeft },
                                { id: 'center', label: 'Center', icon: AlignCenter }
                              ]}
                            />
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Illustrations & Images
                        </span>
                        <SegmentedGroup 
                          sub="Card sides where illustrations are displayed"
                          value={currentImageMode}
                          onChange={(val) => setShowImages(val)}
                          options={[
                            { id: 'none', label: 'Off', icon: ImageOff },
                            { id: 'front', label: 'Front', icon: ImageIcon },
                            { id: 'back', label: 'Back', icon: ImageIcon },
                            { id: 'always', label: 'Both', icon: ImageIcon }
                          ]}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: GESTURES */}
                  {activeTab === 'gestures' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Card Flip Trigger
                        </span>
                        {setCardFlipTrigger && (
                          <SegmentedGroup 
                            sub="How to reveal the back of the card"
                            value={cardFlipTrigger}
                            onChange={(v) => setCardFlipTrigger(v)}
                            options={[
                              { id: 'both', label: 'Both', sub: 'Tap & Button' },
                              { id: 'tap', label: 'Tap Only', sub: 'Card area' },
                              { id: 'button_only', label: 'Button Only', sub: 'Flip button' }
                            ]}
                          />
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          FSRS Recall Rating Mode
                        </span>
                        {setCardRatingMode && (
                          <SegmentedGroup 
                            sub="Recall evaluation interaction"
                            value={cardRatingMode}
                            onChange={(v) => setCardRatingMode(v)}
                            options={[
                              { id: 'both', label: 'Both', sub: 'Buttons & Swipe' },
                              { id: 'buttons', label: '4 Buttons', sub: 'Button bar' },
                              { id: 'swipe_4way', label: '4-Way Swipe', sub: '4 directions' },
                              { id: 'swipe_2way', label: '2-Way Swipe', sub: 'Left / Right' }
                            ]}
                          />
                        )}
                      </div>

                      {/* Quick in-session tools */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          Current Card Actions
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          {copyQuestionToClipboard && (
                            <button
                              type="button"
                              onClick={copyQuestionToClipboard}
                              className="flex items-center gap-2 p-2.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-xs font-black truncate">Copy Question</span>
                            </button>
                          )}

                          {handleIgnoreQuestion && (
                            <button
                              type="button"
                              onClick={handleIgnoreQuestion}
                              className="flex items-center gap-2 p-2.5 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                            >
                              <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-xs font-black truncate">Skip Question</span>
                            </button>
                          )}

                          {openEditModal && (
                            <button
                              type="button"
                              onClick={openEditModal}
                              className="flex items-center gap-2 p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left col-span-2"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-xs font-black truncate">Quick Edit This Card</span>
                            </button>
                          )}
                        </div>

                        {id && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                navigate(`/decks/${id}?tab=settings`)
                              }}
                              className="flex items-center gap-2 p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                            >
                              <Settings className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-xs font-black truncate">Deck Settings</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                navigate(`/decks/${id}?tab=cards`)
                              }}
                              className="flex items-center gap-2 p-2.5 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-xs font-black truncate">Card Manager</span>
                            </button>
                          </div>
                        )}

                        {setIsQuitModalOpen && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                setIsQuitModalOpen(true)
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Quit Session</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {onResetToCreatorDefaults && (isCustomized || settingOrigin !== 'deck_default') && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleResetToCreator}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Deck Default</span>
                  </button>
                )}

                {onSaveAsCreatorDefaults && isCreator && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSaveAsCreator}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Save as Deck Default</span>
                  </button>
                )}
              </div>

              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Done</span>
              </button>
            </div>

            {/* Save New Template Modal */}
            {isSaveModalOpen && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Save as New Template
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setIsSaveModalOpen(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Save current configuration into a reusable template accessible across all decks.
                  </p>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., Japanese Listening, Speedy Review..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveProfile()
                    }}
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSaveModalOpen(false)}
                      className="px-3 py-1.5 text-[10.5px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newProfileName.trim() || isSyncing}
                      onClick={handleSaveProfile}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isSyncing ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
