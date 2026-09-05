import React, { useState } from 'react'
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  ShieldCheck, 
  Trash2, 
  PlusCircle, 
  RefreshCw,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckExcelManagerProps {
  deckId: string | number
}

interface AnalysisData {
  title: string
  description: string
  total_excel_rows: number
  updated_count: number
  added_count: number
  deleted_count_if_replace: number
  existing_total: number
}

export function DeckExcelManager({ deckId }: DeckExcelManagerProps) {
  const queryClient = useQueryClient()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [syncMode, setSyncMode] = useState<'merge' | 'replace'>('merge')
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    setUploadMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/import-analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data?.status === 'ok') {
        setPendingFile(file)
        setAnalysisData(res.data)
        setSyncMode('merge')
      } else {
        setUploadMessage({
          type: 'error',
          text: res.data?.error || 'Failed to analyze spreadsheet.'
        })
      }
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to parse Excel file. Please ensure valid format.'
      })
    } finally {
      setIsAnalyzing(false)
      e.target.value = ''
    }
  }

  const handleConfirmSync = async () => {
    if (!pendingFile) return

    setIsSubmitting(true)
    setUploadMessage(null)

    const formData = new FormData()
    formData.append('file', pendingFile)
    formData.append('mode', syncMode)

    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/import-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data?.status === 'ok') {
        const uCount = res.data.updated_count ?? 0
        const aCount = res.data.added_count ?? 0
        const dCount = res.data.deleted_count ?? 0
        setUploadMessage({
          type: 'success',
          text: `Excel sync completed! Updated: ${uCount}, Added: ${aCount}${dCount > 0 ? `, Deleted: ${dCount}` : ''}.`
        })
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck-study-settings', String(deckId)] })
        
        // Close modal
        setPendingFile(null)
        setAnalysisData(null)
      } else {
        setUploadMessage({
          type: 'error',
          text: res.data?.error || 'Failed to apply spreadsheet updates.'
        })
      }
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to update deck via Excel.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelModal = () => {
    setPendingFile(null)
    setAnalysisData(null)
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Excel Data Sync & Backup
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Manage, update, and backup flashcards via standard spreadsheets
          </p>
        </div>
      </div>

      {uploadMessage && (
        <div
          className={`p-3.5 text-xs rounded-2xl font-bold flex items-center gap-2.5 ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {uploadMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{uploadMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Action 1: Download Template */}
        <a
          href="/api/v1/deck/template/download"
          download
          className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all flex flex-col justify-between gap-3 text-left group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900">Download Template</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Standard spreadsheet template with pre-configured columns (Front, Back, Audio, Image...).
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <Download className="w-3.5 h-3.5" /> Get .xlsx template
          </span>
        </a>

        {/* Action 2: Export Deck */}
        <a
          href={`/api/v1/deck/${deckId}/export`}
          download
          className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all flex flex-col justify-between gap-3 text-left group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Download className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900">Export Deck</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Export all flashcards, definitions, settings, and study defaults to .xlsx.
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <Download className="w-3.5 h-3.5" /> Export Data
          </span>
        </a>

        {/* Action 3: Upload Excel Update */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-3 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Upload className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900">Update via Excel</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Upload an Excel file to add new cards, update existing cards, and sync deck settings.
            </p>
          </div>

          <label className="w-full h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? 'Analyzing File...' : 'Select Excel File'}</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleSelectFile}
              disabled={isAnalyzing}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Confirmation & Diff Modal */}
      <AnimatePresence>
        {analysisData && pendingFile && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Confirm Excel Sync
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {pendingFile.name} • {analysisData.total_excel_rows} rows detected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelModal}
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Diff Stats Breakdown */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-left">
                  <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Cards</span>
                  </div>
                  <div className="text-xl font-black text-emerald-800 mt-1">
                    +{analysisData.added_count}
                  </div>
                  <p className="text-[9px] text-emerald-600 font-medium mt-0.5">Will be created</p>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl text-left">
                  <div className="flex items-center gap-1 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Matched</span>
                  </div>
                  <div className="text-xl font-black text-amber-800 mt-1">
                    {analysisData.updated_count}
                  </div>
                  <p className="text-[9px] text-amber-600 font-medium mt-0.5">Will be updated</p>
                </div>

                <div className={`p-3 rounded-2xl text-left border ${
                  syncMode === 'replace' && analysisData.deleted_count_if_replace > 0
                    ? 'bg-rose-50/80 border-rose-200'
                    : 'bg-slate-50 border-slate-150'
                }`}>
                  <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    syncMode === 'replace' && analysisData.deleted_count_if_replace > 0
                      ? 'text-rose-700'
                      : 'text-slate-400'
                  }`}>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Missing</span>
                  </div>
                  <div className={`text-xl font-black mt-1 ${
                    syncMode === 'replace' && analysisData.deleted_count_if_replace > 0
                      ? 'text-rose-800'
                      : 'text-slate-500'
                  }`}>
                    {syncMode === 'replace' ? `-${analysisData.deleted_count_if_replace}` : '0'}
                  </div>
                  <p className={`text-[9px] font-medium mt-0.5 ${
                    syncMode === 'replace' && analysisData.deleted_count_if_replace > 0
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-400'
                  }`}>
                    {syncMode === 'replace' ? 'Will be removed' : 'Kept safe'}
                  </p>
                </div>
              </div>

              {/* Sync Mode Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Select Synchronization Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSyncMode('merge')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      syncMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${syncMode === 'merge' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black">Merge (Safe)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Updates matched cards and adds new ones. Keeps all unmentioned existing cards intact.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSyncMode('replace')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      syncMode === 'replace'
                        ? 'border-rose-500 bg-rose-50/50 text-rose-950 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${syncMode === 'replace' ? 'text-rose-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black">Replace (Exact Sync)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Synchronizes deck to match file exactly. Deletes cards from deck that are not in file.
                    </p>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSync}
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-all flex items-center gap-2 active:scale-95 ${
                    syncMode === 'replace'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Zap className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply Changes</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DeckExcelManager
