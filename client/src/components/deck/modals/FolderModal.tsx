import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  X, 
  Folder as FolderIcon, 
  Check, 
  Layers, 
  Search, 
  Trash2, 
  Loader2, 
  Plus,
  Palette
} from 'lucide-react'

export interface FolderData {
  id: number
  title: string
  description?: string | null
  cover_image?: string | null
  color: string
  decks_count: number
  deck_ids: number[]
  total_cards: number
  cards_count?: number
  learned_count: number
  mastered_count: number
  progress_percent: number
  created_at?: string
}

interface DeckOption {
  id: number
  title: string
  cards_count?: number
  questions_count?: number
  cover_image?: string | null
}

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (savedFolder?: FolderData) => void
  folder?: FolderData | null
  availableDecks: DeckOption[]
}

const COLOR_THEMES = [
  { id: 'orange', label: 'Orange', bg: 'bg-amber-500', gradient: 'from-amber-500 to-orange-500', ring: 'ring-orange-400' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', gradient: 'from-purple-500 to-indigo-500', ring: 'ring-purple-400' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-400' },
  { id: 'sky', label: 'Sky Blue', bg: 'bg-sky-500', gradient: 'from-sky-500 to-blue-500', ring: 'ring-sky-400' },
]

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  folder,
  availableDecks
}) => {
  const isEditing = Boolean(folder)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('orange')
  const [selectedDeckIds, setSelectedDeckIds] = useState<number[]>([])
  const [deckSearch, setDeckSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (folder) {
        setTitle(folder.title || '')
        setDescription(folder.description || '')
        setColor(folder.color || 'orange')
        setSelectedDeckIds(folder.deck_ids || [])
      } else {
        setTitle('')
        setDescription('')
        setColor('orange')
        setSelectedDeckIds([])
      }
      setDeckSearch('')
      setError(null)
    }
  }, [isOpen, folder])

  if (!isOpen) return null

  const toggleDeck = (deckId: number) => {
    setSelectedDeckIds(prev => 
      prev.includes(deckId) 
        ? prev.filter(id => id !== deckId) 
        : [...prev, deckId]
    )
  }

  const selectAll = () => {
    setSelectedDeckIds(filteredDecks.map(d => d.id))
  }

  const clearAll = () => {
    setSelectedDeckIds([])
  }

  const filteredDecks = availableDecks.filter(d => 
    d.title.toLowerCase().includes(deckSearch.toLowerCase())
  )

  const totalCardsInSelection = availableDecks
    .filter(d => selectedDeckIds.includes(d.id))
    .reduce((sum, d) => sum + (d.cards_count || d.questions_count || 0), 0)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please enter a folder title')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isEditing && folder) {
        const res = await axios.put(`/api/v1/folders/${folder.id}`, {
          title: title.trim(),
          description: description.trim() || null,
          color,
          deck_ids: selectedDeckIds
        })
        onSuccess(res.data)
      } else {
        const res = await axios.post('/api/v1/folders', {
          title: title.trim(),
          description: description.trim() || null,
          color,
          deck_ids: selectedDeckIds
        })
        onSuccess(res.data)
      }
      onClose()
    } catch (err: any) {
      console.error('Failed to save folder:', err)
      setError(err?.response?.data?.detail || 'Failed to save folder. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!folder) return
    if (!window.confirm(`Are you sure you want to delete folder "${folder.title}"? The member decks will NOT be deleted.`)) {
      return
    }

    setDeleting(true)
    try {
      await axios.delete(`/api/v1/folders/${folder.id}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to delete folder:', err)
      alert(err?.response?.data?.detail || 'Failed to delete folder')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-tr ${COLOR_THEMES.find(c => c.id === color)?.gradient || 'from-amber-500 to-orange-500'}`}>
              <FolderIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEditing ? 'Edit Deck Folder' : 'Create Deck Folder'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Group multiple decks for cross-deck practice & study
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Folder Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. JLPT N2 Complete, Medical Terminology..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this folder collection..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Color theme picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              Accent Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setColor(theme.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    color === theme.id 
                      ? 'border-orange-500 bg-orange-50/50 text-slate-800 shadow-sm ring-1 ring-orange-400' 
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${theme.bg} shrink-0`} />
                  <span className="truncate">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Decks Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Select Decks
                <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  {selectedDeckIds.length} decks • {totalCardsInSelection} cards
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                >
                  Select all
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Quick search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={deckSearch}
                onChange={e => setDeckSearch(e.target.value)}
                placeholder="Search your decks..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* Deck checkboxes list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100/60 border border-slate-200 rounded-xl p-2 bg-slate-50/40">
              {filteredDecks.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No decks found
                </div>
              ) : (
                filteredDecks.map(deck => {
                  const isSelected = selectedDeckIds.includes(deck.id)
                  const cardsCount = deck.cards_count || deck.questions_count || 0
                  return (
                    <div
                      key={deck.id}
                      onClick={() => toggleDeck(deck.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors pt-2 ${
                        isSelected 
                          ? 'bg-orange-50/80 border border-orange-200/80' 
                          : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-orange-500 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {deck.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded-full shrink-0">
                        {cardsCount} cards
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Modal Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Folder
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || deleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || deleting || !title.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Folder'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
