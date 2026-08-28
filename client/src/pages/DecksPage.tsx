import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, ChevronLeft, Archive, 
  RotateCcw, Users, Brain, Trophy, X, MoreHorizontal,
  Play, Sparkles, BookOpen, Layers, Eye, Check, Calendar
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
  learned_count?: number
  mastered_count?: number
  progress_percent?: number
  created_at?: string | null
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

  const tabsConfig: { id: DecksTab; label: string; count: number; icon: string }[] = [
    { id: 'my', label: 'Đang học', count: data?.my_quizzes?.length || 0, icon: '🎴' },
    { id: 'discover', label: 'Khám phá', count: data?.discover_quizzes?.length || 0, icon: '🌐' },
    { id: 'archived', label: 'Kho lưu', count: data?.archived_quizzes?.length || 0, icon: '📦' },
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
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
    <div className="fixed inset-0 top-0 bottom-[60px] md:relative md:inset-auto md:top-auto md:bottom-auto md:min-h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP PREMIUM APP-LIKE HEADER (SHRINK-0) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6">
          
          {/* Row 1: Header Brand & Actions */}
          <div className="flex items-center justify-between pt-2.5 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white text-base shadow-sm shadow-orange-500/20 shrink-0 font-bold">
                🎴
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Bộ Thẻ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 text-slate-600 text-[10px] font-black">
                  {filteredData.length}
                </span>
              </div>
            </div>

            {/* Quick Action Group */}
            <div className="flex items-center gap-1.5">
              {/* Search Toggle */}
              <button
                onClick={() => setIsSearchOpen(prev => !prev)}
                className={cn(
                  "w-8.5 h-8.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95",
                  isSearchOpen || searchQuery
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100"
                    : "bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100"
                )}
                title="Tìm kiếm bộ thẻ"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Arena Join */}
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="w-8.5 h-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 border border-slate-200/70 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                title="Tham gia phòng đấu"
              >
                <Users className="w-4 h-4" />
              </button>

              {/* Create Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] sm:text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">Tạo mới</span>
              </button>
            </div>
          </div>

          {/* Row 2: Collapsible Search Bar */}
          <AnimatePresence>
            {(isSearchOpen || searchQuery) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pb-2"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên bộ thẻ, tác giả, tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full h-9 pl-9 pr-8 bg-slate-100/90 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 3: Horizontal Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 pt-0.5">
            {activeTab === 'my' && (
              <>
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
                      "px-2.5 py-1 rounded-xl text-[10px] font-black transition-all shrink-0 border cursor-pointer select-none",
                      statusFilter === st.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                        : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
                <div className="w-[1px] h-4 bg-slate-200 shrink-0 mx-0.5" />
              </>
            )}

            {/* Tag Pills */}
            <button 
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer select-none",
                !activeTag 
                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs" 
                  : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
              )}
            >
              Tags
            </button>

            {allAvailableTags.map(tag => {
              const isActive = activeTag === tag
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(isActive ? null : tag)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border cursor-pointer select-none",
                    isActive
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                      : "bg-white border-slate-200/80 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40"
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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto">
          {/* Empty State */}
          {filteredData.length === 0 ? (
            <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-xs my-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-3">
                🔍
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">
                Không tìm thấy bộ thẻ
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Hãy thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc trạng thái.
              </p>
              {activeTab === 'discover' && (
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  + Tự tạo bộ thẻ mới
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((quiz, idx) => {
                  const learned = quiz.learned_count || 0
                  const total = quiz.questions_count || 1
                  const progressPct = quiz.progress_percent ?? Math.min(100, Math.round((learned / total) * 100))
                  const hasStudied = learned > 0
                  const isMastered = progressPct === 100
                  const formattedDate = formatDate(quiz.created_at)

                  return (
                    <motion.div
                      key={quiz.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.015 }}
                      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-3 sm:p-3.5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between gap-2 relative"
                    >
                      {/* Card Content Row */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div
                          onClick={() => navigate(`/decks/${quiz.id}`)}
                          className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl overflow-hidden border border-slate-100 shadow-2xs shrink-0 cursor-pointer group-hover:scale-102 transition-transform flex items-center justify-center"
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
                        </div>

                        {/* Deck Info */}
                        <div
                          onClick={() => navigate(`/decks/${quiz.id}`)}
                          className="flex-1 min-w-0 cursor-pointer text-left"
                        >
                          {/* Title */}
                          <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-snug">
                            {quiz.title}
                          </h3>

                          {/* Meta line: Card count, Creator, Date */}
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] font-bold text-slate-400">
                            <span className="text-indigo-600 font-extrabold">{quiz.questions_count} thẻ</span>
                            <span>•</span>
                            <span className="text-slate-600 truncate max-w-[120px]">
                              @{quiz.creator_name || (quiz.is_creator ? 'Bạn' : 'Hệ thống')}
                            </span>
                            {formattedDate && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400 font-medium">
                                  {formattedDate}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Progress Line (Clean inline without detached floating numbers) */}
                          {activeTab !== 'discover' && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1">
                              {hasStudied ? (
                                isMastered ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-black">
                                    <span>🌟 Thuộc 100%</span>
                                    <span className="text-slate-400 font-medium font-mono">({quiz.questions_count}/{quiz.questions_count})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-indigo-600 font-bold">
                                    <span>⚡ Đang học {progressPct}%</span>
                                    <span className="text-slate-400 font-medium font-mono">({learned}/{quiz.questions_count})</span>
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                                  <span>✨ Chưa học</span>
                                  <span className="text-slate-400 font-mono">(0/{quiz.questions_count})</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Buttons: Quick Play CTA + More Options */}
                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          {activeTab === 'my' && (
                            <button
                              onClick={() => handleStudyTrigger(quiz, 'flashcard')}
                              className="h-8.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              title="Học bộ thẻ này"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="hidden xs:inline">Học</span>
                            </button>
                          )}

                          {activeTab === 'discover' && (
                            <button
                              onClick={() => enrollMutation.mutate(quiz.id)}
                              className="h-8.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs shadow-orange-200 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm</span>
                            </button>
                          )}

                          {activeTab === 'archived' && (
                            <button
                              onClick={() => archiveMutation.mutate(quiz.id)}
                              className="h-8.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              title="Khôi phục"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3-Dots Action Sheet Trigger */}
                          <button
                            onClick={() => setActionSheetQuiz(quiz)}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all flex items-center justify-center cursor-pointer"
                            title="Tùy chọn khác"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Slim Bottom Progress Bar */}
                      {activeTab !== 'discover' && (
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300 rounded-full",
                              isMastered ? "bg-emerald-500" : "bg-indigo-600"
                            )}
                            style={{ width: `${Math.max(4, progressPct)}%` }}
                          />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ ONE-HAND BOTTOM DOCKED CONTROL BAR (SHRINK-0) ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-3 sm:px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left/Center: Segmented Tabs (Thumb Zone) */}
          <div className="flex-1 max-w-sm">
            <div className="grid grid-cols-3 w-full bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer",
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

          {/* Right: Distinct Standalone Pagination Stepper Component with Jump Modal */}
          <DeckPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

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
