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
  Lightbulb
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DeckColumnSettingsProps {
  deckId: string | number
  isOwner?: boolean
}

interface ColumnOverviewResponse {
  total_cards: number
  custom_columns: string[]
  dynamic_columns: string[]
  column_counts: Record<string, number>
}

const CORE_SYSTEM_COLUMNS = [
  { name: 'front', label: 'Mặt trước (Câu hỏi / Từ vựng chính)', desc: 'Trường dữ liệu bắt buộc hiển thị ở mặt trước flashcard', locked: true },
  { name: 'back', label: 'Mặt sau (Đáp án / Nghĩa chính)', desc: 'Trường dữ liệu bắt buộc hiển thị ở mặt sau flashcard', locked: true },
  { name: 'front_audio_url', label: 'Audio mặt trước (URL)', desc: 'Đường dẫn file âm thanh phát ở mặt trước', locked: false },
  { name: 'back_audio_url', label: 'Audio mặt sau (URL)', desc: 'Đường dẫn file âm thanh phát ở mặt sau', locked: false },
  { name: 'front_audio_content', label: 'Kịch bản đọc mặt trước', desc: 'Văn bản nguồn dùng để sinh giọng đọc TTS cho mặt trước', locked: false },
  { name: 'back_audio_content', label: 'Kịch bản đọc mặt sau', desc: 'Văn bản nguồn dùng để sinh giọng đọc TTS cho mặt sau', locked: false },
  { name: 'front_img', label: 'Hình ảnh mặt trước (URL)', desc: 'Đường dẫn ảnh minh họa mặt trước', locked: false },
  { name: 'back_img', label: 'Hình ảnh mặt sau (URL)', desc: 'Đường dẫn ảnh minh họa mặt sau', locked: false },
]

const POPULAR_COLUMN_SUGGESTIONS = [
  { name: 'furigana', label: 'Furigana / Phiên âm' },
  { name: 'example', label: 'Câu ví dụ (Example)' },
  { name: 'example_vi', label: 'Dịch nghĩa ví dụ (Example VI)' },
  { name: 'kanji', label: 'Chữ Hán (Kanji)' },
  { name: 'romaji', label: 'Phiên âm La-tinh (Romaji)' },
  { name: 'grammar', label: 'Ngữ pháp liên quan' },
  { name: 'synonyms', label: 'Từ đồng nghĩa' },
  { name: 'antonyms', label: 'Từ trái nghĩa' },
  { name: 'collocation', label: 'Cụm từ đi kèm' },
  { name: 'notes', label: 'Ghi chú thêm' },
]

