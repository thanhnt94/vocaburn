import React, { useState, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { DeckCardItem, type CardData } from '../cards/DeckCardItem'
import { DeckCardQuickAdd, type QuickAddCardPayload } from '../cards/DeckCardQuickAdd'
import { DeckCardFilterBar, type CardFilterStatus } from '../cards/DeckCardFilterBar'
import { DeckCardBatchPasteModal } from '../cards/DeckCardBatchPasteModal'
import { DeckCardEditModal } from '../cards/DeckCardEditModal'
import { DeckPagination } from '../DeckPagination'
import { Trash2, Star, EyeOff, X } from 'lucide-react'

export interface DeckCardsTabProps {
  embedded?: boolean
  deckId?: string | number
  currentPage?: number
  onPageChange?: (page: number) => void
  onTotalPagesChange?: (total: number) => void
  onSelectionChange?: (hasSelection: boolean) => void
  search?: string
  isQuickAddOpen?: boolean
  onCloseQuickAdd?: () => void
  isBatchPasteOpen?: boolean
  onCloseBatchPaste?: () => void
  isEditModalOpen?: boolean
  onCloseEditModal?: () => void
}

export function DeckCardsTab({
  embedded = false,
  deckId,
  currentPage: controlledPage,
  onPageChange: controlledOnPageChange,
  onTotalPagesChange,
  onSelectionChange,
  search: externalSearch = '',
  isQuickAddOpen: externalQuickAddOpen,
  onCloseQuickAdd: externalOnCloseQuickAdd,
  isBatchPasteOpen: externalBatchPasteOpen,
  onCloseBatchPaste: externalOnCloseBatchPaste,
  isEditModalOpen: externalEditModalOpen,
  onCloseEditModal: externalOnCloseEditModal,
}: DeckCardsTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const queryClient = useQueryClient()

  const [internalSearch, setInternalSearch] = useState('')
  const search = externalSearch !== undefined ? externalSearch : internalSearch

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CardFilterStatus>('all')
  const [internalPage, setInternalPage] = useState(1)
  const pageSize = 50

  const currentPage = controlledPage !== undefined ? controlledPage : internalPage
  const setCurrentPage = (p: number) => {
    if (controlledOnPageChange) {
      controlledOnPageChange(p)
    } else {
      setInternalPage(p)
    }
  }

  // Debounce search input for snappy typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  // Modals state (internal fallback if not controlled)
  const [internalQuickAddOpen, setInternalQuickAddOpen] = useState(false)
  const isQuickAddOpen = externalQuickAddOpen !== undefined ? externalQuickAddOpen : internalQuickAddOpen
  const handleCloseQuickAdd = () => {
    if (externalOnCloseQuickAdd) externalOnCloseQuickAdd()
    else setInternalQuickAddOpen(false)
  }

  const [internalBatchPasteOpen, setInternalBatchPasteOpen] = useState(false)
  const isBatchPasteOpen = externalBatchPasteOpen !== undefined ? externalBatchPasteOpen : internalBatchPasteOpen
  const handleCloseBatchPaste = () => {
    if (externalOnCloseBatchPaste) externalOnCloseBatchPaste()
    else setInternalBatchPasteOpen(false)
  }

  const [internalEditModalOpen, setInternalEditModalOpen] = useState(false)
  const isEditModalOpen = externalEditModalOpen !== undefined ? externalEditModalOpen : internalEditModalOpen
  const [editingCard, setEditingCard] = useState<CardData | null>(null)
  const handleCloseEditModal = () => {
    if (externalOnCloseEditModal) externalOnCloseEditModal()
    else setInternalEditModalOpen(false)
    setEditingCard(null)
  }

  const [isSavingCard, setIsSavingCard] = useState(false)
  const [isQuickAdding, setIsQuickAdding] = useState(false)

  // Multi-select state
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedCardIds.size > 0)
    }
  }, [selectedCardIds.size, onSelectionChange])

  // 1. Fetch server-side paginated questions list
  const { data, isLoading } = useQuery({
    queryKey: ['quiz-questions', id, currentPage, debouncedSearch],
    queryFn: async () => {
      if (!id) return { questions: [], total: 0 }
      const res = await axios.get(`/api/v1/deck/${id}/questions`, {
        params: {
          page: currentPage,
          size: pageSize,
          search: debouncedSearch.trim()
        }
      })
      return res.data
    },
    enabled: !!id,
    staleTime: 15 * 1000,
  })

  // 2. Fetch deck settings for practice settings & available columns
  const { data: deckData } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/data`)
      return res.data
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  })

  const rawCards: CardData[] = data?.questions || []
  const totalCards: number = data?.total ?? 0

  // Filter Status Logic (Client-side refinement for starred / ignored)
  const displayedCards = useMemo(() => {
    return rawCards.filter((card) => {
      if (statusFilter === 'starred') return !!card.is_starred
      if (statusFilter === 'ignored') return !!card.is_ignored
      return true
    })
  }, [rawCards, statusFilter])

  // Total pages based on server total
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCards / pageSize))
  }, [totalCards, pageSize])

  useEffect(() => {
    if (onTotalPagesChange) {
      onTotalPagesChange(totalPages)
    }
  }, [totalPages, onTotalPagesChange])

  // Multi-selection helpers
  const isAllSelected = displayedCards.length > 0 && selectedCardIds.size === displayedCards.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCardIds(new Set())
    } else {
      setSelectedCardIds(new Set(displayedCards.map((c) => c.id)))
    }
  }

  const handleToggleSelect = (cardId: number) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const handleClearSelection = () => {
    setSelectedCardIds(new Set())
  }

  // Handlers
  const handleQuickAdd = async (payload: QuickAddCardPayload): Promise<boolean> => {
    setIsQuickAdding(true)
    try {
      await axios.post(`/api/v1/deck/${id}/flashcard`, {
        ...payload,
        options: []
      })
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
      return true
    } catch (e) {
      alert('Không thể thêm thẻ. Vui lòng thử lại.')
      return false
    } finally {
      setIsQuickAdding(false)
    }
  }

  const handleDeleteCard = async (cardId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thẻ từ vựng này?')) return
    try {
      await axios.delete(`/api/v1/deck/question/${cardId}`)
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
    } catch (e) {
      alert('Xóa thẻ thất bại')
    }
  }

  const handleToggleStar = async (cardId: number) => {
    try {
      await axios.post(`/api/v1/deck/question/${cardId}/star`)
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
    } catch (e) {
      console.error('Failed to toggle star', e)
    }
  }

  const handleToggleIgnore = async (cardId: number) => {
    try {
      await axios.post(`/api/v1/deck/question/${cardId}/ignore`)
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
    } catch (e) {
      console.error('Failed to toggle ignore', e)
    }
  }

  const handleOpenEdit = (card: CardData) => {
    setEditingCard(card)
    if (externalEditModalOpen !== undefined) {
      // Handled via state in parent if needed
    } else {
      setInternalEditModalOpen(true)
    }
  }

  const handleSaveCardEdit = async (updatedData: any) => {
    setIsSavingCard(true)
    try {
      if (editingCard) {
        await axios.put(`/api/v1/deck/question/${editingCard.id}`, updatedData)
      } else {
        await axios.post(`/api/v1/deck/${id}/flashcard`, updatedData)
      }
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
      handleCloseEditModal()
    } catch (e) {
      alert('Lưu thẻ thất bại. Vui lòng thử lại.')
    } finally {
      setIsSavingCard(false)
    }
  }

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedCardIds.size === 0) return
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedCardIds.size} thẻ đã chọn?`)) return

    setIsBulkProcessing(true)
    try {
      const deletePromises = Array.from(selectedCardIds).map((cardId) =>
        axios.delete(`/api/v1/deck/question/${cardId}`)
      )
      await Promise.all(deletePromises)
      setSelectedCardIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
    } catch (e) {
      alert('Xóa thẻ hàng loạt thất bại')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkStar = async () => {
    if (selectedCardIds.size === 0) return
    setIsBulkProcessing(true)
    try {
      const starPromises = Array.from(selectedCardIds).map((cardId) =>
        axios.post(`/api/v1/deck/question/${cardId}/star`)
      )
      await Promise.all(starPromises)
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
    } catch (e) {
      console.error('Failed to star selected cards', e)
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkIgnore = async () => {
    if (selectedCardIds.size === 0) return
    setIsBulkProcessing(true)
    try {
      const ignorePromises = Array.from(selectedCardIds).map((cardId) =>
        axios.post(`/api/v1/deck/question/${cardId}/ignore`)
      )
      await Promise.all(ignorePromises)
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
    } catch (e) {
      console.error('Failed to ignore selected cards', e)
    } finally {
      setIsBulkProcessing(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 space-y-2.5 text-left animate-in fade-in duration-200 relative pb-32">
      {/* 1. Sticky Filter Bar (Tất cả, Có sao, Đang ẩn, Chọn tất cả, Bulk actions) */}
      <div className="sticky top-0 z-20 bg-[#F8FAFC]/95 backdrop-blur-md pt-0.5 pb-0.5">
        <DeckCardFilterBar
          status={statusFilter}
          onStatusChange={setStatusFilter}
          totalCount={totalCards}
          filteredCount={displayedCards.length}
          selectedCount={selectedCardIds.size}
          isAllSelected={isAllSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onBulkDelete={handleBulkDelete}
          onBulkIgnore={handleBulkIgnore}
          onBulkStar={handleBulkStar}
          onClearSelection={handleClearSelection}
        />
      </div>

      {/* 2. Cards List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : displayedCards.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-3xl block mb-2">🎴</span>
          <h3 className="text-sm font-black text-slate-800">Không tìm thấy thẻ từ vựng nào</h3>
          <p className="text-xs text-slate-400 mt-1">
            {search ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy bấm "+ Thêm nhanh" ở thanh dưới để bắt đầu tạo thẻ!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedCards.map((card, idx) => (
            <DeckCardItem
              key={card.id}
              card={card}
              index={(currentPage - 1) * pageSize + idx}
              isSelected={selectedCardIds.has(card.id)}
              onToggleSelect={() => handleToggleSelect(card.id)}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteCard}
              onToggleStar={handleToggleStar}
              onToggleIgnore={handleToggleIgnore}
            />
          ))}
        </div>
      )}

      {/* 3. Docked Quick Add Panel */}
      <DeckCardQuickAdd
        isOpen={isQuickAddOpen}
        onClose={handleCloseQuickAdd}
        deckId={id!}
        onAddCard={handleQuickAdd}
        isAdding={isQuickAdding}
        onOpenFullEdit={() => {
          setEditingCard(null)
          if (externalEditModalOpen !== undefined) {
            // Handled via external trigger
          } else {
            setInternalEditModalOpen(true)
          }
        }}
      />

      {/* 4. Standalone Pagination Fallback (Khi không nằm trong DeckDetailPage) */}
      {!controlledOnPageChange && (
        <div className="flex items-center justify-between pt-3 text-slate-400 text-xs font-bold">
          <span>
            Trang {currentPage} / {totalPages} (Tổng {totalCards} thẻ)
          </span>

          <DeckPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ═══════════ FLOATING BULK ACTION TOOLBAR ═══════════ */}
      <AnimatePresence>
        {selectedCardIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            className="fixed bottom-[110px] md:bottom-28 left-3 right-3 sm:left-6 sm:right-6 max-w-md mx-auto z-[150] bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-2.5 shadow-2xl border border-slate-700/80 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 pl-1.5 min-w-0">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                {selectedCardIds.size}
              </span>
              <span className="text-xs font-bold text-slate-200 truncate">
                Đã chọn {selectedCardIds.size} thẻ
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleBulkStar}
                disabled={isBulkProcessing}
                className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Gắn sao các thẻ đã chọn"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Sao</span>
              </button>

              <button
                onClick={handleBulkIgnore}
                disabled={isBulkProcessing}
                className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Ẩn các thẻ đã chọn"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ẩn</span>
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm shadow-rose-900/40"
                title="Xóa tất cả các thẻ đã chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>

              <button
                onClick={handleClearSelection}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer ml-1"
                title="Bỏ chọn tất cả"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Modals */}
      <DeckCardBatchPasteModal
        isOpen={isBatchPasteOpen}
        onClose={handleCloseBatchPaste}
        deckId={id!}
      />

      <DeckCardEditModal
        isOpen={isEditModalOpen || (editingCard !== null)}
        onClose={handleCloseEditModal}
        flashcard={editingCard}
        onSave={handleSaveCardEdit}
        isSaving={isSavingCard}
        practiceSettings={deckData?.practice_settings}
      />
    </div>
  )
}

export default DeckCardsTab
