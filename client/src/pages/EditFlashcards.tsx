import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'
import { 
  Save, 
  ChevronLeft, 
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  Plus,
  SlidersHorizontal,
  Clipboard
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
  const [searchCol, setSearchCol] = useState('all')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [editingFlashcard, setEditingFlashcard] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(true)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [configTab, setConfigTab] = useState<'display' | 'filter' | 'manage'>('display')
  const [sortBy, setSortBy] = useState<string>('id_asc')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCol, setFilterCol] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [newColName, setNewColName] = useState('')
  const [renamingCol, setRenamingCol] = useState<string | null>(null)
  const [renamingNewValue, setRenamingNewValue] = useState('')
  const [deckName, setDeckName] = useState('')

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 250)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [practiceSettings, setPracticeSettings] = useState<any>({})
  const [generatingCells, setGeneratingCells] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`/api/v1/deck/${id}/practice-settings`)
        setAvailableColumns(res.data.available_columns || ['front', 'back'])
        setPracticeSettings(res.data.creator_settings || {})
        if (res.data.deck_name) setDeckName(res.data.deck_name)
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
        params: { 
          page, 
          size: 50, 
          search,
          search_col: searchCol,
          sort: sortBy,
          filter: filterType,
          filter_col: filterCol
        }
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
  }, [id, page, search, searchCol, sortBy, filterType, filterCol])

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
      const systemFields = ['front_img', 'back_img', 'front_audio_url', 'back_audio_url', 'front_audio_content', 'back_audio_content']
      systemFields.forEach(f => delete finalOthers[f])
      
      let savedCard: any = null

      if (updatedData.id) {
        // Edit existing card
        await axios.patch(`/api/v1/deck/flashcard/${updatedData.id}`, {
          content: updatedData.content,
          explanation: updatedData.explanation,
          ai_explanation: updatedData.ai_explanation,
          image: updatedData.image || null,
          audio: updatedData.audio || null,
          front_img: updatedData.front_img || '',
          back_img: updatedData.back_img || '',
          front_audio_url: updatedData.front_audio_url || '',
          back_audio_url: updatedData.back_audio_url || '',
          front_audio_content: updatedData.front_audio_content || '',
          back_audio_content: updatedData.back_audio_content || '',
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
          front_img: updatedData.front_img || '',
          back_img: updatedData.back_img || '',
          front_audio_url: updatedData.front_audio_url || '',
          back_audio_url: updatedData.back_audio_url || '',
          front_audio_content: updatedData.front_audio_content || '',
          back_audio_content: updatedData.back_audio_content || '',
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

  const handleDelete = (flashcardId: number) => {
    setDeleteTargetId(flashcardId)
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
      setToastMessage("Đã lưu thẻ mới thành công!")
      setTimeout(() => setToastMessage(null), 3000)
      
      if (visibleCols.length > 0) {
        document.getElementById(`quick-add-${visibleCols[0]}`)?.focus()
      }
    } catch (err) {
      alert("Lỗi khi thêm thẻ nhanh")
    }
  }
  const handlePasteExcel = async () => {
    if (!pasteText.trim()) return;
    setIsSaving(true)
    try {
      const parsedRows: string[][] = []
      let currentRow: string[] = []
      let currentField = ''
      let inQuotes = false
      
      const text = pasteText
      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const nextChar = text[i + 1]
        
        if (inQuotes) {
          if (char === '"') {
            if (nextChar === '"') {
              currentField += '"'
              i++
            } else {
              inQuotes = false
            }
          } else {
            currentField += char
          }
        } else {
          if (char === '"') {
            inQuotes = true
          } else if (char === '\t') {
            currentRow.push(currentField)
            currentField = ''
          } else if (char === '\r') {
            // skip carriage return
          } else if (char === '\n') {
            currentRow.push(currentField)
            parsedRows.push(currentRow)
            currentRow = []
            currentField = ''
          } else {
            currentField += char
          }
        }
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField)
        parsedRows.push(currentRow)
      }

      const cardsToAdd: any[] = []
      
      parsedRows.forEach(parts => {
        if (parts.length === 0 || (parts.length === 1 && !parts[0].trim())) return
        
        const cardData: any = {
          content: '',
          explanation: '',
          front_audio_content: '',
          back_audio_content: '',
          front_audio_url: '',
          back_audio_url: '',
          front_img: '',
          back_img: '',
          others: {},
          options: []
        }
        
        visibleCols.forEach((col, index) => {
          const val = parts[index] ? parts[index].trim() : ''
          if (col === 'front') {
            cardData.content = val
          } else if (col === 'back') {
            cardData.explanation = val
          } else if (['front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(col)) {
            cardData[col] = val
          } else {
            cardData.others[col] = val
          }
        })
        
        cardsToAdd.push(cardData)
      })
      
      if (cardsToAdd.length === 0) {
        setIsPasteModalOpen(false)
        setIsSaving(false)
        return
      }
      
      await Promise.all(cardsToAdd.map(card => {
        return axios.post(`/api/v1/deck/${id}/flashcard`, {
          content: card.content,
          explanation: card.explanation,
          front_audio_content: card.front_audio_content,
          back_audio_content: card.back_audio_content,
          front_audio_url: card.front_audio_url,
          back_audio_url: card.back_audio_url,
          front_img: card.front_img,
          back_img: card.back_img,
          others: card.others,
          options: []
        })
      }))
      
      const newTotal = total + cardsToAdd.length
      const lastPage = Math.max(1, Math.ceil(newTotal / 50))
      shouldScrollToBottomRef.current = true
      setTotal(newTotal)
      setPage(lastPage)
      fetchFlashcards()
      
      setPasteText('')
      setIsPasteModalOpen(false)
      setToastMessage(`Đã dán và thêm thành công ${cardsToAdd.length} thẻ mới!`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (err) {
      console.error("Paste import failed:", err)
      alert("Lỗi khi dán và import dữ liệu")
    } finally {
      setIsSaving(false)
    }
  }
  const handleAddColumn = async () => {
    if (!newColName.trim()) return
    try {
      const res = await axios.post(`/api/v1/deck/${id}/add-column`, {
        column_name: newColName
      })
      const addedCol = res.data.column_name
      setAvailableColumns(prev => [...prev, addedCol])
      setNewColName('')
      setToastMessage("Thêm cột mới thành công!")
      setTimeout(() => setToastMessage(null), 3000)
    } catch (e: any) {
      alert(e.response?.data?.error || "Lỗi khi thêm cột")
    }
  }

  const handleRenameColumn = async (oldName: string) => {
    if (!renamingNewValue.trim()) return
    try {
      await axios.post(`/api/v1/deck/${id}/rename-column`, {
        old_name: oldName,
        new_name: renamingNewValue
      })
      
      setAvailableColumns(prev => prev.map(c => c === oldName ? renamingNewValue : c))
      setVisibleCols(prev => prev.map(c => c === oldName ? renamingNewValue : c))
      setRenamingCol(null)
      setRenamingNewValue('')
      setToastMessage("Đổi tên cột thành công!")
      setTimeout(() => setToastMessage(null), 3000)
    } catch (e: any) {
      alert(e.response?.data?.error || "Lỗi khi đổi tên cột")
    }
  }

  const handleDeleteColumn = async (colName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa cột "${colName}"? Mọi dữ liệu trong cột này ở tất cả các thẻ sẽ bị mất.`)) return
    try {
      await axios.post(`/api/v1/deck/${id}/delete-column`, {
        column_name: colName
      })
      
      setAvailableColumns(prev => prev.filter(c => c !== colName))
      setVisibleCols(prev => prev.filter(c => c !== colName))
      setToastMessage("Xóa cột thành công!")
      setTimeout(() => setToastMessage(null), 3000)
    } catch (e: any) {
      alert(e.response?.data?.error || "Lỗi khi xóa cột")
    }
  }

  return (
    <div className={cn("min-h-screen bg-[#F8FAFC]", isQuickAddOpen ? "pb-[230px] md:pb-[180px]" : "pb-[64px] md:pb-[56px]")}>
      {/* Fixed Header on Mobile, Sticky on Desktop */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 shadow-sm w-full md:sticky md:top-0">
        <div className="max-w-[95%] xl:max-w-[98%] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => navigate('/manage')}
              className="w-8 h-8 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center justify-center text-rose-500 border border-rose-200 active:scale-95 shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1">Card Manager</h1>
              {deckName && (
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wide truncate leading-none mb-1">{deckName}</p>
              )}
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
                onClick={() => { setIsConfigModalOpen(true); setConfigTab('display'); }}
                className={cn(
                   "h-8 w-8 rounded-lg flex items-center justify-center border active:scale-95 transition-all shrink-0",
                   isConfigModalOpen 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                      : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                )}
                title="Cấu hình bộ bài & cột hiển thị"
             >
                <SlidersHorizontal className="w-3.5 h-3.5" />
             </button>

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
             <button 
                onClick={() => setIsPasteModalOpen(true)}
                className="h-8 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-md active:scale-95 transition-all uppercase tracking-wider shrink-0"
                title="Dán nhanh từ Excel"
             >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Dán Excel</span>
             </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-full sm:max-w-[95%] xl:max-w-[98%] mx-auto px-1 sm:px-2 md:px-4 pt-[60px] md:pt-0 mt-2 md:mt-4">


         {/* Flashcards List */}
         <div className="space-y-3.5 md:space-y-6">
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
                      "bg-white rounded-2xl md:rounded-[2.2rem] border transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.02)] hover:shadow-md p-3.5 md:p-6",
                      isDuplicate ? "border-rose-300 bg-rose-50/20 shadow-rose-100/30" :
                      q.isDirty ? "border-amber-300 bg-amber-50/5 shadow-amber-100/50" : "border-slate-200/80"
                    )}
                  >
                     <div className="flex gap-3 items-stretch">
                        {/* Left side: Content Inputs & Badges */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                           {(isDuplicate || q.isDirty) && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                 {isDuplicate && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[8px] font-black uppercase tracking-wider animate-pulse">Trùng lặp</span>
                                 )}
                                 {q.isDirty && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider animate-pulse">Chưa lưu</span>
                                 )}
                              </div>
                           )}

                           <div 
                              className="grid gap-2.5 md:gap-5"
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
                                          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 rounded-xl px-3 py-2 md:px-4 md:py-3 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none resize-none transition-all"
                                          placeholder={`Nhập ${col}...`}
                                       />
                                    </div>
                                 )
                              })}
                           </div>
                        </div>

                        {/* Right side: Action column */}
                        <div className="w-9 md:w-11 shrink-0 flex flex-col items-center justify-between border-l border-slate-100 pl-3 py-1">
                           <span className="text-[9px] md:text-[10px] font-black text-slate-400 italic">#{(page-1)*50 + idx + 1}</span>
                           
                           <div className="flex flex-col gap-1.5 mt-auto">
                              <button
                                 onClick={() => openEditModal(q)}
                                 className="w-7 h-7 md:w-8.5 md:h-8.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200/60 hover:border-indigo-150 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                 title="Chỉnh sửa nâng cao"
                              >
                                 <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              
                              {q.isDirty && (
                                 <button
                                    onClick={() => saveRowCard(q)}
                                    className="w-7 h-7 md:w-8.5 md:h-8.5 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-90 transition-all"
                                    title="Lưu ngay"
                                 >
                                    <Save className="w-3.5 h-3.5" />
                                 </button>
                              )}

                              <button
                                 onClick={() => handleDelete(q.id)}
                                 className="w-7 h-7 md:w-8.5 md:h-8.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200/60 hover:border-rose-150 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                                 title="Xóa thẻ"
                              >
                                 <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               )
            })}
         </div>
      </div>

          {/* Full-width Numeric Pagination - White Theme */}
          <div className="fixed bottom-0 left-0 right-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
             <div className="max-w-[95%] xl:max-w-[98%] mx-auto flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                {(() => {
                   const totalPages = Math.ceil(total / 50)
                   const start = Math.max(1, page - 2)
                   const end = Math.min(totalPages, start + 5)
                   const finalStart = Math.max(1, end - 5)
                   
                   const visiblePages = []
                   for (let i = finalStart; i <= end; i++) {
                      if (i >= 1 && i <= totalPages) {
                         visiblePages.push(i)
                      }
                   }

                   return (
                      <>
                         {!visiblePages.includes(1) && (
                            <>
                               <button
                                  onClick={() => { setPage(1); window.scrollTo(0, 0); }}
                                  className="min-w-[32px] h-8 rounded-lg flex items-center justify-center text-[10px] font-black bg-slate-50 text-slate-400 border border-slate-100 active:scale-95 transition-all"
                               >
                                  1
                               </button>
                               <span className="text-[10px] text-slate-300 px-0.5">...</span>
                            </>
                         )}

                         {visiblePages.map(i => (
                            <button
                               key={i}
                               onClick={() => { setPage(i); window.scrollTo(0, 0); }}
                               className={cn(
                                  "min-w-[32px] h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                                  page === i 
                                     ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                                     : "bg-slate-50 text-slate-400 border border-slate-100"
                               )}
                            >
                               {i}
                            </button>
                         ))}

                         {!visiblePages.includes(totalPages) && totalPages > 1 && (
                            <>
                               <span className="text-[10px] text-slate-300 px-0.5">...</span>
                               <button
                                  onClick={() => { setPage(totalPages); window.scrollTo(0, 0); }}
                                  className="min-w-[32px] h-8 rounded-lg flex items-center justify-center text-[10px] font-black bg-slate-50 text-slate-400 border border-slate-100 active:scale-95 transition-all"
                               >
                                  {totalPages}
                               </button>
                            </>
                         )}
                      </>
                   )
                })()}
             </div>
             
             {!isQuickAddOpen && (
                <button
                   onClick={() => {
                      setIsQuickAddOpen(true);
                      setIsSearchOpen(false);
                   }}
                   className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all z-[120]"
                   title="Mở thanh nhập nhanh"
                >
                   <ChevronUp className="w-4 h-4" />
                </button>
             )}
          </div>

      <FlashcardEditModal
        isOpen={!!editingFlashcard}
        onClose={() => setEditingFlashcard(null)}
        flashcard={editingFlashcard}
        onSave={handleUpdate}
        isSaving={isSaving}
        availableColumns={availableColumns}
        practiceSettings={practiceSettings}
      />

      {/* Floating Bottom Quick Add Panel (Optimized for One-Handed Mobile Use) */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-[44px] left-0 right-0 z-[105] bg-white/95 backdrop-blur-xl border-t border-indigo-50/80 p-3.5 shadow-[0_-12px_30px_rgba(0,0,0,0.06)]"
          >
            <form 
              onSubmit={handleQuickAdd} 
              className="max-w-full sm:max-w-[95%] xl:max-w-[98%] mx-auto relative flex flex-col md:flex-row items-end gap-3.5"
            >
               {/* Collapse Button */}
               <button 
                 type="button"
                 onClick={() => setIsQuickAddOpen(false)}
                 className="absolute -top-1.5 right-1 w-6 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90 transition-all border border-slate-100"
                 title="Thu gọn nhập nhanh"
               >
                 <ChevronDown className="w-4 h-4" />
               </button>

               <div className="flex flex-wrap gap-2.5 flex-1 w-full pr-7">
                  {visibleCols.map(col => (
                     <div key={col} className="space-y-1 flex-1 min-w-[140px]">
                        <div className="flex items-center justify-between ml-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{col.toUpperCase()}</label>
                        </div>
                        <input
                           id={`quick-add-${col}`}
                           type="text"
                           placeholder={`Nhập ${col}...`}
                           value={quickAddValues[col] || ''}
                           onChange={(e) => setQuickAddValues({ ...quickAddValues, [col]: e.target.value })}
                           className="w-full h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none transition-all"
                        />
                     </div>
                  ))}
               </div>

               <button
                  type="submit"
                  className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
               >
                  <Plus className="w-3.5 h-3.5" /> THÊM THẺ
               </button>
            </form>

            {/* Search row right below Add Card form (Hidden on Desktop, Toggleable on Mobile) */}
            {isSearchOpen && (
               <div className="max-w-full sm:max-w-[95%] xl:max-w-[98%] mx-auto mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2.5 md:hidden">
               <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                     type="text"
                     placeholder="Tìm kiếm thẻ..."
                     value={search}
                     onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                     className="w-full h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl pl-9 pr-4 text-xs font-bold text-slate-800 outline-none transition-all"
                  />
               </div>
               <div className="relative shrink-0 min-w-[120px]">
                  <select
                     value={searchCol}
                     onChange={(e) => { setSearchCol(e.target.value); setPage(1); }}
                     className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                  >
                     <option value="all">Tất cả cột</option>
                     <option value="front">Mặt trước</option>
                     <option value="back">Mặt sau</option>
                     {availableColumns.filter(c => c !== 'front' && c !== 'back').map(col => (
                        <option key={col} value={col}>{col.toUpperCase()}</option>
                     ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId !== null && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTargetId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Xác nhận xóa thẻ</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa thẻ này khỏi bộ bài? Mọi thông tin ghi nhớ liên quan sẽ bị mất vĩnh viễn.
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-wider rounded-xl border border-slate-200/50 active:scale-95 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={async () => {
                    const targetId = deleteTargetId;
                    setDeleteTargetId(null);
                    try {
                      await axios.delete(`/api/v1/deck/flashcard/${targetId}`)
                      setFlashcards(flashcards.filter(q => q.id !== targetId))
                      setTotal(prev => prev - 1)
                    } catch (err) {
                      alert('Xóa thẻ thất bại')
                    }
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-lg shadow-rose-100 active:scale-95 transition-all"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel Paste Modal */}
      <AnimatePresence>
        {isPasteModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 p-5 md:p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Dán nhanh từ Excel</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sao chép các ô từ Excel/Sheets rồi dán vào đây</p>
                </div>
              </div>

              <div className="space-y-2 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-50/50">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block mb-1">Thứ tự các cột cần dán (Cực kì quan trọng):</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {visibleCols.map((col, idx) => (
                    <React.Fragment key={col}>
                      {idx > 0 && <span className="text-slate-300 text-[9px]">→</span>}
                      <span className="px-2 py-0.5 bg-white border border-indigo-100 rounded-lg text-[9px] font-black text-indigo-600 uppercase">
                        {col}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider mt-1.5 italic">
                  * Hệ thống sẽ tự động bỏ các cột thừa ở vị trí phía sau nếu bạn dán nhiều cột hơn số lượng hiển thị ở trên. Chỉ thêm mới (không ghi đè).
                </p>
              </div>

              <textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Ví dụ dán từ Excel (các cột cách nhau bởi phím Tab):
apple	quả táo
orange	quả cam"
                className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-2xl text-xs font-semibold text-slate-700 outline-none transition-all resize-none"
              />

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => { setIsPasteModalOpen(false); setPasteText(''); }}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-wider rounded-xl border border-slate-200/50 active:scale-95 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handlePasteExcel}
                  disabled={isSaving || !pasteText.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Đang xử lý..." : "Phân tích & Thêm mới"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Configuration & Column Management Modal */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 p-5 md:p-6 shadow-2xl space-y-4 text-left flex flex-col max-h-[85vh] z-[310]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cấu Hình Bộ Bài</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Tùy biến hiển thị và các cột dữ liệu</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfigModalOpen(false)}
                  className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setConfigTab('display')}
                  className={cn(
                    "flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    configTab === 'display' 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Hiển thị cột
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab('filter')}
                  className={cn(
                    "flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    configTab === 'filter' 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Lọc & Sắp xếp
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab('manage')}
                  className={cn(
                    "flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    configTab === 'manage' 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Quản lý cột
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 py-2">
                {configTab === 'filter' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Sort Options */}
                    <div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block mb-2">Sắp xếp thẻ học:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'id_asc', label: 'Thứ tự ban đầu' },
                          { value: 'id_desc', label: 'Mới nhất trước' },
                          { value: 'az', label: 'Tên A → Z' },
                          { value: 'za', label: 'Tên Z → A' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setSortBy(opt.value); setPage(1); }}
                            className={cn(
                              "h-9 px-3 border rounded-xl text-[10px] font-bold uppercase transition-all text-left flex items-center justify-between",
                              sortBy === opt.value
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Options */}
                    <div className="pt-3 border-t border-slate-50 space-y-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block mb-2">Lọc theo trạng thái:</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'all', label: 'Tất cả thẻ' },
                            { value: 'duplicate', label: 'Thẻ trùng lặp' },
                            { value: 'missing_column', label: 'Thiếu cột...' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setFilterType(opt.value);
                                setPage(1);
                                if (opt.value !== 'missing_column') setFilterCol('');
                                else if (!filterCol) setFilterCol(availableColumns[0] || 'front');
                              }}
                              className={cn(
                                "h-9 px-2 border rounded-xl text-[9px] font-black uppercase tracking-wider transition-all text-center flex flex-col items-center justify-center gap-1",
                                filterType === opt.value
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                  : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              )}
                            >
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {filterType === 'missing_column' && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Chọn cột bị thiếu dữ liệu:</label>
                          <select
                            value={filterCol}
                            onChange={(e) => { setFilterCol(e.target.value); setPage(1); }}
                            className="w-full bg-slate-50 border border-slate-250/60 rounded-xl px-3.5 h-10 text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:border-indigo-500 transition-all uppercase tracking-wider"
                          >
                            {availableColumns.map(col => (
                              <option key={col} value={col}>{col.toUpperCase().replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                          <p className="text-[8px] font-semibold text-slate-450 uppercase tracking-wide mt-1 italic pl-1">
                            * Hệ thống sẽ chỉ lọc ra những thẻ chưa nhập dữ liệu cho cột này để bạn dễ điền thông tin.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {configTab === 'display' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-2">Các cột hiển thị hiện tại:</h4>
                      <div className="flex flex-wrap gap-2">
                        {visibleCols.map(col => (
                          <div 
                            key={col} 
                            className="px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2 text-indigo-700 font-bold text-[9px] uppercase shadow-sm"
                          >
                            <span>{col.replace(/_/g, ' ')}</span>
                            {visibleCols.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setVisibleCols(visibleCols.filter(c => c !== col))}
                                className="w-3.5 h-3.5 rounded-full hover:bg-indigo-200/50 flex items-center justify-center text-indigo-400 hover:text-indigo-650 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Thêm cột hiển thị:</span>
                        <button
                          type="button"
                          onClick={() => setVisibleCols(['front', 'back'])}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[8px] font-black text-slate-500 rounded-lg uppercase tracking-wider transition-colors"
                        >
                          Reset về mặc định
                        </button>
                      </div>
                      
                      {availableColumns.filter(c => !visibleCols.includes(c)).length > 0 ? (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setVisibleCols([...visibleCols, e.target.value])
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-250/60 rounded-xl px-3.5 h-10 text-[10px] font-black text-slate-600 outline-none cursor-pointer hover:border-indigo-500 transition-all uppercase tracking-wider"
                        >
                          <option value="" disabled>-- Chọn cột để hiển thị --</option>
                          {availableColumns
                            .filter(c => !visibleCols.includes(c))
                            .map(col => (
                              <option key={col} value={col}>{col.toUpperCase().replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                      ) : (
                        <p className="text-[9px] font-bold text-slate-400 italic">Tất cả các cột đang được hiển thị.</p>
                      )}
                    </div>
                  </div>
                )}

                {configTab === 'manage' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cột Mặc định của Hệ thống (Không thể sửa/xóa)</span>
                      <div className="flex flex-wrap gap-2">
                        {['front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].map(col => (
                          <span 
                            key={col} 
                            className="px-2.5 py-1 bg-slate-100 border border-slate-200/60 text-slate-400 rounded-xl text-[9px] font-bold uppercase tracking-wide"
                            title="Cột mặc định hệ thống"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-50">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cột Tùy Biến (Custom Columns)</span>
                      {availableColumns.filter(c => !['front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(c)).length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-400 italic py-2">Chưa có cột tùy biến nào được tạo.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {availableColumns
                            .filter(c => !['front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img'].includes(c))
                            .map(col => (
                              <div key={col} className="flex items-center justify-between p-2 bg-slate-50/50 border border-slate-200 rounded-2xl">
                                {renamingCol === col ? (
                                  <div className="flex items-center gap-2 flex-1 mr-1">
                                    <input
                                      type="text"
                                      value={renamingNewValue}
                                      onChange={(e) => setRenamingNewValue(e.target.value)}
                                      className="flex-1 h-8 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 text-xs font-bold text-slate-800 outline-none"
                                      placeholder="Tên mới..."
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleRenameColumn(col)}
                                      className="h-8 px-2.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase"
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      onClick={() => { setRenamingCol(null); setRenamingNewValue(''); }}
                                      className="h-8 px-2 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider pl-2">{col.replace(/_/g, ' ')}</span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => { setRenamingCol(col); setRenamingNewValue(col); }}
                                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black text-indigo-600 uppercase transition-all"
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        onClick={() => handleDeleteColumn(col)}
                                        className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-lg text-[9px] font-black text-rose-500 uppercase transition-all"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Add New Column Input */}
                    <div className="pt-3 border-t border-slate-50 space-y-2 shrink-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Thêm cột tùy biến mới</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          placeholder="Ví dụ: cách đọc, từ trái nghĩa..."
                          className="flex-1 h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none transition-all"
                        />
                        <button
                          onClick={handleAddColumn}
                          disabled={!newColName.trim()}
                          className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* General Toast Success Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] max-w-sm w-full px-4"
          >
            <div className="p-3.5 bg-slate-900/90 text-white border border-slate-850 backdrop-blur-md rounded-2xl shadow-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default EditFlashcards
