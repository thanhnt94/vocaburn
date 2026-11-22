import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ChevronLeft, 
  ArrowLeftRight, 
  Eye, 
  EyeOff, 
  Shuffle, 
  RotateCcw, 
  Volume2, 
  SlidersHorizontal, 
  Search, 
  Check, 
  X, 
  Filter, 
  Layers, 
  Sparkles, 
  BookOpen, 
  Columns3,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ArrowUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { parseBBCodeToHtml } from '@/lib/text'
import { speakWithEdgeTTS, speakMultiLanguage, playCorrectSound } from '@/lib/audio'
import { MarkdownComponents } from '@/lib/markdown'
import { SessionLoadingScreen } from '@/components/flashcard'
import { getCardColumnValue } from '@/components/flashcard/Flashcard3DCard'

export type MaskStrategy = 'random' | 'hide_right' | 'hide_left' | 'hide_both'
export type SelfCheckStatus = 'neutral' | 'remembered' | 'forgotten'

interface CardItem {
  id: number
  original_index?: number
  content: string
  explanation: string
  others?: Record<string, any>
  front_audio_url?: string
  back_audio_url?: string
}

export default function ColumnPracticePlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userSettings } = useAppStore()

  // Data Loading State
  const [isLoading, setIsLoading] = useState(true)
  const [deckTitle, setDeckTitle] = useState('Deck')
  const [rawCards, setRawCards] = useState<CardItem[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [subLessons, setSubLessons] = useState<string[]>([])
  const [subLessonCol, setSubLessonCol] = useState<string>('')

  // User Filter & Setup State
  const [colLeft, setColLeft] = useState<string>('front')
  const [colRight, setColRight] = useState<string>('back')
  const [maskStrategy, setMaskStrategy] = useState<MaskStrategy>('random')
  const [cardLimit, setCardLimit] = useState<number | 'all'>('all')
  const [selectedSubLesson, setSelectedSubLesson] = useState<string>('all')
  const [isShuffled, setIsShuffled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Interactive Card State: cardId -> { leftRevealed: boolean, rightRevealed: boolean }
  const [revealedMap, setRevealedMap] = useState<Record<number, { left: boolean; right: boolean }>>({})
  // Self Check State: cardId -> 'neutral' | 'remembered' | 'forgotten'
  const [checkMap, setCheckMap] = useState<Record<number, SelfCheckStatus>>({})

  const listScrollRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Deck Cards & Available Columns
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

        // Detect Columns
        const colsSet = new Set<string>()
        colsSet.add('front')
        colsSet.add('back')

        // Add from practice_settings.custom_columns
        const customCols: string[] = data.practice_settings?.custom_columns || []
        customCols.forEach(c => {
          if (c && typeof c === 'string' && c.trim()) colsSet.add(c.trim())
        })

        // Add from cards[].others
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

        // Set default columns
        if (allCols.includes('front')) setColLeft('front')
        else if (allCols.length > 0) setColLeft(allCols[0])

        if (allCols.includes('back')) setColRight('back')
        else if (allCols.length > 1) setColRight(allCols[1])

        // Detect Sub-lesson column
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

  // Helper: Generate initial revealed state for a list of cards based on maskStrategy
  const generateMaskState = useCallback((cards: CardItem[], strategy: MaskStrategy) => {
    const nextMap: Record<number, { left: boolean; right: boolean }> = {}
    cards.forEach((c, idx) => {
      if (strategy === 'random') {
        // Randomly hide one side (50% left revealed, 50% right revealed)
        const showLeft = idx % 2 === 0 ? Math.random() > 0.5 : Math.random() <= 0.5
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

  // 2. Filter & Prepare Active Card List
  const activeCards = useMemo(() => {
    let list = [...rawCards]

    // Filter by Sub-lesson
    if (selectedSubLesson !== 'all' && subLessonCol) {
      list = list.filter(c => {
        const val = c.others?.[subLessonCol] || (c as any)[subLessonCol]
        return String(val).trim() === selectedSubLesson
      })
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(c => {
        const leftVal = getCardColumnValue(c, colLeft).toLowerCase()
        const rightVal = getCardColumnValue(c, colRight).toLowerCase()
        return leftVal.includes(q) || rightVal.includes(q)
      })
    }

    // Shuffle if enabled
    if (isShuffled) {
      // Deterministic sort or Fisher-Yates
      list = [...list].sort(() => Math.sin(list.length) - 0.5)
    }

    // Limit cards count
    if (typeof cardLimit === 'number' && cardLimit > 0) {
      list = list.slice(0, cardLimit)
    }

    return list
  }, [rawCards, selectedSubLesson, subLessonCol, searchQuery, isShuffled, cardLimit, colLeft, colRight])

  // 3. Initialize or Reset Masks when cards or strategy changes
  useEffect(() => {
    if (activeCards.length > 0) {
      setRevealedMap(prev => {
        // Only generate for cards not already mapped
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
    // Swap revealed flags so revealed state stays with respective columns
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
      {/* ═══════════ TOP HEADER ═══════════ */}
      <header className="shrink-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 md:px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(`/decks/${id}`)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Quay lại bộ thẻ"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm md:text-base text-slate-900 dark:text-slate-100 truncate max-w-[180px] md:max-w-xs">
                {deckTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Columns3 className="w-3 h-3" />
                2-Col Drill
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Đã mở {stats.revealed}/{stats.total} thẻ ({stats.percent}%)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={() => {
              setIsShuffled(prev => !prev)
              handleResetMasks()
            }}
            className={cn(
              "h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all",
              isShuffled 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            )}
            title="Xáo trộn danh sách thẻ"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xáo trộn</span>
          </button>

          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={cn(
              "h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all",
              showFilters
                ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            )}
            title="Tùy chọn cột và bộ lọc"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tùy chỉnh</span>
          </button>

          <button
            onClick={stats.revealed === stats.total ? handleMaskAll : handleRevealAll}
            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
          >
            {stats.revealed === stats.total ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Ẩn lại</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Mở hết</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ═══════════ FILTER & SETUP TOOLBAR (COLLAPSIBLE / STICKY) ═══════════ */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-5 py-3 overflow-hidden shadow-xs z-20"
          >
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {/* Row 1: Column Selectors & Swap */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[130px] flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cột 1 (Trái)</label>
                  <select
                    value={colLeft}
                    onChange={(e) => {
                      setColLeft(e.target.value)
                      handleResetMasks()
                    }}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                  >
                    {availableColumns.map(col => (
                      <option key={`left-${col}`} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSwapColumns}
                  className="w-8 h-8 rounded-lg mt-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                  title="Đảo 2 cột"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-[130px] flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cột 2 (Phải)</label>
                  <select
                    value={colRight}
                    onChange={(e) => {
                      setColRight(e.target.value)
                      handleResetMasks()
                    }}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                  >
                    {availableColumns.map(col => (
                      <option key={`right-${col}`} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Mask Strategy */}
                <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chế độ che</label>
                  <select
                    value={maskStrategy}
                    onChange={(e) => {
                      const val = e.target.value as MaskStrategy
                      setMaskStrategy(val)
                      handleResetMasks(val)
                    }}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                  >
                    <option value="random">🎲 Ẩn ngẫu nhiên</option>
                    <option value="hide_right">👉 Chỉ ẩn cột 2</option>
                    <option value="hide_left">👈 Chỉ ẩn cột 1</option>
                    <option value="hide_both">🙈 Ẩn cả 2 cột</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Sub-lesson, Limit & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                {subLessons.length > 0 && (
                  <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bài học (Unit)</label>
                    <select
                      value={selectedSubLesson}
                      onChange={(e) => setSelectedSubLesson(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                    >
                      <option value="all">Toàn bộ ({subLessons.length} units)</option>
                      {subLessons.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="w-28 flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Số lượng</label>
                  <select
                    value={cardLimit}
                    onChange={(e) => setCardLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-hidden"
                  >
                    <option value="all">Tất cả ({rawCards.length})</option>
                    <option value={10}>10 thẻ</option>
                    <option value={20}>20 thẻ</option>
                    <option value={30}>30 thẻ</option>
                    <option value={50}>50 thẻ</option>
                    <option value={100}>100 thẻ</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[150px] flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tìm kiếm nhanh</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Lọc từ, nghĩa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ TABLE HEADER ROW ═══════════ */}
      <div className="shrink-0 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-3 md:px-5 py-2 flex items-center gap-2 max-w-4xl mx-auto w-full z-10 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <div className="w-7 text-center shrink-0">#</div>
        <div className="flex-1 truncate flex items-center gap-1">
          <span>{colLeft}</span>
          <span className="text-[9px] font-normal lowercase opacity-70">({activeCards.length})</span>
        </div>
        <div className="w-5 text-center shrink-0">⇄</div>
        <div className="flex-1 truncate flex items-center gap-1">
          <span>{colRight}</span>
          <span className="text-[9px] font-normal lowercase opacity-70">({activeCards.length})</span>
        </div>
        <div className="w-10 text-center shrink-0">Nhớ?</div>
      </div>

      {/* ═══════════ SCROLLABLE CARDS CONTAINER ═══════════ */}
      <div 
        ref={listScrollRef}
        className="flex-1 overflow-y-auto px-2 md:px-5 py-2.5 space-y-2 pb-24 custom-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-4xl mx-auto space-y-2">
          {activeCards.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-sm flex flex-col items-center gap-2 mt-6">
              <HelpCircle className="w-8 h-8 text-slate-400" />
              <span>Không tìm thấy thẻ nào phù hợp với bộ lọc hiện tại.</span>
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
                    "flex items-stretch gap-1.5 md:gap-2.5 p-2 rounded-xl border bg-white dark:bg-slate-900 transition-all shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700",
                    checkState === 'remembered' && "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20",
                    checkState === 'forgotten' && "border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20"
                  )}
                >
                  {/* Index Pill */}
                  <div className="w-7 shrink-0 flex items-center justify-center text-[10px] font-black text-slate-400 dark:text-slate-500 select-none">
                    {idx + 1}
                  </div>

                  {/* LEFT CELL */}
                  <div
                    onClick={() => handleToggleCell(card.id, 'left')}
                    className={cn(
                      "flex-1 min-w-0 p-2.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center",
                      isLeftRevealed 
                        ? "bg-slate-50/70 dark:bg-slate-800/70 border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                        : "bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500"
                    )}
                  >
                    {isLeftRevealed ? (
                      <div className="text-xs md:text-sm font-semibold leading-relaxed break-words markdown-content select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                          {parseBBCodeToHtml(leftVal || '—')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 py-2 text-slate-400 dark:text-slate-500 text-xs font-bold select-none">
                        <Eye className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                        <span>Chạm để mở</span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT CELL */}
                  <div
                    onClick={() => handleToggleCell(card.id, 'right')}
                    className={cn(
                      "flex-1 min-w-0 p-2.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center",
                      isRightRevealed 
                        ? "bg-slate-50/70 dark:bg-slate-800/70 border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                        : "bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500"
                    )}
                  >
                    {isRightRevealed ? (
                      <div className="text-xs md:text-sm font-semibold leading-relaxed break-words markdown-content select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                          {parseBBCodeToHtml(rightVal || '—')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 py-2 text-slate-400 dark:text-slate-500 text-xs font-bold select-none">
                        <Eye className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                        <span>Chạm để mở</span>
                      </div>
                    )}
                  </div>

                  {/* SELF-CHECK BUTTON */}
                  <div className="w-10 shrink-0 flex items-center justify-center">
                    <button
                      onClick={(e) => handleCycleCheck(card.id, e)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        checkState === 'remembered' && "bg-emerald-500 text-white shadow-xs",
                        checkState === 'forgotten' && "bg-rose-500 text-white shadow-xs",
                        checkState === 'neutral' && "border border-slate-200 dark:border-slate-700 text-slate-300 hover:text-slate-400 dark:text-slate-600 hover:border-slate-300"
                      )}
                      title={
                        checkState === 'remembered' ? 'Đã nhớ (Bấm để đổi)' : (checkState === 'forgotten' ? 'Chưa nhớ (Bấm để đổi)' : 'Chưa đánh giá')
                      }
                    >
                      {checkState === 'remembered' && <Check className="w-4 h-4 stroke-[3]" />}
                      {checkState === 'forgotten' && <X className="w-4 h-4 stroke-[3]" />}
                      {checkState === 'neutral' && <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══════════ DOCKED BOTTOM BAR ═══════════ */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 md:px-5 py-2.5 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs font-bold">
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
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              title="Khôi phục trạng thái che ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ẩn lại</span>
            </button>

            <button
              onClick={() => {
                listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
              title="Cuộn lên đầu trang"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
