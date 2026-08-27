import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, ChevronLeft, Archive, 
  RotateCcw, Users, Brain, Trophy, X, BrainCircuit, 
  Eye, CheckCircle2, Sparkles, User as UserIcon, BookOpen, Layers
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

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
  learned_count?: number
  mastered_count?: number
  progress_percent?: number
  last_studied_at?: string | null
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
export type StatusFilter = 'all' | 'learning' | 'unlearned' | 'mastered'

export default function DecksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as DecksTab
  const activeTab: DecksTab = ['my', 'discover', 'archived'].includes(tabParam) ? tabParam : 'my'

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  
  // Unified Study Popup State
  const [selectedStudyQuiz, setSelectedStudyQuiz] = useState<Quiz | null>(null)
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false)
  const [studyModalTab, setStudyModalTab] = useState<'flashcard' | 'practice'>('flashcard')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 

  const { setUser, setGamify, updateUserSettings } = useAppStore()
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

  const handleJoinRoom = async () => {
    if (!roomCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/deck/room/join', { room_code: roomCode })
      navigate(`/room/${roomCode.toUpperCase()}`)
    } catch (e) {
      alert("Phòng không tồn tại hoặc đã hết hạn!")
    } finally {
      setIsJoining(false)
    }
  }

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
      if (statusFilter === 'learning') {
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

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  const tabsConfig: { id: DecksTab; label: string; count: number; icon: string }[] = [
    { id: 'my', label: 'Đang học', count: data?.my_quizzes?.length || 0, icon: '🎴' },
    { id: 'discover', label: 'Khám phá', count: data?.discover_quizzes?.length || 0, icon: '🌐' },
    { id: 'archived', label: 'Đã ẩn', count: data?.archived_quizzes?.length || 0, icon: '📦' },
  ]

  if (error || (data && (data as any).error)) {
    window.location.href = '/login'
    return null
  }

  if (isLoading || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase italic bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <span>📚 LOADING DECKS LIBRARY...</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28">
      {/* ═══════════ TOP COMPACT STICKY BAR ═══════════ */}
      <div className="sticky top-0 md:top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Row: Title, Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2.5 pb-2">
            {/* Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xs text-sm sm:text-base shrink-0">
                📚
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Thư Viện Bộ Thẻ</h1>
                <p className="text-[10px] font-bold text-slate-400 hidden sm:block">Khám phá và theo dõi tiến độ học tập</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => navigate('/create')}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo bộ thẻ</span>
              </button>

              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-2xs active:scale-95 transition-all"
                title="Tham gia phòng đấu Arena"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phòng đấu</span>
              </button>
            </div>
          </div>

          {/* Middle Row: 3 Main Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            {/* 3 Main Tabs: Đang học / Khám phá / Đã ẩn */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/60 overflow-x-auto no-scrollbar shrink-0">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all shrink-0 select-none",
                      isActive
                        ? "text-indigo-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDecksTabPill"
                        className="absolute inset-0 bg-white rounded-lg shadow-2xs border border-slate-200/80"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10 text-xs">{tab.icon}</span>
                    <span className="relative z-10 uppercase">{tab.label}</span>
                    <span className={cn(
                      "relative z-10 px-1.5 py-0.2 rounded-md text-[10px] font-black",
                      isActive ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm theo tên hoặc người tạo..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8.5 pl-8.5 pr-8 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Filter Row: Status Filters & Tags */}
          <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar pt-0.5 border-t border-slate-100/80">
            {/* Status Filter Chips (Only relevant for "my" tab) */}
            {activeTab === 'my' && (
              <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-slate-200">
                {[
                  { id: 'all' as StatusFilter, label: 'Tất cả' },
                  { id: 'learning' as StatusFilter, label: '⚡ Đang học' },
                  { id: 'unlearned' as StatusFilter, label: '✨ Chưa học' },
                  { id: 'mastered' as StatusFilter, label: '🌟 Đã thuộc' },
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[10px] font-black transition-all shrink-0 border",
                      statusFilter === st.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                        : "bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tag Filter Chips */}
            <button 
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border",
                !activeTag 
                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs" 
                  : "bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200/70"
              )}
            >
              Tất cả tags
            </button>
            {allAvailableTags.map(tag => {
              const isActive = activeTag === tag
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(isActive ? null : tag)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border",
                    isActive
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                      : "bg-white border-slate-200/80 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50"
                  )}
                >
                  #{tag}
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* ═══════════ MAIN CONTENT GRID ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        
        {/* Decks List / Cards Grid */}
        {filteredData.length === 0 ? (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-xs">
            <span className="text-4xl mb-3">🔍</span>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ thẻ phù hợp</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">Hãy thử tìm từ khóa khác hoặc xóa bộ lọc trạng thái/tag.</p>
            {activeTab === 'discover' && (
              <button 
                onClick={() => navigate('/create')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-100 transition-all"
              >
                + Tự tạo bộ thẻ mới
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4.5">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((quiz, idx) => {
                  const isCreator = quiz.is_creator || quiz.owner_id === data.user?.id || quiz.creator_id === data.user?.id
                  const creatorDisplayName = quiz.creator_name || (isCreator ? data.user?.username : 'Hệ thống')
                  
                  const learned = quiz.learned_count || 0
                  const mastered = quiz.mastered_count || 0
                  const total = quiz.questions_count || 1
                  const progressPct = quiz.progress_percent ?? Math.min(100, Math.round((learned / total) * 100))
                  const masteredPct = Math.min(100, Math.round((mastered / total) * 100))
                  const hasStudied = learned > 0

                  return (
                    <motion.div
                      key={quiz.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group flex flex-col justify-between bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all relative overflow-hidden"
                    >
                      {/* Top Row: Cover, Info & Creator */}
                      <div>
                        <div className="flex items-start gap-3 mb-2.5">
                          {/* Deck Cover Thumbnail */}
                          <Link 
                            to={`/decks/${quiz.id}`}
                            className="w-13 h-13 rounded-2xl overflow-hidden shadow-2xs border border-slate-100 shrink-0 relative group-hover:scale-102 transition-transform"
                            title="Xem chi tiết bộ thẻ"
                          >
                            {quiz.cover_image ? (
                              <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className={cn(
                                "w-full h-full flex items-center justify-center text-white text-base font-bold",
                                idx % 5 === 0 ? "bg-gradient-to-br from-indigo-500 to-purple-600" :
                                idx % 5 === 1 ? "bg-gradient-to-br from-rose-500 to-orange-500" :
                                idx % 5 === 2 ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                                idx % 5 === 3 ? "bg-gradient-to-br from-blue-500 to-cyan-600" :
                                "bg-gradient-to-br from-amber-500 to-yellow-600"
                              )}>
                                🎴
                              </div>
                            )}
                          </Link>

                          {/* Deck Title, Creator & Badges */}
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/decks/${quiz.id}`}
                              className="text-xs sm:text-sm font-black text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2 leading-tight block"
                              title={quiz.title}
                            >
                              {quiz.title}
                            </Link>

                            {/* Creator Name Display */}
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-500 truncate">
                              <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {isCreator ? `@${creatorDisplayName} (Bạn)` : `@${creatorDisplayName}`}
                              </span>
                            </div>

                            {/* Card Count & Type */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/60 rounded-md text-[9px] font-black">
                                🎴 {quiz.questions_count} thẻ
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Deck Tags */}
                        {quiz.tags && quiz.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {quiz.tags.slice(0, 3).map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200/50 rounded text-[8px] font-black text-slate-500 uppercase tracking-wider">
                                #{t}
                              </span>
                            ))}
                            {quiz.tags.length > 3 && (
                              <span className="px-1 py-0.5 text-[8px] font-bold text-slate-400">
                                +{quiz.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Progress Section (Only for "my" and "archived" tabs) */}
                        {activeTab !== 'discover' && (
                          <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-2.5 mb-3">
                            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                              {hasStudied ? (
                                progressPct === 100 ? (
                                  <span className="flex items-center gap-1 text-emerald-600 font-black">
                                    <CheckCircle2 className="w-3 h-3" /> Thuộc 100%
                                  </span>
                                ) : (
                                  <span className="text-indigo-600 font-black">
                                    ⚡ Đang học ({progressPct}%)
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 font-bold">
                                  ✨ Chưa bắt đầu học
                                </span>
                              )}

                              <span className="text-slate-500 font-mono text-[9px]">
                                {learned}/{quiz.questions_count} thẻ
                              </span>
                            </div>

                            {/* Two-tone Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden flex">
                              {masteredPct > 0 && (
                                <div 
                                  className="h-full bg-amber-500 transition-all duration-500" 
                                  style={{ width: `${masteredPct}%` }}
                                  title={`Đã thuộc: ${mastered} thẻ`}
                                />
                              )}
                              {progressPct > masteredPct && (
                                <div 
                                  className="h-full bg-indigo-600 transition-all duration-500" 
                                  style={{ width: `${progressPct - masteredPct}%` }}
                                  title={`Đang học: ${learned - mastered} thẻ`}
                                />
                              )}
                            </div>

                            {hasStudied && mastered > 0 && (
                              <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mt-1">
                                <span>Thuộc: {mastered} thẻ</span>
                                <span>Cần ôn: {learned - mastered} thẻ</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons (Compact & Harmonious) */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        
                        {/* TAB: ĐANG HỌC (MY DECKS) */}
                        {activeTab === 'my' && (
                          <>
                            <div className="flex items-center gap-1.5 flex-1">
                              {/* Học Button (Sleek Compact Pill) */}
                              <button
                                onClick={() => {
                                  setSelectedStudyQuiz(quiz)
                                  setStudyModalTab('flashcard')
                                  setIsStudyModalOpen(true)
                                }}
                                className="flex-1 h-8 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-black text-[11px] shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Brain className="w-3.5 h-3.5" />
                                <span>Học</span>
                              </button>

                              {/* Luyện Button */}
                              <button
                                onClick={() => {
                                  setSelectedStudyQuiz(quiz)
                                  setStudyModalTab('practice')
                                  setIsStudyModalOpen(true)
                                }}
                                className="h-8 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl font-black text-[11px] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="Luyện tập trắc nghiệm & gõ từ"
                              >
                                <Trophy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Luyện</span>
                              </button>
                            </div>

                            {/* Utility Buttons: Chi tiết & Ẩn */}
                            <div className="flex items-center gap-1">
                              <Link
                                to={`/decks/${quiz.id}`}
                                className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200/60 flex items-center justify-center"
                                title="Xem chi tiết bộ thẻ"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                              
                              <button
                                onClick={() => archiveMutation.mutate(quiz.id)}
                                className="h-8 w-8 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all border border-slate-200/60 flex items-center justify-center cursor-pointer"
                                title="Ẩn vào kho lưu trữ"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}

                        {/* TAB: KHÁM PHÁ (DISCOVER) */}
                        {activeTab === 'discover' && (
                          <>
                            <button
                              onClick={() => enrollMutation.mutate(quiz.id)}
                              className="flex-1 h-8 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-black text-[11px] shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Thêm vào học</span>
                            </button>

                            <Link
                              to={`/decks/${quiz.id}`}
                              className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 rounded-xl font-black text-[11px] transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem</span>
                            </Link>
                          </>
                        )}

                        {/* TAB: ĐÃ ẨN (ARCHIVED) */}
                        {activeTab === 'archived' && (
                          <>
                            <button
                              onClick={() => archiveMutation.mutate(quiz.id)}
                              className="flex-1 h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[11px] shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Khôi phục học</span>
                            </button>

                            <Link
                              to={`/decks/${quiz.id}`}
                              className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200/60 flex items-center justify-center"
                              title="Chi tiết bộ thẻ"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </>
                        )}

                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-8 border-t border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-400">
                  Trang {currentPage} / {totalPages} ({filteredData.length} bộ thẻ)
                </span>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Trước
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, idx) => (
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-400">...</span>
                      ) : (
                        <button 
                          key={`page-${p}`}
                          onClick={() => setCurrentPage(Number(p))}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all cursor-pointer",
                            currentPage === p 
                              ? "bg-indigo-600 text-white shadow-2xs" 
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {p}
                        </button>
                      )
                    ))}
                  </div>

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    Sau <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══════════ JOIN ROOM ARENA MODAL ═══════════ */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl relative z-10 p-6 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tham Gia Phòng Đấu</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer">
                   <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-5">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Nhập mã phòng Arena</label>
                   <input 
                     type="text" 
                     placeholder="VD: AZ78K"
                     value={roomCode}
                     onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                     className="w-full h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 text-xl font-black tracking-[0.25em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-xs"
                   />
                </div>
                
                <button 
                  onClick={handleJoinRoom}
                  disabled={!roomCode || isJoining}
                  className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none cursor-pointer"
                >
                  {isJoining ? 'ĐANG KẾT NỐI...' : 'VÀO PHÒNG NGAY 🚀'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════ UNIFIED STUDY MODE SELECTOR POPUP ═══════════ */}
      <AnimatePresence>
        {isStudyModalOpen && selectedStudyQuiz && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsStudyModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative z-10 p-5 sm:p-6 border border-slate-100 text-left overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Brain className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight leading-tight">
                      {studyModalTab === 'flashcard' ? 'Study Console' : 'Practice Console'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {studyModalTab === 'flashcard' ? 'Chọn phương pháp học tập' : 'Chọn chế độ luyện tập'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsStudyModalOpen(false)} 
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                   <X className="w-4 h-4" />
                </button>
              </div>

              {/* Deck Info Banner */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-3 shrink-0 text-left">
                <h4 className="text-xs sm:text-sm font-black text-indigo-700 tracking-wide line-clamp-1">{selectedStudyQuiz.title}</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
                  {selectedStudyQuiz.questions_count} câu hỏi trong bộ thẻ
                </p>
              </div>

              {/* Mode Options List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-0">
                {studyModalTab === 'flashcard' && (
                  <div className="space-y-2">
                    {[
                      { mode: 'fsrs', icon: '🧠', title: 'FSRS Spaced Repetition', desc: 'Học lặp lại ngắt quãng thông minh' },
                      { mode: 'roadmap', icon: '🗺️', title: 'Roadmap Mode', desc: 'Học theo lộ trình mục tiêu mỗi ngày' },
                      { mode: 'flip', icon: '🔄', title: 'Flip Card', desc: 'Lật thẻ ghi nhớ phản xạ tự do' },
                      { mode: 'review', icon: '📚', title: 'Review Only', desc: 'Chỉ ôn tập lại các thẻ cũ' },
                      { mode: 'new', icon: '✨', title: 'New Only', desc: 'Chỉ học các thẻ mới chưa biết' },
                    ].filter(item => {
                      const disabled = (selectedStudyQuiz as any).practice_settings?.disabled_modes || [];
                      return !disabled.includes(item.mode);
                    }).map(item => (
                      <button
                        key={item.mode}
                        onClick={() => {
                          setIsStudyModalOpen(false)
                          updateUserSettings({ quiz_learning_mode: item.mode as any })
                          navigate(`/flashcard/${selectedStudyQuiz.id}/play?mode=${item.mode}`)
                        }}
                        className="group w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-indigo-500/35 hover:bg-indigo-50/10 hover:shadow-xs active:scale-[0.99] transition-all text-left shadow-2xs cursor-pointer"
                      >
                        <span className="text-lg w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all shrink-0">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-indigo-600 transition-colors truncate">{item.title}</span>
                          <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">{item.desc}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {studyModalTab === 'practice' && (
                  <div className="space-y-2">
                    {[
                      { mode: 'mcq', icon: '🎯', title: 'MCQ Test', desc: 'Trắc nghiệm phản xạ 4 đáp án' },
                      { mode: 'typing', icon: '⌨️', title: 'Typing Test', desc: 'Gõ từ vựng nhớ chi tiết' },
                      { mode: 'listening', icon: '🎧', title: 'Listening Test', desc: 'Nghe audio chọn đáp án' },
                    ].filter(item => {
                      const disabled = (selectedStudyQuiz as any).practice_settings?.disabled_modes || [];
                      return !disabled.includes(item.mode);
                    }).map(item => (
                      <button
                        key={item.mode}
                        onClick={() => {
                          setIsStudyModalOpen(false)
                          updateUserSettings({ practice_submode: item.mode as any })
                          navigate(`/practice/${selectedStudyQuiz.id}/${item.mode}`)
                        }}
                        className="group w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-emerald-500/35 hover:bg-emerald-50/10 hover:shadow-xs active:scale-[0.99] transition-all text-left shadow-2xs cursor-pointer"
                      >
                        <span className="text-lg w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all shrink-0">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-800 block group-hover:text-emerald-600 transition-colors truncate">{item.title}</span>
                          <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">{item.desc}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
