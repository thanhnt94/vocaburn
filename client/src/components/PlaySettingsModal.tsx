import React, { useState, useEffect, useRef } from 'react'
import { 
  Brain, 
  Route, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  Copy, 
  EyeOff, 
  Edit3, 
  LogOut, 
  Check, 
  X,
  ShieldCheck,
  RotateCcw,
  Settings,
  BookOpen,
  BookmarkPlus,
  BookmarkCheck,
  Move,
  Layers,
  Headphones,
  Volume2,
  Zap,
  Shuffle,
  Eye,
  Star,
  Type,
  Hand,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { StudyProfile } from '@/store/useSettingsStore'
import {
  SYSTEM_TEMPLATES,
  StudyTemplateSelector,
  SegmentedControl,
  ToggleRow,
  getFrontFontSizeStyle,
  type StudySettings,
  type StudyTemplateItem,
} from '@/components/common/study'

export type PlaySettingsTab = 'mode' | 'gestures' | 'display' | 'audio' | 'templates'

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
  handleStarQuestion?: () => void;
  isStarred?: boolean;
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
  frontFontSize?: string;
  setFrontFontSize?: (val: string) => void;
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
  currentQuestion,
  handleIgnoreQuestion,
  handleStarQuestion,
  isStarred,
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
  frontFontSize = '100%',
  setFrontFontSize,
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

  // Active Tab - Default to 'mode' as requested by user
  const [activeTab, setActiveTab] = useState<PlaySettingsTab>('mode')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false)
  const [newProfileName, setNewProfileName] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  const starred = isStarred ?? Boolean(currentQuestion?.is_starred)

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
        frontFontSize,
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
  }, [isOpen, isCustomized, selectedProfileId, activeMode, autoPlayAudio, showImages, frontValign, frontHalign, frontFontSize, backValign, backHalign, randomEnabled, sfxEnabled, hapticEnabled, quickLearnEnabled, showFsrs, cardFlipTrigger, cardRatingMode])

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

  const MODES_LIST = [
    { id: 'fsrs', label: 'Flashcard FSRS', desc: 'Spaced repetition v6', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50/80', border: 'border-indigo-200' },
    { id: 'roadmap', label: 'Daily Roadmap', desc: 'Step-by-step goals', icon: Route, color: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-200' },
    { id: 'new', label: 'New Cards', desc: 'Cards never seen before', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50/80', border: 'border-amber-200' },
    { id: 'review', label: 'Review Due', desc: 'Cards due for revision', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/80', border: 'border-rose-200' },
    { id: 'hardest', label: 'Hardest Cards', desc: 'Frequently forgotten', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50/80', border: 'border-purple-200' },
    { id: 'flip', label: 'Quick Flip', desc: 'Free-form flip cards', icon: RotateCcw, color: 'text-sky-600', bg: 'bg-sky-50/80', border: 'border-sky-200' }
  ]

  const currentSettings: StudySettings = {
    card_flip_trigger: cardFlipTrigger || 'both',
    card_rating_mode: cardRatingMode || 'both',
    quiz_learning_mode: activeMode,
    learning_mode: activeMode,
    front_valign: frontValign || 'center',
    front_halign: frontHalign || 'left',
    front_font_size: frontFontSize || '100%',
    back_valign: backValign || 'center',
    back_halign: backHalign || 'left',
    autoplay_audio: autoPlayAudio || 'always',
    show_images: showImages || 'both',
    show_fsrs: showFsrs ?? true,
    sfx_enabled: sfxEnabled ?? true,
    haptic_enabled: hapticEnabled ?? true,
    random_enabled: randomEnabled ?? false,
    quick_learn_enabled: quickLearnEnabled ?? false,
  }

  const handleSelectCurrentCustom = () => {
    setSelectedProfileId('current-custom')
    if (customSnapshotRef.current) {
      const s = customSnapshotRef.current
      if (applyLearningMode && s.learningMode) applyLearningMode(s.learningMode)
      if (setAutoPlayAudio && s.autoPlayAudio) setAutoPlayAudio(s.autoPlayAudio)
      if (setShowImages && s.showImages) setShowImages(s.showImages)
      if (setFrontValign && s.frontValign) setFrontValign(s.frontValign)
      if (setFrontHalign && s.frontHalign) setFrontHalign(s.frontHalign)
      if (setFrontFontSize && s.frontFontSize) setFrontFontSize(s.frontFontSize)
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

  const allTemplates: StudyTemplateItem[] = React.useMemo(() => {
    const list: StudyTemplateItem[] = []

    if (isCustomized || selectedProfileId === 'current-custom') {
      list.push({
        id: 'current-custom',
        name: 'Current Customization',
        badge: 'Active Custom',
        desc: 'Your personalized active study configuration for this session.',
        icon: 'sparkles',
        isCustom: true,
        settings: currentSettings,
      })
    }

    list.push({
      id: 'deck-default',
      name: 'Deck Creator Default',
      badge: 'Creator Baseline',
      desc: 'Original baseline settings designed specifically for this deck by the author.',
      icon: 'sparkles',
      isDeckDefault: true,
      settings: {},
    })

    if (systemProfilesList.length > 0) {
      systemProfilesList.forEach((p) => {
        list.push({
          id: p.id,
          name: p.name,
          badge: p.badge || 'System',
          desc: p.description || '',
          icon: p.icon || 'sparkles',
          isSystem: true,
          settings: p.settings || {},
        })
      })
    } else {
      list.push(...SYSTEM_TEMPLATES)
    }

    customProfilesList.forEach((p) => {
      list.push({
        id: p.id,
        name: p.name,
        badge: 'My Template',
        desc: p.description || 'User saved template',
        icon: p.icon || 'sparkles',
        isCustom: true,
        settings: p.settings || {},
      })
    })

    return list
  }, [isCustomized, selectedProfileId, currentSettings, systemProfilesList, customProfilesList])

  const handleSelectTemplate = (tpl: StudyTemplateItem) => {
    if (tpl.id === 'current-custom') {
      handleSelectCurrentCustom()
    } else if (tpl.id === 'deck-default') {
      handleSelectDeckDefault()
    } else {
      handleApplyTemplateInstant(tpl.id)
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

  const handleCopy = () => {
    if (copyQuestionToClipboard) {
      copyQuestionToClipboard()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isDeckDefaultActive = selectedProfileId === 'deck-default'

  const TABS: { id: PlaySettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'mode', label: 'Mode', icon: Brain },
    { id: 'gestures', label: 'Gestures', icon: Move },
    { id: 'display', label: 'Display', icon: Layers },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'templates', label: 'Presets', icon: BookmarkCheck },
  ]

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
                  <BookmarkCheck className="w-4 h-4" />
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
                    Configure mode, gestures, display & audio for this session
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-100 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB NAVIGATION BAR */}
            <div className="px-4 pt-3 pb-1 bg-white border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "py-2 px-1 rounded-xl text-[10.5px] sm:text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer select-none",
                        isActive
                          ? "bg-white text-indigo-600 shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600" : "text-slate-400")} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* ═══════════ TAB 1: TEMPLATES ═══════════ */}
              {activeTab === 'templates' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Choose study template (instant apply)
                    </span>
                    {onCreateCustomProfile && (
                      <button
                        type="button"
                        onClick={() => setIsSaveModalOpen(true)}
                        className="text-[10.5px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        <span>Save Current as Template</span>
                      </button>
                    )}
                  </div>

                  <StudyTemplateSelector
                    templates={allTemplates}
                    selectedId={selectedProfileId}
                    onSelect={handleSelectTemplate}
                    compact={true}
                  />
                </div>
              )}

              {/* ═══════════ TAB 2: MODE ═══════════ */}
              {activeTab === 'mode' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                      Choose Learning Mode
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
                      Queue Order & Flow
                    </span>

                    {setRandomEnabled && (
                      <ToggleRow
                        icon={Shuffle}
                        label="Shuffle Queue Questions"
                        desc="Randomize the study card order within the active queue"
                        checked={randomEnabled}
                        onChange={(val) => setRandomEnabled(val)}
                        compact={true}
                      />
                    )}

                    {setQuickLearnEnabled && (
                      <ToggleRow
                        icon={Sparkles}
                        label="Auto Advance (Quick Learn)"
                        desc="Instantly move to the next card after rating"
                        checked={quickLearnEnabled}
                        onChange={(val) => setQuickLearnEnabled(val)}
                        compact={true}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB 3: GESTURES ═══════════ */}
              {activeTab === 'gestures' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Card Interaction Triggers
                    </span>

                    {(() => {
                      const swipeToRate = cardRatingMode !== 'buttons'
                      const showActionDock = cardRatingMode !== 'swipe_4way' && cardRatingMode !== 'swipe_2way'

                      const handleToggleActionDock = (val: boolean) => {
                        if (!val && !swipeToRate) {
                          alert("Cannot hide Rating Buttons while Swipe to Rate is disabled. At least one rating method must remain active!")
                          return
                        }
                        const nextMode = val ? (swipeToRate ? 'both' : 'buttons') : 'swipe_4way'
                        if (setCardRatingMode) setCardRatingMode(nextMode)
                      }

                      const handleToggleSwipeToRate = (val: boolean) => {
                        if (!val && !showActionDock) {
                          alert("Cannot disable Swipe to Rate while Rating Buttons are hidden. At least one rating method must remain active!")
                          return
                        }
                        const nextMode = val ? (showActionDock ? 'both' : 'swipe_4way') : 'buttons'
                        if (setCardRatingMode) setCardRatingMode(nextMode)
                      }

                      return (
                        <>
                          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2 text-indigo-900">
                            <Hand className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            <div className="text-left">
                              <span className="font-bold text-xs block text-indigo-950">Tap Card Body to Flip</span>
                              <p className="text-[11px] text-indigo-700 leading-relaxed mt-0.5">
                                Permanent default gesture: tap or click the card body to flip between question and answer.
                              </p>
                            </div>
                          </div>

                          <ToggleRow
                            icon={Layers}
                            label="Rating Buttons Dock"
                            desc="Display bottom rating dock (Again, Hard, Good, Easy + Flip Back) on card back"
                            checked={showActionDock}
                            onChange={handleToggleActionDock}
                            compact={true}
                          />

                          <ToggleRow
                            icon={Move}
                            label="Swipe to Rate"
                            desc="4-Way compass swipe gesture on card back (Left = Again, Down = Hard, Right = Good, Up = Easy)"
                            checked={swipeToRate}
                            onChange={handleToggleSwipeToRate}
                            compact={true}
                          />
                        </>
                      )
                    })()}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Sensory Feedback
                    </span>

                    <ToggleRow
                      icon={Volume2}
                      label="Sound Effects (SFX)"
                      desc="Play audio feedback on card flips and answer ratings"
                      checked={sfxEnabled}
                      onChange={(val) => setSfxEnabled(val)}
                      compact={true}
                    />

                    <ToggleRow
                      icon={Zap}
                      label="Haptic Feedback"
                      desc="Vibrate on mobile devices when swiping cards"
                      checked={hapticEnabled}
                      onChange={(val) => setHapticEnabled(val)}
                      compact={true}
                    />
                  </div>
                </div>
              )}

              {/* ═══════════ TAB 4: DISPLAY ═══════════ */}
              {activeTab === 'display' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Card Alignment (2-Axis)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Front Card Vertical
                        </label>
                        <SegmentedControl
                          value={frontValign || 'center'}
                          onChange={(val) => setFrontValign && setFrontValign(val)}
                          options={[
                            { id: 'center', label: 'Center' },
                            { id: 'top', label: 'Top' },
                          ]}
                          compact={true}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Front Card Horizontal
                        </label>
                        <SegmentedControl
                          value={frontHalign || 'left'}
                          onChange={(val) => setFrontHalign && setFrontHalign(val)}
                          options={[
                            { id: 'left', label: 'Left' },
                            { id: 'center', label: 'Center' },
                          ]}
                          compact={true}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Back Card Vertical
                        </label>
                        <SegmentedControl
                          value={backValign || 'center'}
                          onChange={(val) => setBackValign && setBackValign(val)}
                          options={[
                            { id: 'center', label: 'Center' },
                            { id: 'top', label: 'Top' },
                          ]}
                          compact={true}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Back Card Horizontal
                        </label>
                        <SegmentedControl
                          value={backHalign || 'left'}
                          onChange={(val) => setBackHalign && setBackHalign(val)}
                          options={[
                            { id: 'left', label: 'Left' },
                            { id: 'center', label: 'Center' },
                          ]}
                          compact={true}
                        />
                      </div>
                    </div>

                    {/* Front Font Size Scale */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-indigo-600" />
                          <label className="text-xs font-bold text-slate-800">
                            Front Font Size
                          </label>
                        </div>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {(() => {
                            const match = String(frontFontSize || '100%').match(/\d+/)
                            const pct = match ? parseInt(match[0], 10) : 100
                            const lbl = pct <= 85 ? 'Compact' : pct <= 105 ? 'Normal' : pct <= 135 ? 'Large' : pct <= 165 ? 'Extra Large' : 'Huge'
                            return `${pct}% • ${lbl}`
                          })()}
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: '85%', label: '85%', sub: 'Compact' },
                          { id: '100%', label: '100%', sub: 'Normal' },
                          { id: '125%', label: '125%', sub: 'Large' },
                          { id: '150%', label: '150%', sub: 'XL' },
                          { id: '175%', label: '175%', sub: 'Huge' },
                        ].map((p) => {
                          const match = String(frontFontSize || '100%').match(/\d+/)
                          const currentPct = match ? parseInt(match[0], 10) : 100
                          const active = currentPct === parseInt(p.id, 10)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setFrontFontSize && setFrontFontSize(p.id)}
                              className={cn(
                                "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer border text-center",
                                active
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black"
                                  : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
                              )}
                            >
                              <span className="text-xs font-black leading-tight">{p.label}</span>
                              <span className={cn("text-[9px] tracking-tight leading-none mt-0.5", active ? "text-indigo-100" : "text-slate-400")}>
                                {p.sub}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Fine-Tuning Slider */}
                      <div className="flex items-center gap-2.5 px-1 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-400">75%</span>
                        <input
                          type="range"
                          min={75}
                          max={200}
                          step={5}
                          value={(() => {
                            const match = String(frontFontSize || '100%').match(/\d+/)
                            return match ? parseInt(match[0], 10) : 100
                          })()}
                          onChange={(e) => setFrontFontSize && setFrontFontSize(`${e.target.value}%`)}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[10px] font-bold text-slate-400">200%</span>
                      </div>

                      {/* Live Preview Box */}
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center overflow-hidden min-h-[50px]">
                        <span
                          className="font-black text-slate-800 tracking-tight transition-all duration-150 truncate max-w-full text-center"
                          style={{ fontSize: getFrontFontSizeStyle(frontFontSize || '100%') }}
                        >
                          Aa Vocabulary
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Visual Content & Stats
                    </span>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Illustration Images
                      </label>
                      <SegmentedControl
                        value={showImages === true || showImages === 'true' ? 'always' : showImages || 'both'}
                        onChange={(val) => setShowImages && setShowImages(val)}
                        options={[
                          { id: 'always', label: 'Both Sides' },
                          { id: 'front', label: 'Front' },
                          { id: 'back', label: 'Back' },
                          { id: 'none', label: 'Off' },
                        ]}
                        compact={true}
                      />
                    </div>

                    {setShowFsrs && (
                      <ToggleRow
                        icon={Eye}
                        label="FSRS Algorithm Metrics"
                        desc="Show memory stability, retrievability & review interval on card"
                        checked={showFsrs}
                        onChange={(val) => setShowFsrs(val)}
                        compact={true}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ TAB 5: AUDIO ═══════════ */}
              {activeTab === 'audio' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Pronunciation & Audio
                    </span>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        TTS Audio Autoplay
                      </label>
                      <SegmentedControl
                        value={autoPlayAudio || 'always'}
                        onChange={(val) => setAutoPlayAudio(val)}
                        options={[
                          { id: 'always', label: 'Always (Both)' },
                          { id: 'back', label: 'Back Only' },
                          { id: 'front', label: 'Front Only' },
                          { id: 'none', label: 'Off' },
                        ]}
                        compact={true}
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Choose whether vocabulary audio automatically speaks when turning the card over or presenting a new word.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER: QUICK ACTION ICONS ON LEFT, RESET & DONE ON RIGHT */}
            <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              {/* Left: Quick Card Action Icons Row */}
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink min-w-0">
                {/* 1. Edit Card */}
                {openEditModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      openEditModal()
                    }}
                    title="Quick Edit Card"
                    aria-label="Quick Edit Card"
                    className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {/* 2. Star / Bookmark Card */}
                {handleStarQuestion && (
                  <button
                    type="button"
                    onClick={handleStarQuestion}
                    title={starred ? "Unstar Card" : "Star / Bookmark Card"}
                    aria-label="Star / Bookmark Card"
                    className={cn(
                      "w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs",
                      starred
                        ? "bg-amber-50 text-amber-500 border-amber-300 ring-2 ring-amber-400/20"
                        : "bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 border-slate-200/80"
                    )}
                  >
                    <Star className={cn("w-4 h-4 transition-transform", starred && "fill-amber-400 text-amber-500 scale-110")} />
                  </button>
                )}

                {/* 3. Copy Card */}
                {copyQuestionToClipboard && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    title={copied ? "Copied to clipboard!" : "Copy Card Content"}
                    aria-label="Copy Card Content"
                    className={cn(
                      "w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs",
                      copied
                        ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-400/20"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200/80"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}

                {/* 4. Ignore / Skip Card */}
                {handleIgnoreQuestion && (
                  <button
                    type="button"
                    onClick={() => {
                      handleIgnoreQuestion()
                      onClose()
                    }}
                    title="Skip / Ignore Card"
                    aria-label="Ignore Card"
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                )}

                {/* Divider between card actions and navigation */}
                <div className="h-4 w-px bg-slate-200 mx-0.5 shrink-0" />

                {/* 5. Deck Settings */}
                {id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/decks/${id}?tab=settings`)
                    }}
                    title="Deck Settings"
                    aria-label="Deck Settings"
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {/* 6. Card Manager */}
                {id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/decks/${id}?tab=cards`)
                    }}
                    title="Card Manager"
                    aria-label="Card Manager"
                    className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                )}

                {/* 7. Quit Session */}
                {setIsQuitModalOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      setIsQuitModalOpen(true)
                    }}
                    title="Quit Session"
                    aria-label="Quit Session"
                    className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Right: Reset/Save defaults & Done */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-1">
                {onResetToCreatorDefaults && (isCustomized || settingOrigin !== 'deck_default') && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleResetToCreator}
                    title="Reset to Deck Default"
                    className="h-9 px-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Reset</span>
                  </button>
                )}

                {onSaveAsCreatorDefaults && isCreator && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSaveAsCreator}
                    title="Save as Official Deck Default"
                    className="h-9 px-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Default</span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 sm:px-5 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              </div>
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

export default PlaySettingsModal
