import React from 'react'
import { 
  X, 
  Folder as FolderIcon, 
  Layers, 
  BookOpen, 
  Sparkles, 
  Edit3, 
  ChevronRight,
  GraduationCap,
  Play,
  Flame,
  BarChart2
} from 'lucide-react'
import type { FolderData } from './FolderModal'

interface FolderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  folder: FolderData | null
  memberDecks: any[]
  onEdit: (folder: FolderData) => void
  onStudy: (folderId: number) => void
  onPractice: (folderId: number) => void
  onSelectDeck?: (deckId: number) => void
}

const COLOR_GRADIENTS: Record<string, string> = {
  orange: 'from-amber-500 to-orange-500',
  purple: 'from-purple-500 to-indigo-500',
  emerald: 'from-emerald-500 to-teal-500',
  sky: 'from-sky-500 to-blue-500',
}

export const FolderDetailModal: React.FC<FolderDetailModalProps> = ({
  isOpen,
  onClose,
  folder,
  memberDecks,
  onEdit,
  onStudy,
  onPractice,
  onSelectDeck
}) => {
  if (!isOpen || !folder) return null

  const gradient = COLOR_GRADIENTS[folder.color] || COLOR_GRADIENTS.orange
  const totalCards = folder.total_cards || folder.cards_count || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Header */}
        <div className={`relative px-5 pt-6 pb-5 bg-gradient-to-r ${gradient} text-white`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 p-1.5 bg-black/20 hover:bg-black/30 text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner shrink-0">
              <FolderIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                  Deck Collection
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEdit(folder)
                  }}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/90 hover:text-white"
                  title="Edit Folder"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight truncate mt-1">
                {folder.title}
              </h2>
              {folder.description && (
                <p className="text-xs text-white/80 line-clamp-2 mt-0.5">
                  {folder.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 text-center">
              <div className="text-[11px] font-medium text-white/80">Decks</div>
              <div className="text-base font-extrabold text-white">{folder.decks_count || folder.deck_ids.length}</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 text-center">
              <div className="text-[11px] font-medium text-white/80">Cards</div>
              <div className="text-base font-extrabold text-white">{totalCards}</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 text-center">
              <div className="text-[11px] font-medium text-white/80">Progress</div>
              <div className="text-base font-extrabold text-white">{folder.progress_percent || 0}%</div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose()
              onStudy(folder.id)
            }}
            disabled={totalCards === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs shadow-sm shadow-orange-500/20 disabled:opacity-50 transition-all"
          >
            <GraduationCap className="w-4 h-4" />
            Study All Cards
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onPractice(folder.id)
            }}
            disabled={totalCards === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 border border-slate-200 font-bold text-xs shadow-sm disabled:opacity-50 transition-all"
          >
            <Play className="w-4 h-4 text-orange-500" />
            Practice Folder
          </button>
        </div>

        {/* Member Decks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Member Decks ({memberDecks.length})
            </h3>
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(folder)
              }}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
            >
              + Manage Decks
            </button>
          </div>

          {memberDecks.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No decks added yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Manage Decks" to add decks to this folder.</p>
            </div>
          ) : (
            memberDecks.map((deck: any) => (
              <div
                key={deck.id}
                onClick={() => {
                  if (onSelectDeck) {
                    onClose()
                    onSelectDeck(deck.id)
                  }
                }}
                className="flex items-center justify-between p-3 bg-white hover:bg-orange-50/40 rounded-xl border border-slate-200/80 cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-orange-100/70 border border-orange-200/60 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                      {deck.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {deck.cards_count || deck.questions_count || 0} cards • {deck.progress_percent || 0}% mastered
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
