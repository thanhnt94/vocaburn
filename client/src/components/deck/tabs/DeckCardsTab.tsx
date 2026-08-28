import React, { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { DeckCardItem, type CardData } from '../cards/DeckCardItem'
import { DeckCardQuickAdd } from '../cards/DeckCardQuickAdd'
import { DeckCardFilterBar, type CardFilterStatus } from '../cards/DeckCardFilterBar'
import { DeckCardBatchPasteModal } from '../cards/DeckCardBatchPasteModal'
import { DeckCardEditModal } from '../cards/DeckCardEditModal'
import { ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react'

export interface DeckCardsTabProps {
  embedded?: boolean
  deckId?: string | number
}

export function DeckCardsTab({ embedded = false, deckId }: DeckCardsTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CardFilterStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  // Modals state
  const [isBatchPasteOpen, setIsBatchPasteOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CardData | null>(null)
  const [isSavingCard, setIsSavingCard] = useState(false)
  const [isQuickAdding, setIsQuickAdding] = useState(false)

  // Multi-select state
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())

  // 1. Fetch questions list
  const { data, isLoading } = useQuery({
    queryKey: ['quiz-questions', id],
    queryFn: async () => {
      if (!id) return { questions: [], total: 0 }
      const res = await axios.get(`/api/v1/deck/${id}/questions`, {
        params: { limit: 2000 }
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

  // Filter & Search Logic
  const filteredCards = useMemo(() => {
    return rawCards.filter((card) => {
      // 1. Search Query
      const query = search.toLowerCase().trim()
      const matchesSearch =
        !query ||
        card.content.toLowerCase().includes(query) ||
        (card.explanation && card.explanation.toLowerCase().includes(query)) ||
        (card.hint && card.hint.toLowerCase().includes(query)) ||
        (card.mnemonic && card.mnemonic.toLowerCase().includes(query))

      // 2. Status filter
      let matchesStatus = true
      if (statusFilter === 'starred') {
        matchesStatus = !!card.is_starred
      } else if (statusFilter === 'ignored') {
        matchesStatus = !!card.is_ignored
      }

      return matchesSearch && matchesStatus
    })
  }, [rawCards, search, statusFilter])

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage))
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredCards.slice(start, start + itemsPerPage)
  }, [filteredCards, currentPage, itemsPerPage])

  // Handlers
  const handleQuickAdd = async (front: string, back: string): Promise<boolean> => {
    setIsQuickAdding(true)
    try {
      await axios.post(`/api/v1/deck/${id}/flashcard`, {
        content: front,
        explanation: back,
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
    setIsEditModalOpen(true)
  }

  const handleSaveCardEdit = async (updatedCard: any, addAnother?: boolean) => {
    setIsSavingCard(true)
    try {
      if (editingCard?.id) {
        // Update existing card
        await axios.patch(`/api/v1/deck/question/${editingCard.id}`, updatedCard)
      } else {
        // Create new card
        await axios.post(`/api/v1/deck/${id}/flashcard`, updatedCard)
      }
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })

      if (addAnother) {
        setEditingCard(null)
      } else {
        setIsEditModalOpen(false)
        setEditingCard(null)
      }
    } catch (e) {
      alert('Không thể lưu thẻ')
    } finally {
      setIsSavingCard(false)
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

  const handleBulkDelete = async () => {
    if (selectedCardIds.size === 0) return
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedCardIds.size} thẻ đã chọn?`)) return
    try {
      for (const cardId of selectedCardIds) {
        await axios.delete(`/api/v1/deck/question/${cardId}`)
      }
      setSelectedCardIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
    } catch (e) {
      alert('Xóa thẻ hàng loạt thất bại')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-4 text-left animate-in fade-in duration-200">
      {/* 1. Quick Add Bar */}
      <DeckCardQuickAdd onAddCard={handleQuickAdd} isAdding={isQuickAdding} />

      {/* 2. Filter Bar */}
      <DeckCardFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val)
          setCurrentPage(1)
        }}
        status={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val)
          setCurrentPage(1)
        }}
        totalCount={rawCards.length}
        filteredCount={filteredCards.length}
        selectedCount={selectedCardIds.size}
        onOpenBatchPaste={() => setIsBatchPasteOpen(true)}
        onAddNewCard={() => {
          setEditingCard(null)
          setIsEditModalOpen(true)
        }}
        onBulkDelete={handleBulkDelete}
      />

      {/* 3. Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-3xl block mb-2">🎴</span>
          <h3 className="text-sm font-black text-slate-800">Không tìm thấy thẻ từ vựng nào</h3>
          <p className="text-xs text-slate-400 mt-1">
            {search ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy nhập thẻ vào thanh thêm nhanh phía trên!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginatedCards.map((card, idx) => (
            <DeckCardItem
              key={card.id}
              card={card}
              index={(currentPage - 1) * itemsPerPage + idx}
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

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 text-slate-400 text-xs font-bold">
          <span>
            Hiển thị {paginatedCards.length} / {filteredCards.length} thẻ
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>

            <span className="px-2 font-black text-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              Sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      <DeckCardBatchPasteModal
        isOpen={isBatchPasteOpen}
        onClose={() => setIsBatchPasteOpen(false)}
        deckId={id!}
      />

      <DeckCardEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingCard(null)
        }}
        flashcard={editingCard}
        onSave={handleSaveCardEdit}
        isSaving={isSavingCard}
        practiceSettings={deckData?.practice_settings}
      />
    </div>
  )
}

export default DeckCardsTab
