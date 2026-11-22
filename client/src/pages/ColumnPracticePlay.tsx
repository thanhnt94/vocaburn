import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, 
  ArrowLeftRight, 
  Eye, 
  EyeOff, 
  Shuffle, 
  RotateCcw, 
  Volume2, 
  Search, 
  Check, 
  X, 
  Filter, 
  Layers, 
  Sparkles, 
  Columns3,
  SlidersHorizontal,
  ChevronDown,
  ArrowUp,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { parseBBCodeToHtml } from '@/lib/text'
import { speakWithEdgeTTS, playCorrectSound } from '@/lib/audio'
import { MarkdownComponents } from '@/lib/markdown'
import { SessionLoadingScreen } from '@/components/flashcard'
import { getCardColumnValue } from '@/components/flashcard/Flashcard3DCard'

export type MaskStrategy = 'random' | 'hide_right' | 'hide_left' | 'hide_both'
export type SelfCheckStatus = 'neutral' | 'remembered' | 'forgotten'

export interface ColumnPairConfig {
  id: string
  name: string
  short_name?: string
  col1: string
  col2: string
  icon?: string
  col1_label?: string
  col2_label?: string
}

interface CardItem {
  id: number
  original_index?: number
  front?: string
  content?: string
  explanation?: string
  others?: Record<string, any>
  front_audio_url?: string
  back_audio_url?: string
}

