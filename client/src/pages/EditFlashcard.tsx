import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Save, 
  ChevronLeft, 
  LayoutGrid,
  Zap,
  AlertCircle,
  FileText,
  CheckCircle2,
  Brain,
  Plus,
  Edit2,
  HelpCircle,
  X,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Tag,
  ChevronRight,
  Users,
  Search,
  Trash2,
  UserPlus,
  ShieldCheck,
  ArrowLeftRight,
  FileSpreadsheet,
  Upload,
  Download,
  Clipboard,
  Layers
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

const removeVietnameseTones = (str: string) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return str;
}

const SYSTEM_DEFAULTS = ['front', 'back', 'front_audio_content', 'back_audio_content', 'front_audio_url', 'back_audio_url', 'front_img', 'back_img']

const EditFlashcard = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'columns' | 'ai' | 'collaboration' | 'practice' | 'excel'>('basic')

  // Excel Import/Export State
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge')
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  // Copy-paste import states
  const [rawText, setRawText] = useState('')
  const [delimiter, setDelimiter] = useState<'auto' | 'tab' | 'space' | 'comma' | 'semicolon' | 'pipe'>('auto')
  const [parsedCards, setParsedCards] = useState<any[]>([])
  const [isTextImporting, setIsTextImporting] = useState(false)
  const [textImportSuccess, setTextImportSuccess] = useState(false)
  const [textImportError, setTextImportError] = useState<string | null>(null)

  const detectDelimiter = (text: string): string => {
    let tabCount = 0;
    let pipeCount = 0;
    let semicolonCount = 0;
    let commaCount = 0;
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (text[i + 1] === '"') {
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes) {
        if (char === '\t') tabCount++;
        else if (char === '|') pipeCount++;
        else if (char === ';') semicolonCount++;
        else if (char === ',') commaCount++;
      }
    }
    
    const counts = [
      { char: '\t', count: tabCount },
      { char: '|', count: pipeCount },
      { char: ';', count: semicolonCount },
      { char: ',', count: commaCount }
    ];
    
    counts.sort((a, b) => b.count - a.count);
    return counts[0].count > 0 ? counts[0].char : '\t';
  }

  const parseClipboardText = (text: string, selectedDelim: string): string[][] => {
    const delimChar = selectedDelim === 'auto' ? detectDelimiter(text) : (
      selectedDelim === 'tab' ? '\t' :
      selectedDelim === 'space' ? ' ' :
      selectedDelim === 'comma' ? ',' :
      selectedDelim === 'semicolon' ? ';' :
      selectedDelim === 'pipe' ? '|' : '\t'
    );

    const result: string[][] = [];
    let row: string[] = [];
    let currentVal = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentVal += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentVal += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimChar) {
          row.push(currentVal);
          currentVal = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(currentVal);
          result.push(row);
          row = [];
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal);
      result.push(row);
    }
    
    return result.filter(r => r.some(cell => cell.trim().length > 0));
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      setTextImportError("Vui lòng nhập hoặc dán văn bản trước.")
      return
    }
    setTextImportError(null)
    const rows = parseClipboardText(rawText, delimiter)
    if (rows.length === 0) {
      setTextImportError("Không tìm thấy dòng thẻ nào hợp lệ.")
      return
    }
    
    const nonMainCols = availableColumns.filter(c => c !== 'front' && c !== 'back')
    const colOrder = ['front', 'back', ...nonMainCols]
    
    const cards = rows.map(row => {
      const cardObj: any = { content: '', explanation: '', others: {} }
      
      row.forEach((cellVal, colIdx) => {
        const targetCol = colOrder[colIdx]
        if (targetCol === 'front') {
          cardObj.content = cellVal.trim()
        } else if (targetCol === 'back') {
          cardObj.explanation = cellVal.trim()
        } else if (targetCol) {
          cardObj.others[targetCol] = cellVal.trim()
        }
      })
      
      // Initialize missing custom columns with empty string
      nonMainCols.forEach(c => {
        if (cardObj.others[c] === undefined) {
          cardObj.others[c] = ''
        }
      })
      
      return cardObj
    })
    
    setParsedCards(cards)
  }

  const handleTextImportSubmit = async () => {
    if (parsedCards.length === 0) return
    setIsTextImporting(true)
    setTextImportError(null)
    setTextImportSuccess(false)
    try {
      const payload = {
        mode: importMode,
        cards: parsedCards.map(c => ({
          content: c.content,
          explanation: c.explanation,
          others: c.others
        }))
      }
      await axios.post(`/api/v1/deck/${id}/import-text-update`, payload)
      setTextImportSuccess(true)
      setParsedCards([])
      setRawText('')
    } catch (err: any) {
      setTextImportError(err.response?.data?.error || "Import văn bản thất bại")
    } finally {
      setIsTextImporting(false)
    }
  }

  const handleUpdateCardText = (idx: number, field: string, value: string) => {
    const updated = [...parsedCards]
    if (field === 'content') {
      updated[idx].content = value
    } else if (field === 'explanation') {
      updated[idx].explanation = value
    } else {
      updated[idx].others = {
        ...updated[idx].others,
        [field]: value
      }
    }
    setParsedCards(updated)
  }

  const handleDeleteCardText = (idx: number) => {
    setParsedCards(parsedCards.filter((_, i) => i !== idx))
  }

  const handleAddCardRowText = () => {
    const nonMainCols = availableColumns.filter(c => c !== 'front' && c !== 'back')
    const othersObj: any = {}
    nonMainCols.forEach(c => { othersObj[c] = '' })
    setParsedCards([...parsedCards, { content: '', explanation: '', others: othersObj }])
  }

  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`/api/v1/deck/${id}/export`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${formData.title || 'deck'}_export.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert("Xuất Excel thất bại")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0])
      setImportError(null)
      setImportSuccess(false)
    }
  }

  const handleImportExcel = async () => {
    if (!excelFile) return
    setIsImporting(true)
    setImportError(null)
    setImportSuccess(false)
    
    const data = new FormData()
    data.append('file', excelFile)
    data.append('mode', importMode)

    try {
      await axios.post(`/api/v1/deck/${id}/import-update`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setImportSuccess(true)
      setExcelFile(null)
    } catch (err: any) {
      setImportError(err.response?.data?.error || "Nhập Excel thất bại")
    } finally {
      setIsImporting(false)
    }
  }
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ai_prompt: '',
    ai_prompt_hint: '',
    ai_prompt_mnemonic: '',
    instruction: '',
    category_name: '',
    cover_image: '',
    tags: '',
    creator_id: 0,
    is_public: true
  })
  
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Practice Defaults State
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [customColumns, setCustomColumns] = useState<string[]>([])
  const [newColName, setNewColName] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renamingColumn, setRenamingColumn] = useState('')
  const [newRenamedName, setNewRenamedName] = useState('')
  const [practiceSettings, setPracticeSettings] = useState<any>({
    mcq: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
    typing: { active_pairs: [{ q: 'front', a: 'back' }] },
    listening: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
    ai_prompts: []
  })
  
  // Collaboration State
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/v1/deck/${id}/data`)
        setFormData({
          title: res.data.title,
          description: res.data.description || '',
          ai_prompt: res.data.ai_prompt || '',
          ai_prompt_hint: res.data.ai_prompt_hint || '',
          ai_prompt_mnemonic: res.data.ai_prompt_mnemonic || '',
          instruction: res.data.instruction || '',
          category_name: res.data.category_name || 'General',
          cover_image: res.data.cover_image || '',
          tags: res.data.tags?.join(', ') || '',
          creator_id: res.data.creator_id,
          is_public: res.data.is_public !== undefined ? res.data.is_public : true
        })
        
        // Fetch collaborators
        const collabRes = await axios.get(`/api/v1/deck/${id}/collaborators`)
        setCollaborators(collabRes.data)

        // Fetch practice settings
        const settingsRes = await axios.get(`/api/v1/deck/${id}/practice-settings`)
        setAvailableColumns(settingsRes.data.available_columns || ['front', 'back'])
        setCustomColumns(settingsRes.data.creator_settings?.custom_columns || [])
        if (settingsRes.data.creator_settings && Object.keys(settingsRes.data.creator_settings).length > 0) {
          const loaded = settingsRes.data.creator_settings
          // Ensure ai_prompts is always an array even if missing from server data
          if (!loaded.ai_prompts) loaded.ai_prompts = []
          setPracticeSettings(loaded)
        }
      } catch (err) {
        setError('Failed to load quiz data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuiz()
  }, [id])

  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const res = await axios.get(`/api/v1/deck/users/search?q=${userSearch}`)
        setSearchResults(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }
    const timer = setTimeout(searchUsers, 500)
    return () => clearTimeout(timer)
  }, [userSearch])

  const handleSaveMetadata = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await axios.patch(`/api/v1/deck/${id}`, {
        title: formData.title,
        description: formData.description,
        instruction: formData.instruction,
        cover_image: formData.cover_image,
        is_public: formData.is_public,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      })
      
      // Save default practice settings for this deck
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        settings: practiceSettings,
        is_creator: true
      })
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const addCollaborator = async (userId: number) => {
    try {
      await axios.post(`/api/v1/deck/${id}/collaborators`, { user_id: userId })
      const res = await axios.get(`/api/v1/deck/${id}/collaborators`)
      setCollaborators(res.data)
      setUserSearch('')
      setSearchResults([])
    } catch (err) {
      alert("Failed to add collaborator")
    }
  }

  const removeCollaborator = async (userId: number) => {
    if (!confirm("Remove this collaborator?")) return
    try {
      await axios.delete(`/api/v1/deck/${id}/collaborators/${userId}`)
      setCollaborators(collaborators.filter(c => c.id !== userId))
    } catch (err) {
      alert("Failed to remove collaborator")
    }
  }

  const transferOwnership = async (userId: number) => {
    if (!confirm("Are you sure you want to transfer ownership? You will lose primary control over this collection.")) return
    try {
      await axios.post(`/api/v1/deck/${id}/transfer-ownership`, { user_id: userId })
      alert("Ownership transferred successfully")
      navigate('/manage')
    } catch (err) {
      alert("Failed to transfer ownership")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Zap className="w-10 h-10 text-indigo-600 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Fixed Header on Mobile, Sticky on Desktop */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 shadow-sm w-full md:sticky md:top-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => navigate('/manage')}
              className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 active:scale-95 transition-all border border-slate-100 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] md:text-sm font-black text-slate-900 uppercase tracking-tight italic truncate leading-none mb-1">Edit Collection</h1>
              <p className="hidden md:block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Refine Identity & AI Rules</p>
            </div>
          </div>

          <button 
            onClick={handleSaveMetadata}
            disabled={isSaving || success}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-white text-[9px] md:text-[10px] font-black rounded-lg transition-all shadow-lg uppercase tracking-widest active:scale-95 shrink-0",
              success ? "bg-emerald-500 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
            )}
          >
            {isSaving ? <Zap className="w-3 h-3 animate-spin" /> : success ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            <span>{isSaving ? "Saving..." : success ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-[68px] md:pt-0 mt-6 md:mt-10">
        {/* Mobile Tab Switcher */}
        <div className="flex items-center bg-white border border-slate-100 p-1.5 rounded-2xl mb-8 md:hidden shadow-sm overflow-x-auto">
           {['basic', 'columns', 'practice', 'ai', 'collaboration', 'excel'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={cn(
                 "flex-1 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                 activeTab === tab ? "bg-slate-900 text-white shadow-md" : "text-slate-400"
               )}
             >
               {tab === 'basic' ? 'Identity' : tab === 'columns' ? 'Cột dữ liệu' : tab === 'practice' ? 'Practice' : tab === 'ai' ? 'AI Engine' : tab === 'collaboration' ? 'Rights' : 'Excel'}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Navigation Aside (Desktop) */}
           <aside className="hidden md:flex flex-col gap-3">
              <NavButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={SettingsIcon} title="Basic Info" sub="Title, Cover, Tags" />
              <NavButton active={activeTab === 'columns'} onClick={() => setActiveTab('columns')} icon={Layers} title="Column Manager" sub="Custom Columns & Fields" />
              <NavButton active={activeTab === 'practice'} onClick={() => setActiveTab('practice')} icon={Zap} title="Practice Defaults" sub="MCQ, Typing, Listening" />
              <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={Brain} title="AI Intelligence" sub="System Prompts & Rules" />
              <NavButton active={activeTab === 'collaboration'} onClick={() => setActiveTab('collaboration')} icon={Users} title="Collaboration" sub="Editors & Ownership" />
              <NavButton active={activeTab === 'excel'} onClick={() => setActiveTab('excel')} icon={FileSpreadsheet} title="Excel Tools" sub="Import & Export" />

              <div className="mt-4 p-6 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
                 <LayoutGrid className="w-8 h-8 mb-4 opacity-50" />
                 <h4 className="text-sm font-black uppercase italic tracking-tighter">Quick Access</h4>
                 <p className="text-[10px] opacity-80 mt-2 font-medium leading-relaxed">Manage individual cards and options in the question studio.</p>
                 <button 
                    onClick={() => navigate(`/manage/edit/${id}/flashcards`)}
                    className="w-full mt-6 py-3 bg-white text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                 >
                    Manage Cards
                 </button>
              </div>
           </aside>

           {/* Main Content Area */}
           <div className="md:col-span-2">
              <AnimatePresence mode="wait">
                 {activeTab === 'basic' && (
                    <motion.div key="basic" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                         <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                               <SettingsIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase italic">Identity</h2>
                         </div>

                         <div className="space-y-4">
                            <InputField label="Collection Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} />
                            
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                               <div className="relative">
                                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                     type="text" 
                                     placeholder="https://..."
                                     value={formData.cover_image}
                                     onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                                     className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                  />
                               </div>
                            </div>

                            <Textarea label="Description" value={formData.description} onChange={v => setFormData({...formData, description: v})} rows={4} />
                            <Textarea label="Global Instruction (SSR Header)" value={formData.instruction} onChange={v => setFormData({...formData, instruction: v})} rows={3} placeholder="e.g. Choose the most appropriate answer..." />
                            
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                               <input 
                                  type="checkbox" 
                                  id="isPublicEdit"
                                  checked={formData.is_public}
                                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                  className="w-5 h-5 text-indigo-600 bg-white border-slate-200 rounded focus:ring-indigo-500"
                               />
                               <div className="flex flex-col">
                                  <label htmlFor="isPublicEdit" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                                     Public Deck (Bộ thẻ công khai)
                                  </label>
                                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                                     If unchecked, only you will be able to see and access this collection.
                                  </span>
                               </div>
                            </div>
                            
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (Comma Separated)</label>
                               <div className="relative">
                                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                     type="text" 
                                     placeholder="Kanji, JLPT N1, Grammar"
                                     value={formData.tags}
                                     onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                     className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                  />
                               </div>
                            </div>
                         </div>
                       </div>
                     </motion.div>
                  )}

                  {activeTab === 'columns' && (
                     <motion.div key="columns" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                          <div className="flex items-center gap-4 mb-2">
                             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Layers className="w-5 h-5" />
                             </div>
                             <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase italic">Quản lý cột dữ liệu</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Quản lý các cột dữ liệu tùy biến (Custom Columns)</p>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                   Cột mặc định của hệ thống:
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                   {availableColumns.filter(c => SYSTEM_DEFAULTS.includes(c)).map(col => (
                                      <div 
                                         key={col}
                                         className="px-3 py-2 rounded-xl border bg-slate-100 border-slate-200 text-slate-500 text-xs font-bold transition-all"
                                      >
                                         <div className="flex flex-col">
                                            <span className="uppercase text-[10px]">{col}</span>
                                            <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider">Mặc định</span>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>

                             <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                   Cột dữ liệu tùy chỉnh / Excel:
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                   {availableColumns.filter(c => !SYSTEM_DEFAULTS.includes(c)).map(col => {
                                      const isCustom = customColumns.includes(col);
                                      return (
                                         <div 
                                            key={col}
                                            className={cn(
                                               "px-3 py-2 rounded-xl border flex items-center gap-3 text-xs font-bold transition-all",
                                               isCustom 
                                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                                                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            )}
                                         >
                                            <div className="flex flex-col">
                                               <span className="uppercase text-[10px]">{col}</span>
                                               <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider">
                                                  {isCustom ? 'Tự tạo' : 'Import Excel'}
                                               </span>
                                            </div>
                                            {true && (
                                                <div className="flex items-center gap-1.5 ml-1">
                                                   <button
                                                      type="button"
                                                      onClick={() => {
                                                         setRenamingColumn(col);
                                                         setNewRenamedName(col);
                                                         setShowRenameModal(true);
                                                      }}
                                                      className="w-5 h-5 rounded-lg bg-indigo-100 hover:bg-indigo-200 transition-colors flex items-center justify-center text-indigo-500"
                                                      title="Đổi tên cột"
                                                   >
                                                      <Edit2 className="w-3 h-3" />
                                                   </button>
                                                   <button
                                                      type="button"
                                                      onClick={async () => {
                                                         if (!confirm(`Bạn chắc chắn muốn xóa cột "${col}"? Hành động này sẽ xóa dữ liệu cột này ở toàn bộ các thẻ.`)) return;
                                                         try {
                                                            await axios.post(`/api/v1/deck/${id}/delete-column`, {
                                                               column_name: col
                                                            });
                                                            const nextCustom = customColumns.filter(c => c !== col);
                                                            setCustomColumns(nextCustom);
                                                            const sRes = await axios.get(`/api/v1/deck/${id}/practice-settings`);
                                                            setAvailableColumns(sRes.data.available_columns || ['front', 'back']);
                                                            setPracticeSettings(sRes.data.creator_settings || {});
                                                            alert("Xóa cột thành công!");
                                                         } catch (err) {
                                                            alert("Lỗi khi xóa cột");
                                                         }
                                                      }}
                                                      className="w-5 h-5 rounded-lg bg-indigo-100 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center text-indigo-400"
                                                      title="Xóa cột"
                                                   >
                                                      <Trash2 className="w-3 h-3" />
                                                   </button>
                                                </div>
                                             )}
                                         </div>
                                      );
                                   })}
                                   {availableColumns.filter(c => !SYSTEM_DEFAULTS.includes(c)).length === 0 && (
                                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest py-2">Không có cột tùy chỉnh nào</span>
                                   )}
                                </div>
                             </div>

                             <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                   Thêm cột dữ liệu tùy biến mới:
                                </h3>
                                <div className="flex items-center gap-3">
                                   <input 
                                      type="text" 
                                      placeholder="Tên cột mới (ví dụ: Nghĩa, Cách nhớ, Kanji...)"
                                      value={newColName}
                                      onChange={(e) => setNewColName(e.target.value)}
                                      className="flex-1 h-12 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                   />
                                   <button
                                      type="button"
                                      onClick={async () => {
                                         const name = newColName.trim();
                                         if (!name) return;
                                         if (availableColumns.includes(name)) {
                                            alert("Cột này đã tồn tại!");
                                            return;
                                         }
                                         const nextCustom = [...customColumns, name];
                                         setCustomColumns(nextCustom);
                                         setNewColName('');
                                         
                                         try {
                                            await axios.post(`/api/v1/deck/${id}/practice-settings`, {
                                               settings: { ...practiceSettings, custom_columns: nextCustom },
                                               is_creator: true
                                            });
                                            const sRes = await axios.get(`/api/v1/deck/${id}/practice-settings`);
                                            setAvailableColumns(sRes.data.available_columns || ['front', 'back']);
                                         } catch (err) {
                                            alert("Lỗi khi thêm cột mới");
                                         }
                                      }}
                                      className="h-12 px-6 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
                                   >
                                      <Plus className="w-3.5 h-3.5" /> Thêm cột
                                   </button>
                                </div>
                             </div>
                          </div>
                        </div>
                     </motion.div>
                  )}

                  {activeTab === 'practice' && (
                    <motion.div key="practice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                         <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                               <Zap className="w-5 h-5" />
                            </div>
                            <div>
                               <h2 className="text-lg font-black text-slate-800 uppercase italic">Default Practice Settings</h2>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Configure default layouts for students</p>
                            </div>
                         </div>

                         {/* MCQ Settings */}
                         <div className="p-6 bg-slate-50 border border-slate-100/80 rounded-2xl space-y-5">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-indigo-500" />
                               MCQ Mode (Trắc nghiệm)
                            </h3>
                            
                            <div className="space-y-3">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question - Answer Pairs (Các cặp câu hỏi - đáp án)</label>
                               {(practiceSettings.mcq?.active_pairs || []).map((pair: any, index: number) => (
                                  <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-fade-in">
                                     <div className="flex-grow grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] font-bold text-slate-400">Q:</span>
                                           <select
                                              value={pair.q || 'front'}
                                              onChange={(e) => {
                                                 const newPairs = [...(practiceSettings.mcq?.active_pairs || [])];
                                                 newPairs[index] = { ...newPairs[index], q: e.target.value };
                                                 setPracticeSettings({
                                                    ...practiceSettings,
                                                    mcq: { ...practiceSettings.mcq, active_pairs: newPairs }
                                                 });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 outline-none"
                                           >
                                              {availableColumns.map(col => (
                                                 <option key={col} value={col}>{col.toUpperCase()}</option>
                                              ))}
                                           </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] font-bold text-slate-400">A:</span>
                                           <select
                                              value={pair.a || 'back'}
                                              onChange={(e) => {
                                                 const newPairs = [...(practiceSettings.mcq?.active_pairs || [])];
                                                 newPairs[index] = { ...newPairs[index], a: e.target.value };
                                                 setPracticeSettings({
                                                    ...practiceSettings,
                                                    mcq: { ...practiceSettings.mcq, active_pairs: newPairs }
                                                 });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 outline-none"
                                           >
                                              {availableColumns.map(col => (
                                                 <option key={col} value={col}>{col.toUpperCase()}</option>
                                              ))}
                                           </select>
                                        </div>
                                     </div>
                                     <button
                                        type="button"
                                        onClick={() => {
                                           const newPairs = (practiceSettings.mcq?.active_pairs || []).filter((_: any, idx: number) => idx !== index);
                                           setPracticeSettings({
                                              ...practiceSettings,
                                              mcq: { ...practiceSettings.mcq, active_pairs: newPairs }
                                           });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-100 flex items-center justify-center transition-all"
                                     >
                                        <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                               ))}
                               <button
                                  type="button"
                                  onClick={() => {
                                     const newPairs = [...(practiceSettings.mcq?.active_pairs || []), { q: 'front', a: 'back' }];
                                     setPracticeSettings({
                                        ...practiceSettings,
                                        mcq: { ...practiceSettings.mcq, active_pairs: newPairs }
                                     });
                                  }}
                                  className="py-2 px-3 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all w-fit bg-indigo-50/20 active:scale-95"
                               >
                                  <Plus className="w-3.5 h-3.5" /> Add QA Pair
                               </button>
                            </div>

                            <div className="space-y-1.5 pt-2">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Number of Choices (Số lượng đáp án)</label>
                               <select
                                  value={practiceSettings.mcq?.num_choices || 4}
                                  onChange={(e) => {
                                     setPracticeSettings({
                                        ...practiceSettings,
                                        mcq: {
                                           ...practiceSettings.mcq,
                                           num_choices: parseInt(e.target.value)
                                        }
                                     })
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                               >
                                  {[2, 3, 4, 5, 6].map(num => (
                                     <option key={num} value={num}>{num} Choices</option>
                                  ))}
                               </select>
                            </div>
                         </div>

                         {/* Typing Settings */}
                         <div className="p-6 bg-slate-50 border border-slate-100/80 rounded-2xl space-y-5">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-pink-500" />
                               Typing Mode (Gõ câu trả lời)
                            </h3>
                            
                            <div className="space-y-3">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question - Answer Pairs (Các cặp câu hỏi - đáp án)</label>
                               {(practiceSettings.typing?.active_pairs || []).map((pair: any, index: number) => (
                                  <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-fade-in">
                                     <div className="flex-grow grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] font-bold text-slate-400">Q:</span>
                                           <select
                                              value={pair.q || 'front'}
                                              onChange={(e) => {
                                                 const newPairs = [...(practiceSettings.typing?.active_pairs || [])];
                                                 newPairs[index] = { ...newPairs[index], q: e.target.value };
                                                 setPracticeSettings({
                                                    ...practiceSettings,
                                                    typing: { ...practiceSettings.typing, active_pairs: newPairs }
                                                 });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 outline-none"
                                           >
                                              {availableColumns.map(col => (
                                                 <option key={col} value={col}>{col.toUpperCase()}</option>
                                              ))}
                                           </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] font-bold text-slate-400">A:</span>
                                           <select
                                              value={pair.a || 'back'}
                                              onChange={(e) => {
                                                 const newPairs = [...(practiceSettings.typing?.active_pairs || [])];
                                                 newPairs[index] = { ...newPairs[index], a: e.target.value };
                                                 setPracticeSettings({
                                                    ...practiceSettings,
                                                    typing: { ...practiceSettings.typing, active_pairs: newPairs }
                                                 });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 outline-none"
                                           >
                                              {availableColumns.map(col => (
                                                 <option key={col} value={col}>{col.toUpperCase()}</option>
                                              ))}
                                           </select>
                                        </div>
                                     </div>
                                     <button
                                        type="button"
                                        onClick={() => {
                                           const newPairs = (practiceSettings.typing?.active_pairs || []).filter((_: any, idx: number) => idx !== index);
                                           setPracticeSettings({
                                              ...practiceSettings,
                                              typing: { ...practiceSettings.typing, active_pairs: newPairs }
                                           });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-100 flex items-center justify-center transition-all"
                                     >
                                        <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                               ))}
                               <button
                                  type="button"
                                  onClick={() => {
                                     const newPairs = [...(practiceSettings.typing?.active_pairs || []), { q: 'front', a: 'back' }];
                                     setPracticeSettings({
                                        ...practiceSettings,
                                        typing: { ...practiceSettings.typing, active_pairs: newPairs }
                                     });
                                  }}
                                  className="py-2 px-3 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all w-fit bg-indigo-50/20 active:scale-95"
                               >
                                  <Plus className="w-3.5 h-3.5" /> Add QA Pair
                               </button>
                            </div>
                         </div>

                         {/* Listening Settings */}
                         <div className="p-6 bg-slate-50 border border-slate-100/80 rounded-2xl space-y-5">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-emerald-500" />
                               Listening Mode (Luyện nghe)
                            </h3>
                            
                            <div className="space-y-3">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question - Answer Pairs (Các cặp câu hỏi - đáp án)</label>
                               {(practiceSettings.listening?.active_pairs || []).map((pair: any, index: number) => (
                                  <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-fade-in">
                                     <div className="flex-grow grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] font-bold text-slate-400">Q:</span>
                                           <select
                                              value={pair.q || 'front'}
                                              onChange={(e) => {
                                                 const newPairs = [...(practiceSettings.listening?.active_pairs || [])];
                                                 newPairs[index] = { ...newPairs[index], q: e.target.value };
                                                 setPracticeSettings({
                                                    ...practiceSettings,
                                                    listening: { ...practiceSettings.listening, active_pairs: newPairs }
                                                 });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 outline-none"
                                           >
                                              {availableColumns.map(col => (
                                                 <option key={col} value={col}>{col.toUpperCase()}</option>
                                              ))}
                                           </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[9px] font-bold text-slate-400">A:</span>
                                           <select
                                              value={pair.a || 'back'}
                                              onChange={(e) => {
                                                 const newPairs = [...(practiceSettings.listening?.active_pairs || [])];
                                                 newPairs[index] = { ...newPairs[index], a: e.target.value };
                                                 setPracticeSettings({
                                                    ...practiceSettings,
                                                    listening: { ...practiceSettings.listening, active_pairs: newPairs }
                                                 });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 outline-none"
                                           >
                                              {availableColumns.map(col => (
                                                 <option key={col} value={col}>{col.toUpperCase()}</option>
                                              ))}
                                           </select>
                                        </div>
                                     </div>
                                     <button
                                        type="button"
                                        onClick={() => {
                                           const newPairs = (practiceSettings.listening?.active_pairs || []).filter((_: any, idx: number) => idx !== index);
                                           setPracticeSettings({
                                              ...practiceSettings,
                                              listening: { ...practiceSettings.listening, active_pairs: newPairs }
                                           });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-100 flex items-center justify-center transition-all"
                                     >
                                        <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                               ))}
                               <button
                                  type="button"
                                  onClick={() => {
                                     const newPairs = [...(practiceSettings.listening?.active_pairs || []), { q: 'front', a: 'back' }];
                                     setPracticeSettings({
                                        ...practiceSettings,
                                        listening: { ...practiceSettings.listening, active_pairs: newPairs }
                                     });
                                  }}
                                  className="py-2 px-3 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all w-fit bg-indigo-50/20 active:scale-95"
                               >
                                  <Plus className="w-3.5 h-3.5" /> Add QA Pair
                               </button>
                            </div>

                            <div className="space-y-1.5 pt-2">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Number of Choices (Số lượng đáp án)</label>
                               <select
                                  value={practiceSettings.listening?.num_choices || 4}
                                  onChange={(e) => {
                                     setPracticeSettings({
                                        ...practiceSettings,
                                        listening: {
                                           ...practiceSettings.listening,
                                           num_choices: parseInt(e.target.value)
                                        }
                                     })
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 h-12 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                               >
                                  {[2, 3, 4, 5, 6].map(num => (
                                     <option key={num} value={num}>{num} Choices</option>
                                  ))}
                               </select>
                            </div>
                         </div>
                       </div>
                    </motion.div>
                 )}


                 {activeTab === 'ai' && (
                    <motion.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-10 border border-slate-800 shadow-2xl space-y-6">
                         <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-400">
                                  <Brain className="w-5 h-5" />
                               </div>
                               <h2 className="text-lg font-black text-white uppercase italic">AI Intelligence</h2>
                            </div>
                            <button 
                               onClick={() => setShowHelpModal(true)}
                               className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                            >
                               <HelpCircle className="w-4 h-4" />
                            </button>
                         </div>

                         <div className="space-y-4 pt-4">
                             <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Cấu hình tạo nội dung bằng AI (AI Prompts)</label>
                                <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">Column-to-Prompt Mapping</span>
                             </div>
                             {(practiceSettings.ai_prompts || []).map((cp: any, index: number) => (
                                <div key={index} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 animate-fade-in">
                                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                      <div className="flex-1">
                                         <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-1">Cột Đích Cần Tạo AI (Target Column)</label>
                                         <select 
                                            value={cp.column || cp.id || ''}
                                            onChange={(e) => {
                                               const val = e.target.value
                                               const newPrompts = [...(practiceSettings.ai_prompts || [])]
                                               newPrompts[index] = { 
                                                  ...newPrompts[index], 
                                                  column: val, 
                                                  id: val, 
                                                  title: val.toUpperCase().replace(/_/g, ' ') 
                                               }
                                               setPracticeSettings({ ...practiceSettings, ai_prompts: newPrompts })
                                            }}
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 h-10 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                         >
                                            <option value="">-- Chọn cột dữ liệu cần gán AI --</option>
                                            {availableColumns.map(col => (
                                               <option key={col} value={col}>{col.toUpperCase()}</option>
                                            ))}
                                         </select>
                                      </div>
                                      <button
                                         type="button"
                                         onClick={() => {
                                            const newPrompts = (practiceSettings.ai_prompts || []).filter((_: any, idx: number) => idx !== index)
                                            setPracticeSettings({ ...practiceSettings, ai_prompts: newPrompts })
                                         }}
                                         className="w-10 h-10 rounded-xl bg-white/5 hover:bg-rose-500/15 hover:text-rose-400 border border-white/5 flex items-center justify-center text-white/40 transition-all self-end"
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                   </div>

                                   <div className="space-y-1.5">
                                      <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">AI Prompt Template</label>
                                      <textarea 
                                         rows={4}
                                         placeholder="Define custom instruction for this column. Placeholders: {{question}}, {{card}}, {{correct_answer}}, {{options}}"
                                         value={cp.prompt || ''}
                                         onChange={(e) => {
                                            const newPrompts = [...(practiceSettings.ai_prompts || [])]
                                            newPrompts[index] = { ...newPrompts[index], prompt: e.target.value }
                                            setPracticeSettings({ ...practiceSettings, ai_prompts: newPrompts })
                                         }}
                                         className="w-full bg-slate-800 border border-white/10 rounded-xl p-3.5 text-xs font-medium text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none custom-scrollbar"
                                      />
                                   </div>
                                </div>
                             ))}

                             <button
                                type="button"
                                onClick={() => {
                                   const newPrompts = [...(practiceSettings.ai_prompts || []), { id: '', column: '', title: '', prompt: '' }]
                                   setPracticeSettings({ ...practiceSettings, ai_prompts: newPrompts })
                                }}
                                className="py-2.5 px-4 border border-dashed border-indigo-500/30 hover:border-indigo-400 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all w-fit bg-indigo-500/5 active:scale-95"
                             >
                                <Plus className="w-3.5 h-3.5" /> Thêm Cấu Hình Tạo AI
                             </button>
                          </div>
                       </div>
                    </motion.div>
                 )}

                 {activeTab === 'collaboration' && (
                    <motion.div key="collab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-100 shadow-sm space-y-8">
                          <div>
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                   <Users className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase italic">Collaborators</h2>
                             </div>
                             
                             {/* User Search */}
                             <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                   type="text" 
                                   placeholder="Search users to add as editors..." 
                                   value={userSearch}
                                   onChange={(e) => setUserSearch(e.target.value)}
                                   className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                />
                                <AnimatePresence>
                                   {searchResults.length > 0 && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[50] overflow-hidden">
                                         {searchResults.map(u => (
                                            <button key={u.id} onClick={() => addCollaborator(u.id)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group">
                                               <div className="text-left">
                                                  <div className="text-xs font-black text-slate-900 uppercase italic">{u.username}</div>
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.full_name}</div>
                                               </div>
                                               <UserPlus className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                         ))}
                                      </motion.div>
                                   )}
                                </AnimatePresence>
                             </div>

                             {/* Collaborator List */}
                             <div className="space-y-3">
                                {collaborators.map(c => (
                                   <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm font-black text-xs uppercase tracking-tighter">
                                            {c.username[0]}
                                         </div>
                                         <div>
                                            <div className="text-xs font-black text-slate-900 uppercase italic">{c.username}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                               <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shared Editor</span>
                                            </div>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                         <button 
                                            onClick={() => transferOwnership(c.id)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-black text-amber-600 hover:bg-amber-50 hover:border-amber-100 transition-all uppercase tracking-widest flex items-center gap-1.5"
                                         >
                                            <ArrowLeftRight className="w-3 h-3" /> Transfer Ownership
                                         </button>
                                         <button 
                                            onClick={() => removeCollaborator(c.id)}
                                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all"
                                         >
                                            <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                      </div>
                                   </div>
                                ))}
                                {collaborators.length === 0 && !isSearching && (
                                   <div className="py-12 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No shared editors found</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>
                    </motion.div>
                 )}

                 {activeTab === 'excel' && (
                    <motion.div key="excel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-100 shadow-sm space-y-8">
                          <div>
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                   <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                   <h2 className="text-lg font-black text-slate-800 uppercase italic">Excel Utilities</h2>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Nhập / Xuất Excel để quản lý thẻ nhanh</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Export Section */}
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                   <div>
                                      <h3 className="text-sm font-black text-slate-800 uppercase italic flex items-center gap-2 mb-2">
                                         <Download className="w-4 h-4 text-indigo-600" />
                                         Xuất file Excel
                                      </h3>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6 leading-relaxed">
                                         Tải xuống toàn bộ thẻ hiện tại của collection này thành một file Excel để lưu trữ hoặc sửa nhanh.
                                      </p>
                                   </div>
                                   <button 
                                      onClick={handleExportExcel}
                                      className="w-full py-3.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                                   >
                                      <Download className="w-3.5 h-3.5" />
                                      Xuất Excel
                                   </button>
                                </div>

                                {/* Import Section */}
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                   <div>
                                      <h3 className="text-sm font-black text-slate-800 uppercase italic flex items-center gap-2 mb-2">
                                         <Upload className="w-4 h-4 text-emerald-600" />
                                         Nhập file Excel
                                      </h3>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6 leading-relaxed">
                                         Chọn file Excel của bạn để cập nhật/sửa nhanh hoặc thêm tiếp thẻ mới vào bộ sưu tập.
                                      </p>
                                   </div>
                                   
                                   <div className="relative">
                                      <input 
                                         type="file" 
                                         accept=".xlsx, .xls"
                                         onChange={(e) => {
                                            handleFileChange(e);
                                            if (e.target.files && e.target.files[0]) {
                                               setShowImportModal(true);
                                            }
                                         }}
                                         className="hidden" 
                                         id="excel-file-upload"
                                      />
                                      <label 
                                         htmlFor="excel-file-upload"
                                         className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 cursor-pointer text-center"
                                      >
                                         <Upload className="w-3.5 h-3.5" />
                                         Chọn file Excel
                                      </label>
                                   </div>
                                </div>
                             </div>

                             {/* Quick Copy-Paste Section */}
                             <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                                <div>
                                   <h3 className="text-sm font-black text-slate-800 uppercase italic flex items-center gap-2 mb-2">
                                      <Clipboard className="w-4 h-4 text-indigo-600" />
                                      Dán nhanh từ văn bản (Copy-Paste)
                                   </h3>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 leading-relaxed">
                                      Dán trực tiếp văn bản từ Excel, Google Sheets hoặc Quizlet vào ô bên dưới.
                                   </p>
                                </div>

                                <div className="space-y-4">
                                   <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs space-y-2">
                                      <div className="font-black text-indigo-900 uppercase tracking-widest text-[9px]">Thứ tự các cột cần dán (Cực kì quan trọng):</div>
                                      <div className="flex flex-wrap gap-2 items-center text-[11px] font-bold text-indigo-700">
                                         <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md">Cột 1: front (Mặt trước)</span>
                                         <span className="text-indigo-400">➔</span>
                                         <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md">Cột 2: back (Mặt sau)</span>
                                         {availableColumns.filter(c => c !== 'front' && c !== 'back').map((col, idx) => (
                                            <React.Fragment key={col}>
                                               <span className="text-indigo-400">➔</span>
                                               <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md">Cột {idx + 3}: {col}</span>
                                            </React.Fragment>
                                         ))}
                                      </div>
                                      <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                         💡 <strong>Lưu ý về CHAR(10) (Dòng mới trong ô):</strong> Các dòng mới nằm bên trong một ô Excel / Google Sheets khi dán vào đây sẽ được tự động nhận diện chính xác mà không làm lệch cột hoặc hàng (hệ thống tự phân tích định dạng dấu ngoặc kép của Excel).
                                      </div>
                                   </div>

                                   <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                      <div className="space-y-1.5 flex-grow">
                                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Kí tự phân tách (Delimiter)</label>
                                         <div className="flex flex-wrap gap-1.5">
                                            {([
                                               { key: 'auto', label: 'Tự động phát hiện ⚙️' },
                                               { key: 'tab', label: 'Tab ⇥' },
                                               { key: 'space', label: 'Khoảng trắng ␣' },
                                               { key: 'comma', label: 'Dấu phẩy (,) ⎎' },
                                               { key: 'semicolon', label: 'Dấu chấm phẩy (;) ⎏' },
                                               { key: 'pipe', label: 'Dấu gạch đứng (|)' }
                                            ] as const).map(item => (
                                               <button
                                                  key={item.key}
                                                  type="button"
                                                  onClick={() => setDelimiter(item.key)}
                                                  className={cn(
                                                     "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border",
                                                     delimiter === item.key
                                                        ? "bg-indigo-650 border-indigo-650 text-white shadow-md"
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                                  )}
                                               >
                                                  {item.label}
                                               </button>
                                            ))}
                                         </div>
                                      </div>

                                      <div className="space-y-1.5 w-full md:w-auto">
                                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Phương thức nhập</label>
                                         <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                                            <button
                                               type="button"
                                               onClick={() => setImportMode('merge')}
                                               className={cn(
                                                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                                  importMode === 'merge' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                               )}
                                            >
                                               Thêm tiếp (Merge)
                                            </button>
                                            <button
                                               type="button"
                                               onClick={() => setImportMode('overwrite')}
                                               className={cn(
                                                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                                  importMode === 'overwrite' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                               )}
                                            >
                                               Ghi đè (Overwrite)
                                            </button>
                                         </div>
                                      </div>
                                   </div>

                                   {parsedCards.length === 0 ? (
                                      <div className="space-y-3">
                                         <textarea
                                            rows={6}
                                            value={rawText}
                                            onChange={(e) => setRawText(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                            placeholder={`Dán dữ liệu từ Excel / Google Sheets vào đây...\nVí dụ:\napple\tquả táo\nbanana\tquả chuối`}
                                         />
                                         <div className="flex justify-end">
                                            <button
                                               type="button"
                                               onClick={handleParseText}
                                               className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg uppercase tracking-wider active:scale-95"
                                            >
                                               Phân tích văn bản
                                            </button>
                                         </div>
                                      </div>
                                   ) : (
                                      <div className="space-y-4">
                                         <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                               Đã phân tích: <strong className="text-indigo-600">{parsedCards.length} thẻ</strong>
                                            </span>
                                            <div className="flex gap-2">
                                               <button
                                                  type="button"
                                                  onClick={() => setParsedCards([])}
                                                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider"
                                               >
                                                  Hủy
                                               </button>
                                               <button
                                                  type="button"
                                                  onClick={handleTextImportSubmit}
                                                  disabled={isTextImporting}
                                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black rounded-lg transition-all uppercase tracking-wider flex items-center gap-1 shadow-md shadow-indigo-100"
                                               >
                                                  {isTextImporting ? <Zap className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                  Thực hiện Import ({importMode === 'overwrite' ? 'Ghi đè' : 'Thêm tiếp'})
                                               </button>
                                            </div>
                                         </div>

                                         <div className="border border-slate-100 rounded-2xl max-h-[400px] overflow-y-auto divide-y divide-slate-100 bg-white shadow-sm custom-scrollbar">
                                            {parsedCards.map((card, idx) => (
                                               <div key={idx} className="p-4 flex gap-3 items-center hover:bg-slate-50/50 transition-colors">
                                                  <span className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[9px] font-black shrink-0">
                                                     {idx + 1}
                                                  </span>
                                                  <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                     <div className="space-y-1">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">front</span>
                                                        <input
                                                           type="text"
                                                           value={card.content}
                                                           onChange={(e) => handleUpdateCardText(idx, 'content', e.target.value)}
                                                           className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                        />
                                                     </div>
                                                     <div className="space-y-1">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">back</span>
                                                        <input
                                                           type="text"
                                                           value={card.explanation}
                                                           onChange={(e) => handleUpdateCardText(idx, 'explanation', e.target.value)}
                                                           className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                        />
                                                     </div>
                                                     {Object.keys(card.others || {}).map(otherCol => (
                                                        <div key={otherCol} className="space-y-1">
                                                           <span className="text-[8px] font-bold text-slate-400 uppercase">{otherCol}</span>
                                                           <input
                                                              type="text"
                                                              value={card.others[otherCol] || ''}
                                                              onChange={(e) => handleUpdateCardText(idx, otherCol, e.target.value)}
                                                              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                           />
                                                        </div>
                                                     ))}
                                                  </div>
                                                  <button
                                                     type="button"
                                                     onClick={() => handleDeleteCardText(idx)}
                                                     className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all shrink-0"
                                                  >
                                                     <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                               </div>
                                            ))}

                                            <div className="p-3 bg-slate-50/50">
                                               <button
                                                  type="button"
                                                  onClick={handleAddCardRowText}
                                                  className="w-full py-2.5 bg-white border border-dashed border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all"
                                               >
                                                  <Plus className="w-3.5 h-3.5" /> Thêm dòng mới
                                               </button>
                                            </div>
                                         </div>
                                      </div>
                                   )}
                                </div>
                             </div>

                             {importSuccess && (
                                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700">
                                   <CheckCircle2 className="w-5 h-5 shrink-0" />
                                   <span className="text-xs font-bold">Cập nhật dữ liệu từ Excel thành công!</span>
                                </div>
                             )}

                             {importError && (
                                <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700">
                                   <AlertCircle className="w-5 h-5 shrink-0" />
                                   <span className="text-xs font-bold">{importError}</span>
                                </div>
                             )}

                             {textImportSuccess && (
                                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700">
                                   <CheckCircle2 className="w-5 h-5 shrink-0" />
                                   <span className="text-xs font-bold">Import văn bản thành công!</span>
                                </div>
                             )}

                             {textImportError && (
                                <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700">
                                   <AlertCircle className="w-5 h-5 shrink-0" />
                                   <span className="text-xs font-bold">{textImportError}</span>
                                </div>
                             )}
                           </div>
                        </div>
                     </motion.div>
                 )}
              </AnimatePresence>
              
              {/* Card Manager Shortcut (Mobile) */}
              <div className="md:hidden mt-8">
                 <button 
                    onClick={() => navigate(`/manage/edit/${id}/flashcards`)}
                    className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm active:scale-95 transition-all"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                          <LayoutGrid className="w-6 h-6" />
                       </div>
                       <div className="text-left">
                          <h4 className="text-sm font-black text-slate-800 uppercase italic">Manage Cards</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Edit Card Content</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
         {showHelpModal && (
           <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowHelpModal(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                     <HelpCircle className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Prompting Guide</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Personalize the AI system</p>
                   </div>
                 </div>
                 <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
               </div>

               <div className="space-y-4">
                  <p className="text-xs font-medium text-slate-600 leading-relaxed mb-6">
                     Hệ thống sẽ tự động thay thế các thẻ sau bằng dữ liệu thực tế từ mỗi thẻ. Bạn có thể sử dụng bất kỳ tên cột nào làm thẻ bằng cách bao quanh bởi <code>{"{{tên_cột}}"}</code>:
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {availableColumns.map((col) => (
                       <div key={col} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all group">
                         <code className="text-[10px] font-black text-indigo-650 bg-indigo-50/50 px-2 py-0.5 rounded">{"{{" + col + "}}"}</code>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cột {col.toUpperCase()}</span>
                       </div>
                     ))}
                     <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all group">
                       <code className="text-[10px] font-black text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded">{"{{global_instruction}}"}</code>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Hướng dẫn chung bộ bài</span>
                     </div>
                  </div>
                  <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 border-dashed text-center">
                     <p className="text-[9px] font-bold text-amber-700 leading-relaxed italic uppercase tracking-wider">Sử dụng đúng thẻ sẽ giúp AI giải thích chính xác và sinh động hơn!</p>
                  </div>
               </div>
             </motion.div>
           </div>
         )}
      </AnimatePresence>

 
      {/* Rename Column Modal */}
      <AnimatePresence>
         {showRenameModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRenameModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Edit2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Đổi tên cột</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Cập nhật tên cột dữ liệu</p>
                    </div>
                  </div>
                  <button onClick={() => setShowRenameModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên cột hiện tại:</label>
                     <div className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-xs font-bold text-slate-500 uppercase">
                        {renamingColumn}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên cột mới:</label>
                     <input 
                        type="text" 
                        value={newRenamedName}
                        onChange={(e) => setNewRenamedName(e.target.value)}
                        placeholder="Nhập tên cột mới..."
                        className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                     />
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button
                        type="button"
                        onClick={() => setShowRenameModal(false)}
                        className="flex-1 h-12 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                     >
                        Hủy
                     </button>
                     <button
                        type="button"
                        onClick={async () => {
                           const cleanNewName = newRenamedName.trim();
                           if (!cleanNewName || cleanNewName === renamingColumn) {
                              setShowRenameModal(false);
                              return;
                           }
                           if (availableColumns.includes(cleanNewName)) {
                              alert("Tên cột này đã tồn tại!");
                              return;
                           }
                           try {
                              setIsSaving(true);
                              await axios.post(`/api/v1/deck/${id}/rename-column`, {
                                 old_name: renamingColumn,
                                 new_name: cleanNewName
                              });
                              const nextCustom = customColumns.map(c => c === renamingColumn ? cleanNewName : c);
                              setCustomColumns(nextCustom);
                              const sRes = await axios.get(`/api/v1/deck/${id}/practice-settings`);
                              setAvailableColumns(sRes.data.available_columns || ['front', 'back']);
                              setPracticeSettings(sRes.data.creator_settings || {});
                              setShowRenameModal(false);
                              alert("Đổi tên cột thành công!");
                           } catch (err) {
                              alert("Lỗi khi đổi tên cột");
                           } finally {
                              setIsSaving(false);
                           }
                        }}
                        className="flex-1 h-12 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100 flex items-center justify-center"
                     >
                        Lưu thay đổi
                     </button>
                  </div>
                </div>
              </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Import Settings Modal */}
      <AnimatePresence>
         {showImportModal && excelFile && (
           <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowImportModal(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                     <FileSpreadsheet className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Nhập file Excel</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cấu hình chế độ tải lên</p>
                   </div>
                 </div>
                 <button onClick={() => setShowImportModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
               </div>

               <div className="space-y-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên tệp đã chọn:</span>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{excelFile.name}</span>
                 </div>

                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn phương thức nhập:</label>
                   
                   {/* Option 1: Overwrite */}
                   <button 
                      onClick={() => setImportMode('overwrite')}
                      className={cn(
                        "w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-4",
                        importMode === 'overwrite' ? "bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/10" : "bg-white border-slate-100 hover:bg-slate-50"
                      )}
                   >
                     <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0", importMode === 'overwrite' ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300")}>
                        {importMode === 'overwrite' && <div className="w-2 h-2 rounded-full bg-white" />}
                     </div>
                     <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase italic">Ghi đè (Overwrite / Sửa nhanh)</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                           Xóa toàn bộ thẻ cũ trong collection này và thay thế bằng danh sách thẻ từ file Excel. Phù hợp khi bạn xuất ra để sửa rồi nhập đè.
                        </p>
                     </div>
                   </button>

                   {/* Option 2: Merge/Append */}
                   <button 
                      onClick={() => setImportMode('merge')}
                      className={cn(
                        "w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-4",
                        importMode === 'merge' ? "bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-500/10" : "bg-white border-slate-100 hover:bg-slate-50"
                      )}
                   >
                     <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0", importMode === 'merge' ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300")}>
                        {importMode === 'merge' && <div className="w-2 h-2 rounded-full bg-white" />}
                     </div>
                     <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase italic">Thêm tiếp / Trộn (Merge)</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                           Giữ nguyên thẻ cũ, cập nhật các thẻ trùng ID từ file Excel và thêm các thẻ không trùng ID thành thẻ mới.
                        </p>
                     </div>
                   </button>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button 
                       onClick={() => setShowImportModal(false)}
                       disabled={isImporting}
                       className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                    >
                       Hủy
                    </button>
                    <button 
                       onClick={async () => {
                          await handleImportExcel();
                          setShowImportModal(false);
                       }}
                       disabled={isImporting}
                       className="flex-grow py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                    >
                       {isImporting ? <Zap className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                       {isImporting ? "Đang nhập..." : "Bắt đầu Nhập"}
                    </button>
                 </div>
               </div>
             </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  )
}

const NavButton = ({ active, onClick, icon: Icon, title, sub }: { active: boolean, onClick: () => void, icon: any, title: string, sub: string }) => (
  <button onClick={onClick} className={cn("flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group", active ? "bg-white border-indigo-100 shadow-xl shadow-indigo-500/5" : "bg-transparent border-transparent text-slate-400 hover:bg-white/50")}>
     <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-100 text-slate-400")}>
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h3 className={cn("text-xs font-black uppercase tracking-tight", active ? "text-slate-900" : "text-slate-400")}>{title}</h3>
        <p className="text-[9px] font-bold opacity-60">{sub}</p>
     </div>
  </button>
)

const InputField = ({ label, value, onChange, placeholder, icon: Icon }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, icon?: any }) => (
  <div className="space-y-1.5">
     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
     <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
        <input 
           type="text" 
           placeholder={placeholder}
           value={value}
           onChange={(e) => onChange(e.target.value)}
           className={cn("w-full h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all", Icon ? "pl-11 pr-4" : "px-4")}
        />
     </div>
  </div>
)

const Textarea = ({ label, value, onChange, rows, placeholder }: { label: string, value: string, onChange: (v: string) => void, rows: number, placeholder?: string }) => (
  <div className="space-y-1.5">
     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
     <textarea 
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
     />
  </div>
)

export default EditFlashcard
