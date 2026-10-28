import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Columns3, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  Database,
  Search,
  Lightbulb,
  Image as ImageIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DeckSubLessonSettings } from './DeckSubLessonSettings'

interface DeckColumnSettingsProps {
  deckId: string | number
  isOwner?: boolean
  hideSubLessons?: boolean
}

interface ColumnOverviewResponse {
  total_cards: number
  custom_columns: string[]
  dynamic_columns: string[]
  column_counts: Record<string, number>
}

const CORE_SYSTEM_COLUMNS = [
  { name: 'front', label: 'Front (Question / Main Term)', desc: 'Mandatory field displayed on the front of flashcards', locked: true },
  { name: 'back', label: 'Back (Answer / Main Meaning)', desc: 'Mandatory field displayed on the back of flashcards', locked: true },
  { name: 'front_audio_url', label: 'Front Audio (URL)', desc: 'Audio file link played on the front face', locked: false },
  { name: 'back_audio_url', label: 'Back Audio (URL)', desc: 'Audio file link played on the back face', locked: false },
  { name: 'front_audio_content', label: 'Front TTS Reading Script', desc: 'Source text used for generating TTS voice on front', locked: false },
  { name: 'back_audio_content', label: 'Back TTS Reading Script', desc: 'Source text used for generating TTS voice on back', locked: false },
  { name: 'front_img', label: 'Front Image (URL)', desc: 'Image link displayed on the front face', locked: false },
  { name: 'back_img', label: 'Back Image (URL)', desc: 'Image link displayed on the back face', locked: false },
]

const POPULAR_COLUMN_SUGGESTIONS = [
  { name: 'furigana', label: 'Furigana / Phonetics' },
  { name: 'example', label: 'Example Sentence' },
  { name: 'example_vi', label: 'Example Meaning / Translation' },
  { name: 'kanji', label: 'Kanji Characters' },
  { name: 'romaji', label: 'Romaji Transcription' },
  { name: 'grammar', label: 'Related Grammar' },
  { name: 'synonyms', label: 'Synonyms' },
  { name: 'antonyms', label: 'Antonyms' },
  { name: 'collocation', label: 'Collocations' },
  { name: 'notes', label: 'Additional Notes' },
]

