import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, ChevronLeft, Archive, 
  RotateCcw, Users, Trophy, X,
  Play, Sparkles, Layers, Eye, Check,
  Compass, ChevronDown, BookOpen, Folder as FolderIcon, FolderPlus,
  Edit3, Trash2, Settings
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

export type DecksTab = 'my' | 'folders' | 'discover' | 'archived'
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
  const activeTab: DecksTab = ['my', 'folders', 'discover', 'archived'].includes(tabParam) ? tabParam : 'my'

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

  // Filter dropdown & in-app confirmation modals
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<FolderData | null>(null)

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

  const filteredFolders = useMemo(() => {
    if (!folders) return []
    if (!searchQuery.trim()) return folders
    const q = searchQuery.toLowerCase()
    return folders.filter(f => f.title.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)))
  }, [folders, searchQuery])

  const setActiveTab = (tab: DecksTab) => {
    setSearchParams({ tab }, { replace: true })
    setCurrentPage(1)
    if (tab !== 'my' && tab !== 'folders') {
      setActiveFolderId(null)
    }
  }

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: number) => axios.delete(`/api/v1/folders/${folderId}`),
    onSuccess: () => {
      refetchFolders()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['deck_folders'] })
      if (activeFolderId) setActiveFolderId(null)
    }
  })

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
    if (activeTab === 'folders') return []
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
    { id: 'folders', label: 'My Folders', count: folders.length, icon: FolderIcon },
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
          <div className="flex items-center justify-between pt-2.5 pb-2 md:py-2.5">
            {/* Left: Warm Branding with Mascot / Orange Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shadow-2xs shrink-0">
                <Layers className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none truncate">
                    Decks Library
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 text-[10px] font-black shrink-0 leading-none">
                    {activeTab === 'folders' ? filteredFolders.length : filteredData.length}
                  </span>

                  {/* Desktop Stepper Pagination (Hidden on mobile to eliminate clutter) */}
                  {totalPages > 1 && activeTab !== 'folders' && (
                    <div className="hidden md:flex items-center gap-0.5 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/70 shrink-0">
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
                  <span>{activeTab === 'folders' ? 'Manage your deck collections and study groups' : 'Choose a deck to study'}</span>
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

            {/* Desktop Quick Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Quick Search on Desktop */}
              <div className="relative w-48 lg:w-64">
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

              {/* Folder Button */}
              <button
                onClick={() => {
                  setEditingFolder(null)
                  setIsFolderModalOpen(true)
                }}
                className="h-8.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/90 border border-amber-200 hover:border-amber-300 text-amber-800 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Manage & Create Folders"
              >
                <FolderIcon className="w-4 h-4 text-amber-600 fill-amber-500/20" />
                <span className="font-extrabold text-amber-900">Folder</span>
                {folders.length > 0 && (
                  <span className="bg-amber-200/90 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none">
                    {folders.length}
                  </span>
                )}
              </button>

              {/* New Deck */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8.5 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center gap-1.5 text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                title="Create new deck"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New Deck</span>
              </button>
            </div>

            {/* Mobile Actions: Clean, Uncluttered & App-Like */}
            <div className="flex md:hidden items-center gap-1.5">
              {/* Search Toggle */}
              <button
                onClick={() => setIsSearchOpen(prev => !prev)}
                className={cn(
                  "h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                  isSearchOpen || searchQuery
                    ? "bg-orange-50 border-orange-200 text-orange-600 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title="Search decks"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* New Deck Primary Action */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8.5 px-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center gap-1 text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                title="Create new deck"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Row 2 on Mobile: Modern iOS-Style Segmented Pill Bar */}
          <div className="md:hidden pt-1 pb-2">
            <div className="grid grid-cols-4 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 shadow-inner">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id
                const TabIcon = tab.icon
                const shortLabel = tab.id === 'my' ? 'My Decks' : tab.id === 'folders' ? 'Folders' : tab.id === 'discover' ? 'Discover' : 'Archived'
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer flex items-center justify-center gap-1 min-w-0",
                      isActive
                        ? "text-slate-900 font-black shadow-xs bg-white"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <TabIcon className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-colors",
                      isActive ? "text-orange-500 stroke-[2.4]" : "text-slate-400"
                    )} />
                    <span className="truncate text-[10.5px] leading-tight">{shortLabel}</span>
                    <span className={cn(
                      "px-1 py-0.2 rounded-full text-[9px] font-black leading-none shrink-0",
                      isActive 
                        ? "bg-orange-50 text-orange-600 border border-orange-200/70" 
                        : "bg-slate-200/80 text-slate-500"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
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

          {/* Row 3: Pure Status Filter Chips & Smart Tag Dropdown */}
          {activeTab !== 'folders' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 pt-1 md:border-t md:border-slate-100 md:pt-1.5 md:pb-2">
              {activeTab === 'my' && (
                <>
                  {[
                    { id: 'all' as StatusFilter, label: 'All' },
                    { id: 'roadmap' as StatusFilter, label: '🧭 Roadmap' },
                    { id: 'learning' as StatusFilter, label: '⚡ In Progress' },
                    { id: 'unlearned' as StatusFilter, label: '✨ New' },
                    { id: 'mastered' as StatusFilter, label: '🌟 Mastered' },
                  ].map(st => {
                    const isSelected = statusFilter === st.id
                    return (
                      <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 border cursor-pointer select-none",
                          isSelected
                            ? st.id === 'roadmap'
                              ? "bg-teal-600 border-teal-600 text-white shadow-xs font-black"
                              : "bg-orange-500 border-orange-500 text-white shadow-xs shadow-orange-500/20 font-black"
                            : "bg-slate-100/80 md:bg-white border-slate-200/80 text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                        )}
                      >
                        {st.label}
                      </button>
                    )
                  })}

                  <div className="w-[1px] h-4 bg-slate-200 shrink-0 mx-0.5" />

                  {/* Smart Tag Dropdown Chip */}
                  {allAvailableTags.length > 0 && (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setIsTagMenuOpen(prev => !prev)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 border cursor-pointer select-none flex items-center gap-1",
                          activeTag
                            ? "bg-amber-500 border-amber-500 text-white shadow-xs font-black"
                            : "bg-slate-100/80 md:bg-white border-slate-200/80 text-slate-600 hover:bg-slate-200/60"
                        )}
                      >
                        <span>{activeTag ? `#${activeTag}` : '🏷️ Tags'}</span>
                        {activeTag ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveTag(null)
                            }}
                            className="hover:bg-white/20 rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        ) : (
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        )}
                      </button>

                      {/* Popover Menu for Tags */}
                      {isTagMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsTagMenuOpen(false)}
                          />
                          <div className="absolute left-0 mt-1.5 w-48 max-h-56 overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => {
                                setActiveTag(null)
                                setIsTagMenuOpen(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer",
                                !activeTag ? "bg-orange-50 text-orange-600 font-black" : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              <span>All Tags</span>
                              {!activeTag && <Check className="w-3.5 h-3.5 text-orange-500" />}
                            </button>
                            <div className="h-[1px] bg-slate-100 my-1" />
                            {allAvailableTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => {
                                  setActiveTag(tag)
                                  setIsTagMenuOpen(false)
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-between truncate cursor-pointer",
                                  activeTag === tag ? "bg-orange-50 text-orange-600 font-black" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                <span className="truncate">#{tag}</span>
                                {activeTag === tag && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pb-2.5 pt-1 md:border-t md:border-slate-100 md:pt-1.5 md:pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  Organize your decks into folders for combined study sessions
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-extrabold">
                  {filteredFolders.length} {filteredFolders.length === 1 ? 'folder' : 'folders'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingFolder(null)
                  setIsFolderModalOpen(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ New Folder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ MAIN DECK SELECTION LIST (SCROLLABLE - NO BUTTONS INSIDE CARDS) ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
          {/* Active Folder Banner (if filtering by folder in My Decks tab) */}
          {activeFolder && activeTab === 'my' && (
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

          {activeTab === 'folders' ? (
            filteredFolders.length === 0 ? (
              <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-10 sm:p-14 text-center flex flex-col items-center justify-center shadow-sm my-auto">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-200/80 flex items-center justify-center text-4xl mb-4 shadow-inner">
                  📁
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1.5">
                  {searchQuery ? `No folders matching "${searchQuery}"` : "No folders created yet"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                  {searchQuery 
                    ? "Try a different search keyword or clear the search input to see all folders."
                    : "Folders let you group related decks (e.g. Kanji + Grammar, Vocabulary + Practice) and study all cards together with unified FSRS spaced repetition."}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer active:scale-95"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingFolder(null)
                      setIsFolderModalOpen(true)
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <FolderPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Create Your First Folder</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 pb-12">
                <AnimatePresence mode="popLayout">
                  {filteredFolders.map((folder, idx) => {
                    const totalCards = folder.total_cards || folder.cards_count || 0
                    const memberQuizzes = (data?.my_quizzes || []).filter(q => folder.deck_ids?.includes(q.id))
                    const colorStyles = {
                      purple: {
                        gradient: 'from-purple-500 to-indigo-500',
                        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
                        cardBg: 'bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/30 border-purple-200/90 hover:border-purple-300',
                        accent: '#7C3AED',
                        barTrack: 'bg-purple-100/70',
                        barFill: 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      },
                      emerald: {
                        gradient: 'from-emerald-500 to-teal-500',
                        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                        cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 border-emerald-200/90 hover:border-emerald-300',
                        accent: '#059669',
                        barTrack: 'bg-emerald-100/70',
                        barFill: 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      },
                      sky: {
                        gradient: 'from-sky-500 to-blue-500',
                        badgeBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
                        cardBg: 'bg-gradient-to-br from-sky-50/60 via-white to-blue-50/30 border-sky-200/90 hover:border-sky-300',
                        accent: '#0284C7',
                        barTrack: 'bg-sky-100/70',
                        barFill: 'bg-gradient-to-r from-sky-500 to-blue-500'
                      },
                      amber: {
                        gradient: 'from-amber-500 to-orange-500',
                        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
                        cardBg: 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border-amber-200/90 hover:border-amber-300',
                        accent: '#FF7A00',
                        barTrack: 'bg-amber-100/70',
                        barFill: 'bg-gradient-to-r from-orange-400 to-amber-500'
                      }
                    }[folder.color as 'purple' | 'emerald' | 'sky' | 'amber'] || {
                      gradient: 'from-amber-500 to-orange-500',
                      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
                      cardBg: 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border-amber-200/90 hover:border-amber-300',
                      accent: '#FF7A00',
                      barTrack: 'bg-amber-100/70',
                      barFill: 'bg-gradient-to-r from-orange-400 to-amber-500'
                    }

                    return (
                      <motion.div
                        key={folder.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "rounded-[24px] p-4 sm:p-4.5 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between select-none relative group",
                          colorStyles.cardBg
                        )}
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl bg-gradient-to-tr text-white flex items-center justify-center shadow-xs shrink-0",
                                colorStyles.gradient
                              )}>
                                <FolderIcon className="w-6 h-6 fill-white/20" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                                  {folder.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10.5px] font-black border",
                                    colorStyles.badgeBg
                                  )}>
                                    📚 {folder.deck_ids.length} {folder.deck_ids.length === 1 ? 'deck' : 'decks'}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-500">
                                    🃏 {totalCards} cards
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Folder Menu: Edit & Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingFolder(folder)
                                  setIsFolderModalOpen(true)
                                }}
                                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Folder"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFolderToDelete(folder)
                                }}
                                className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Description */}
                          {folder.description && (
                            <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-3 leading-relaxed">
                              {folder.description}
                            </p>
                          )}

                          {/* Member Decks Preview Chips */}
                          <div className="mt-3 pt-3 border-t border-slate-200/60">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>Decks in this folder</span>
                            </div>
                            {memberQuizzes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {memberQuizzes.slice(0, 3).map(mq => (
                                  <span 
                                    key={mq.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 border border-slate-200 text-slate-700 text-[11px] font-bold truncate max-w-[160px]"
                                  >
                                    <BookOpen className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{mq.title}</span>
                                  </span>
                                ))}
                                {memberQuizzes.length > 3 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black">
                                    +{memberQuizzes.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] font-semibold text-slate-400 italic">
                                No decks added yet. Click Edit to add decks.
                              </p>
                            )}
                          </div>

                          {/* Progress bar */}
                          {totalCards > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 mb-1">
                                <span>Overall Progress</span>
                                <span className="font-mono font-black text-slate-700">{folder.progress_percent || 0}%</span>
                              </div>
                              <div className={cn("h-1.5 rounded-full overflow-hidden p-0.5 shadow-inner", colorStyles.barTrack)}>
                                <div
                                  className={cn("h-full rounded-full transition-all duration-500", colorStyles.barFill)}
                                  style={{ width: `${Math.max(folder.progress_percent || 0, 3)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/flashcard/folder_${folder.id}`)}
                            disabled={totalCards === 0}
                            className="flex-1 h-9 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-xs shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 select-none"
                            title="Study all cards with FSRS Spaced Repetition"
                          >
                            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                            <span>Study All</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/practice/folder_${folder.id}`)}
                            disabled={totalCards === 0}
                            className="h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 select-none shadow-2xs"
                            title="Practice Quiz with all cards"
                          >
                            <Trophy className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>Practice</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFolderForDetail(folder)
                              setIsFolderDetailOpen(true)
                            }}
                            className="h-9 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer select-none shadow-2xs"
                            title="View folder details and member decks"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('my')
                              setActiveFolderId(folder.id)
                            }}
                            className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
                            title="Filter My Decks to this folder"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )
          ) : filteredData.length === 0 ? (
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
      {selectedDeck && activeTab !== 'folders' && (
        <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2">
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center gap-2">
            {activeTab === 'my' && (
              <>
                {/* Single Row Actions: If roadmap is enabled, show long Roadmap Hero CTA + 2 compact icon buttons (Study & Practice) */}
                {selectedDeck.has_roadmap ? (
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Main Long Roadmap Hero Button */}
                    <button
                      onClick={() => navigate(`/decks/${selectedDeck.id}?tab=roadmap`)}
                      className="flex-1 min-w-0 h-11 px-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-[#c44e00] select-none"
                      title="Continue daily roadmap"
                    >
                      <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin-slow shrink-0" />
                      <span className="truncate">Continue Roadmap</span>
                    </button>

                    {/* Icon Button: Study */}
                    <button
                      onClick={() => handleLaunchDefaultStudy(selectedDeck)}
                      className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FFA100] hover:from-[#f36b00] hover:to-[#ff9100] text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs border-b-[3px] border-[#c44e00]"
                      title="Study Flashcards (FSRS)"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>

                    {/* Icon Button: Practice */}
                    <button
                      onClick={() => navigate(`/practice/${selectedDeck.id}/mcq`)}
                      className="w-11 h-11 rounded-2xl bg-white hover:bg-orange-50/50 text-slate-700 hover:text-orange-600 border-2 border-orange-100 hover:border-orange-300 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs border-b-[3px] border-orange-200"
                      title="Practice Quiz (MCQ)"
                    >
                      <Trophy className="w-4 h-4 text-orange-500" />
                    </button>
                  </div>
                ) : (
                  /* Standard Decks: Study & Practice (Full Width Split Buttons) */
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Study */}
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

                    {/* Practice with Dropdown */}
                    <div className="flex-1 min-w-0 flex items-center rounded-2xl bg-white hover:bg-orange-50/30 text-slate-800 border-2 border-orange-100 hover:border-orange-300 shadow-sm transition-all overflow-hidden border-b-[3px] border-orange-200">
                      <button
                        onClick={() => navigate(`/practice/${selectedDeck.id}/mcq`)}
                        className="flex-1 h-11 pl-3 pr-2 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all min-w-0 select-none"
                        title="Launch default Practice (MCQ)"
                      >
                        <Trophy className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="text-xs font-black truncate">Practice</span>
                      </button>
                      <div className="w-[1px] h-5 bg-orange-200 shrink-0" />
                      <button
                        onClick={() => handleStudyTrigger(selectedDeck, 'practice')}
                        className="h-11 px-2.5 hover:bg-orange-100/60 text-slate-600 hover:text-orange-600 flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all shrink-0"
                        title="Choose practice mode (MCQ, Typing, Listening)"
                      >
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
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


      {/* ═══════════ IN-APP FOLDER DELETE CONFIRMATION MODAL ═══════════ */}
      <AnimatePresence>
        {folderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: "spring", duration: 0.25 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80 text-center select-none"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-inner">
                <Trash2 className="w-7 h-7 stroke-[2.2]" />
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">
                Delete Folder?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Are you sure you want to delete folder <strong className="text-slate-800">"{folderToDelete.title}"</strong>? The flashcard decks inside will <strong className="text-emerald-700">NOT</strong> be deleted.
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteFolderMutation.isPending}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(8)
                    deleteFolderMutation.mutate(folderToDelete.id, {
                      onSettled: () => setFolderToDelete(null)
                    })
                  }}
                  className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleteFolderMutation.isPending ? 'Deleting...' : 'Delete Folder'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
