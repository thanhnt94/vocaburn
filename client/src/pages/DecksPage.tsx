import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, ChevronLeft, Archive, 
  RotateCcw, Users, Trophy, X,
  Play, Sparkles, Layers, Eye, Check,
  Compass, ChevronDown, BookOpen, Folder as FolderIcon
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  DeckStudyModal, 
  DeckJoinRoomModal, 
  DeckCreateModal,
  FolderModal,
  FolderDetailModal,
  type FolderData
} from '@/components/deck'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'

export interface Quiz {
  id: number
  title: string
  description?: string
  cover_image: string | null
  questions_count: number
  cards_count?: number
  tags: string[]
  creator_id?: number
  creator_name?: string
  is_creator?: boolean
  is_public?: boolean
  owner_id?: number
  has_roadmap?: boolean
  learned_count?: number
  mastered_count?: number
  progress_percent?: number
  created_at?: string | null
  last_studied_at?: string | null
  practice_settings?: any
  default_mode?: string
}

interface DashboardData {
  user: { id: number, username: string, email: string, role?: string }
  my_quizzes: Quiz[]
  archived_quizzes: Quiz[]
  discover_quizzes: Quiz[]
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
}

export type DecksTab = 'my' | 'discover' | 'archived'
export type StatusFilter = 'all' | 'roadmap' | 'learning' | 'unlearned' | 'mastered'

const DECK_PALETTES = [
  {
    theme: 'orange',
    avatarBg: 'bg-gradient-to-br from-orange-100 to-amber-100',
    cardBorder: 'border-orange-500',
    cardBg: 'bg-gradient-to-r from-orange-50/90 via-white to-amber-50/50',
    barTrack: 'bg-orange-100',
    barFill: 'bg-gradient-to-r from-orange-400 to-[#FF7A00]',
    mascotImage: '/mascot/mascot_flame_sakura.jpg',
    accentColor: '#FF7A00'
  },
  {
    theme: 'purple',
    avatarBg: 'bg-gradient-to-br from-indigo-100 to-purple-100',
    cardBorder: 'border-indigo-200/90',
    cardBg: 'bg-gradient-to-r from-[#FAF8FF] via-white to-[#F5F3FF]',
    barTrack: 'bg-indigo-100/70',
    barFill: 'bg-gradient-to-r from-indigo-400 to-purple-500',
    mascotImage: '/mascot/mascot_fox_reading.jpg',
    accentColor: '#7C3AED'
  },
  {
    theme: 'green',
    avatarBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
    cardBorder: 'border-emerald-200/90',
    cardBg: 'bg-gradient-to-r from-[#F4FBF7] via-white to-[#ECFDF5]',
    barTrack: 'bg-emerald-100/70',
    barFill: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    mascotImage: '/mascot/mascot_leaf_spirit.jpg',
    accentColor: '#059669'
  },
  {
    theme: 'blue',
    avatarBg: 'bg-gradient-to-br from-sky-100 to-blue-100',
    cardBorder: 'border-sky-200/90',
    cardBg: 'bg-gradient-to-r from-[#F0F9FF] via-white to-[#E0F2FE]',
    barTrack: 'bg-sky-100/70',
    barFill: 'bg-gradient-to-r from-sky-400 to-blue-500',
    mascotImage: '/mascot/mascot_flame_sakura.jpg',
    accentColor: '#0284C7'
  }
]

