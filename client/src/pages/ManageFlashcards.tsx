import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit3, Trash2, Search, Filter, LayoutGrid, ChevronRight, Archive, CheckCircle2, AlertCircle, BookOpen, MoreVertical, Image as ImageIcon, X, Settings as SettingsIcon, Layers, Download, Lock, Globe } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ManageFlashcardsProps {
  embedded?: boolean
}

export default function ManageFlashcards({ embedded = false }: ManageFlashcardsProps = {}) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newQuiz, setNewQuiz] = useState({ title: '', description: '', cover_image: '', is_public: false })
  const [activeExportDeckId, setActiveExportDeckId] = useState<number | null>(null)

  const { data: quizzes, isLoading } = useQuery<any[]>({
    queryKey: ['manage-quizzes'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data?only_created=true')
      return res.data.created_quizzes
    }
  })

  const totalDecks = quizzes?.length || 0
  const totalCards = quizzes?.reduce((acc, q) => acc + (q.questions_count || 0), 0) || 0
  const publicDecks = quizzes?.filter(q => q.is_public).length || 0

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this deck?')) return
    try {
      await axios.delete(`/api/v1/deck/${id}`)
      queryClient.invalidateQueries({ queryKey: ['manage-quizzes'] })
    } catch (err) {
      alert('Failed to delete deck')
    }
  }

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await axios.post('/api/v1/deck/create', newQuiz)
      setIsCreateModalOpen(false)
      setNewQuiz({ title: '', description: '', cover_image: '', is_public: false })
      queryClient.invalidateQueries({ queryKey: ['manage-quizzes'] })
    } catch (err) {
      alert('Failed to create deck')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredQuizzes = quizzes?.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 📱 MOBILE-FIRST APP LAYOUT (< md) */}
      <div className="md:hidden fixed inset-0 top-0 bottom-[60px] flex flex-col bg-slate-100/70 overflow-hidden z-[90]">
        
        {/* ═══════════ STICKY TOP CONTAINER (Header + Search + Stats Grid) ═══════════ */}
        <div className="bg-white border-b border-slate-200/80 shrink-0 z-30 shadow-xs">
          {/* Top Header */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-sm">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 leading-none">Quản Lý Bộ Thẻ 📚</h1>
                <span className="text-[9px] font-bold text-slate-400">Creator Studio</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                title="Tạo bộ thẻ mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo mới</span>
              </button>

              <Link 
                to="/decks?tab=import"
                className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs active:scale-95 transition-all"
                title="Import Excel"
              >
                <Archive className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bộ thẻ..." 
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
              />
            </div>
          </div>

          {/* Fixed 3-Column Vibrant Stats Cards */}
          <div className="px-3.5 pb-3 pt-1">
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Total Decks Card */}
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-2xl p-2.5 shadow-sm shadow-indigo-500/20 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest block mb-0.5">Bộ Thẻ</span>
                <span className="text-base font-black text-white leading-none">{totalDecks}</span>
                <span className="text-[8px] font-bold text-indigo-200 block mt-0.5">bộ thẻ tạo</span>
              </div>

              {/* Total Cards Card */}
              <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white rounded-2xl p-2.5 shadow-sm shadow-purple-500/20 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-purple-200 uppercase tracking-widest block mb-0.5">Tổng Thẻ</span>
                <span className="text-base font-black text-white leading-none">{totalCards}</span>
                <span className="text-[8px] font-bold text-purple-200 block mt-0.5">từ vựng</span>
              </div>

              {/* Public Decks Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-2.5 shadow-sm shadow-emerald-500/20 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-emerald-200 uppercase tracking-widest block mb-0.5">Công Khai</span>
                <span className="text-base font-black text-white leading-none">{publicDecks}</span>
                <span className="text-[8px] font-bold text-emerald-200 block mt-0.5">public deck</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ SCROLLABLE COLLECTIONS LIST ═══════════ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Bộ Thẻ Đã Tạo ({filteredQuizzes?.length || 0})
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Đang tải bộ thẻ...</p>
            </div>
          ) : filteredQuizzes?.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 text-center border border-slate-200 shadow-2xs">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <h3 className="text-sm font-black text-slate-800 mb-1">Chưa Có Bộ Thẻ Nào</h3>
              <p className="text-slate-500 font-medium text-[11px] mb-4">
                Không tìm thấy bộ thẻ nào phù hợp hoặc bạn chưa tạo bộ thẻ nào.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm inline-block"
              >
                Tạo Bộ Thẻ Mới 🚀
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuizzes?.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden text-left"
                >
                  {/* Top Accent Gradient Bar */}
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 inset-x-0" />

                  {/* Header: Cover + Title + Badges */}
                  <div className="flex items-start gap-3 pt-0.5">
                    <div className="w-13 h-13 rounded-2xl border bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {quiz.cover_image ? (
                        <img src={quiz.cover_image} alt={quiz.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h3 className="text-xs font-black text-slate-900 truncate tracking-tight">{quiz.title}</h3>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[9px] font-black shadow-2xs">
                          🎴 {quiz.questions_count || 0} thẻ
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black border shadow-2xs flex items-center gap-0.5",
                          quiz.is_public ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {quiz.is_public ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {quiz.is_public ? "Công khai" : "Riêng tư"}
                        </span>
                      </div>

                      {quiz.description && (
                        <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-1">
                          {quiz.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/decks/${quiz.id}?tab=cards`}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-xs active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3" />
                        <span>SỬA THẺ ({quiz.questions_count})</span>
                      </Link>

                      <Link
                        to={`/decks/${quiz.id}?tab=settings`}
                        className="p-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl active:scale-95 transition-all"
                        title="Cài đặt bộ thẻ"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setActiveExportDeckId(activeExportDeckId === quiz.id ? null : quiz.id)
                        }}
                        className="p-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl active:scale-95 transition-all relative"
                        title="Export Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {activeExportDeckId === quiz.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-[140]" 
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setActiveExportDeckId(null)
                            }}
                          />
                          <div className="absolute left-4 bottom-14 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-[150] animate-in fade-in duration-150 text-left">
                            <a 
                              href={`/api/v1/deck/${quiz.id}/export`} 
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveExportDeckId(null)
                              }}
                              className="block px-3 py-2 text-[9px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                            >
                              Export kèm IDs
                            </a>
                            <a 
                              href={`/api/v1/deck/${quiz.id}/export?exclude_ids=true`} 
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveExportDeckId(null)
                              }}
                              className="block px-3 py-2 text-[9px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-slate-100 uppercase tracking-wider"
                            >
                              Export sạch (Không IDs)
                            </a>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl active:scale-95 transition-all shrink-0"
                      title="Xóa bộ thẻ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shrink-0 z-30 shadow-lg">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-200 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Bộ Thẻ Mới 🚀</span>
          </button>
        </div>
      </div>

      {/* 💻 DESKTOP LAYOUT (>= md) */}
      <div className="hidden md:block pb-10">
        <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                 <LayoutGrid className="w-8 h-8" />
              </div>
              <div>
                 <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Creator Studio</h1>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Manage Your Collections</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest whitespace-nowrap"
              >
                 <Plus className="w-4 h-4" />
                 New Collection
              </button>
              <Link 
                to="/decks?tab=import"
                className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white text-[10px] font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-100 uppercase tracking-widest whitespace-nowrap"
              >
                 <Archive className="w-4 h-4" />
                 Import Excel
              </Link>
            </div>
          </div>
        </div>

        <div className="px-4 max-w-6xl mx-auto">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your collections..." 
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm transition-all" 
                 />
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{filteredQuizzes?.length || 0} Collections Found</span>
              </div>
           </div>

           {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[1,2,3].map(i => (
                    <div key={i} className="h-64 bg-white rounded-[2.5rem] border border-slate-100 animate-pulse" />
                 ))}
              </div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <AnimatePresence mode="popLayout">
                 {filteredQuizzes?.map((quiz) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={quiz.id} 
                      className="w-full"
                    >
                       {/* Desktop Card View */}
                       <div className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                          <div className="aspect-[16/9] bg-slate-50 relative overflow-hidden">
                             {quiz.cover_image ? (
                                <img src={quiz.cover_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80">
                                   <BookOpen className="w-12 h-12 text-white/40" />
                                </div>
                             )}
                             <div className="absolute top-4 left-4 flex gap-1.5">
                                <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-white/20">
                                   <span className="text-[10px] font-black text-indigo-600 uppercase">{quiz.questions_count} Cards</span>
                                </div>
                                <div className={cn(
                                   "px-2.5 py-1.5 rounded-xl shadow-sm border flex items-center justify-center backdrop-blur-md",
                                   quiz.is_public 
                                      ? "bg-emerald-500/95 border-emerald-400/20 text-white" 
                                      : "bg-amber-500/95 border-amber-400/20 text-white"
                                )} title={quiz.is_public ? "Public" : "Private"}>
                                   {quiz.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                </div>
                             </div>
                             <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                                <div className="relative">
                                   <button 
                                      onClick={(e) => {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         setActiveExportDeckId(activeExportDeckId === quiz.id ? null : quiz.id);
                                      }}
                                      className="w-9 h-9 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 shadow-sm border border-white/20 transition-all active:scale-90"
                                      title="Export Excel"
                                   >
                                      <Download className="w-4 h-4" />
                                   </button>
                                   {activeExportDeckId === quiz.id && (
                                      <>
                                         <div 
                                            className="fixed inset-0 z-[140]" 
                                            onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                               setActiveExportDeckId(null);
                                            }}
                                         />
                                         <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-[150] animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                                            <a 
                                               href={`/api/v1/deck/${quiz.id}/export`} 
                                               onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveExportDeckId(null);
                                               }}
                                               className="block px-4 py-2.5 text-[9px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-wider text-right"
                                            >
                                               Export with IDs (for updating)
                                            </a>
                                            <a 
                                               href={`/api/v1/deck/${quiz.id}/export?exclude_ids=true`} 
                                               onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveExportDeckId(null);
                                               }}
                                               className="block px-4 py-2.5 text-[9px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-slate-50 uppercase tracking-wider text-right"
                                            >
                                               Export clean (new import)
                                            </a>
                                         </div>
                                      </>
                                   )}
                                </div>
                                <button 
                                   onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDelete(quiz.id);
                                   }}
                                   className="w-9 h-9 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm border border-white/20 transition-all active:scale-90"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                          
                          <div className="p-6">
                             <div className="mb-4">
                                <h3 className="text-lg font-black text-slate-800 line-clamp-1 leading-tight">{quiz.title}</h3>
                                <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-2 leading-relaxed">
                                   {quiz.description || "No description provided for this collection."}
                                </p>
                             </div>
                             
                             <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                <Link 
                                   to={`/decks/${quiz.id}?tab=settings`}
                                   className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 text-[9px] font-black rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest border border-slate-100"
                                >
                                   <SettingsIcon className="w-3.5 h-3.5" />
                                   Settings
                                </Link>
                                <Link 
                                   to={`/decks/${quiz.id}?tab=cards`}
                                   className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[9px] font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100"
                                >
                                   <Layers className="w-3.5 h-3.5" />
                                   Cards
                                </Link>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 </AnimatePresence>
              </div>
           )}

           {!isLoading && filteredQuizzes?.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100">
                 <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                 <h3 className="text-xl font-black text-slate-800 uppercase italic">Empty Studio</h3>
                 <p className="text-slate-400 text-sm font-medium mt-2">No collections match your search or you haven't created any yet.</p>
                 <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest"
                 >
                    Create Your First Deck
                 </button>
              </div>
           )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
         {isCreateModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
               />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
               >
                  <div className="p-8">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h2 className="text-xl font-black text-slate-800 uppercase italic">Create New Deck</h2>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Define your collection baseline</p>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                           <X className="w-5 h-5" />
                        </button>
                     </div>

                     <form onSubmit={handleCreateQuiz} className="space-y-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deck Title</label>
                           <input 
                              required
                              type="text" 
                              value={newQuiz.title}
                              onChange={(e) => setNewQuiz({...newQuiz, title: e.target.value})}
                              placeholder="e.g. Advanced Kanji N1"
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                           />
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                           <textarea 
                              value={newQuiz.description}
                              onChange={(e) => setNewQuiz({...newQuiz, description: e.target.value})}
                              placeholder="What is this collection about?"
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none h-32 resize-none transition-all"
                           />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                            <div className="relative">
                               <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                               <input 
                                  type="text" 
                                  value={newQuiz.cover_image}
                                  onChange={(e) => setNewQuiz({...newQuiz, cover_image: e.target.value})}
                                  placeholder="https://images.unsplash.com/..."
                                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                               />
                            </div>
                         </div>

                         <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <input 
                               type="checkbox" 
                               id="isPublic"
                               checked={newQuiz.is_public}
                               onChange={(e) => setNewQuiz({...newQuiz, is_public: e.target.checked})}
                               className="w-5 h-5 text-indigo-600 bg-white border-slate-200 rounded focus:ring-indigo-500"
                            />
                            <div className="flex flex-col">
                               <label htmlFor="isPublic" className="text-xs font-black text-slate-700 select-none cursor-pointer">
                                  Public Deck
                               </label>
                               <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                                  If unchecked, only you will be able to see and access this collection.
                               </span>
                            </div>
                         </div>

                        <button 
                           disabled={isSubmitting}
                           type="submit"
                           className="w-full py-5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                           {isSubmitting ? 'INITIALIZING...' : 'START CREATING'}
                        </button>
                     </form>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  )
}
