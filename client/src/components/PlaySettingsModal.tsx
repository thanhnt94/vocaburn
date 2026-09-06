import React, { useState, useEffect, useRef } from 'react'
import { 
  Sliders, 
  SlidersHorizontal,
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { StudyProfile } from '@/store/useSettingsStore'
import {
  SYSTEM_TEMPLATES,
  StudyTemplateSelector,
  StudySettingsEditor,
  type StudySettings,
  type StudyTemplateItem,
} from '@/components/common/study'

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

  // View Mode: Simple Mode (Templates) vs Advanced Mode (Fine-Tuning)
  const [modalViewMode, setModalViewMode] = useState<'simple' | 'advanced'>('simple')
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

  const MODES_LIST = [
    { id: 'fsrs', label: 'FSRS v6', desc: 'Spaced repetition algorithm', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50/80', border: 'border-indigo-200' },
    { id: 'roadmap', label: 'Roadmap', desc: 'Step-by-step daily journey', icon: Route, color: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-200' },
    { id: 'new', label: 'New Cards', desc: 'Cards never studied before', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50/80', border: 'border-amber-200' },
    { id: 'review', label: 'Review', desc: 'Cards due for revision', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/80', border: 'border-rose-200' },
    { id: 'hardest', label: 'Hardest', desc: 'Frequently forgotten cards', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50/80', border: 'border-purple-200' },
    { id: 'flip', label: 'Quick Flip', desc: 'Free-form flashcard flip', icon: RotateCcw, color: 'text-sky-600', bg: 'bg-sky-50/80', border: 'border-sky-200' }
  ]

  const currentSettings: StudySettings = {
    card_flip_trigger: cardFlipTrigger || 'both',
    card_rating_mode: cardRatingMode || 'both',
    quiz_learning_mode: activeMode,
    learning_mode: activeMode,
    front_valign: frontValign || 'center',
    front_halign: frontHalign || 'left',
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

  const handleSettingChange = (key: string, val: any) => {
    switch (key) {
      case 'card_flip_trigger':
        if (setCardFlipTrigger) setCardFlipTrigger(val)
        break
      case 'card_rating_mode':
        if (setCardRatingMode) setCardRatingMode(val)
        break
      case 'front_valign':
        if (setFrontValign) setFrontValign(val)
        break
      case 'front_halign':
        if (setFrontHalign) setFrontHalign(val)
        break
      case 'back_valign':
        if (setBackValign) setBackValign(val)
        break
      case 'back_halign':
        if (setBackHalign) setBackHalign(val)
        break
      case 'autoplay_audio':
        if (setAutoPlayAudio) setAutoPlayAudio(val)
        break
      case 'show_images':
        if (setShowImages) setShowImages(val)
        break
      case 'show_fsrs':
        if (setShowFsrs) setShowFsrs(val)
        break
      case 'sfx_enabled':
        if (setSfxEnabled) setSfxEnabled(val)
        break
      case 'haptic_enabled':
        if (setHapticEnabled) setHapticEnabled(val)
        break
      case 'random_enabled':
        if (setRandomEnabled) setRandomEnabled(val)
        break
      case 'quick_learn_enabled':
        if (setQuickLearnEnabled) setQuickLearnEnabled(val)
        break
      case 'quiz_learning_mode':
      case 'learning_mode':
        if (applyLearningMode) applyLearningMode(val)
        break
    }
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
              {/* ═══════════ VIEW A: SIMPLE MODE (TEMPLATES) ═══════════ */}
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
              ) : (
                /* ═══════════ VIEW B: ADVANCED MODE (DETAILED CONTROLS) ═══════════ */
                <div className="space-y-4">
                  {/* Learning Mode Selection */}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Learning Mode
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

                  {/* Fine-Tuning Controls */}
                  <StudySettingsEditor
                    settings={currentSettings}
                    onChange={handleSettingChange}
                    compact={true}
                    hideQueue={false}
                  />

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

export default PlaySettingsModal