export function DeckColumnSettings({ deckId, isOwner = true, hideSubLessons = false }: DeckColumnSettingsProps) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColIsInsight, setNewColIsInsight] = useState(true)
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmCol, setDeleteConfirmCol] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 1. Fetch Column Overview
  const { data: overview } = useQuery<ColumnOverviewResponse>({
    queryKey: ['deck-columns-overview', deckId],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/columns-overview`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 10 * 1000
  })

  // 1b. Fetch Practice Settings as backup & column list
  const { data: practiceSettingsData } = useQuery({
    queryKey: ['deck-practice-settings', String(deckId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 10 * 1000,
  })

  // 1c. Fetch Deck Data as backup
  const { data: deckData } = useQuery({
    queryKey: ['quiz', String(deckId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/data`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000,
  })

  // Current configured insight columns
  const currentInsightCols: string[] = React.useMemo(() => {
    const saved = practiceSettingsData?.creator_settings?.insight_columns 
      ?? deckData?.practice_settings?.insight_columns
      ?? practiceSettingsData?.creator_settings?.insights_columns
      ?? deckData?.practice_settings?.insights_columns;
    if (Array.isArray(saved)) return saved;
    return ['back'];
  }, [practiceSettingsData, deckData]);

  // 2. Mutations
  const toggleInsightMutation = useMutation({
    mutationFn: async ({ column, isInsight }: { column: string; isInsight: boolean }) => {
      let updated: string[]
      if (isInsight) {
        updated = Array.from(new Set([...currentInsightCols, column]))
      } else {
        updated = currentInsightCols.filter(c => c !== column)
      }
      
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        settings: {
          insight_columns: updated
        }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-settings', deckId] })
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to save insight column settings.')
    }
  })

  // Current configured multi-image settings
  const currentImageConfigs = React.useMemo(() => {
    const saved = practiceSettingsData?.creator_settings?.image_configs 
      ?? deckData?.practice_settings?.image_configs;
    return {
      front_cols: Array.isArray(saved?.front_cols) ? saved.front_cols : ['front_img'],
      back_cols: Array.isArray(saved?.back_cols) ? saved.back_cols : ['back_img'],
      auto_split: saved?.auto_split !== false,
      layout: (saved?.layout || 'grid') as 'grid' | 'carousel' | 'stacked'
    };
  }, [practiceSettingsData, deckData]);

  const updateImageConfigsMutation = useMutation({
    mutationFn: async (updatedConfigs: any) => {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        settings: {
          image_configs: updatedConfigs
        }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-settings', deckId] })
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to save multi-image settings.')
    }
  })

  const toggleImageCol = (side: 'front' | 'back', colName: string) => {
    if (!isOwner) return
    const key = side === 'front' ? 'front_cols' : 'back_cols'
    const currentList: string[] = currentImageConfigs[key] || []
    let updatedList: string[]
    if (currentList.includes(colName)) {
      updatedList = currentList.filter(c => c !== colName)
    } else {
      updatedList = [...currentList, colName]
    }
    updateImageConfigsMutation.mutate({
      ...currentImageConfigs,
      [key]: updatedList
    })
  }

  const toggleAutoSplit = (enabled: boolean) => {
    if (!isOwner) return
    updateImageConfigsMutation.mutate({
      ...currentImageConfigs,
      auto_split: enabled
    })
  }

  const addColumnMutation = useMutation({
    mutationFn: async ({ column_name, isInsight }: { column_name: string; isInsight: boolean }) => {
      const res = await axios.post(`/api/v1/deck/${deckId}/add-column`, { column_name })
      if (isInsight) {
        const updated = Array.from(new Set([...currentInsightCols, column_name]))
        await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
          is_creator: true,
          settings: {
            insight_columns: updated
          }
        })
      }
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-columns-overview', deckId] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-settings', deckId] })
      queryClient.invalidateQueries({ queryKey: ['quiz', deckId] })
      setIsAddModalOpen(false)
      setNewColumnName('')
      setNewColIsInsight(true)
      setErrorMsg(null)
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to add column. Please try again.')
    }
  })

  const renameColumnMutation = useMutation({
    mutationFn: async ({ old_name, new_name }: { old_name: string; new_name: string }) => {
      const res = await axios.post(`/api/v1/deck/${deckId}/rename-column`, { old_name, new_name })
      if (currentInsightCols.includes(old_name)) {
        const updated = currentInsightCols.map(c => c === old_name ? new_name : c)
        await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
          is_creator: true,
          settings: {
            insight_columns: updated
          }
        })
      }
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-columns-overview', deckId] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-settings', deckId] })
      queryClient.invalidateQueries({ queryKey: ['quiz', deckId] })
      setEditingColumn(null)
      setRenameValue('')
      setErrorMsg(null)
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to rename column. Please try again.')
    }
  })

  const deleteColumnMutation = useMutation({
    mutationFn: async (column_name: string) => {
      const res = await axios.post(`/api/v1/deck/${deckId}/delete-column`, { column_name })
      if (currentInsightCols.includes(column_name)) {
        const updated = currentInsightCols.filter(c => c !== column_name)
        await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
          is_creator: true,
          settings: {
            insight_columns: updated
          }
        })
      }
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck-columns-overview', deckId] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-settings', deckId] })
      queryClient.invalidateQueries({ queryKey: ['quiz', deckId] })
      setDeleteConfirmCol(null)
      setErrorMsg(null)
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to delete column. Please try again.')
    }
  })

  const totalCards = overview?.total_cards || deckData?.card_count || (Array.isArray(deckData?.cards) ? deckData.cards.length : 0) || 0
  const columnCounts = overview?.column_counts || {}

  const SYSTEM_CORE_COLS = new Set([
    'front', 'back', 'front_audio_url', 'back_audio_url', 'front_audio_content', 'back_audio_content', 'front_img', 'back_img', 'audio', 'image'
  ])

  const allAvailableCols: string[] = practiceSettingsData?.available_columns || []
  const customColsFromPractice: string[] = practiceSettingsData?.creator_settings?.custom_columns || []
  
  const dynamicCols = Array.from(
    new Set([
      ...(overview?.dynamic_columns || []),
      ...(overview?.custom_columns || []),
      ...customColsFromPractice,
      ...allAvailableCols.filter(col => !SYSTEM_CORE_COLS.has(col))
    ])
  )

  const selectableImageCols = React.useMemo(() => {
    const defaultCols = ['front_img', 'back_img', 'image']
    const combined = Array.from(new Set([...defaultCols, ...dynamicCols]))
    return combined.sort((a, b) => {
      const aIsImg = a.toLowerCase().includes('img') || a.toLowerCase().includes('image') || a.toLowerCase().includes('pic')
      const bIsImg = b.toLowerCase().includes('img') || b.toLowerCase().includes('image') || b.toLowerCase().includes('pic')
      if (aIsImg && !bIsImg) return -1
      if (!aIsImg && bIsImg) return 1
      return 0
    })
  }, [dynamicCols])

  // Clean formatted input to slug
  const formatSlug = (val: string) => val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = formatSlug(newColumnName)
    if (!clean) {
      setErrorMsg('Please enter a valid column name')
      return
    }
    addColumnMutation.mutate({ column_name: clean, isInsight: newColIsInsight })
  }

  const handleRenameColumn = (oldName: string) => {
    const clean = formatSlug(renameValue)
    if (!clean) {
      setErrorMsg('Please enter a valid new column name')
      return
    }
    if (clean === oldName) {
      setEditingColumn(null)
      return
    }
    renameColumnMutation.mutate({ old_name: oldName, new_name: clean })
  }

  // Filter columns
  const filteredDynamicCols = dynamicCols.filter(col => 
    col.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER CARD ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
              <Columns3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Manage Columns & Card Data
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-black">
                  {dynamicCols.length + 8} columns
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Add custom columns, configure fields for the Learning Insights Assistant, and manage deck fields.
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              id="btn-add-deck-column"
              onClick={() => {
                setNewColumnName('')
                setNewColIsInsight(true)
                setErrorMsg(null)
                setIsAddModalOpen(true)
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Column</span>
            </button>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center gap-3 text-rose-700 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── SECTION 1: CUSTOM DATA COLUMNS ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-500" />
              Custom Data Columns ({dynamicCols.length})
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Custom deck fields for AI generation, practice quizzes, and the Learning Insights Assistant.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition-all"
            />
          </div>
        </div>

        {dynamicCols.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-3">
              <Columns3 className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">No Custom Columns Yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              This deck only has core system columns. Click "Add New Column" to create custom fields for examples, Kanji, grammar...
            </p>
            {isOwner && (
              <button
                onClick={() => {
                  setNewColumnName('')
                  setNewColIsInsight(true)
                  setIsAddModalOpen(true)
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-black transition-all cursor-pointer"
              >
                + Add First Column
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDynamicCols.map((colName) => {
              const count = columnCounts[colName] || 0
              const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0
              const isEditing = editingColumn === colName
              const isInsightCol = currentInsightCols.includes(colName)

              return (
                <div
                  key={colName}
                  className={cn(
                    "border rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 group",
                    isInsightCol
                      ? "bg-amber-50/20 border-amber-200/70 hover:bg-amber-50/30"
                      : "bg-slate-50/80 hover:bg-slate-50 border-slate-200/70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            placeholder="New column name..."
                            className="h-8 px-2.5 text-xs font-mono font-bold bg-white border-2 border-orange-500 rounded-lg outline-none w-full"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameColumn(colName)
                              if (e.key === 'Escape') setEditingColumn(null)
                            }}
                          />
                          <button
                            onClick={() => handleRenameColumn(colName)}
                            disabled={renameColumnMutation.isPending}
                            className="w-8 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                            title="Save new name"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingColumn(null)}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs truncate">
                            {colName}
                          </span>
                        </div>
                      )}
                    </div>

                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingColumn(colName)
                            setRenameValue(colName)
                            setErrorMsg(null)
                          }}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-orange-500 hover:text-orange-600 text-slate-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Rename column"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCol(colName)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Delete column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Insight Toggle / Checkbox */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <label 
                      className="flex items-center gap-2 cursor-pointer select-none text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isInsightCol}
                        onChange={(e) => {
                          if (isOwner) {
                            toggleInsightMutation.mutate({ column: colName, isInsight: e.target.checked })
                          }
                        }}
                        disabled={!isOwner || toggleInsightMutation.isPending}
                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 transition cursor-pointer"
                      />
                      <span className={cn(
                        "text-xs font-bold transition-colors flex items-center gap-1",
                        isInsightCol ? "text-amber-800 font-extrabold" : "text-slate-500"
                      )}>
                        <Lightbulb className={cn("w-3.5 h-3.5", isInsightCol ? "text-amber-500 fill-amber-500" : "text-slate-400")} />
                        Learning Insights Assistant
                      </span>
                    </label>
                    {isInsightCol && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                        ✨ Insights On
                      </span>
                    )}
                  </div>

                  {/* Data completeness progress */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400">Data completion:</span>
                      <span className="font-bold text-slate-700">
                        {count.toLocaleString()} / {totalCards.toLocaleString()} cards ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-orange-500" : "bg-slate-300"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2: CORE SYSTEM COLUMNS ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            Core System Columns
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Core fields managed by the system for audio pronunciation, card display, and imagery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CORE_SYSTEM_COLUMNS.map((col) => {
            const count = columnCounts[col.name] || 0
            const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0
            const isBackCol = col.name === 'back'
            const isInsightCol = currentInsightCols.includes(col.name)

            return (
              <div
                key={col.name}
                className={cn(
                  "border rounded-2xl p-3.5 flex flex-col justify-between gap-2.5",
                  isInsightCol
                    ? "bg-amber-50/20 border-amber-200/70"
                    : "bg-slate-50/60 border-slate-200/60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                        {col.name}
                      </span>
                      {col.locked && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/60 text-[9px] font-black uppercase">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-700 mt-1">{col.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{col.desc}</p>
                  </div>
                </div>

                {/* Insight Toggle for Back column */}
                {isBackCol && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <label 
                      className="flex items-center gap-2 cursor-pointer select-none text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isInsightCol}
                        onChange={(e) => {
                          if (isOwner) {
                            toggleInsightMutation.mutate({ column: 'back', isInsight: e.target.checked })
                          }
                        }}
                        disabled={!isOwner || toggleInsightMutation.isPending}
                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 transition cursor-pointer"
                      />
                      <span className={cn(
                        "text-xs font-bold transition-colors flex items-center gap-1",
                        isInsightCol ? "text-amber-800 font-extrabold" : "text-slate-500"
                      )}>
                        <Lightbulb className={cn("w-3.5 h-3.5", isInsightCol ? "text-amber-500 fill-amber-500" : "text-slate-400")} />
                        Learning Insights Assistant
                      </span>
                    </label>
                    {isInsightCol && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                        ✨ Insights On
                      </span>
                    )}
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-1 pt-1 border-t border-slate-100/80">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-400">Filled:</span>
                    <span className="font-bold text-slate-600">
                      {count.toLocaleString()} / {totalCards.toLocaleString()} cards ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-200/70 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-500" : "bg-slate-300"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SECTION 2.5: MULTI-IMAGE CONFIGURATION ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                Multi-Image Display Configuration
                <span className="px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200/60 text-pink-700 text-[10px] font-black uppercase tracking-wider">
                  New ✨
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Display 2 or 3 images simultaneously on flashcards (front/back) or practice quizzes (MCQ, Typing, Listening).
            </p>
          </div>
        </div>

        {/* 2 Face Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Front Face / Question Image Columns */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-indigo-900 block">
                  Front Face & Question Images (Front / Question)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {currentImageConfigs.front_cols.length} columns selected
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px] font-black max-w-[160px] truncate">
                {currentImageConfigs.front_cols.join(', ') || 'None selected'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectableImageCols.map(col => {
                const isSelected = currentImageConfigs.front_cols.includes(col)
                const isPrimary = col === 'front_img'
                return (
                  <button
                    key={`front-${col}`}
                    type="button"
                    onClick={() => toggleImageCol('front', col)}
                    disabled={!isOwner || updateImageConfigsMutation.isPending}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95",
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200/80"
                    )}
                  >
                    <span className="font-mono text-[11px]">{col}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {isPrimary && !isSelected && <span className="text-[9px] text-slate-400">(Default)</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Back Face / Answer Image Columns */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-indigo-900 block">
                  Back Face & Answer Images (Back / Answer)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {currentImageConfigs.back_cols.length} columns selected
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px] font-black max-w-[160px] truncate">
                {currentImageConfigs.back_cols.join(', ') || 'None selected'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectableImageCols.map(col => {
                const isSelected = currentImageConfigs.back_cols.includes(col)
                const isPrimary = col === 'back_img'
                return (
                  <button
                    key={`back-${col}`}
                    type="button"
                    onClick={() => toggleImageCol('back', col)}
                    disabled={!isOwner || updateImageConfigsMutation.isPending}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95",
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200/80"
                    )}
                  >
                    <span className="font-mono text-[11px]">{col}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {isPrimary && !isSelected && <span className="text-[9px] text-slate-400">(Default)</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Auto-split helper toggle */}
        <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={currentImageConfigs.auto_split}
            onChange={(e) => toggleAutoSplit(e.target.checked)}
            disabled={!isOwner || updateImageConfigsMutation.isPending}
            className="w-4 h-4 mt-0.5 rounded border-amber-300 text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
          />
          <div className="text-xs">
            <span className="font-black text-amber-900 block">
              Automatically detect multiple image URLs in a single data cell
            </span>
            <span className="text-slate-500 font-medium leading-relaxed block mt-0.5">
              When pasting multiple image URLs (separated by commas <code>,</code> or line breaks), the system automatically splits and renders them in an interactive image gallery with zoom controls.
            </span>
          </div>
        </label>
      </div>

      {/* ── SECTION 3: TIPS & INTEGRATIONS ── */}
      <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-slate-50 border border-indigo-100/80 rounded-3xl p-5 sm:p-6 text-xs text-slate-600 space-y-3">
        <h4 className="font-black text-indigo-950 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Pro Tips for Using Columns in Vocaburn
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100/60 shadow-2xs">
            <span className="font-black text-amber-600 block mb-1">💡 Learning Insights Assistant</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Toggle <strong>Learning Insights</strong> to show this field in the Insights drawer during flashcard study.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100/60 shadow-2xs">
            <span className="font-black text-indigo-600 block mb-1">✨ AI Prompt Studio Integration</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Head to the <strong>AI Prompt</strong> tab to configure AI prompts that bulk populate this new column.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100/60 shadow-2xs">
            <span className="font-black text-sky-600 block mb-1">🎙️ Native Audio TTS Generator</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Head to the <strong>Audio TTS</strong> tab to use this column as a reading source or audio URL destination.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SUB-LESSON GROUPING (PHÂN NHÓM BÀI HỌC CON) ── */}
      {!hideSubLessons && (
        <DeckSubLessonSettings
          deckId={deckId}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['deck-sub-lessons-settings', String(deckId)] })
            queryClient.invalidateQueries({ queryKey: ['deck-columns-overview', deckId] })
            queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
          }}
        />
      )}

      {/* ═══════════ MODAL THÊM CỘT MỚI ═══════════ */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Add New Data Column</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Create custom fields for vocabulary cards</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddColumn} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                    Column Name (Slug / Snake_case) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="e.g. example_en, kanji, grammar..."
                    className="w-full h-11 px-3.5 font-mono text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition-all"
                    autoFocus
                  />
                  {newColumnName && (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Column identifier: <strong className="text-orange-600">{formatSlug(newColumnName)}</strong>
                    </p>
                  )}
                </div>

                {/* Tùy chọn: Là cột giải thích & ghi nhớ */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newColIsInsight}
                    onChange={(e) => setNewColIsInsight(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-black text-amber-900 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Set as Learning Insights Field
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">Display inside the Learning Insights Assistant during study</span>
                  </div>
                </label>

                {/* Gợi ý cột phổ biến */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Or pick from popular suggestions:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {POPULAR_COLUMN_SUGGESTIONS.filter(s => !dynamicCols.includes(s.name)).map(sug => (
                      <button
                        key={sug.name}
                        type="button"
                        onClick={() => setNewColumnName(sug.name)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 text-[11px] font-semibold transition-all border border-slate-200/60 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="font-mono font-bold">{sug.name}</span>
                        <span className="text-[9px] text-slate-400">({sug.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newColumnName.trim() || addColumnMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {addColumnMutation.isPending ? 'Creating...' : 'Create Column'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════ MODAL XÁC NHẬN XÓA CỘT ═══════════ */}
      <AnimatePresence>
        {deleteConfirmCol && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete column "{deleteConfirmCol}"?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This will permanently delete data in column <strong>{deleteConfirmCol}</strong> across all <strong>{totalCards.toLocaleString()}</strong> cards in this deck. This action cannot be undone!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCol(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteColumnMutation.mutate(deleteConfirmCol)}
                  disabled={deleteColumnMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {deleteColumnMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
