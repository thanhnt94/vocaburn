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
  Upload,
  Plus
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
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  
  const [quickAddValues, setQuickAddValues] = useState<Record<string, string>>({})
  const [visibleCols, setVisibleCols] = useState<string[]>(['front', 'back'])

  const shouldScrollToBottomRef = React.useRef(false)

  const contentCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    flashcards.forEach(c => {
      const text = (c.content || '').trim().toLowerCase()
      if (text) {
        counts[text] = (counts[text] || 0) + 1
      }
    })
    return counts
  }, [flashcards])

  useEffect(() => {
    if (availableColumns.length > 0) {
      const defaultCols = []
      if (availableColumns.includes('front')) defaultCols.push('front')
      if (availableColumns.includes('back')) defaultCols.push('back')
      
      if (defaultCols.length === 0) {
        defaultCols.push(availableColumns[0])
        if (availableColumns[1]) defaultCols.push(availableColumns[1])
      }
      setVisibleCols(defaultCols)
    }
  }, [availableColumns])

  const [practiceSettings, setPracticeSettings] = useState<any>({})
  const [generatingCells, setGeneratingCells] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`/api/v1/deck/${id}/practice-settings`)
        setAvailableColumns(res.data.available_columns || ['front', 'back'])
        setPracticeSettings(res.data.creator_settings || {})
      } catch (e) {
        console.error("Failed to fetch deck practice settings", e)
      }
    }
    fetchSettings()
  }, [id])

  const generateCellAi = async (cardId: number, col: string) => {
    const key = `${cardId}_${col}`
    setGeneratingCells(prev => ({ ...prev, [key]: true }))
    try {
      await axios.post(`/api/v1/deck/${id}/cards/${cardId}/generate-ai`, { field: col })
      alert("Yêu cầu tạo bằng AI đã được đưa vào hàng đợi của hệ thống CentralAuth! Kết quả sẽ được cập nhật tự động sau vài giây, bạn có thể reload trang để kiểm tra.")
    } catch (err: any) {
      alert(err.response?.data?.error || "Gửi yêu cầu AI thất bại")
    } finally {
      setGeneratingCells(prev => ({ ...prev, [key]: false }))
    }
  }

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
      if (shouldScrollToBottomRef.current) {
        setTimeout(() => {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          })
          shouldScrollToBottomRef.current = false
        }, 150)
      }
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

  const handleCreateNewCard = () => {
    const initialOthers: Record<string, any> = {
      back_img: '',
      back_audio_url: '',
      front_audio_content: '',
      back_audio_content: '',
    }
    availableColumns.forEach(c => {
      if (c !== 'front' && c !== 'back') {
        initialOthers[c] = ''
      }
    })
    setEditingFlashcard({
      id: undefined,
      deck_id: Number(id),
      content: '',
      explanation: '',
      ai_explanation: '',
      image: null,
      audio: null,
      others: initialOthers,
      options: []
    })
  }

  const handleUpdate = async (updatedData: any, addAnother = false) => {
    if (!updatedData) return null
    setIsSaving(true)
    try {
      const updatedOptions = (updatedData.options || []).map((opt: any) => {
        if (opt.is_correct && updatedData.explanation) {
          return { ...opt, content: updatedData.explanation }
        }
        return opt
      })

      const finalOthers = { ...updatedData.others }
      let savedCard: any = null

      if (updatedData.id) {
        // Edit existing card
        await axios.patch(`/api/v1/deck/flashcard/${updatedData.id}`, {
          content: updatedData.content,
          explanation: updatedData.explanation,
          ai_explanation: updatedData.ai_explanation,
          image: updatedData.image || null,
          audio: updatedData.audio || null,
          others: finalOthers,
          options: updatedOptions
        })
        
        savedCard = {
          ...updatedData,
          options: updatedOptions,
          others: finalOthers
        }

        setFlashcards(flashcards.map(q => q.id === updatedData.id ? savedCard : q))
      } else {
        // Create new card
        const res = await axios.post(`/api/v1/deck/${id}/flashcard`, {
          content: updatedData.content,
          explanation: updatedData.explanation,
          ai_explanation: updatedData.ai_explanation,
          image: updatedData.image || null,
          audio: updatedData.audio || null,
          others: finalOthers,
          options: updatedOptions
        })

        savedCard = res.data.card
        const newTotal = total + 1
        const lastPage = Math.max(1, Math.ceil(newTotal / 50))
        shouldScrollToBottomRef.current = true
        setTotal(newTotal)
        if (page === lastPage) {
          fetchFlashcards()
        } else {
          setPage(lastPage)
        }
      }

      if (!addAnother) {
        setEditingFlashcard(null)
      }

      return savedCard
    } catch (err) {
      alert('Failed to save flashcard')
      throw err
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

  const handleRowFieldChange = (cardId: number, field: string, value: string) => {
    setFlashcards(prev => prev.map(c => {
      if (c.id === cardId) {
        const updated = { ...c }
        if (field === 'front') {
          updated.content = value
        } else if (field === 'back') {
          updated.explanation = value
        } else if (['front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(field)) {
          updated[field] = value
        } else {
          updated.others = { ...updated.others, [field]: value }
        }
        updated.isDirty = true
        return updated
      }
      return c
    }))
  }

  const saveRowCard = async (card: any) => {
    if (!card.isDirty) return
    try {
      const updatedOptions = (card.options || []).map((opt: any) => {
        if (opt.is_correct && card.explanation) {
          return { ...opt, content: card.explanation }
        }
        return opt
      })
      
      await axios.patch(`/api/v1/deck/flashcard/${card.id}`, {
        content: card.content,
        explanation: card.explanation,
        front_audio_content: card.front_audio_content,
        back_audio_content: card.back_audio_content,
        front_audio_url: card.front_audio_url,
        back_audio_url: card.back_audio_url,
        front_img: card.front_img,
        back_img: card.back_img,
        others: card.others,
        options: updatedOptions
      })
      
      setFlashcards(prev => prev.map(c => c.id === card.id ? { ...c, isDirty: false } : c))
    } catch (err) {
      console.error(err)
    }
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!Object.values(quickAddValues).some(v => v.trim())) return
    
    try {
      const initialOthers: Record<string, any> = {
        back_img: '',
        back_audio_url: '',
        front_audio_content: '',
        back_audio_content: '',
      }
      availableColumns.forEach(c => {
        if (!['front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(c)) {
          initialOthers[c] = ''
        }
      })

      const newCardData: any = {
        content: quickAddValues['front'] || '',
        explanation: quickAddValues['back'] || '',
        front_audio_content: quickAddValues['front_audio_content'] || '',
        back_audio_content: quickAddValues['back_audio_content'] || '',
        front_audio_url: quickAddValues['front_audio_url'] || '',
        back_audio_url: quickAddValues['back_audio_url'] || '',
        front_img: quickAddValues['front_img'] || '',
        back_img: quickAddValues['back_img'] || '',
        others: { ...initialOthers },
        options: []
      }

      Object.keys(quickAddValues).forEach(col => {
        if (!['front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(col)) {
          newCardData.others[col] = quickAddValues[col]
        }
      })

      const res = await axios.post(`/api/v1/deck/${id}/flashcard`, {
        content: newCardData.content,
        explanation: newCardData.explanation,
        front_audio_content: newCardData.front_audio_content,
        back_audio_content: newCardData.back_audio_content,
        front_audio_url: newCardData.front_audio_url,
        back_audio_url: newCardData.back_audio_url,
        front_img: newCardData.front_img,
        back_img: newCardData.back_img,
        others: newCardData.others,
        options: []
      })

      const savedCard = res.data.card
      const newTotal = total + 1
      const lastPage = Math.max(1, Math.ceil(newTotal / 50))
      shouldScrollToBottomRef.current = true
      setTotal(newTotal)
      if (page === lastPage) {
        fetchFlashcards()
      } else {
        setPage(lastPage)
      }
      
      setQuickAddValues({})
      
      if (visibleCols.length > 0) {
        document.getElementById(`quick-add-${visibleCols[0]}`)?.focus()
      }
    } catch (err) {
      alert("Lỗi khi thêm thẻ nhanh")
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Fixed Header on Mobile, Sticky on Desktop */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 shadow-sm w-full md:sticky md:top-0">
        <div className="max-w-[95%] xl:max-w-[98%] mx-auto flex items-center justify-between gap-3">
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
             <button 
                onClick={handleCreateNewCard}
                className="h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-md active:scale-95 transition-all uppercase tracking-wider shrink-0"
                title="Thêm thẻ thủ công"
             >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Thêm thẻ</span>
             </button>

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

      <div className="max-w-[95%] xl:max-w-[98%] mx-auto px-4 pt-[68px] md:pt-0 mt-4">
         {/* Column Manager Bar (Memrise / Multi-column Style) */}
         <div className="bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 mb-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                     <Filter className="w-4 h-4" />
                  </div>
                  <div>
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Cấu hình cột hiển thị</h3>
                     <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Tùy biến thêm/bớt cột để nhập liệu nhanh nhiều trường</p>
                  </div>
               </div>

               <div className="flex items-center gap-2">
                  <button
                     type="button"
                     onClick={() => setVisibleCols(['front', 'back'])}
                     className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[9px] font-black text-slate-505 rounded-lg uppercase tracking-wider transition-colors border border-slate-100"
                  >
                     Reset Mặc Định
                  </button>
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
               <div className="flex flex-wrap items-center gap-2">
                  {visibleCols.map(col => (
                     <div 
                        key={col} 
                        className="px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2 text-indigo-700 font-bold text-[10px] uppercase shadow-sm"
                     >
                        <span>{col}</span>
                        {visibleCols.length > 1 && (
                           <button
                              type="button"
                              onClick={() => setVisibleCols(visibleCols.filter(c => c !== col))}
                              className="w-3.5 h-3.5 rounded-full hover:bg-indigo-200/50 flex items-center justify-center text-indigo-400 hover:text-indigo-600 transition-colors"
                           >
                              <X className="w-2.5 h-2.5" />
                           </button>
                        )}
                     </div>
                  ))}
               </div>

               {availableColumns.filter(c => !visibleCols.includes(c)).length > 0 && (
                  <div className="flex items-center gap-1.5 ml-auto">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Thêm cột:</span>
                     <select
                        value=""
                        onChange={(e) => {
                           if (e.target.value) {
                              setVisibleCols([...visibleCols, e.target.value])
                           }
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:border-indigo-500 transition-all uppercase tracking-wider"
                     >
                        <option value="" disabled>-- Chọn cột --</option>
                        {availableColumns
                           .filter(c => !visibleCols.includes(c))
                           .map(col => (
                              <option key={col} value={col}>{col.toUpperCase()}</option>
                           ))}
                     </select>
                  </div>
               )}
            </div>
         </div>

         {/* Quick Add Row (Quizlet Style) */}
         <form onSubmit={handleQuickAdd} className="bg-gradient-to-r from-indigo-50/50 to-pink-50/30 rounded-[2.5rem] border border-indigo-100/50 p-6 mb-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-1">
               <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Thêm thẻ nhanh (Quizlet Style)</span>
               </div>
               <span className="text-[8px] font-bold text-slate-400 uppercase">Nhập và nhấn Enter để thêm</span>
            </div>

            <div className="flex flex-wrap gap-4">
               {visibleCols.map(col => (
                  <div key={col} className="space-y-1.5 flex-1 min-w-[200px]">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{col.toUpperCase()}</label>
                     <input
                        id={`quick-add-${col}`}
                        type="text"
                        placeholder={`Nhập ${col}...`}
                        value={quickAddValues[col] || ''}
                        onChange={(e) => setQuickAddValues({ ...quickAddValues, [col]: e.target.value })}
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                     />
                  </div>
               ))}
            </div>

            <button
               type="submit"
               className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
               <Plus className="w-4 h-4" /> THÊM VÀO BỘ BÀI
            </button>
         </form>

         {/* Flashcards List */}
         <div className="space-y-6">
            {isLoading ? (
               <div className="py-20 text-center">
                  <Zap className="w-8 h-8 text-indigo-600 animate-pulse mx-auto" />
               </div>
            ) : flashcards.map((q, idx) => {
               const textNormalized = (q.content || '').trim().toLowerCase()
               const isDuplicate = textNormalized ? (contentCounts[textNormalized] > 1) : false
               return (
                  <div 
                    key={q.id}
                    className={cn(
                      "bg-white rounded-[2.2rem] border p-6 transition-all duration-300 shadow-sm space-y-4 hover:shadow-md",
                      isDuplicate ? "border-rose-200 bg-rose-50/20 shadow-rose-100/30" :
                      q.isDirty ? "border-amber-200 bg-amber-50/5 shadow-amber-100/50" : "border-slate-100"
                    )}
                  >
                     {/* Header */}
                     <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-slate-300 italic">#{(page-1)*50 + idx + 1}</span>
                           {isDuplicate && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[8px] font-black uppercase tracking-wider tracking-widest animate-pulse">Trùng lặp</span>
                           )}
                           {q.isDirty && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider tracking-widest animate-pulse">Chưa lưu</span>
                           )}
                        </div>

                        <div className="flex items-center gap-2">
                           <button
                              onClick={() => openEditModal(q)}
                              className="w-8.5 h-8.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 rounded-xl flex items-center justify-center transition-all"
                              title="Chỉnh sửa nâng cao"
                           >
                              <Edit2 className="w-3.5 h-3.5" />
                           </button>
                           
                           {q.isDirty && (
                              <button
                                 onClick={() => saveRowCard(q)}
                                 className="w-8.5 h-8.5 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-90 transition-all"
                                 title="Lưu ngay"
                              >
                                 <Save className="w-3.5 h-3.5" />
                              </button>
                           )}

                           <button
                              onClick={() => handleDelete(q.id)}
                              className="w-8.5 h-8.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-100 hover:border-rose-100 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                              title="Xóa thẻ"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>

                     {/* Content Inputs */}
                     <div 
                        className="grid gap-5"
                        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}
                     >
                        {visibleCols.map(col => {
                           const val = col === 'front' ? q.content : (
                              col === 'back' ? q.explanation : (
                                 ['front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(col) ? q[col] : (q.others?.[col] || '')
                              )
                           );
                           const hasAi = practiceSettings.ai_prompts?.some((p: any) => p.column === col || p.id === col);
                           
                           return (
                              <div key={col} className="space-y-1.5 relative group/cell">
                                 <div className="flex items-center justify-between ml-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{col.toUpperCase()}</label>
                                    {hasAi && (
                                       <button
                                          type="button"
                                          onClick={() => generateCellAi(q.id, col)}
                                          disabled={generatingCells[`${q.id}_${col}`]}
                                          className="text-[9px] font-bold text-indigo-500 hover:text-indigo-750 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                          title="Tự động tạo bằng AI cho ô này"
                                       >
                                          {generatingCells[`${q.id}_${col}`] ? (
                                             <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                             <Sparkles className="w-3.5 h-3.5" />
                                          )}
                                          <span>AI</span>
                                       </button>
                                    )}
                                 </div>
                                 <textarea
                                    rows={2}
                                    value={val || ''}
                                    onChange={(e) => handleRowFieldChange(q.id, col, e.target.value)}
                                    onBlur={() => saveRowCard(q)}
                                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none resize-none transition-all"
                                    placeholder={`Nhập ${col}...`}
                                 />
                              </div>
                           )
                        })}
                     </div>
                  </div>
               )
            })}
         </div>
      </div>

         {/* Full-width Numeric Pagination - White Theme */}
         <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="max-w-[95%] xl:max-w-[98%] mx-auto flex items-center justify-between gap-4">
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

      <FlashcardEditModal
        isOpen={!!editingFlashcard}
        onClose={() => setEditingFlashcard(null)}
        flashcard={editingFlashcard}
        onSave={handleUpdate}
        isSaving={isSaving}
        availableColumns={availableColumns}
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