export default function DecksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as DecksTab
  const activeTab: DecksTab = ['my', 'discover', 'archived'].includes(tabParam) ? tabParam : 'my'

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Selection State (Master-Detail matching Home Learning)
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null)
  const [roadmapMode, setRoadmapMode] = useState<'roadmap' | 'classic'>('roadmap')

  // Folder states
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null)
  const [isFolderDetailOpen, setIsFolderDetailOpen] = useState(false)
  const [folderForDetail, setFolderForDetail] = useState<FolderData | null>(null)

  // Modals State
  const [selectedStudyQuiz, setSelectedStudyQuiz] = useState<Quiz | null>(null)
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false)
  const [studyModalTab, setStudyModalTab] = useState<'flashcard' | 'practice'>('flashcard')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 

  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      if (res.data.user) setUser(res.data.user)
      if (res.data.gamify) setGamify(res.data.gamify)
      return res.data
    },
    staleTime: 30 * 1000,
  })

  const { data: folders = [], refetch: refetchFolders } = useQuery<FolderData[]>({
    queryKey: ['deck_folders'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/folders')
      return res.data || []
    },
    staleTime: 30 * 1000
  })

  const activeFolder = useMemo(() => {
    return folders.find(f => f.id === activeFolderId) || null
  }, [folders, activeFolderId])

  const setActiveTab = (tab: DecksTab) => {
    setSearchParams({ tab }, { replace: true })
    setCurrentPage(1)
    if (tab !== 'my') {
      setActiveFolderId(null)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, activeTag, statusFilter, activeFolderId])

  const archiveMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/deck/${quizId}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })

  const enrollMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/deck/${quizId}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const allAvailableTags = useMemo(() => {
    const tags = new Set<string>()
    const allQuizzes = data ? [...(data.my_quizzes || []), ...(data.archived_quizzes || []), ...(data.discover_quizzes || [])] : []
    allQuizzes.forEach(q => q.tags?.forEach(t => tags.add(t)))
    const list = Array.from(tags)
    if (list.length === 0) {
      return ['JLPT', 'N2', 'N3', 'IELTS', 'TOEIC', 'Vocabulary']
    }
    return list.sort()
  }, [data])

  const filteredData = useMemo(() => {
    if (!data) return []
    const quizzes = (data[`${activeTab}_quizzes` as keyof DashboardData] || []) as Quiz[]
    return quizzes.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (q.creator_name && q.creator_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesTag = !activeTag || q.tags?.includes(activeTag)

      const learned = q.learned_count || 0
      const total = q.questions_count || 1
      const pct = q.progress_percent ?? Math.round((learned / total) * 100)

      let matchesStatus = true
      if (statusFilter === 'roadmap') {
        matchesStatus = Boolean(q.has_roadmap)
      } else if (statusFilter === 'learning') {
        matchesStatus = learned > 0 && pct < 100
      } else if (statusFilter === 'unlearned') {
        matchesStatus = learned === 0
      } else if (statusFilter === 'mastered') {
        matchesStatus = pct === 100 || (q.mastered_count || 0) > 0
      }

      let matchesFolder = true
      if (activeFolderId && activeTab === 'my') {
        const curFolder = folders.find(f => f.id === activeFolderId)
        if (curFolder) {
          matchesFolder = curFolder.deck_ids.includes(q.id)
        }
      }

      return matchesSearch && matchesTag && matchesStatus && matchesFolder
    })
  }, [data, activeTab, searchQuery, activeTag, statusFilter, activeFolderId, folders])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  }, [filteredData])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // Auto-sync selectedDeckId with currently visible paginated data
  useEffect(() => {
    if (paginatedData.length > 0) {
      if (!selectedDeckId || !paginatedData.some(q => q.id === selectedDeckId)) {
        const first = paginatedData[0]
        setSelectedDeckId(first.id)
        if (first.has_roadmap) setRoadmapMode('roadmap')
      }
    } else {
      setSelectedDeckId(null)
    }
  }, [paginatedData, selectedDeckId])

  const selectedDeck = useMemo(() => {
    return paginatedData.find(q => q.id === selectedDeckId) || paginatedData[0] || null
  }, [paginatedData, selectedDeckId])

  const tabsConfig: { id: DecksTab; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'my', label: 'My Decks', count: data?.my_quizzes?.length || 0, icon: Layers },
    { id: 'discover', label: 'Discover', count: data?.discover_quizzes?.length || 0, icon: Compass },
    { id: 'archived', label: 'Archived', count: data?.archived_quizzes?.length || 0, icon: Archive },
  ]

  const handleStudyTrigger = (quiz: Quiz, tab: 'flashcard' | 'practice') => {
    setSelectedStudyQuiz(quiz)
    setStudyModalTab(tab)
    setIsStudyModalOpen(true)
  }

  const handleLaunchDefaultStudy = (quiz: Quiz) => {
    const defMode = quiz.practice_settings?.study_defaults?.learning_mode || quiz.default_mode || 'fsrs'
    if (defMode === 'mcq') navigate(`/practice/${quiz.id}/mcq`)
    else if (defMode === 'typing') navigate(`/practice/${quiz.id}/typing`)
    else if (defMode === 'listening') navigate(`/practice/${quiz.id}/listening`)
    else if (defMode === 'roadmap') navigate(`/flashcard/${quiz.id}/play?mode=roadmap`)
    else if (defMode === 'flip') navigate(`/flashcard/${quiz.id}/play?mode=flip`)
    else navigate(`/flashcard/${quiz.id}/play?mode=fsrs`)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return null
    }
  }

  if (error || (data && (data as any).error)) {
    window.location.href = '/login'
    return null
  }

  if (isLoading || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center font-black animate-pulse text-orange-600 tracking-widest uppercase italic bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
      <span>📚 LOADING DECKS...</span>
    </div>
  )

  return (
    <div className="fixed inset-0 top-0 bottom-[68px] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER (BRAND + TABS + FILTERS) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 md:bg-[#F8FAFC]/95 md:backdrop-blur-md border-b border-slate-200/80 shadow-2xs md:shadow-none">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
          {/* Row 1: Header Brand, Desktop Tabs, and Quick Actions */}
          <div className="flex items-center justify-between pt-3 pb-2 md:py-2.5">
            {/* Left: Warm Branding with Mascot / Orange Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shadow-2xs shrink-0">
                <Layers className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none truncate">
                    Decks Library
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 text-[10px] font-black shrink-0 leading-none">
                    {filteredData.length}
                  </span>

                  {/* Compact Header Stepper Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/70 shrink-0">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="w-5.5 h-5.5 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-25 cursor-pointer transition-all"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="px-1 text-[9.5px] font-black font-mono text-slate-700 leading-none">
                        {currentPage}/{totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="w-5.5 h-5.5 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-25 cursor-pointer transition-all"
                        title="Next page"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1 leading-none truncate">
                  <span>Choose a deck to study</span>
                  <span className="text-amber-500">✨</span>
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs (My Decks, Discover, Archived) */}
            <div className="hidden md:flex items-center gap-8">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 pb-2 px-0.5 text-sm transition-all select-none cursor-pointer group",
                      isActive 
                        ? "text-slate-900 font-extrabold" 
                        : "text-slate-500 hover:text-slate-900 font-semibold"
                    )}
                  >
                    <TabIcon className={cn(
                      "w-4.5 h-4.5 transition-colors shrink-0",
                      isActive 
                        ? "text-orange-500 stroke-[2.4]" 
                        : "text-slate-400 group-hover:text-slate-600 stroke-[1.8]"
                    )} />
                    <span className="tracking-tight">{tab.label}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-black leading-none transition-all",
                      isActive 
                        ? "bg-orange-500 text-white shadow-xs shadow-orange-500/20" 
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                    )}>
                      {tab.count}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="desktopDecksUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right: Quick actions (Desktop & Mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Quick Search on Desktop */}
              <div className="relative hidden md:block w-48 lg:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search decks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white hover:border-slate-300 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Toggle on Mobile */}
              <button
                onClick={() => setIsSearchOpen(prev => !prev)}
                className={cn(
                  "md:hidden h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                  isSearchOpen || searchQuery
                    ? "bg-orange-50 border-orange-200 text-orange-600 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title="Search decks"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Room Match */}
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="h-8.5 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-purple-50/80 border border-slate-200 hover:border-purple-200 text-slate-700 hover:text-purple-700 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Join study room"
              >
                <Users className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">Room</span>
              </button>

              {/* Folder Button (My Decks tab) */}
              {activeTab === 'my' && (
                <button
                  onClick={() => {
                    setEditingFolder(null)
                    setIsFolderModalOpen(true)
                  }}
                  className="h-8.5 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Create new folder"
                >
                  <FolderIcon className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">Folder</span>
                </button>
              )}

              {/* New Deck */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8.5 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center gap-1.5 text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                title="Create new deck"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden xs:inline sm:inline">New Deck</span>
              </button>
            </div>
          </div>

          {/* Row 2 on Mobile: Modern Sub-Tabs (My Decks, Discover, Archived moved to top!) */}
          <div className="md:hidden flex items-center justify-start gap-6 border-t border-slate-100 pt-2 pb-1.5">
            {tabsConfig.map((tab) => {
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 pb-1 text-xs transition-all select-none cursor-pointer",
                    isActive ? "text-slate-900 font-extrabold" : "text-slate-500 hover:text-slate-800 font-semibold"
                  )}
                >
                  <TabIcon className={cn("w-3.5 h-3.5", isActive ? "text-orange-500 stroke-[2.4]" : "text-slate-400")} />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none",
                    isActive ? "bg-orange-500 text-white shadow-xs" : "bg-slate-100 text-slate-500"
                  )}>
                    {tab.count}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mobileDecksHeaderUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Collapsible Search Input for Mobile */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden pb-2 overflow-hidden"
              >
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-orange-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by title, author, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-white border border-orange-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 3: Horizontal Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 pt-1 md:border-t md:border-slate-100 md:pt-1.5 md:pb-2">
            {activeTab === 'my' && (
              <>
                {[
                  { id: 'all' as StatusFilter, label: 'All' },
                  { id: 'roadmap' as StatusFilter, label: '🧭 Roadmap' },
                  { id: 'learning' as StatusFilter, label: '⚡ Learning' },
                  { id: 'unlearned' as StatusFilter, label: '✨ Unlearned' },
                  { id: 'mastered' as StatusFilter, label: '🌟 Mastered' },
                ].map(st => {
                  const isSelected = statusFilter === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black transition-all shrink-0 border cursor-pointer select-none",
                        isSelected
                          ? st.id === 'roadmap'
                            ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                            : "bg-orange-500 border-orange-500 text-white shadow-xs shadow-orange-500/20"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {st.label}
                    </button>
                  )
                })}
                <div className="w-[1px] h-4 bg-slate-200 shrink-0 mx-1" />

                {/* Folder Pills in My Decks tab */}
                {folders.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {folders.map(folder => {
                        const isFolderSelected = activeFolderId === folder.id
                        return (
                          <div
                            key={folder.id}
                            className={cn(
                              "flex items-center rounded-xl border text-xs font-black transition-all shrink-0 cursor-pointer select-none",
                              isFolderSelected
                                ? "bg-orange-500 border-orange-500 text-white shadow-xs shadow-orange-500/20"
                                : "bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/40"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveFolderId(isFolderSelected ? null : folder.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1"
                            >
                              <FolderIcon className={cn("w-3.5 h-3.5", isFolderSelected ? "text-white" : "text-amber-500")} />
                              <span className="max-w-[120px] truncate">{folder.title}</span>
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[9.5px] font-black leading-none",
                                isFolderSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                {folder.deck_ids.length}
                              </span>
                            </button>
                            {isFolderSelected && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFolderForDetail(folder)
                                  setIsFolderDetailOpen(true)
                                }}
                                title="Folder Info & Actions"
                                className="pr-2 pl-0.5 py-1 text-white/80 hover:text-white"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="w-[1px] h-4 bg-slate-200 shrink-0 mx-1" />
                  </>
                )}
              </>
            )}

            {/* Tag Pills */}
            <button 
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer select-none",
                !activeTag 
                  ? "bg-orange-500 border-orange-500 text-white shadow-xs shadow-orange-500/20" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              All Tags
            </button>

            {allAvailableTags.map(tag => {
              const isActive = activeTag === tag
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(isActive ? null : tag)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer select-none",
                    isActive
                      ? "bg-orange-500 border-orange-500 text-white shadow-xs shadow-orange-500/20"
                      : "bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50/40 hover:text-orange-600"
                  )}
                >
                  #{tag}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN DECK SELECTION LIST (SCROLLABLE - NO BUTTONS INSIDE CARDS) ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
          {/* Active Folder Banner (if filtering by folder) */}
          {activeFolder && (
            <div className={cn(
              "mb-4 p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all",
              activeFolder.color === 'purple' 
                ? 'bg-purple-50/70 border-purple-200/80' 
                : activeFolder.color === 'emerald'
                ? 'bg-emerald-50/70 border-emerald-200/80'
                : activeFolder.color === 'sky'
                ? 'bg-sky-50/70 border-sky-200/80'
                : 'bg-amber-50/70 border-amber-200/80'
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-gradient-to-tr",
                  activeFolder.color === 'purple' 
                    ? 'from-purple-500 to-indigo-500' 
                    : activeFolder.color === 'emerald'
                    ? 'from-emerald-500 to-teal-500'
                    : activeFolder.color === 'sky'
                    ? 'from-sky-500 to-blue-500'
                    : 'from-amber-500 to-orange-500'
                )}>
                  <FolderIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight truncate">
                      {activeFolder.title}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 text-slate-600 shrink-0">
                      {activeFolder.deck_ids.length} decks • {activeFolder.total_cards || activeFolder.cards_count || 0} cards
                    </span>
                  </div>
                  {activeFolder.description && (
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {activeFolder.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Folder Quick Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/flashcard/folder_${activeFolder.id}`)}
                  className="h-8.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Study all cards in this folder"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Study Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/practice/folder_${activeFolder.id}`)}
                  className="h-8.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Practice all decks in this folder"
                >
                  <Trophy className="w-3.5 h-3.5 text-orange-500" />
                  <span>Practice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFolderForDetail(activeFolder)
                    setIsFolderDetailOpen(true)
                  }}
                  className="h-8.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  title="Folder details and settings"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFolderId(null)}
                  className="h-8.5 px-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Clear folder filter"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {filteredData.length === 0 ? (
            <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-sm my-auto">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center text-3xl mb-3 shadow-inner">
                🔍
              </div>
              <h3 className="text-base font-black text-slate-800 tracking-tight mb-1">
                No matching decks found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-5">
                Try searching with different keywords or change the status filter to "All".
              </p>
              {activeTab === 'discover' && (
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                >
                  + Create New Deck
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-3.5">
                <AnimatePresence mode="popLayout">
                  {paginatedData.map((quiz, idx) => {
                    const isSelected = (selectedDeck?.id ?? null) === quiz.id
                    const learned = quiz.learned_count || 0
                    const total = quiz.questions_count || 1
                    const progressPct = quiz.progress_percent ?? Math.min(100, Math.round((learned / total) * 100))
                    const formattedDate = formatDate(quiz.created_at)
                    const palette = DECK_PALETTES[idx % DECK_PALETTES.length]
                    const mascotSrc = quiz.cover_image ? resolveMediaUrl(quiz.cover_image) : palette.mascotImage

                    return (
                      <motion.div
                        key={quiz.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(6)
                          if (selectedDeckId === quiz.id) {
                            navigate(`/decks/${quiz.id}`)
                          } else {
                            setSelectedDeckId(quiz.id)
                            if (quiz.has_roadmap) setRoadmapMode('roadmap')
                          }
                        }}
                        className={cn(
                          "relative rounded-[24px] p-3 sm:p-3.5 flex items-center gap-3.5 transition-all duration-200 cursor-pointer select-none",
                          isSelected
                            ? "border-2 border-orange-500 bg-gradient-to-r from-orange-50/95 via-white to-amber-50/60 shadow-md shadow-orange-500/10 ring-2 ring-orange-400/25"
                            : cn("border border-slate-200/90 hover:border-slate-300 shadow-xs", palette.cardBg)
                        )}
                      >
                        {/* Deck Mascot / Avatar */}
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] flex items-center justify-center overflow-hidden shadow-xs border-2 border-white",
                            palette.avatarBg
                          )}>
                            <img
                              src={mascotSrc}
                              alt={quiz.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = palette.mascotImage
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Deck Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                                {quiz.title}
                              </h4>
                              {quiz.has_roadmap && (
                                <span 
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-extrabold text-[9.5px] shrink-0"
                                  title="Smart daily roadmap enabled"
                                >
                                  <Compass className="w-2.5 h-2.5 text-teal-600 animate-spin-slow" />
                                  <span>Roadmap</span>
                                </span>
                              )}
                            </div>

                            {/* Right Indicator: Checkmark if selected, subtle Chevron if not */}
                            {isSelected ? (
                              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <ChevronRight className="w-4.5 h-4.5 text-slate-300 stroke-[2.5] shrink-0" />
                            )}
                          </div>

                          {/* Meta Badges: Cards count, creator, compact date */}
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/80 border border-slate-200/60 text-slate-700 text-[10px] font-bold">
                              📚 {quiz.questions_count} cards
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-bold truncate max-w-[120px]">
                              @{quiz.creator_name || 'Vocaburn'}
                            </span>
                            {formattedDate && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400 font-medium text-[10px]">
                                  {formattedDate}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Progress Bar (if not in discover tab) */}
                          {activeTab !== 'discover' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className={cn(
                                "flex-1 h-1.5 rounded-full overflow-hidden p-0.5 shadow-inner",
                                isSelected ? "bg-orange-100" : palette.barTrack
                              )}>
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    isSelected ? "bg-gradient-to-r from-orange-400 to-amber-500" : palette.barFill
                                  )}
                                  style={{ width: `${Math.max(progressPct, total > 0 ? 3 : 0)}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-[10.5px] font-black shrink-0 leading-none font-mono",
                                isSelected ? "text-orange-600" : "text-slate-500"
                              )}>
                                {progressPct}%
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Bottom In-List Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-6 pb-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-35 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    Page <strong className="text-slate-800 font-black">{currentPage}</strong> of <strong className="text-slate-800 font-black">{totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-35 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════ STRICTLY SINGLE-ROW BOTTOM ACTION DOCK (H-[54PX]) ═══════════ */}
      {selectedDeck && (
        <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2">
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center gap-2">
            {activeTab === 'my' && (
              <>
                {/* Small Compact Archive Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Archive deck "${selectedDeck.title}"?`)) {
                      archiveMutation.mutate(selectedDeck.id)
                    }
                  }}
                  className="w-11 h-11 rounded-2xl bg-slate-100/90 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs"
                  title="Archive deck"
                >
                  <Archive className="w-4 h-4" />
                </button>

                {/* Single Row Actions: If roadmap is enabled, support swipe/toggle between Roadmap and Study/Practice */}
                {selectedDeck.has_roadmap ? (
                  <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                    <AnimatePresence mode="wait">
                      {roadmapMode === 'roadmap' ? (
                        <motion.div
                          key="roadmap-action"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 15 }}
                          transition={{ duration: 0.15 }}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.2}
                          onDragEnd={(_, info) => {
                            if (Math.abs(info.offset.x) > 35) {
                              setRoadmapMode('classic')
                            }
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0"
                        >
                          {/* Main Roadmap Hero Button */}
                          <button
                            onClick={() => navigate(`/decks/${selectedDeck.id}?tab=roadmap`)}
                            className="flex-1 h-11 px-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs shadow-md shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-teal-700 min-w-0 select-none"
                            title="Continue daily roadmap"
                          >
                            <Compass className="w-4.5 h-4.5 animate-spin-slow shrink-0" />
                            <span className="truncate">Continue Daily Roadmap</span>
                            <span className="hidden xs:inline text-teal-200 text-[10px] font-bold">↔</span>
                          </button>

                          {/* Toggle Switcher to Classic Study & Practice */}
                          <button
                            onClick={() => setRoadmapMode('classic')}
                            className="w-11 h-11 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-orange-600 flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0 shadow-2xs"
                            title="Switch to Free Study & Practice (or swipe)"
                          >
                            <Layers className="w-4 h-4 stroke-[2.4]" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="classic-action"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.15 }}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.2}
                          onDragEnd={(_, info) => {
                            if (Math.abs(info.offset.x) > 35) {
                              setRoadmapMode('roadmap')
                            }
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0"
                        >
                          {/* Study Flashcards */}
                          <div className="flex-1 min-w-0 flex items-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FFA100] hover:from-[#f36b00] hover:to-[#ff9100] text-white shadow-md shadow-orange-500/20 transition-all overflow-hidden border-b-[3px] border-[#c44e00]">
                            <button
                              onClick={() => handleLaunchDefaultStudy(selectedDeck)}
                              className="flex-1 h-11 pl-3 pr-2 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all min-w-0 select-none"
                              title="Launch default study mode"
                            >
                              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                              <span className="text-xs font-black truncate">Study</span>
                            </button>
                            <div className="w-[1px] h-5 bg-white/25 shrink-0" />
                            <button
                              onClick={() => handleStudyTrigger(selectedDeck, 'flashcard')}
                              className="h-11 px-2.5 hover:bg-white/15 flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all shrink-0"
                              title="Choose study mode (FSRS, Flip, Review, New)"
                            >
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Practice Quiz Button */}
                          <button
                            onClick={() => handleStudyTrigger(selectedDeck, 'practice')}
                            className="flex-1 min-w-0 h-11 px-3 rounded-2xl bg-white hover:bg-orange-50/30 text-slate-800 border-2 border-orange-100 hover:border-orange-300 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-[3px] border-orange-200 select-none"
                            title="Practice Quiz (MCQ, Typing, Listening)"
                          >
                            <Trophy className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span className="text-xs font-black truncate">Practice</span>
                          </button>

                          {/* Switch back to Roadmap */}
                          <button
                            onClick={() => setRoadmapMode('roadmap')}
                            className="w-11 h-11 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-teal-700 flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0 shadow-2xs"
                            title="Switch back to Roadmap (or swipe)"
                          >
                            <Compass className="w-4 h-4 animate-spin-slow" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* Decks without roadmap: Directly display Study Flashcard & Practice */
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Study Flashcards */}
                    <div className="flex-1 min-w-0 flex items-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FFA100] hover:from-[#f36b00] hover:to-[#ff9100] text-white shadow-md shadow-orange-500/20 transition-all overflow-hidden border-b-[3px] border-[#c44e00]">
                      <button
                        onClick={() => handleLaunchDefaultStudy(selectedDeck)}
                        className="flex-1 h-11 pl-3 pr-2 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all min-w-0 select-none"
                        title="Launch default study mode"
                      >
                        <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span className="text-xs font-black truncate">Study Flashcards</span>
                      </button>
                      <div className="w-[1px] h-5 bg-white/25 shrink-0" />
                      <button
                        onClick={() => handleStudyTrigger(selectedDeck, 'flashcard')}
                        className="h-11 px-2.5 hover:bg-white/15 flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all shrink-0"
                        title="Choose study mode (FSRS, Flip, Review, New)"
                      >
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Practice Quiz */}
                    <button
                      onClick={() => handleStudyTrigger(selectedDeck, 'practice')}
                      className="flex-1 min-w-0 h-11 px-3 rounded-2xl bg-white hover:bg-orange-50/30 text-slate-800 border-2 border-orange-100 hover:border-orange-300 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-[3px] border-orange-200 select-none"
                      title="Practice Quiz (MCQ, Typing, Listening)"
                    >
                      <Trophy className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="text-xs font-black truncate">Practice Test</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'discover' && (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <button
                  onClick={() => enrollMutation.mutate(selectedDeck.id)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-[#c44e00] select-none"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add to My Decks</span>
                </button>
                <button
                  onClick={() => navigate(`/decks/${selectedDeck.id}`)}
                  className="h-11 px-4 rounded-2xl bg-white hover:bg-orange-50/30 border-2 border-orange-100 hover:border-orange-300 text-slate-800 font-black text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-orange-200 select-none"
                >
                  <Eye className="w-4 h-4 text-orange-500" />
                  <span>View Details</span>
                </button>
              </div>
            )}

            {activeTab === 'archived' && (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <button
                  onClick={() => archiveMutation.mutate(selectedDeck.id)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-slate-950 select-none"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>Restore Deck</span>
                </button>
                <button
                  onClick={() => navigate(`/decks/${selectedDeck.id}`)}
                  className="h-11 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-black text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-slate-300 select-none"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>View Details</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}
      <DeckJoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      <DeckCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DeckStudyModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        deck={selectedStudyQuiz}
        initialTab={studyModalTab}
      />

      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false)
          setEditingFolder(null)
        }}
        onSuccess={() => {
          refetchFolders()
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
        folder={editingFolder}
        availableDecks={data?.my_quizzes || []}
      />

      <FolderDetailModal
        isOpen={isFolderDetailOpen}
        onClose={() => {
          setIsFolderDetailOpen(false)
          setFolderForDetail(null)
        }}
        folder={folderForDetail}
        memberDecks={(data?.my_quizzes || []).filter(d => folderForDetail?.deck_ids?.includes(d.id))}
        onEdit={(f) => {
          setEditingFolder(f)
          setIsFolderModalOpen(true)
        }}
        onStudy={(folderId) => {
          navigate(`/flashcard/folder_${folderId}`)
        }}
        onPractice={(folderId) => {
          navigate(`/practice/folder_${folderId}`)
        }}
        onSelectDeck={(deckId) => {
          setSelectedDeckId(deckId)
        }}
      />
    </div>
  )
}