export function DeckColumnSettings({ deckId, isOwner = true }: DeckColumnSettingsProps) {
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
      setErrorMsg(err.response?.data?.error || 'Không thể lưu cài đặt cột giải thích.')
    }
  })

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
      setErrorMsg(err.response?.data?.error || 'Không thể thêm cột. Vui lòng thử lại.')
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
      setErrorMsg(err.response?.data?.error || 'Không thể đổi tên cột. Vui lòng thử lại.')
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
      setErrorMsg(err.response?.data?.error || 'Không thể xóa cột. Vui lòng thử lại.')
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

  // Clean formatted input to slug
  const formatSlug = (val: string) => val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = formatSlug(newColumnName)
    if (!clean) {
      setErrorMsg('Vui lòng nhập tên cột hợp lệ')
      return
    }
    addColumnMutation.mutate({ column_name: clean, isInsight: newColIsInsight })
  }

  const handleRenameColumn = (oldName: string) => {
    const clean = formatSlug(renameValue)
    if (!clean) {
      setErrorMsg('Vui lòng nhập tên cột mới hợp lệ')
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
                Quản lý Cột & Dữ liệu Thẻ
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-black">
                  {dynamicCols.length + 8} cột
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Thêm cột tùy biến, thiết lập cột hiển thị trong tab Trợ lý Giải thích hoặc quản lý các trường thông tin thẻ.
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => {
                setNewColumnName('')
                setNewColIsInsight(true)
                setErrorMsg(null)
                setIsAddModalOpen(true)
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Thêm cột mới</span>
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

      {/* ── SECTION 1: CỘT TÙY BIẾN & MỞ RỘNG (CUSTOM COLUMNS) ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-500" />
              Cột Dữ liệu Mở rộng ({dynamicCols.length})
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Các cột riêng của bộ thẻ phục vụ AI sinh tự động, luyện tập hoặc hiển thị trong tab Trợ lý Giải thích & Ghi nhớ.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cột..."
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
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Chưa có cột tùy biến nào</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Bộ thẻ hiện chỉ có các cột cơ bản. Bạn có thể bấm "Thêm cột mới" để tạo thêm ví dụ, chữ Hán, ngữ pháp...
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
                + Thêm cột đầu tiên
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
                            placeholder="Tên cột mới..."
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
                            title="Lưu tên mới"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingColumn(null)}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
                            title="Hủy"
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
                          title="Đổi tên cột"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCol(colName)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Xóa cột"
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
                        Cột giải thích & ghi nhớ (Trợ lý)
                      </span>
                    </label>
                    {isInsightCol && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                        ✨ Trợ lý bật
                      </span>
                    )}
                  </div>

                  {/* Data completeness progress */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400">Dữ liệu hoàn thiện:</span>
                      <span className="font-bold text-slate-700">
                        {count.toLocaleString()} / {totalCards.toLocaleString()} thẻ ({pct}%)
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

      {/* ── SECTION 2: CỘT HỆ THỐNG MẶC ĐỊNH (CORE SYSTEM COLUMNS) ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            Cột Hệ thống Mặc định (Core Columns)
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Các trường cốt lõi được hệ thống quản lý để phục vụ phát âm thanh, hiển thị thẻ và hình ảnh.
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
                          Bắt buộc
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
                        Cột giải thích & ghi nhớ (Trợ lý)
                      </span>
                    </label>
                    {isInsightCol && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                        ✨ Trợ lý bật
                      </span>
                    )}
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-1 pt-1 border-t border-slate-100/80">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-400">Đã điền:</span>
                    <span className="font-bold text-slate-600">
                      {count.toLocaleString()} / {totalCards.toLocaleString()} thẻ ({pct}%)
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

      {/* ── SECTION 3: HƯỚNG DẪN & LIÊN KẾT TÍCH HỢP ── */}
      <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-slate-50 border border-indigo-100/80 rounded-3xl p-5 sm:p-6 text-xs text-slate-600 space-y-3">
        <h4 className="font-black text-indigo-950 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Mẹo sử dụng Cột trong Vocaburn
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100/60 shadow-2xs">
            <span className="font-black text-amber-600 block mb-1">💡 Trợ lý Giải thích & Ghi nhớ</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Tích chọn <strong>Cột giải thích</strong> để hiển thị trường dữ liệu này trong tab Trợ lý khi người dùng học thẻ.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100/60 shadow-2xs">
            <span className="font-black text-indigo-600 block mb-1">✨ Tích hợp AI Prompt</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Vào tab <strong>AI Prompt</strong> để thiết lập kịch bản AI tự động điền nội dung hàng loạt vào cột mới tạo.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100/60 shadow-2xs">
            <span className="font-black text-sky-600 block mb-1">🎙️ Tạo Audio TTS</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Vào tab <strong>Audio TTS</strong> để chọn cột làm nguồn đọc hoặc đích lưu URL âm thanh riêng biệt.
            </p>
          </div>
        </div>
      </div>

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
                    <h3 className="text-sm font-black text-slate-900">Thêm Cột Dữ Liệu Mới</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Tạo thêm trường thông tin cho các thẻ</p>
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
                    Tên cột (Slug / Snake_case) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Ví dụ: example_vi, kanji, grammar..."
                    className="w-full h-11 px-3.5 font-mono text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition-all"
                    autoFocus
                  />
                  {newColumnName && (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Mã định danh cột: <strong className="text-orange-600">{formatSlug(newColumnName)}</strong>
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
                      Đặt làm Cột Giải thích & Ghi nhớ
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">Hiển thị trong tab Trợ lý Giải thích khi học và ôn luyện thẻ</span>
                  </div>
                </label>

                {/* Gợi ý cột phổ biến */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Hoặc chọn nhanh gợi ý:
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
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={!newColumnName.trim() || addColumnMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {addColumnMutation.isPending ? 'Đang tạo...' : 'Tạo cột ngay'}
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
                <h3 className="text-base font-black text-slate-900">Xóa cột "{deleteConfirmCol}"?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hành động này sẽ xóa dữ liệu của cột <strong>{deleteConfirmCol}</strong> trên tất cả <strong>{totalCards.toLocaleString()}</strong> thẻ bài trong bộ thẻ này. Hành động không thể hoàn tác!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCol(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => deleteColumnMutation.mutate(deleteConfirmCol)}
                  disabled={deleteColumnMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {deleteColumnMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