export default function ColumnPracticePlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userSettings } = useAppStore()

  // Data Loading State
  const [isLoading, setIsLoading] = useState(true)
  const [deckTitle, setDeckTitle] = useState('Deck')
  const [rawCards, setRawCards] = useState<CardItem[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [subLessons, setSubLessons] = useState<string[]>([])
  const [subLessonCol, setSubLessonCol] = useState<string>('')

  // Pre-configured Pairs State (Setup sẵn trong option - không bắt người dùng chọn phức tạp)
  const [presetPairs, setPresetPairs] = useState<ColumnPairConfig[]>([])
  const [selectedPairId, setSelectedPairId] = useState<string>('')

  // Active Columns
  const [colLeft, setColLeft] = useState<string>('front')
  const [colRight, setColRight] = useState<string>('back')
  const [colLeftLabel, setColLeftLabel] = useState<string>('Cột 1')
  const [colRightLabel, setColRightLabel] = useState<string>('Cột 2')

  // Mask & Filter State
  const [maskStrategy, setMaskStrategy] = useState<MaskStrategy>('random')
  const [cardLimit, setCardLimit] = useState<number | 'all'>('all')
  const [selectedSubLesson, setSelectedSubLesson] = useState<string>('all')
  const [isShuffled, setIsShuffled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false)

  // Interactive Card State: cardId -> { leftRevealed: boolean, rightRevealed: boolean }
  const [revealedMap, setRevealedMap] = useState<Record<number, { left: boolean; right: boolean }>>({})
  // Self Check State: cardId -> 'neutral' | 'remembered' | 'forgotten'
  const [checkMap, setCheckMap] = useState<Record<number, SelfCheckStatus>>({})

  const listScrollRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Deck Cards & Preset Column Pairs
  useEffect(() => {
    let isMounted = true
    const fetchDeck = async () => {
      try {
        setIsLoading(true)
        const res = await axios.get(`/api/v1/deck/${id}/play-data`)
        if (!isMounted) return
        const data = res.data || {}
        const fetchedCards: CardItem[] = data.cards || data.questions || []
        setRawCards(fetchedCards)

        const title = data.deck?.title || 'Vocabulary Deck'
        setDeckTitle(title)

        // Detect all available columns
        const colsSet = new Set<string>()
        colsSet.add('front')
        colsSet.add('back')

        const customCols: string[] = data.practice_settings?.custom_columns || []
        customCols.forEach(c => {
          if (c && typeof c === 'string' && c.trim()) colsSet.add(c.trim())
        })

        fetchedCards.slice(0, 30).forEach(card => {
          if (card.others && typeof card.others === 'object') {
            Object.keys(card.others).forEach(k => {
              const lower = k.toLowerCase()
              if (!lower.includes('audio') && !lower.includes('img') && !lower.includes('image') && !lower.includes('fsrs')) {
                colsSet.add(k)
              }
            })
          }
        })

        const allCols = Array.from(colsSet)
        setAvailableColumns(allCols)

        // Load or build Pre-configured Pairs (Setup sẵn trong option)
        const loadedPairs: ColumnPairConfig[] = data.practice_settings?.column_pairs || []
        let finalPairs: ColumnPairConfig[] = []

        if (Array.isArray(loadedPairs) && loadedPairs.length > 0) {
          finalPairs = loadedPairs
        } else {
          // Fallback smart presets based on detected columns
          const hasGrammar = allCols.includes('mẫu_ngữ_pháp')
          const hasMeaning = allCols.includes('nghĩa')
          const hasFormation = allCols.includes('cách_kết_hợp')
          const hasExample = allCols.includes('ví_dụ_1') || allCols.includes('ví_dụ')
          const hasRightWrong = allCols.includes('ví_dụ_đúng_sai') || allCols.includes('phân_biệt_đúng_sai')

          if (hasGrammar && hasMeaning) {
            finalPairs.push({
              id: 'pair_grammar_meaning',
              name: 'Mẫu ⇄ Ý nghĩa',
              short_name: 'Mẫu ⇄ Nghĩa',
              col1: 'mẫu_ngữ_pháp',
              col2: 'nghĩa',
              icon: '🎯',
              col1_label: 'Mẫu ngữ pháp',
              col2_label: 'Ý nghĩa'
            })
          }
          if (hasGrammar && hasFormation) {
            finalPairs.push({
              id: 'pair_grammar_formation',
              name: 'Mẫu ⇄ Kết hợp',
              short_name: 'Mẫu ⇄ Kết hợp',
              col1: 'mẫu_ngữ_pháp',
              col2: 'cách_kết_hợp',
              icon: '🧩',
              col1_label: 'Mẫu ngữ pháp',
              col2_label: 'Cách kết hợp'
            })
          }
          if (hasGrammar && hasExample) {
            const exCol = allCols.includes('ví_dụ_1') ? 'ví_dụ_1' : 'ví_dụ'
            finalPairs.push({
              id: 'pair_grammar_example',
              name: 'Mẫu ⇄ Ví dụ',
              short_name: 'Mẫu ⇄ Ví dụ',
              col1: 'mẫu_ngữ_pháp',
              col2: exCol,
              icon: '💡',
              col1_label: 'Mẫu ngữ pháp',
              col2_label: 'Ví dụ'
            })
          }
          if (hasGrammar && hasRightWrong) {
            const rwCol = allCols.includes('ví_dụ_đúng_sai') ? 'ví_dụ_đúng_sai' : 'phân_biệt_đúng_sai'
            finalPairs.push({
              id: 'pair_grammar_rightwrong',
              name: 'Mẫu ⇄ Đúng/Sai',
              short_name: 'Mẫu ⇄ Đúng/Sai',
              col1: 'mẫu_ngữ_pháp',
              col2: rwCol,
              icon: '⚖️',
              col1_label: 'Mẫu ngữ pháp',
              col2_label: 'Ví dụ Đúng vs Sai & Cách sửa'
            })
          }
          if (hasMeaning && hasFormation) {
            finalPairs.push({
              id: 'pair_meaning_formation',
              name: 'Nghĩa ⇄ Kết hợp',
              short_name: 'Nghĩa ⇄ Kết hợp',
              col1: 'nghĩa',
              col2: 'cách_kết_hợp',
              icon: '📖',
              col1_label: 'Ý nghĩa',
              col2_label: 'Cách kết hợp'
            })
          }

          // Default fallback if no grammar columns
          if (finalPairs.length === 0) {
            finalPairs.push({
              id: 'pair_front_back',
              name: 'Mặt trước ⇄ Mặt sau',
              short_name: 'Trước ⇄ Sau',
              col1: allCols.includes('front') ? 'front' : (allCols[0] || 'front'),
              col2: allCols.includes('back') ? 'back' : (allCols[1] || 'back'),
              icon: '📑',
              col1_label: 'Mặt trước',
              col2_label: 'Mặt sau'
            })
          }
        }

        setPresetPairs(finalPairs)

        // Select initial pair
        const defaultPairId = data.practice_settings?.default_column_pair || finalPairs[0]?.id || ''
        const activePair = finalPairs.find(p => p.id === defaultPairId) || finalPairs[0]
        if (activePair) {
          setSelectedPairId(activePair.id)
          setColLeft(activePair.col1)
          setColRight(activePair.col2)
          setColLeftLabel(activePair.col1_label || activePair.col1)
          setColRightLabel(activePair.col2_label || activePair.col2)
        }

        // Sub-lesson detection
        const subCol = data.practice_settings?.sub_lesson_column || 'unit'
        setSubLessonCol(subCol)

        const detectedUnits = new Set<string>()
        fetchedCards.forEach(c => {
          const unitVal = c.others?.[subCol] || (c as any)[subCol]
          if (unitVal && String(unitVal).trim()) {
            detectedUnits.add(String(unitVal).trim())
          }
        })
        setSubLessons(Array.from(detectedUnits))

      } catch (err) {
        console.error('Failed to load deck data for column drill:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    if (id) fetchDeck()
    return () => { isMounted = false }
  }, [id])

  // Helper: Generate mask state
  const generateMaskState = useCallback((cards: CardItem[], strategy: MaskStrategy) => {
    const nextMap: Record<number, { left: boolean; right: boolean }> = {}
    cards.forEach((c, idx) => {
      if (strategy === 'random') {
        // Alternating / random 50-50 per row
        const showLeft = idx % 2 === 0 ? Math.random() > 0.45 : Math.random() <= 0.55
        nextMap[c.id] = { left: showLeft, right: !showLeft }
      } else if (strategy === 'hide_right') {
        nextMap[c.id] = { left: true, right: false }
      } else if (strategy === 'hide_left') {
        nextMap[c.id] = { left: false, right: true }
      } else if (strategy === 'hide_both') {
        nextMap[c.id] = { left: false, right: false }
      }
    })
    return nextMap
  }, [])

  // 2. Select Preset Pair Handler (1-tap setup)
  const handleSelectPair = (pair: ColumnPairConfig) => {
    setSelectedPairId(pair.id)
    setColLeft(pair.col1)
    setColRight(pair.col2)
    setColLeftLabel(pair.col1_label || pair.col1)
    setColRightLabel(pair.col2_label || pair.col2)
    setRevealedMap(generateMaskState(activeCards, maskStrategy))
  }

  // 3. Filter & Prepare Active Card List
  const activeCards = useMemo(() => {
    let list = [...rawCards]

    if (selectedSubLesson !== 'all' && subLessonCol) {
      list = list.filter(c => {
        const val = c.others?.[subLessonCol] || (c as any)[subLessonCol]
        return String(val).trim() === selectedSubLesson
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(c => {
        const leftVal = getCardColumnValue(c, colLeft).toLowerCase()
        const rightVal = getCardColumnValue(c, colRight).toLowerCase()
        return leftVal.includes(q) || rightVal.includes(q)
      })
    }

    if (isShuffled) {
      list = [...list].sort(() => Math.sin(list.length) - 0.5)
    }

    if (typeof cardLimit === 'number' && cardLimit > 0) {
      list = list.slice(0, cardLimit)
    }

    return list
  }, [rawCards, selectedSubLesson, subLessonCol, searchQuery, isShuffled, cardLimit, colLeft, colRight])

  // Initialize masks on cards change
  useEffect(() => {
    if (activeCards.length > 0) {
      setRevealedMap(prev => {
        const isFresh = Object.keys(prev).length === 0
        if (isFresh) {
          return generateMaskState(activeCards, maskStrategy)
        }
        return prev
      })
    }
  }, [activeCards, maskStrategy, generateMaskState])

  const handleResetMasks = (strategy = maskStrategy) => {
    setRevealedMap(generateMaskState(activeCards, strategy))
  }

  // Toggle single cell
  const handleToggleCell = (cardId: number, side: 'left' | 'right') => {
    setRevealedMap(prev => {
      const current = prev[cardId] || { left: true, right: true }
      const nextVal = !current[side]
      if (nextVal && userSettings?.sfx_enabled) {
        playCorrectSound()
      }
      return {
        ...prev,
        [cardId]: {
          ...current,
          [side]: nextVal
        }
      }
    })
  }

  // Swap Column 1 & Column 2
  const handleSwapColumns = () => {
    setColLeft(colRight)
    setColRight(colLeft)
    const oldLeftLabel = colLeftLabel
    setColLeftLabel(colRightLabel)
    setColRightLabel(oldLeftLabel)

    setRevealedMap(prev => {
      const next: Record<number, { left: boolean; right: boolean }> = {}
      Object.entries(prev).forEach(([cardId, val]) => {
        next[Number(cardId)] = { left: val.right, right: val.left }
      })
      return next
    })
  }

  // Reveal All / Hide All
  const handleRevealAll = () => {
    const nextMap: Record<number, { left: boolean; right: boolean }> = {}
    activeCards.forEach(c => {
      nextMap[c.id] = { left: true, right: true }
    })
    setRevealedMap(nextMap)
  }

  const handleMaskAll = () => {
    handleResetMasks(maskStrategy)
  }

  // Self check cycle
  const handleCycleCheck = (cardId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCheckMap(prev => {
      const cur = prev[cardId] || 'neutral'
      const next: SelfCheckStatus = cur === 'neutral' ? 'remembered' : (cur === 'remembered' ? 'forgotten' : 'neutral')
      return { ...prev, [cardId]: next }
    })
  }

  // Pronunciation Audio
  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!text) return
    const plain = text.replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '').trim()
    speakWithEdgeTTS(plain, 'ja-JP', 1.0)
  }

  // Computed Stats
  const stats = useMemo(() => {
    let revealedCount = 0
    let rememberedCount = 0
    let forgottenCount = 0

    activeCards.forEach(c => {
      const mask = revealedMap[c.id]
      if (mask?.left && mask?.right) revealedCount++
      const chk = checkMap[c.id]
      if (chk === 'remembered') rememberedCount++
      if (chk === 'forgotten') forgottenCount++
    })

    return {
      total: activeCards.length,
      revealed: revealedCount,
      remembered: rememberedCount,
      forgotten: forgottenCount,
      percent: activeCards.length > 0 ? Math.round((revealedCount / activeCards.length) * 100) : 0
    }
  }, [activeCards, revealedMap, checkMap])

  if (isLoading) {
    return <SessionLoadingScreen />
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none font-sans">
      
      {/* ═══════════ TOP HEADER (COMPACT & MOBILE-FIRST) ═══════════ */}
      <header className="shrink-0 h-13 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-2.5 md:px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate(`/decks/${id}`)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Quay lại bộ thẻ"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs md:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[150px] xs:max-w-[200px] md:max-w-xs">
                {deckTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Columns3 className="w-2.5 h-2.5" />
                2-Col Drill
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Đã mở {stats.revealed}/{stats.total} ({stats.percent}%)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsShuffled(prev => !prev)
              handleResetMasks()
            }}
            className={cn(
              "h-7.5 px-2 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all active:scale-95",
              isShuffled 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            )}
            title="Xáo trộn danh sách thẻ"
          >
            <Shuffle className="w-3 h-3" />
            <span className="hidden sm:inline">Xáo trộn</span>
          </button>

          <button
            onClick={stats.revealed === stats.total ? handleMaskAll : handleRevealAll}
            className="h-7.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 shrink-0"
          >
            {stats.revealed === stats.total ? (
              <>
                <EyeOff className="w-3 h-3" />
                <span className="hidden xs:inline">Ẩn lại</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span className="hidden xs:inline">Mở hết</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ═══════════ PRE-CONFIGURED PAIR SELECTOR (THUMB-REACHABLE CAROUSEL) ═══════════ */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 md:px-5 py-2 shadow-2xs z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1 hidden xs:inline">
            Cặp:
          </span>
          {presetPairs.map(p => {
            const isSelected = p.id === selectedPairId
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPair(p)}
                className={cn(
                  "h-7.5 px-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all active:scale-95",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs font-black"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                )}
              >
                <span>{p.icon || '📑'}</span>
                <span>{p.short_name || p.name}</span>
              </button>
            )
          })}

          <button
            onClick={handleSwapColumns}
            className="h-7.5 px-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0 ml-auto transition-colors active:scale-95"
            title="Đảo chiều 2 cột"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span className="text-[10px] font-bold hidden sm:inline">Đảo cột</span>
          </button>
        </div>

        {/* ═══════════ MASKING MODE PILLS (MOBILE-OPTIMIZED) ═══════════ */}
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'random', label: '🎲 Ngẫu nhiên' },
              { id: 'hide_right', label: '👉 Ẩn phải' },
              { id: 'hide_left', label: '👈 Ẩn trái' },
              { id: 'hide_both', label: '🙈 Ẩn cả 2' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  const val = m.id as MaskStrategy
                  setMaskStrategy(val)
                  handleResetMasks(val)
                }}
                className={cn(
                  "h-6 px-2 rounded-md text-[11px] font-bold whitespace-nowrap transition-all",
                  maskStrategy === m.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Card Limit Pill */}
          <div className="flex items-center gap-1 shrink-0">
            <select
              value={cardLimit}
              onChange={(e) => setCardLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="h-6 px-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-hidden"
            >
              <option value="all">Tất cả ({rawCards.length})</option>
              <option value={10}>10 thẻ</option>
              <option value={20}>20 thẻ</option>
              <option value={50}>50 thẻ</option>
              <option value={100}>100 thẻ</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════ TABLE HEADER ROW ═══════════ */}
      <div className="shrink-0 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-2.5 md:px-5 py-1.5 flex items-center gap-1.5 max-w-4xl mx-auto w-full z-10 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <div className="w-6 text-center shrink-0">#</div>
        <div className="flex-1 truncate flex items-center gap-1">
          <span className="truncate">{colLeftLabel}</span>
        </div>
        <div className="w-4 text-center shrink-0 text-slate-300 dark:text-slate-600">⇄</div>
        <div className="flex-1 truncate flex items-center gap-1">
          <span className="truncate">{colRightLabel}</span>
        </div>
        <div className="w-8 text-center shrink-0">Nhớ</div>
      </div>

      {/* ═══════════ SCROLLABLE CARDS CONTAINER (MOBILE-OPTIMIZED) ═══════════ */}
      <div 
        ref={listScrollRef}
        className="flex-1 overflow-y-auto px-2 md:px-5 py-2 space-y-1.5 pb-24 custom-scrollbar"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain'
        }}
      >
        <div className="max-w-4xl mx-auto space-y-1.5">
          {activeCards.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex flex-col items-center gap-2 mt-6">
              <HelpCircle className="w-8 h-8 text-slate-400" />
              <span>Không có thẻ nào phù hợp.</span>
            </div>
          ) : (
            activeCards.map((card, idx) => {
              const leftVal = getCardColumnValue(card, colLeft)
              const rightVal = getCardColumnValue(card, colRight)
              const maskState = revealedMap[card.id] || { left: true, right: true }
              const isLeftRevealed = Boolean(maskState.left)
              const isRightRevealed = Boolean(maskState.right)
              const checkState = checkMap[card.id] || 'neutral'

              return (
                <div
                  key={card.id}
                  className={cn(
                    "flex items-stretch gap-1 md:gap-2 p-1.5 md:p-2 rounded-xl border bg-white dark:bg-slate-900 transition-all shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700",
                    checkState === 'remembered' && "border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20",
                    checkState === 'forgotten' && "border-rose-200/90 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20"
                  )}
                >
                  {/* Index */}
                  <div className="w-6 shrink-0 flex items-center justify-center text-[10px] font-black text-slate-400 dark:text-slate-500 select-none">
                    {idx + 1}
                  </div>

                  {/* LEFT CELL */}
                  <div
                    onClick={() => handleToggleCell(card.id, 'left')}
                    className={cn(
                      "flex-1 min-w-0 p-2 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[48px]",
                      isLeftRevealed 
                        ? "bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-slate-100" 
                        : "bg-slate-100/90 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500"
                    )}
                  >
                    {isLeftRevealed ? (
                      <div className="text-[12px] md:text-sm font-semibold leading-relaxed break-words markdown-content select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                          {parseBBCodeToHtml(leftVal || '—')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 py-1 text-slate-400 dark:text-slate-500 text-[11px] font-bold select-none">
                        <Eye className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                        <span>Chạm mở</span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT CELL */}
                  <div
                    onClick={() => handleToggleCell(card.id, 'right')}
                    className={cn(
                      "flex-1 min-w-0 p-2 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[48px]",
                      isRightRevealed 
                        ? "bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-slate-100" 
                        : "bg-slate-100/90 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500"
                    )}
                  >
                    {isRightRevealed ? (
                      <div className="text-[12px] md:text-sm font-semibold leading-relaxed break-words markdown-content select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                          {parseBBCodeToHtml(rightVal || '—')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 py-1 text-slate-400 dark:text-slate-500 text-[11px] font-bold select-none">
                        <Eye className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                        <span>Chạm mở</span>
                      </div>
                    )}
                  </div>

                  {/* SELF-CHECK BUTTON (MOBILE THUMB-SIZED) */}
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    <button
                      onClick={(e) => handleCycleCheck(card.id, e)}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90",
                        checkState === 'remembered' && "bg-emerald-500 text-white shadow-xs",
                        checkState === 'forgotten' && "bg-rose-500 text-white shadow-xs",
                        checkState === 'neutral' && "border border-slate-200 dark:border-slate-700 text-slate-300 hover:text-slate-400 dark:text-slate-600"
                      )}
                      title={
                        checkState === 'remembered' ? 'Đã nhớ' : (checkState === 'forgotten' ? 'Chưa nhớ' : 'Chưa đánh giá')
                      }
                    >
                      {checkState === 'remembered' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      {checkState === 'forgotten' && <X className="w-3.5 h-3.5 stroke-[3]" />}
                      {checkState === 'neutral' && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══════════ DOCKED BOTTOM BAR (MOBILE THUMB CONTROLS) ═══════════ */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 md:px-5 py-2 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Stats Summary */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              Đã mở: <strong className="text-indigo-600 dark:text-indigo-400">{stats.revealed}</strong>/{stats.total}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              ✓ {stats.remembered}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-rose-600 dark:text-rose-400">
              ✕ {stats.forgotten}
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleResetMasks(maskStrategy)}
              className="h-7.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors active:scale-95"
              title="Khôi phục trạng thái che ban đầu"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Ẩn lại</span>
            </button>

            <button
              onClick={() => {
                listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="w-7.5 h-7.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors active:scale-95"
              title="Cuộn lên đầu trang"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
