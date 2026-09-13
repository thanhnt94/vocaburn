import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  X, 
  Sparkles, 
  Globe, 
  Lock, 
  Image as ImageIcon, 
  PenLine, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  FileText,
  ChevronRight,
  Layers
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { MediaUrlInput } from '../../common/MediaUrlInput'

export interface DeckCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newDeckId: number) => void
  initialMode?: 'manual' | 'excel'
}

export function DeckCreateModal({ isOpen, onClose, onSuccess, initialMode = 'manual' }: DeckCreateModalProps) {
  const [createMode, setCreateMode] = useState<'manual' | 'excel'>(initialMode)
  
  // Manual mode states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // Excel mode states
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [isParsingExcel, setIsParsingExcel] = useState(false)
  const [previewData, setPreviewData] = useState<{
    metadata: { title?: string; description?: string; category?: string; cover_image?: string };
    cards: Array<{ content?: string; explanation?: string; question_type?: string }>;
    count: number;
  } | null>(null)
  const [excelTitle, setExcelTitle] = useState('')
  const [excelDescription, setExcelDescription] = useState('')
  const [excelIsPublic, setExcelIsPublic] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Common submission states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (!isOpen) return null

  // Reset state when closing
  const handleClose = () => {
    setError(null)
    setExcelFile(null)
    setPreviewData(null)
    onClose()
  }

  // ── Manual Creation Handler ──
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please enter deck title')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await axios.post('/api/v1/deck/create', {
        title: title.trim(),
        description: description.trim(),
        cover_image: coverImage.trim() || null,
        is_public: isPublic,
      })

      const newId = res.data.id
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      queryClient.invalidateQueries({ queryKey: ['all_decks'] })
      handleClose()
      if (onSuccess) {
        onSuccess(newId)
      } else {
        navigate(`/decks/${newId}?tab=cards`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create deck')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── File Selection & Parsing Handler ──
  const handleFileChange = async (file: File) => {
    if (!file) return
    const validExts = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setError('Please select an Excel (.xlsx, .xls) or .csv file')
      return
    }

    setExcelFile(file)
    setError(null)
    setIsParsingExcel(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post('/api/v1/deck/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const pData = res.data
      setPreviewData(pData)

      // Auto fill title and description from Excel Info sheet or file name
      const fallbackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      const detectedTitle = pData.metadata?.title && pData.metadata.title !== 'Imported Deck'
        ? pData.metadata.title
        : fallbackTitle

      setExcelTitle(detectedTitle)
      setExcelDescription(pData.metadata?.description || `Imported ${pData.count || 0} cards from ${file.name}`)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to parse Excel file. Please check the file format.')
      setExcelFile(null)
      setPreviewData(null)
    } finally {
      setIsParsingExcel(false)
    }
  }

  // ── Excel Deck Creation Handler ──
  const handleCreateExcel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!excelFile) {
      setError('Please select an Excel or CSV file')
      return
    }
    if (!excelTitle.trim()) {
      setError('Please enter deck title')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', excelFile)
      
      const metadataOverride = {
        title: excelTitle.trim(),
        description: excelDescription.trim(),
        category: previewData?.metadata?.category || 'General',
        is_public: excelIsPublic
      }
      formData.append('metadata_override', JSON.stringify(metadataOverride))

      const res = await axios.post('/api/v1/deck/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const newId = res.data.id || res.data.deck_id
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      queryClient.invalidateQueries({ queryKey: ['all_decks'] })
      
      handleClose()
      if (newId) {
        if (onSuccess) {
          onSuccess(newId)
        } else {
          navigate(`/decks/${newId}`)
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['all_decks'] })
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to import Excel file')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative z-10 p-5 sm:p-6 border border-slate-100 my-auto max-h-[92vh] flex flex-col"
        >
          {/* ═══════════ HEADER ═══════════ */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Create New Deck</h3>
                <p className="text-[11px] text-slate-400 font-bold">Start a new vocabulary collection</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ═══════════ METHOD SEGMENTED SELECTOR ═══════════ */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl my-3 shrink-0 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setCreateMode('manual')
                setError(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                createMode === 'manual'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Create Manually</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateMode('excel')
                setError(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer relative ${
                createMode === 'excel'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import from Excel</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-100 text-emerald-700">
                .xlsx
              </span>
            </button>
          </div>

          {/* ═══════════ ERROR BANNER ═══════════ */}
          {error && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold flex items-center gap-2 shrink-0 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="flex-1 text-left">{error}</span>
            </div>
          )}

          {/* ═══════════ TAB BODY (SCROLLABLE) ═══════════ */}
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-0.5 space-y-4">
            {createMode === 'manual' ? (
              /* ────── TAB 1: MANUAL CREATION FORM ────── */
              <form onSubmit={handleCreateManual} className="space-y-4 text-left">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Deck Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 Common Words..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Short Description
                  </label>
                  <textarea
                    placeholder="Goals, source materials, or notes..."
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <MediaUrlInput
                    mediaType="image"
                    label="Cover Image URL (Optional)"
                    placeholder="Paste image link or URL..."
                    value={coverImage}
                    onChange={(val) => setCoverImage(val)}
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        {isPublic ? 'Public Deck' : 'Private Deck'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isPublic ? 'Everyone in the community can view and study' : 'Only you can access this deck'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      isPublic ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        isPublic ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? 'CREATING...' : 'CREATE DECK 🚀'}
                  </button>
                </div>
              </form>
            ) : (
              /* ────── TAB 2: EXCEL / CSV IMPORT FORM ────── */
              <form onSubmit={handleCreateExcel} className="space-y-4 text-left">
                {/* Hidden Native File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileChange(f)
                  }}
                />

                {/* Template Download Prompt */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-emerald-900 block">Excel Template</span>
                      <span className="text-[10px] text-emerald-700 font-medium">Standard layout with Info & Data sheets</span>
                    </div>
                  </div>
                  <a
                    href="/api/v1/deck/template/download"
                    download="Vocaburn_Template.xlsx"
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template</span>
                  </a>
                </div>

                {/* Upload Zone */}
                {!excelFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOver(false)
                      const f = e.dataTransfer.files?.[0]
                      if (f) handleFileChange(f)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-3xl text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                        : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-2.5 shadow-inner">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black text-slate-800 block mb-0.5">
                      Drag & drop your Excel file here or <span className="text-emerald-600 underline">Browse File</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Supports .xlsx, .xls, .csv (Auto-detects Front, Back, Explanation columns, etc.)
                    </span>
                  </div>
                ) : (
                  /* File Loaded & Preview */
                  <div className="space-y-3">
                    {/* Selected File Badge */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          {isParsingExcel ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-black text-slate-800 truncate block">
                            {excelFile.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {(excelFile.size / 1024).toFixed(1)} KB • {isParsingExcel ? 'Parsing file...' : `${previewData?.count || 0} cards detected`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition active:scale-95 cursor-pointer ml-2"
                      >
                        Change File
                      </button>
                    </div>

                    {/* Metadata Override Form */}
                    {previewData && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                        <div>
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                            Deck Title <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={excelTitle}
                            onChange={(e) => setExcelTitle(e.target.value)}
                            placeholder="Enter deck title..."
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                            Short Description
                          </label>
                          <textarea
                            rows={2}
                            value={excelDescription}
                            onChange={(e) => setExcelDescription(e.target.value)}
                            placeholder="Describe this deck..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all resize-none"
                          />
                        </div>

                        {/* Visibility Toggle */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            {excelIsPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
                            <div>
                              <span className="text-xs font-black text-slate-800 block">
                                {excelIsPublic ? 'Public Deck' : 'Private Deck'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExcelIsPublic(!excelIsPublic)}
                            className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                              excelIsPublic ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <div
                              className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                                excelIsPublic ? 'translate-x-4.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Cards Preview Accordion Snippet */}
                        {previewData.cards && previewData.cards.length > 0 && (
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Preview sample cards ({previewData.count} cards)</span>
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                              {previewData.cards.slice(0, 3).map((card, idx) => (
                                <div key={idx} className="p-2 bg-white rounded-xl border border-slate-200/60 text-left flex items-start gap-2 text-xs">
                                  <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-800 truncate">{card.content || '(Empty)'}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{card.explanation || '(No explanation)'}</div>
                                  </div>
                                </div>
                              ))}
                              {previewData.count > 3 && (
                                <div className="text-[10px] text-slate-400 text-center font-bold pt-1">
                                  + and {previewData.count - 3} more cards will be created
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !excelFile || !excelTitle.trim() || isParsingExcel}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>IMPORTING CARDS...</span>
                      </>
                    ) : (
                      <>
                        <span>IMPORT & CREATE DECK {previewData?.count ? `(${previewData.count} CARDS)` : ''} 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckCreateModal
