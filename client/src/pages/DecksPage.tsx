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
import { DeckStudyModal, DeckJoinRoomModal, DeckCreateModal } from '@/components/deck/modals'

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
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
    <div className="min-h-screen bg-[#F8FAFC] pb-20 sm:pb-12">
      {/* ═══════════ TOP COMPACT STICKY BAR ═══════════ */}
      <div className="sticky top-0 md:top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Top Row: Title, Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2.5 pb-2">
            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xs text-sm shrink-0">
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
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo bộ thẻ</span>
              </button>

              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                title="Tham gia phòng đấu Arena"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phòng đấu</span>
              </button>
            </div>
          </div>

          {/* Middle Row: 3 Centered Full-Width Equal Segmented Tabs */}
          <div className="pb-2">
            <div className="grid grid-cols-3 w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 rounded-lg text-xs font-black tracking-tight transition-all select-none cursor-pointer",
                      isActive
                        ? "text-indigo-600"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDecksTabPill"
                        className="absolute inset-0 bg-white rounded-lg shadow-2xs border border-slate-200/80"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10 text-xs hidden xs:inline">{tab.icon}</span>
                    <span className="relative z-10 text-[11px] sm:text-xs truncate">{tab.label}</span>
                    <span className={cn(
                      "relative z-10 px-1.5 py-0.2 rounded-md text-[9px] sm:text-[10px] font-black leading-none",
                      isActive ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search Bar & Tag/Status Filters in compact single row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pb-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên bộ thẻ..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status & Tag Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0">
              {activeTab === 'my' && (
                <div className="flex items-center gap-1 shrink-0 pr-1 border-r border-slate-200">
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
                        "px-2 py-0.5 rounded-lg text-[10px] font-black transition-all shrink-0 border cursor-pointer",
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

              {/* Tag Chips */}
              <button 
                onClick={() => setActiveTag(null)}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer",
                  !activeTag 
                    ? "bg-slate-900 border-slate-900 text-white shadow-2xs" 
                    : "bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200/70"
                )}
              >
                Tags
              </button>
              {allAvailableTags.slice(0, 8).map(tag => {
                const isActive = activeTag === tag
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(isActive ? null : tag)}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer",
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
      </div>

      {/* ═══════════ MAIN CONTENT LIST ═══════════ */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
        
        {/* Empty State */}
        {filteredData.length === 0 ? (
          <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center shadow-xs">
            <span className="text-3xl mb-2">🔍</span>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Không tìm thấy bộ thẻ phù hợp</h3>
            <p className="text-[11px] text-slate-400 max-w-sm mb-3">Hãy thử tìm từ khóa khác hoặc xóa bộ lọc trạng thái/tag.</p>
            {activeTab === 'discover' && (
              <button 
                onClick={() => navigate('/create')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
              >
                + Tự tạo bộ thẻ mới
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact Deck Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.015 }}
                      className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs hover:shadow-sm hover:border-indigo-200 transition-all relative flex flex-col justify-between gap-2.5"
                    >
                      {/* Top Row: Thumbnail + Info */}
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Compact Thumbnail */}
                        <Link 
                          to={`/decks/${quiz.id}`}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-2xs border border-slate-100 shrink-0 relative group-hover:scale-102 transition-transform flex items-center justify-center"
                          title="Xem chi tiết bộ thẻ"
                        >
                          {quiz.cover_image ? (
                            <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className={cn(
                              "w-full h-full flex items-center justify-center text-white text-sm font-bold",
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

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <Link 
                              to={`/decks/${quiz.id}`}
                              className="text-xs sm:text-sm font-black text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 leading-snug"
                              title={quiz.title}
                            >
                              {quiz.title}
                            </Link>

                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200/60 rounded text-[9px] font-bold shrink-0">
                              {quiz.questions_count} thẻ
                            </span>
                          </div>

                          {/* Sub-line: Creator only for discover tab, or progress info for my/archived */}
                          {activeTab === 'discover' ? (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-slate-400 truncate">
                              <span>Bởi @{creatorDisplayName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[10px] font-bold mt-0.5 text-slate-500">
                              <span>
                                {hasStudied ? (
                                  progressPct === 100 ? (
                                    <span className="text-emerald-600 font-black">🌟 Thuộc 100%</span>
                                  ) : (
                                    <span className="text-indigo-600 font-bold">⚡ Đang học ({progressPct}%)</span>
                                  )
                                ) : (
                                  <span className="text-slate-400">✨ Chưa học</span>
                                )}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400">
                                {learned}/{quiz.questions_count}
                              </span>
                            </div>
                          )}

                          {/* Mini Progress Bar (for my and archived tabs) */}
                          {activeTab !== 'discover' && (
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex mt-1">
                              {masteredPct > 0 && (
                                <div 
                                  className="h-full bg-amber-500 transition-all duration-300" 
                                  style={{ width: `${masteredPct}%` }}
                                />
                              )}
                              {progressPct > masteredPct && (
                                <div 
                                  className="h-full bg-indigo-600 transition-all duration-300" 
                                  style={{ width: `${progressPct - masteredPct}%` }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Row: Compact, Non-Intrusive Buttons */}
                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                        
                        {/* TAB: ĐANG HỌC (MY DECKS) */}
                        {activeTab === 'my' && (
                          <>
                            <div className="flex items-center gap-1 flex-1">
                              {/* Học Button (Compact Pill) */}
                              <button
                                onClick={() => {
                                  setSelectedStudyQuiz(quiz)
                                  setStudyModalTab('flashcard')
                                  setIsStudyModalOpen(true)
                                }}
                                className="flex-1 h-7.5 px-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-black text-[11px] shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
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
                                className="h-7.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 rounded-lg font-black text-[10px] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="Luyện tập trắc nghiệm & gõ từ"
                              >
                                <Trophy className="w-3 h-3" />
                                <span>Luyện</span>
                              </button>
                            </div>

                            {/* Utility Buttons: Chi tiết & Ẩn */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Link
                                to={`/decks/${quiz.id}`}
                                className="h-7.5 w-7.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all border border-slate-200/60 flex items-center justify-center"
                                title="Xem chi tiết bộ thẻ"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                              
                              <button
                                onClick={() => archiveMutation.mutate(quiz.id)}
                                className="h-7.5 w-7.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all border border-slate-200/60 flex items-center justify-center cursor-pointer"
                                title="Ẩn vào kho lưu trữ"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}

                        {/* TAB: KHÁM PHÁ (DISCOVER) */}
                        {activeTab === 'discover' && (
                          <>
                            <button
                              onClick={() => enrollMutation.mutate(quiz.id)}
                              className="flex-1 h-7.5 px-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg font-black text-[11px] shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Thêm vào học</span>
                            </button>

                            <Link
                              to={`/decks/${quiz.id}`}
                              className="h-7.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 rounded-lg font-black text-[10px] transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem</span>
                            </Link>
                          </>
                        )}

                        {/* TAB: ĐÃ ẨN (ARCHIVED) */}
                        {activeTab === 'archived' && (
                          <>
                            <button
                              onClick={() => archiveMutation.mutate(quiz.id)}
                              className="flex-1 h-7.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-[11px] shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Khôi phục học</span>
                            </button>

                            <Link
                              to={`/decks/${quiz.id}`}
                              className="h-7.5 w-7.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all border border-slate-200/60 flex items-center justify-center"
                              title="Chi tiết bộ thẻ"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </>
                        )}

                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Pagination Controls only if needed and compact */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 pb-4 text-slate-400">
                <span className="text-[10px] font-bold">
                  {filteredData.length} bộ thẻ
                </span>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-[10px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" /> Trước
                  </button>
                  
                  <span className="px-2 text-[10px] font-bold text-slate-600">
                    {currentPage} / {totalPages}
                  </span>

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-[10px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    Sau <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

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
    </div>
  )
}
