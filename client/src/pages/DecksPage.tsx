import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, ChevronLeft, Archive, 
  RotateCcw, Users, Brain, Trophy, X, MoreHorizontal,
  Play, Sparkles, BookOpen, Layers, Eye, Check, Calendar,
  Compass, ChevronDown
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  DeckStudyModal, 
  DeckJoinRoomModal, 
  DeckCreateModal, 
  DeckActionSheet,
  DeckPagination 
} from '@/components/deck'

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
  
  // Modals & Bottom Drawer State
  const [selectedStudyQuiz, setSelectedStudyQuiz] = useState<Quiz | null>(null)
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false)
  const [studyModalTab, setStudyModalTab] = useState<'flashcard' | 'practice'>('flashcard')
  const [actionSheetQuiz, setActionSheetQuiz] = useState<Quiz | null>(null)

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

  const setActiveTab = (tab: DecksTab) => {
    setSearchParams({ tab }, { replace: true })
    setCurrentPage(1)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, activeTag, statusFilter])

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

      return matchesSearch && matchesTag && matchesStatus
    })
  }, [data, activeTab, searchQuery, activeTag, statusFilter])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  }, [filteredData])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

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
    <div className="min-h-screen flex flex-col items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase italic bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <span>📚 LOADING DECKS...</span>
    </div>
  )

  return (
    <div className="fixed inset-0 top-0 bottom-[68px] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 md:bg-[#F8FAFC]/95 md:backdrop-blur-md border-b border-slate-200/80 md:border-slate-200/60 shadow-2xs md:shadow-none">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
          {/* Row 1: Mobile Header Title / Desktop Navigation Tabs & Quick Actions */}
          <div className="flex items-center justify-between pt-3 pb-2.5 md:py-2.5">
            {/* Mobile Header (Exact original styling restored) */}
            <div className="md:hidden flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-900/10 shrink-0">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic leading-none truncate">
                    Decks Repository
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 text-[10px] font-black not-italic shrink-0">
                    {filteredData.length}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 truncate">
                  Spaced Repetition & Roadmap Decks
                </p>
              </div>
            </div>

            {/* Desktop Modern Underline Tabs (My Decks, Discover, Archived) */}
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

            {/* Right: Quick actions on desktop (Search, Join Room, New Deck) */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Quick Search */}
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

              {/* Room */}
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="h-8.5 px-3 rounded-xl bg-white hover:bg-purple-50/80 border border-slate-200 hover:border-purple-200 text-slate-700 hover:text-purple-700 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Join study room"
              >
                <Users className="w-4 h-4 text-purple-600" />
                <span className="hidden xl:inline">Room</span>
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
          </div>

          {/* Row 2: Horizontal Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 pt-0.5 md:border-t md:border-slate-100 md:pt-1.5 md:pb-2">
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
                        "px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border cursor-pointer select-none",
                        isSelected
                          ? st.id === 'roadmap'
                            ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                            : "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {st.label}
                    </button>
                  )
                })}
                <div className="w-[1px] h-4 bg-slate-200 shrink-0 mx-1" />
              </>
            )}

            {/* Tag Pills */}
            <button 
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer select-none",
                !activeTag 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
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
                    "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer select-none",
                    isActive
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-600"
                  )}
                >
                  #{tag}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN DECK LIST (INTERNAL SCROLLABLE - FLEX-1) ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
          {/* Empty State */}
          {filteredData.length === 0 ? (
            <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-sm my-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl mb-3 shadow-inner">
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
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer active:scale-95"
                >
                  + Create New Deck
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((quiz, idx) => {
                  const learned = quiz.learned_count || 0
                  const total = quiz.questions_count || 1
                  const progressPct = quiz.progress_percent ?? Math.min(100, Math.round((learned / total) * 100))
                  const hasStudied = learned > 0
                  const isMastered = progressPct === 100
                  const formattedDate = formatDate(quiz.created_at)

                  // Smart gradient & cover palette based on title / tags
                  const getThemeGradient = (q: Quiz, i: number) => {
                    const titleLower = q.title.toLowerCase()
                    if (titleLower.includes('n1') || titleLower.includes('n2') || titleLower.includes('kanji')) {
                      return {
                        bg: 'from-rose-500 via-pink-500 to-indigo-600',
                        accent: 'text-rose-600 bg-rose-50 border-rose-200/80',
                        icon: '🌸'
                      }
                    }
                    if (titleLower.includes('n3') || titleLower.includes('n4') || titleLower.includes('n5')) {
                      return {
                        bg: 'from-emerald-500 via-teal-500 to-cyan-600',
                        accent: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
                        icon: '🌿'
                      }
                    }
                    if (titleLower.includes('ielts') || titleLower.includes('toeic') || titleLower.includes('english')) {
                      return {
                        bg: 'from-blue-600 via-indigo-600 to-violet-600',
                        accent: 'text-blue-600 bg-blue-50 border-blue-200/80',
                        icon: '🇬🇧'
                      }
                    }
                    if (titleLower.includes('hội thoại') || titleLower.includes('công việc') || titleLower.includes('giao tiếp')) {
                      return {
                        bg: 'from-amber-500 via-orange-500 to-rose-500',
                        accent: 'text-amber-700 bg-amber-50 border-amber-200/80',
                        icon: '💼'
                      }
                    }
                    const palettes = [
                      { bg: 'from-indigo-600 via-purple-600 to-pink-500', accent: 'text-indigo-600 bg-indigo-50 border-indigo-200/80', icon: '🎴' },
                      { bg: 'from-sky-500 via-blue-600 to-indigo-600', accent: 'text-sky-600 bg-sky-50 border-sky-200/80', icon: '✨' },
                      { bg: 'from-teal-500 via-emerald-600 to-green-600', accent: 'text-teal-600 bg-teal-50 border-teal-200/80', icon: '🎯' },
                      { bg: 'from-violet-600 via-purple-600 to-amber-500', accent: 'text-purple-600 bg-purple-50 border-purple-200/80', icon: '⚡' },
                    ]
                    return palettes[i % palettes.length]
                  }

                  const theme = getThemeGradient(quiz, idx)

                  return (
                    <motion.div
                      key={quiz.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-300/90 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-3.5 relative overflow-hidden"
                    >
                      {/* Top Row: Thumbnail + Deck Info + Menu */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Vibrant Thumbnail */}
                        <div
                          onClick={() => navigate(`/decks/${quiz.id}`)}
                          className={cn(
                            "w-14 h-14 sm:w-15 sm:h-15 rounded-2xl overflow-hidden shadow-md shrink-0 cursor-pointer group-hover:scale-105 transition-transform flex flex-col items-center justify-center text-white relative",
                            !quiz.cover_image && `bg-gradient-to-br ${theme.bg}`
                          )}
                        >
                          {quiz.cover_image ? (
                            <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <span className="text-xl leading-none drop-shadow-sm">{theme.icon}</span>
                              <span className="text-[10px] font-black uppercase tracking-wider mt-0.5 opacity-90">
                                {quiz.questions_count > 999 ? `${(quiz.questions_count / 1000).toFixed(1)}k` : quiz.questions_count}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Deck Info */}
                        <div
                          onClick={() => navigate(`/decks/${quiz.id}`)}
                          className="flex-1 min-w-0 cursor-pointer text-left"
                        >
                          {/* Title & Roadmap Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h3 className="text-sm sm:text-base font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-snug">
                              {quiz.title}
                            </h3>
                            {quiz.has_roadmap && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-extrabold text-[10px] shadow-2xs shrink-0"
                                title="Smart daily roadmap enabled"
                              >
                                <Compass className="w-3 h-3 text-teal-600 animate-spin-slow" />
                                <span>Roadmap</span>
                              </span>
                            )}
                          </div>

                          {/* Meta Badges: Count, Creator, Compact Date */}
                          <div className="flex items-center flex-wrap gap-1.5 mt-1.5 text-[11px] font-bold text-slate-400">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                              📚 {quiz.questions_count} cards
                            </span>

                            <span className="text-slate-600 font-bold text-[11px] truncate max-w-[130px]">
                              @{quiz.creator_name || 'thanhnt'}
                            </span>

                            {formattedDate && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400 font-medium text-[10px]" title="Created / Updated date">
                                  {formattedDate}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Top-Right: Quick Archive button (Replaced redundant 3-dots button) */}
                        {activeTab === 'my' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(`Archive deck "${quiz.title}"?`)) {
                                archiveMutation.mutate(quiz.id)
                              }
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs active:scale-95"
                            title="Archive deck"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {activeTab === 'archived' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              archiveMutation.mutate(quiz.id)
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-900 border border-slate-200/60 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs active:scale-95"
                            title="Restore to active decks"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Middle Row: Progress presentation (Clean, high-contrast & sleek) */}
                      {activeTab !== 'discover' && (
                        <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-slate-100 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs font-black">
                            {hasStudied ? (
                              isMastered ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Mastered!</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-indigo-600">
                                  <span>⚡ Progress: {progressPct}%</span>
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 font-semibold">
                                ✨ Not started yet
                              </span>
                            )}

                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              {learned} / {quiz.questions_count}
                            </span>
                          </div>

                          {/* Progress Track */}
                          <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden p-0.5">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isMastered 
                                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-xs" 
                                  : hasStudied
                                  ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 shadow-xs shadow-indigo-200"
                                  : "bg-transparent"
                              )}
                              style={{ width: `${Math.max(hasStudied ? 6 : 0, progressPct)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bottom Action Row: Practice, Roadmap, Play CTA & Archive */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100/80">
                        {/* Left: Quick Practice & Roadmap */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {activeTab === 'my' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStudyTrigger(quiz, 'practice')
                                }}
                                className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Practice: MCQ, Typing, Listening"
                              >
                                <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Practice</span>
                              </button>

                              {quiz.has_roadmap && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/decks/${quiz.id}?tab=roadmap`)
                                  }}
                                  className="h-9 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-700 font-black text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Open daily roadmap"
                                >
                                  <Compass className="w-3.5 h-3.5 text-teal-600 animate-spin-slow" />
                                  <span className="hidden sm:inline">Roadmap</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Right: Primary Study CTA (Split Button with Default FSRS & Mode Selector Dropdown) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {activeTab === 'my' && (
                            <div className="inline-flex items-center rounded-xl shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 group/btn">
                              {/* Direct Launch Button: Default Deck Mode */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const defMode = quiz.practice_settings?.study_defaults?.learning_mode || quiz.default_mode || 'fsrs'
                                  if (defMode === 'mcq') navigate(`/practice/${quiz.id}/mcq`)
                                  else if (defMode === 'typing') navigate(`/practice/${quiz.id}/typing`)
                                  else if (defMode === 'listening') navigate(`/practice/${quiz.id}/listening`)
                                  else if (defMode === 'roadmap') navigate(`/flashcard/${quiz.id}/play?mode=roadmap`)
                                  else if (defMode === 'flip') navigate(`/flashcard/${quiz.id}/play?mode=flip`)
                                  else navigate(`/flashcard/${quiz.id}/play?mode=fsrs`)
                                }}
                                className="h-9 pl-3.5 pr-2.5 hover:bg-white/10 text-white font-black text-xs active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer select-none"
                                title="Study now with configured deck mode"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Study</span>
                              </button>

                              {/* Subtle Divider */}
                              <div className="w-[1px] h-4.5 bg-white/25 shrink-0" />

                              {/* Dropdown Arrow: Open Flashcard Modes Selection */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStudyTrigger(quiz, 'flashcard')
                                }}
                                className="h-9 px-2 hover:bg-white/15 text-white/90 hover:text-white active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer select-none"
                                title="Choose study mode (Roadmap, Flip card, Review, New...)"
                              >
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          )}

                          {activeTab === 'discover' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                enrollMutation.mutate(quiz.id)
                              }}
                              className="h-9 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Add to Decks</span>
                            </button>
                          )}

                          {activeTab === 'archived' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                archiveMutation.mutate(quiz.id)
                              }}
                              className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Restore to active decks"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ FIXED ACTION & PAGINATION TOOLBAR (ABOVE TABS) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3.5 sm:px-6 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center justify-between gap-2 min-h-[36px] px-3.5 sm:px-6 lg:px-8 xl:px-10">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 flex-1 animate-in fade-in duration-150">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by title, author, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-100/90 border border-indigo-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 shadow-inner"
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
              <button
                onClick={() => {
                  setSearchQuery('')
                  setIsSearchOpen(false)
                }}
                className="h-8.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Left on Mobile: Pagination Stepper; Left on Desktop: Results Summary */}
              <div className="flex items-center gap-3">
                {/* Mobile: Standard Left Stepper Pagination (Exactly as original) */}
                <div className="md:hidden">
                  <DeckPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>

                {/* Desktop: Results Summary */}
                <span className="text-xs font-bold text-slate-500 hidden md:inline">
                  Showing <span className="font-extrabold text-slate-800">{filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="font-extrabold text-slate-800">{filteredData.length}</span> decks
                </span>
              </div>

              {/* Center on Desktop: Numbered Pagination Stepper */}
              <div className="hidden md:flex items-center justify-center">
                <DeckPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>

              {/* Right: Quick Action Buttons on Mobile (Exact original styling and position) */}
              <div className="flex items-center gap-1.5 md:hidden">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className={cn(
                    "h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                    searchQuery 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-bold" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                  )}
                  title="Search decks"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="h-8.5 w-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Join study room"
                >
                  <Users className="w-4 h-4 text-purple-600" />
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-8.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center gap-1 text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  title="Create new deck"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="hidden sm:inline">New Deck</span>
                </button>
              </div>

              {/* Desktop Spacer to balance center alignment */}
              <div className="hidden md:block w-36" />
            </>
          )}
        </div>
      </div>

      {/* ═══════════ ONE-HAND CENTERED BOTTOM DOCKED TAB BAR (MOBILE ONLY) ═══════════ */}
      <div className="md:hidden shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3 sm:px-6 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center justify-center">
          <div className="grid grid-flow-col auto-cols-fr w-full max-w-sm sm:max-w-md bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
            {tabsConfig.map((tab) => {
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
                    isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDecksBottomTabPill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <TabIcon className={cn("w-3.5 h-3.5 relative z-10 shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
                  <span className="relative z-10 text-[11px] sm:text-xs truncate">{tab.label}</span>
                  <span className={cn(
                    "relative z-10 px-1.5 py-0.2 rounded-md text-[9px] font-black leading-none",
                    isActive ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
                  )}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ MODALS & BOTTOM SHEETS ═══════════ */}
      <DeckActionSheet
        isOpen={actionSheetQuiz !== null}
        onClose={() => setActionSheetQuiz(null)}
        deck={actionSheetQuiz}
        activeTab={activeTab}
        onStudy={(mode) => {
          if (actionSheetQuiz) {
            handleStudyTrigger(actionSheetQuiz, mode)
          }
        }}
        onArchive={(deckId) => archiveMutation.mutate(deckId)}
        onEnroll={(deckId) => enrollMutation.mutate(deckId)}
      />

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
    </div>
  )
}
