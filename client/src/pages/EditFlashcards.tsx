import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'
import { 
  Save, 
  ChevronLeft, 
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  Zap,
  AlertCircle,
  FileText,
  CheckCircle2,
  Brain,
  Filter,
  Check,
  X,
  Layers,
  Image as ImageIcon,
  Music,
  Sparkles,
  Download,
  Upload
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

const EditFlashcards = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const [editingFlashcard, setEditingFlashcard] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [isUpdatingExcel, setIsUpdatingExcel] = useState(false)
  const [excelUpdateError, setExcelUpdateError] = useState<string | null>(null)
  const [excelUpdateSuccess, setExcelUpdateSuccess] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExcelUpdateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUpdatingExcel(true)
    setExcelUpdateError(null)
    setExcelUpdateSuccess(false)
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await axios.post(`/api/v1/deck/${id}/import-update`, formData)
      if (res.data.status === 'ok') {
        setExcelUpdateSuccess(true)
        fetchFlashcards()
        setTimeout(() => setExcelUpdateSuccess(false), 3000)
      } else {
        throw new Error(res.data.error || "Cập nhật thất bại.")
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Lỗi khi đồng bộ thẻ từ file Excel."
      setExcelUpdateError(msg)
    } finally {
      setIsUpdatingExcel(false)
      e.target.value = ''
    }
  }

  const fetchFlashcards = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`/api/v1/deck/${id}/flashcards`, {
        params: { page, size: 50, search }
      })
      setFlashcards(res.data.flashcards || res.data.questions || [])
      setTotal(res.data.total)
    } catch (err) {
      setError('Failed to fetch flashcards')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFlashcards()
  }, [id, page, search])

  const openEditModal = (q: any) => {
    let parsedOthers: any = {}
    if (q.others) {
      try {
        parsedOthers = typeof q.others === 'string' ? JSON.parse(q.others) : q.others
      } catch (e) {
        console.error("Failed to parse others field", e)
      }
    }
    setEditingFlashcard({
      ...q,
      others: {
        back_img: '',
        back_audio_url: '',
        front_audio_content: '',
        back_audio_content: '',
        ...parsedOthers
      }
    })
  }

  const handleUpdate = async (updatedData: any) => {
    if (!updatedData) return
    setIsSaving(true)
    try {
      const updatedOptions = (updatedData.options || []).map((opt: any) => {
        if (opt.is_correct) {
          return { ...opt, content: updatedData.explanation }
        }
        return opt
      })

      const finalOthers = { ...updatedData.others }

      await axios.patch(`/api/v1/deck/flashcard/${updatedData.id}`, {
        content: updatedData.content,
        explanation: updatedData.explanation,
        ai_explanation: updatedData.ai_explanation,
        image: updatedData.image || null,
        audio: updatedData.audio || null,
        others: finalOthers,
        options: updatedOptions
      })
      
      const updatedFlashcard = {
        ...updatedData,
        options: updatedOptions,
        others: finalOthers
      }

      setFlashcards(flashcards.map(q => q.id === updatedData.id ? updatedFlashcard : q))
      setEditingFlashcard(null)
    } catch (err) {
      alert('Failed to update flashcard')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (flashcardId: number) => {
    if (!confirm('Are you sure? This card will be erased.')) return
    try {
      await axios.delete(`/api/v1/deck/flashcard/${flashcardId}`)
      setFlashcards(flashcards.filter(q => q.id !== flashcardId))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert('Deletion failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Fixed Header on Mobile, Sticky on Desktop */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 shadow-sm w-full md:sticky md:top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => navigate(`/manage/edit/${id}`)}
              className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] md:text-sm font-black text-slate-900 uppercase tracking-tight italic truncate leading-none mb-1">Card Manager</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{total} Items</p>
            </div>
          </div>

          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 h-8 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>

           <div className="flex items-center gap-2">
             <div className="flex items-center gap-4 mr-4 hidden md:flex">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   <span className="text-[7px] font-black text-slate-400 uppercase">Manual</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                   <span className="text-[7px] font-black text-slate-400 uppercase">AI</span>
                </div>
             </div>
             
             <div className="relative">
               <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-90 transition-all"
                  title="Xuất Excel"
               >
                  <Download className="w-3.5 h-3.5" />
               </button>
               {showExportMenu && (
                 <>
                   <div 
                     className="fixed inset-0 z-[140]" 
                     onClick={() => setShowExportMenu(false)}
                   />
                   <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-[150] animate-in fade-in slide-in-from-top-2 duration-150">
                     <a 
                       href={`/api/v1/deck/${id}/export`} 
                       onClick={() => setShowExportMenu(false)}
                       className="block px-4 py-2.5 text-[9px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-wider text-right"
                     >
                       Xuất có ID (để sửa rồi update)
                     </a>
                     <a 
                       href={`/api/v1/deck/${id}/export?exclude_ids=true`} 
                       onClick={() => setShowExportMenu(false)}
                       className="block px-4 py-2.5 text-[9px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-slate-50 uppercase tracking-wider text-right"
                     >
                       Xuất không ID (để import mới)
                     </a>
                   </div>
                 </>
               )}
             </div>
             
             <button 
                onClick={() => document.getElementById('excel-update-upload')?.click()}
                className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-90 transition-all"
                title="Sửa nhanh từ Excel"
             >
                <Upload className="w-3.5 h-3.5" />
             </button>
             <input 
                id="excel-update-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleExcelUpdateUpload}
             />

             <button className="w-8 h-8 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-all">
                <Layers className="w-3.5 h-3.5" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-[68px] md:pt-0 mt-4">
         {/* Flashcard Row List */}
         <div className="space-y-2">
            {isLoading ? (
               <div className="py-20 text-center">
                  <Zap className="w-8 h-8 text-indigo-600 animate-pulse mx-auto" />
               </div>
            ) : flashcards.map((q, idx) => (
               <motion.div 
                 key={q.id}
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="group bg-white rounded-2xl border border-slate-100 p-3 md:p-4 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex items-stretch gap-4 md:gap-6"
               >
                  {/* Left: Metadata & Status */}
                  <div className="flex flex-col items-center justify-center gap-2 shrink-0 border-r border-slate-50 pr-4">
                     <span className="text-[8px] font-black text-slate-300 italic">#{(page-1)*50 + idx + 1}</span>
                     <div className="flex flex-col gap-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", q.explanation ? "bg-emerald-500 shadow-sm shadow-emerald-200" : "bg-slate-100")} />
                        <div className={cn("w-1.5 h-1.5 rounded-full", q.ai_explanation ? "bg-indigo-500 shadow-sm shadow-indigo-200" : "bg-slate-100")} />
                     </div>
                  </div>

                  {/* Middle: Content & High Contrast Options */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h3 className="text-[13px] md:text-sm font-bold text-slate-900 leading-tight mb-3 line-clamp-1 group-hover:line-clamp-none transition-all">
                        {q.content}
                     </h3>
                     
                     <div className="flex flex-wrap items-center gap-1.5">
                        {q.options.map((opt: any, oIdx: number) => (
                           <div 
                              key={oIdx}
                              className={cn(
                                 "px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 border transition-all",
                                 opt.is_correct 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                                    : "bg-white border-slate-200 text-slate-600"
                              )}
                           >
                              <span className={cn("w-3.5 h-3.5 rounded flex items-center justify-center text-[8px]", opt.is_correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                                 {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="max-w-[120px] truncate">{opt.content}</span>
                           </div>
                        ))}
                        {(q.image || q.audio) && (
                           <div className="flex items-center gap-1.5 ml-1 px-2 py-1 bg-slate-50 rounded-lg">
                              {q.image && <ImageIcon className="w-3 h-3 text-slate-400" />}
                              {q.audio && <Music className="w-3 h-3 text-slate-400" />}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Right: Vertical Actions (Always Visible but compact) */}
                  <div className="flex flex-col gap-1.5 shrink-0 border-l border-slate-50 pl-4 py-1">
                     <button 
                        onClick={() => openEditModal(q)}
                        className="w-10 md:w-11 h-8 md:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                     >
                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </button>
                     <button 
                        onClick={() => handleDelete(q.id)}
                        className="w-10 md:w-11 h-8 md:h-10 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                     >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </button>
                  </div>
               </motion.div>
            ))}
         </div>

         {/* Full-width Numeric Pagination - White Theme */}
         <div className="fixed bottom-20 left-0 right-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
               <button 
                 disabled={page === 1}
                 onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
                 className="flex items-center gap-2 px-3 h-10 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-100 disabled:opacity-30"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>

               <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                  {(() => {
                     const totalPages = Math.ceil(total / 50)
                     const pages = []
                     const start = Math.max(1, page - 2)
                     const end = Math.min(totalPages, start + 5)
                     const finalStart = Math.max(1, end - 5)
                     
                     for (let i = finalStart; i <= end; i++) {
                        if (i < 1) continue;
                        pages.push(
                           <button
                              key={i}
                              onClick={() => { setPage(i); window.scrollTo(0, 0); }}
                              className={cn(
                                 "min-w-[36px] h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all",
                                 page === i 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                                    : "bg-slate-50 text-slate-400 border border-slate-100"
                              )}
                           >
                              {i}
                           </button>
                        )
                     }
                     return pages
                  })()}
               </div>

               <button 
                 disabled={page * 50 >= total}
                 onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
                 className="flex items-center gap-2 px-3 h-10 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-100 disabled:opacity-30"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      <FlashcardEditModal
        isOpen={!!editingFlashcard}
        onClose={() => setEditingFlashcard(null)}
        flashcard={editingFlashcard}
        onSave={handleUpdate}
        isSaving={isSaving}
      />
      {/* Floating Status Notification for Excel Import/Update */}
      <AnimatePresence>
        {(isUpdatingExcel || excelUpdateError || excelUpdateSuccess) && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] max-w-md w-full px-4"
          >
            <div className={cn(
              "p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3",
              isUpdatingExcel && "bg-white/90 border-indigo-100 text-indigo-600",
              excelUpdateError && "bg-rose-50/90 border-rose-100 text-rose-600",
              excelUpdateSuccess && "bg-emerald-50/90 border-emerald-100 text-emerald-600"
            )}>
              {isUpdatingExcel && <Zap className="w-5 h-5 animate-bounce shrink-0" />}
              {excelUpdateError && <AlertCircle className="w-5 h-5 shrink-0" />}
              {excelUpdateSuccess && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider">
                  {isUpdatingExcel && "Đang cập nhật từ Excel..."}
                  {excelUpdateError && "Lỗi cập nhật"}
                  {excelUpdateSuccess && "Cập nhật thành công!"}
                </p>
                <p className="text-[9px] font-bold opacity-80 mt-0.5 truncate">
                  {isUpdatingExcel && "Đang xử lý cấu trúc và đồng bộ hóa thẻ..."}
                  {excelUpdateError && excelUpdateError}
                  {excelUpdateSuccess && "Toàn bộ bộ thẻ đã được đồng bộ & cập nhật thành công."}
                </p>
              </div>
              
              {(excelUpdateError || excelUpdateSuccess) && (
                <button 
                  onClick={() => { setExcelUpdateError(null); setExcelUpdateSuccess(false); }}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EditFlashcards
