import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, LayoutGrid, ChevronRight, Filter, Archive, RotateCcw, Users, Play, ChevronLeft, Brain, Trophy, X, BrainCircuit, Zap, BookOpen, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface Quiz {
  id: number
  title: string
  description: string
  cover_image: string | null
  questions_count: number
  tags: string[]
  is_creator?: boolean
}

interface DashboardData {
  user: { id: number, username: string, email: string, role?: string }
  my_quizzes: Quiz[]
  archived_quizzes: Quiz[]
  discover_quizzes: Quiz[]
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
}

export default function Library() {
  const [activeTab, setActiveTab] = useState<'my' | 'discover' | 'archived'>('my')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
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

  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    retry: false
  })

  // Lock body overflow on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100vh'
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.style.height = '100vh'
      } else {
        document.body.style.overflow = ''
        document.body.style.height = ''
        document.documentElement.style.overflow = ''
        document.documentElement.style.height = ''
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, activeTag])

  const archiveMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/deck/${quizId}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })

  const enrollMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/deck/${quizId}/enroll`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })

  const handleJoinRoom = async () => {
    if (!roomCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/deck/room/join', { room_code: roomCode })
      navigate(`/room/${roomCode.toUpperCase()}`)
    } catch (e) {
      alert("Room not found or expired")
    } finally {
      setIsJoining(false)
    }
  }

  const allAvailableTags = useMemo(() => {
    const tags = new Set<string>()
    const allQuizzes = data ? [...data.my_quizzes, ...data.archived_quizzes, ...data.discover_quizzes] : []
    allQuizzes.forEach(q => q.tags?.forEach(t => tags.add(t)))
    const list = Array.from(tags)
    if (list.length === 0) {
      return ['JLPT', 'N2', 'N3', 'Vocabulary', 'Grammar']
    }
    return list.sort()
  }, [data])

  const filteredData = useMemo(() => {
    if (!data) return []
    const quizzes = (data[`${activeTab}_quizzes` as keyof DashboardData] || []) as Quiz[]
    return quizzes.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag = !activeTag || q.tags?.includes(activeTag)
      return matchesSearch && matchesTag
    })
  }, [data, activeTab, searchQuery, activeTag])

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

  if (error || (data && (data as any).error)) {
    window.location.href = '/login'
    return null
  }

  if (isLoading || !data) return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase italic bg-[#fafbfd]">
      📚 LOADING LIBRARY...
    </div>
  )

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#f8fafc] via-[#f1f6fa] to-[#f8fafc] min-h-[calc(100vh-6rem)] relative overflow-x-hidden md:overflow-hidden md:min-h-0 md:h-full">
      
      {/* Background blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-200/10 blur-[130px] pointer-events-none" />

      {/* MOBILE HEADER */}
      <div className="fixed top-0 left-0 right-0 z-[150] bg-white/80 backdrop-blur-xl border-b border-slate-100 md:hidden flex-shrink-0">
         <div className="px-4 py-4 flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 flex-shrink-0">
                   <BookOpen className="w-6 h-6 animate-pulse" />
                </div>
               <div>
                  <h1 className="text-[13px] font-black text-slate-800 leading-none mb-1">Thư viện bài học 📚</h1>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tìm kiếm & Khám phá</span>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <Link 
                  to="/manage"
                  className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-605 shadow-sm active:scale-90 transition-all"
                  title="Creator Studio"
               >
                  <Plus className="w-5 h-5" />
               </Link>
               <button 
                  onClick={() => setIsJoinModalOpen(true)}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-all"
               >
                  <Users className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* Search & Tabs Mixed Row */}
         <div className="px-4 pb-4 space-y-3">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm bộ thẻ..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
               />
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex-1 bg-slate-100/60 p-1 rounded-2xl flex items-center border border-slate-200/50">
                  {['my', 'discover', 'archived'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className="flex-1 py-2 rounded-xl text-[9px] font-black tracking-widest relative transition-all">
                      {activeTab === tab && <motion.div layoutId="tabMarkerMob" className="absolute inset-0 bg-white shadow-sm rounded-xl border border-slate-100" />}
                      <span className="relative z-10 uppercase">{tab === 'my' ? 'CỦA TÔI' : (tab === 'discover' ? 'KHÁM PHÁ' : 'ĐÃ LƯU')}</span>
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex w-full h-full overflow-hidden px-8 py-6 gap-8">
        
        {/* LEFT COLUMN: Tags filter & actions sidebar */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6 scrollbar-thin">
          
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-5 text-left relative overflow-hidden flex-shrink-0">
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md text-2xl">
                📚
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 leading-tight">Thư viện bộ thẻ</h2>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">Library Studio</span>
              </div>
            </div>
            
            <Link 
              to="/manage"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Creator Studio
            </Link>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 text-left flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search & Arena</span>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm bộ thẻ..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Users className="w-4 h-4" />
              Enter Arena Room
            </button>
          </div>

          {allAvailableTags.length > 0 && (
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-3.5 text-left flex-shrink-0">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lọc theo tag</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allAvailableTags.map(t => (
                  <button 
                    key={t} 
                    onClick={() => setActiveTag(activeTag === t ? null : t)} 
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border", 
                      activeTag === t 
                        ? "bg-slate-800 border-slate-800 text-white shadow-sm" 
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: Decks grid */}
        <section className="flex-1 h-full flex flex-col gap-5 overflow-hidden text-left">
          
          <div className="flex-shrink-0 bg-white border border-slate-200/60 p-2 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/30 flex-shrink-0">
              {['my', 'discover', 'archived'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={cn(
                    "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                    activeTab === tab 
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab === 'my' ? 'Bộ thẻ của tôi' : (tab === 'discover' ? 'Khám phá mới' : 'Đã lưu trữ')}
                </button>
              ))}
            </div>

            <div className="hidden xl:block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center truncate">
              {filteredData.length === 0 
                ? "Không tìm thấy bộ thẻ" 
                : `Hiển thị ${ (currentPage - 1) * itemsPerPage + 1 } - ${ Math.min(currentPage * itemsPerPage, filteredData.length) } của ${ filteredData.length } bộ thẻ`
              }
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 h-8.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Trước
              </button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, idx) => (
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400">...</span>
                  ) : (
                    <button 
                      key={`page-${p}`}
                      onClick={() => setCurrentPage(Number(p))}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                        currentPage === p 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                          : "text-slate-500 hover:bg-slate-100"
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
                className="px-3 h-8.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
              >
                Sau <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin">
            {filteredData.length === 0 ? (
              <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl mb-4">🔍</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ thẻ nào</h3>
                <p className="text-xs text-slate-400">Hãy thử từ khóa khác hoặc xóa bộ lọc tag.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-6">
                 <AnimatePresence mode="popLayout">
                    {paginatedData.map((quiz, idx) => (
                      <motion.div key={quiz.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.02 }}>
                        
                        <div className="group h-full flex flex-col justify-between bg-white rounded-[2rem] border border-slate-200/50 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 hover:-translate-y-1 transition-all relative overflow-hidden text-left">
                           <div>
                              <div className="flex items-start justify-between mb-5 mt-1">
                                 <Link to={`/flashcard/${quiz.id}`} className="block flex-shrink-0 transition-transform hover:scale-105" title="Vào Dashboard bộ thẻ">
                                   <div className={cn(
                                      "w-14 h-14 rounded-[1.25rem] overflow-hidden shadow-md transition-all",
                                      !quiz.cover_image && (
                                         idx % 5 === 0 ? "bg-gradient-to-br from-indigo-400 to-purple-500 shadow-indigo-100" :
                                         idx % 5 === 1 ? "bg-gradient-to-br from-rose-400 to-orange-500 shadow-rose-100" :
                                         idx % 5 === 2 ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-100" :
                                         idx % 5 === 3 ? "bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-100" :
                                         "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-100"
                                      )
                                   )}>
                                      {quiz.cover_image ? (
                                        <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white">
                                          <LayoutGrid className="w-7 h-7" />
                                        </div>
                                      )}
                                   </div>
                                 </Link>
                                 <div className="flex items-center gap-1.5">
                                   <button 
                                      onClick={() => {
                                        setSelectedStudyQuiz(quiz)
                                        setStudyModalTab('flashcard')
                                        setIsStudyModalOpen(true)
                                      }}
                                      className="px-3.5 py-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-700 text-white flex items-center gap-1 shadow-md shadow-indigo-100 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider"
                                   >
                                      <Brain className="w-3.5 h-3.5" />
                                      <span>Học</span>
                                   </button>
                                   <button 
                                      onClick={() => {
                                        setSelectedStudyQuiz(quiz)
                                        setStudyModalTab('practice')
                                        setIsStudyModalOpen(true)
                                      }}
                                      className="px-3.5 py-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center gap-1 shadow-md shadow-emerald-100 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider"
                                   >
                                      <Trophy className="w-3.5 h-3.5" />
                                      <span>Luyện</span>
                                   </button>
                                 </div>
                              </div>

                              <div className="flex-grow">
                                 <Link to={`/flashcard/${quiz.id}`} className="block hover:underline" title="Vào Dashboard bộ thẻ">
                                   <h3 className="text-sm font-black text-slate-800 hover:text-indigo-600 transition-colors leading-tight mb-2 truncate">{quiz.title}</h3>
                                 </Link>
                                 <div className="flex flex-wrap gap-1 mb-3">
                                    {quiz.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-slate-50 border border-slate-200/50 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-wider">#{t}</span>)}
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                   <BrainCircuit className="w-3.5 h-3.5 text-slate-350" />
                                   <span className="text-[10px] font-black text-slate-450 uppercase">{quiz.questions_count} Flashcards</span>
                                 </div>
                              </div>
                           </div>

                           <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2">
                                  {activeTab === 'discover' ? (
                                    <button 
                                      onClick={() => enrollMutation.mutate(quiz.id)} 
                                      className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-indigo-100 text-[9px] font-black uppercase tracking-wider active:scale-95 hover:scale-102"
                                      title="Đăng ký học bộ này"
                                    >
                                      Đăng ký
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => archiveMutation.mutate(quiz.id)} 
                                      className="w-8 h-8 bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200/50 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 hover:scale-105"
                                      title={activeTab === 'archived' ? 'Khôi phục bộ thẻ' : 'Lưu trữ bộ thẻ'}
                                    >
                                      {activeTab === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                              </div>
                              <Link to={`/flashcard/${quiz.id}`} className="hover:translate-x-1 transition-transform" title="Vào Dashboard bộ thẻ">
                                <ChevronRight className="w-4 h-4 text-slate-300 hover:text-indigo-600 transition-all" />
                              </Link>
                           </div>
                        </div>

                      </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
            )}
          </div>

        </section>

      </div>

      {/* MOBILE FEED CONTENT */}
      <div className="md:hidden px-4 w-full pt-[190px] flex-grow space-y-4 pb-20">
        {filteredData.length === 0 ? (
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-4xl mb-4">🔍</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ thẻ nào</h3>
            <p className="text-xs text-slate-400">Hãy thử từ khóa khác hoặc thay đổi bộ lọc.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
               {filteredData.map((quiz, idx) => (
                 <motion.div key={quiz.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}>
                    <div className="bg-white rounded-[1.75rem] border border-slate-200/60 p-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden flex items-center justify-between gap-3">
                      {/* Left Side: Clickable Cover, Title, Info */}
                      <div 
                        onClick={() => navigate(`/flashcard/${quiz.id}`)}
                        className="flex-1 min-w-0 flex items-center gap-3.5 text-left cursor-pointer"
                      >
                         <div className="w-13 h-13 rounded-2xl flex-shrink-0 overflow-hidden shadow-md transition-all relative">
                            {quiz.cover_image ? (
                              <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className={cn(
                                 "w-full h-full flex items-center justify-center text-white",
                                 idx % 5 === 0 ? "bg-gradient-to-br from-indigo-400 to-purple-500" :
                                 idx % 5 === 1 ? "bg-gradient-to-br from-rose-400 to-orange-500" :
                                 idx % 5 === 2 ? "bg-gradient-to-br from-emerald-400 to-teal-500" :
                                 idx % 5 === 3 ? "bg-gradient-to-br from-blue-400 to-cyan-500" :
                                 "bg-gradient-to-br from-amber-400 to-yellow-500"
                              )}>
                                 <LayoutGrid className="w-5.5 h-5.5" />
                              </div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h3 className="text-[12px] font-black text-slate-800 leading-tight mb-1 truncate">{quiz.title}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                               <div className="flex items-center gap-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                                  <BrainCircuit className="w-2.5 h-2.5 text-slate-455" />
                                  <span className="text-[7.5px] font-black text-slate-500 uppercase">{quiz.questions_count} Cards</span>
                                </div>
                               {quiz.tags?.[0] && <span className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[50px]">#{quiz.tags[0]}</span>}
                               {activeTab === 'discover' && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     enrollMutation.mutate(quiz.id)
                                   }}
                                   className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[7.5px] font-black uppercase tracking-wider flex items-center gap-0.5"
                                 >
                                   <Plus className="w-2 h-2" /> Đăng ký
                                 </button>
                               )}
                            </div>
                         </div>
                      </div>
                      
                      {/* Right Side: Stacked Action Buttons (Học on top, Luyện on bottom) */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                         <button 
                            onClick={() => {
                               setSelectedStudyQuiz(quiz)
                               setStudyModalTab('flashcard')
                               setIsStudyModalOpen(true)
                            }}
                            className="w-8.5 h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center active:scale-90 transition-all"
                            title="Học tập"
                         >
                            <Brain className="w-4 h-4" />
                         </button>
                         <button 
                            onClick={() => {
                               setSelectedStudyQuiz(quiz)
                               setStudyModalTab('practice')
                               setIsStudyModalOpen(true)
                            }}
                            className="w-8.5 h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center active:scale-90 transition-all"
                            title="Luyện tập"
                         >
                            <Trophy className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                 </motion.div>
               ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* JOIN ROOM MODAL */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Enter Arena Room</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enter Arena Room Code</label>
                   <input 
                     type="text" 
                     placeholder="e.g. AZ78K"
                     value={roomCode}
                     onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                     className="w-full h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
                   />
                </div>
                
                <button 
                  onClick={handleJoinRoom}
                  disabled={!roomCode || isJoining}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isJoining ? 'CONNECTING...' : 'ENTER ROOM NOW'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED STUDY MODE SELECTOR POPUP MODAL */}
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
              className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-6 sm:p-8 border border-slate-100 text-left overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-100/40 blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-5 relative z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Brain className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Study Console</h3>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Chọn phương pháp học tập</p>
                  </div>
                </div>
                <button onClick={() => setIsStudyModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 mb-4 flex-shrink-0">
                <h4 className="text-xs font-black text-indigo-600 leading-snug line-clamp-1">{selectedStudyQuiz.title}</h4>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black mt-0.5 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 text-slate-350" />
                  {selectedStudyQuiz.questions_count} câu hỏi trong bộ thẻ
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar min-h-0">
                {/* Tab selector inside modal */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                  <button 
                    onClick={() => setStudyModalTab('flashcard')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                      studyModalTab === 'flashcard' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-450 hover:text-slate-600"
                    )}
                  >
                    Flashcard Modes
                  </button>
                  <button 
                    onClick={() => setStudyModalTab('practice')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                      studyModalTab === 'practice' ? "bg-white text-emerald-650 shadow-sm" : "text-slate-450 hover:text-slate-600"
                    )}
                  >
                    Practice Modes
                  </button>
                </div>

                {/* ── FLASHCARD MODES ── */}
                {studyModalTab === 'flashcard' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { mode: 'fsrs', icon: '🧠', title: 'FSRS Spaced Repetition', desc: 'Học lặp lại ngắt quãng thông minh' },
                        { mode: 'roadmap', icon: '🗺️', title: 'Roadmap Mode', desc: 'Học theo lộ trình mục tiêu mỗi ngày' },
                        { mode: 'flip', icon: '🔄', title: 'Flip Card', desc: 'Lật thẻ ghi nhớ phản xạ tự do' },
                        { mode: 'review', icon: '📚', title: 'Review Only', desc: 'Chỉ ôn tập lại các thẻ cũ' },
                        { mode: 'new', icon: '✨', title: 'New Only', desc: 'Chỉ học các thẻ mới chưa biết' },
                      ].map(item => (
                        <button
                          key={item.mode}
                          onClick={() => {
                            setIsStudyModalOpen(false)
                            localStorage.setItem('quiz_learning_mode', item.mode)
                            navigate(`/flashcard/${selectedStudyQuiz.id}/play?mode=${item.mode}`)
                          }}
                          className="group flex items-start gap-3 p-3.5 rounded-2xl border border-slate-150/70 bg-white hover:border-indigo-500 hover:bg-indigo-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                        >
                          <span className="text-xl bg-slate-50 p-2 rounded-xl group-hover:scale-110 transition-all flex-shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-indigo-600 transition-colors truncate">{item.title}</span>
                            <span className="text-[8px] font-semibold text-slate-400 block leading-snug line-clamp-1">{item.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── PRACTICE MODES ── */}
                {studyModalTab === 'practice' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { mode: 'mcq', icon: '🎯', title: 'MCQ Test', desc: 'Trắc nghiệm phản xạ 4 đáp án' },
                        { mode: 'typing', icon: '⌨️', title: 'Typing Test', desc: 'Gõ từ vựng nhớ chi tiết' },
                        { mode: 'listening', icon: '🎧', title: 'Listening Test', desc: 'Nghe audio chọn đáp án' },
                      ].map(item => (
                        <button
                          key={item.mode}
                          onClick={() => {
                            setIsStudyModalOpen(false)
                            localStorage.setItem('vocab_practice_submode', item.mode)
                            navigate(`/practice/${selectedStudyQuiz.id}/${item.mode}`)
                          }}
                          className="group flex items-start gap-3 p-3.5 rounded-2xl border border-slate-150/70 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                        >
                          <span className="text-xl bg-slate-50 p-2 rounded-xl group-hover:scale-110 transition-all flex-shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-emerald-600 transition-colors truncate">{item.title}</span>
                            <span className="text-[8px] font-semibold text-slate-400 block leading-snug line-clamp-1">{item.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
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
