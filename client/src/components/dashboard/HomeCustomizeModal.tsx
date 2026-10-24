import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  X, 
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
  CheckCircle2,
  CheckSquare,
  Square,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface HomeCustomizeModalProps {
  isOpen: boolean
  onClose: () => void
  activeDecks: any[]
  roadmapDecks?: any[]
}

export function HomeCustomizeModal({
  isOpen,
  onClose,
  activeDecks,
  roadmapDecks = []
}: HomeCustomizeModalProps) {
  const { userSettings, updateUserSettings } = useAppStore()

  const [activeTab, setActiveTab] = useState<'decks' | 'display'>('decks')
  const [defaultHomeView, setDefaultHomeView] = useState<'spotlight' | 'grid'>((userSettings.home_view_mode || 'spotlight') as any)
  const [studyMode, setStudyMode] = useState<string>(userSettings.quiz_learning_mode || 'fsrs')
  const [practiceMode, setPracticeMode] = useState<string>(userSettings.practice_submode || 'mcq')
  const [orderedLearningDecks, setOrderedLearningDecks] = useState<any[]>([])
  const [selectedLearningIds, setSelectedLearningIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Merge all unique decks
  const allDecks = React.useMemo(() => {
    const list: any[] = []
    const seen = new Set<string>()

    const addDeck = (d: any) => {
      const id = String(d.deck_id ?? d.id ?? '')
      if (id && !seen.has(id)) {
        seen.add(id)
        list.push(d)
      }
    }

    ;(roadmapDecks || []).forEach(addDeck)
    ;(activeDecks || []).forEach(addDeck)
    return list
  }, [activeDecks, roadmapDecks])

  // Initialize state from userSettings and passed decks
  useEffect(() => {
    if (isOpen) {
      setDefaultHomeView((userSettings.home_view_mode || 'spotlight') as any)
      setStudyMode(userSettings.quiz_learning_mode || 'fsrs')
      setPracticeMode(userSettings.practice_submode || 'mcq')

      const lnOrder = (userSettings.learning_deck_order || userSettings.roadmap_deck_order || []).map((x: any) => String(x))
      const hasPriorSelection = Array.isArray(lnOrder) && lnOrder.length > 0
      
      const initialSelected = new Set(
        hasPriorSelection
          ? lnOrder
          : allDecks.map(d => String(d.deck_id ?? d.id ?? ''))
      )
      setSelectedLearningIds(initialSelected)

      const sortedLn = [...allDecks].sort((a, b) => {
        const idA = String(a.deck_id ?? a.id ?? '')
        const idB = String(b.deck_id ?? b.id ?? '')
        const isSelA = initialSelected.has(idA)
        const isSelB = initialSelected.has(idB)
        if (isSelA && !isSelB) return -1
        if (!isSelA && isSelB) return 1
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
  }, [isOpen, userSettings, allDecks])

  // Partitioned decks
  const pinnedLearningDecks = orderedLearningDecks.filter(d => selectedLearningIds.has(String(d.deck_id ?? d.id)))
  const unpinnedLearningDecks = orderedLearningDecks.filter(d => !selectedLearningIds.has(String(d.deck_id ?? d.id)))

  const toggleLearningDeck = (deckId: string | number) => {
    const idStr = String(deckId)
    setSelectedLearningIds(prev => {
      const next = new Set(prev)
      if (next.has(idStr)) {
        next.delete(idStr)
      } else {
        next.add(idStr)
      }
      return next
    })
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(8)
    }
  }

  const selectAllLearningDecks = () => {
    const allIds = allDecks.map(d => String(d.deck_id ?? d.id))
    setSelectedLearningIds(new Set(allIds))
  }

  const clearAllLearningDecks = () => {
    setSelectedLearningIds(new Set())
  }

  const selectTop4LearningDecks = () => {
    const top4 = allDecks.slice(0, 4).map(d => String(d.deck_id ?? d.id))
    setSelectedLearningIds(new Set(top4))
  }

  const moveLearningDeck = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= pinnedLearningDecks.length) return
    const nextPinned = [...pinnedLearningDecks]
    const temp = nextPinned[index]
    nextPinned[index] = nextPinned[targetIdx]
    nextPinned[targetIdx] = temp
    setOrderedLearningDecks([...nextPinned, ...unpinnedLearningDecks])
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(6)
    }
  }

  const handleReorderPinned = (newPinned: any[]) => {
    setOrderedLearningDecks([...newPinned, ...unpinnedLearningDecks])
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const learningIds = orderedLearningDecks
        .filter(d => selectedLearningIds.has(String(d.deck_id ?? d.id)))
        .map(d => d.deck_id ?? d.id)
        .filter(id => id !== null && id !== undefined)

      await updateUserSettings({
        home_active_tab: 'learning',
        home_view_mode: defaultHomeView,
        quiz_learning_mode: studyMode as any,
        practice_submode: practiceMode,
        learning_deck_order: learningIds,
        roadmap_deck_order: learningIds
      })

      setSaveSuccess(true)
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate([15, 30, 15])
      }
      setTimeout(() => {
        onClose()
      }, 400)
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
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative z-10 border border-slate-200/90 flex flex-col max-h-[88vh] overflow-hidden text-left"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                    Manage Home Decks
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    Toggle and reorder decks displayed on Home
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Navigation Tabs (2 Tabs: Manage Decks vs Display Layout) */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('decks')}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-lg text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer border select-none",
                    activeTab === 'decks'
                      ? "bg-white text-orange-600 shadow-xs border-slate-200/80"
                      : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Decks ({pinnedLearningDecks.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('display')}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-lg text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer border select-none",
                    activeTab === 'display'
                      ? "bg-white text-orange-600 shadow-xs border-slate-200/80"
                      : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Display & Modes</span>
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
              {/* ══════════════ TAB 1: MANAGE DECKS (BẬT/TẮT & SẮP XẾP) ══════════════ */}
              {activeTab === 'decks' && (
                <div className="space-y-4">
                  {/* Top Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        <span>Active on Home ({pinnedLearningDecks.length} of {allDecks.length})</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Decks turned ON will appear on your Home dashboard
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={selectAllLearningDecks}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-black hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={selectTop4LearningDecks}
                        className="px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-black hover:bg-orange-100 transition-all cursor-pointer shadow-2xs"
                      >
                        Top 4
                      </button>
                      <button
                        type="button"
                        onClick={clearAllLearningDecks}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-rose-600 text-[10px] font-black hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Active on Home (Reorderable) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Active on Home (Drag or use arrows to order)
                      </span>
                      <span className="text-[10px] font-extrabold text-orange-600">
                        {pinnedLearningDecks.length} Active
                      </span>
                    </div>

                    {pinnedLearningDecks.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                        No decks enabled on Home yet. Tap below to turn on decks.
                      </div>
                    ) : (
                      <Reorder.Group
                        axis="y"
                        values={pinnedLearningDecks}
                        onReorder={handleReorderPinned}
                        className="space-y-2"
                      >
                        {pinnedLearningDecks.map((deck, idx) => {
                          const id = deck.deck_id || deck.id
                          const idStr = String(id)
                          const totalCards = deck.total_cards || deck.status?.total_cards || deck.questions_count || 0
                          const learnedCards = deck.learned_cards || deck.status?.learned_cards || 0
                          const streak = deck.streak || deck.status?.streak || 0

                          return (
                            <Reorder.Item
                              key={idStr}
                              value={deck}
                              className="bg-white border border-orange-200/90 rounded-2xl p-2.5 shadow-2xs flex items-center gap-2.5 touch-none hover:border-orange-300 transition-colors"
                            >
                              {/* Drag Handle */}
                              <div className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Toggle Checkbox (Tap to turn OFF) */}
                              <button
                                type="button"
                                onClick={() => toggleLearningDeck(id)}
                                className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-90 transition-transform"
                                title="Turn OFF (hide from Home)"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

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
                                  <span>{learnedCards}/{totalCards} cards</span>
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
                                  disabled={idx === pinnedLearningDecks.length - 1}
                                  className={cn(
                                    "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                    idx === pinnedLearningDecks.length - 1
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

                  {/* Section 2: Available / Hidden Decks */}
                  {unpinnedLearningDecks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Hidden Decks (Tap to add to Home)
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400">
                          {unpinnedLearningDecks.length} Available
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {unpinnedLearningDecks.map(deck => {
                          const id = deck.deck_id || deck.id
                          const totalCards = deck.total_cards || deck.status?.total_cards || deck.questions_count || 0

                          return (
                            <div
                              key={String(id)}
                              onClick={() => toggleLearningDeck(id)}
                              className="bg-slate-50/70 hover:bg-orange-50/50 border border-slate-200/80 hover:border-orange-300 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg border-2 border-slate-300 group-hover:border-orange-500 flex items-center justify-center shrink-0 transition-colors">
                                  <Plus className="w-3 h-3 text-slate-400 group-hover:text-orange-600 transition-colors" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-700 group-hover:text-slate-900 truncate">
                                    {deck.title}
                                  </h4>
                                  <p className="text-[10px] text-slate-400">
                                    {totalCards} words
                                  </p>
                                </div>
                              </div>

                              <span className="text-[10px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                + Add
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════ TAB 2: DISPLAY LAYOUT PREFERENCES ══════════════ */}
              {activeTab === 'display' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                      Default Home View (Chế độ xem mặc định trên Trang chủ)
                    </label>
                    <div className="space-y-2.5">
                      {/* 1. Spotlight View */}
                      <div
                        onClick={() => setDefaultHomeView('spotlight')}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          defaultHomeView === 'spotlight'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100/70 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 text-lg">
                            🎠
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">
                              Spotlight View (Recommended)
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500">
                              Thẻ học tập trung dạng Hero Mascot, hỗ trợ vuốt chuyển bài đa chiều và các phím tắt học nhanh
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                          defaultHomeView === 'spotlight' ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                        )}>
                          {defaultHomeView === 'spotlight' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* 2. Grid Cards View */}
                      <div
                        onClick={() => setDefaultHomeView('grid')}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          defaultHomeView === 'grid'
                            ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 text-lg">
                            📑
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">
                              Grid Cards View
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500">
                              Danh sách các bộ thẻ đang học kèm tiến độ chi tiết và bảng điều khiển Bắt đầu học ngay
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                          defaultHomeView === 'grid' ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                        )}>
                          {defaultHomeView === 'grid' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Default Study Mode Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Default Study Action (Nút Study)
                      </label>
                      <span className="text-[9.5px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        Chế độ học mặc định
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          mode: 'fsrs',
                          icon: '🧠',
                          title: 'FSRS v6 Spaced Repetition (Recommended)',
                          desc: 'Lặp lại ngắt quãng thích ứng với 4 nút đánh giá (Again, Hard, Good, Easy)'
                        },
                        {
                          mode: 'skim',
                          icon: '⚡',
                          title: 'Speed Skim',
                          desc: 'Quét thẻ nhanh 1 chạm / phím Space không áp lực chấm điểm (+3 XP)'
                        },
                        {
                          mode: 'autoplay',
                          icon: '🎧',
                          title: 'AutoPlay',
                          desc: 'Tự động phát âm và lật thẻ rảnh tay theo nhịp độ'
                        }
                      ].map(item => (
                        <div
                          key={item.mode}
                          onClick={() => setStudyMode(item.mode)}
                          className={cn(
                            "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                            studyMode === item.mode
                              ? "bg-orange-50/60 border-orange-400 ring-2 ring-orange-200/60"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-orange-100/70 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 text-base">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {item.title}
                              </h4>
                              <p className="text-[10px] font-medium text-slate-500 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                            studyMode === item.mode ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                          )}>
                            {studyMode === item.mode && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Default Practice Mode Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Default Practice Action (Nút Practice)
                      </label>
                      <span className="text-[9.5px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        Dạng bài tập mặc định
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          mode: 'mcq',
                          icon: '🎯',
                          title: 'Multiple Choice (MCQ Quiz) (Recommended)',
                          desc: 'Luyện phản xạ nhanh với trắc nghiệm 4 đáp án'
                        },
                        {
                          mode: 'typing',
                          icon: '⌨️',
                          title: 'Vocabulary Typing',
                          desc: 'Gõ từ vựng kiểm tra trí nhớ chính tả chuyên sâu'
                        },
                        {
                          mode: 'listening',
                          icon: '🔊',
                          title: 'Listening Test',
                          desc: 'Nghe phát âm bản xứ và chọn đáp án chính xác'
                        }
                      ].map(item => (
                        <div
                          key={item.mode}
                          onClick={() => setPracticeMode(item.mode)}
                          className={cn(
                            "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                            practiceMode === item.mode
                              ? "bg-teal-50/60 border-teal-400 ring-2 ring-teal-200/60"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 text-base">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {item.title}
                              </h4>
                              <p className="text-[10px] font-medium text-slate-500 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                            practiceMode === item.mode ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300"
                          )}>
                            {practiceMode === item.mode && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                {pinnedLearningDecks.length} active on Home
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
