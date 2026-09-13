import React from 'react'
import { Star, EyeOff, Trash2, CheckSquare, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CardFilterStatus = 'all' | 'starred' | 'ignored'

export interface DeckCardFilterBarProps {
  status: CardFilterStatus
  onStatusChange: (val: CardFilterStatus) => void
  totalCount: number
  filteredCount: number
  selectedCount: number
  isAllSelected?: boolean
  onToggleSelectAll?: () => void
  onBulkDelete?: () => void
  onBulkIgnore?: () => void
  onBulkStar?: () => void
  onClearSelection?: () => void
}

export function DeckCardFilterBar({
  status,
  onStatusChange,
  totalCount,
  filteredCount,
  selectedCount,
  isAllSelected,
  onToggleSelectAll,
  onBulkDelete,
  onBulkIgnore,
  onBulkStar,
  onClearSelection,
}: DeckCardFilterBarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-left">
      {/* Left: Status Filter Chips */}
      <div className="flex items-center gap-1 p-0.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
        <button
          onClick={() => onStatusChange('all')}
          className={cn(
            "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer",
            status === 'all'
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200/70 dark:border-slate-600"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          All ({totalCount})
        </button>

        <button
          onClick={() => onStatusChange('starred')}
          className={cn(
            "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer",
            status === 'starred'
              ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs border border-slate-200/70 dark:border-slate-600"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <Star className="w-3 h-3 fill-current" />
          <span>Starred</span>
        </button>

        <button
          onClick={() => onStatusChange('ignored')}
          className={cn(
            "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer",
            status === 'ignored'
              ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs border border-slate-200/70 dark:border-slate-600"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          <EyeOff className="w-3 h-3" />
          <span>Hidden</span>
        </button>
      </div>

      {/* Right: Select All & Bulk Actions */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <span>Selected {selectedCount}</span>
            {onBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg transition-all cursor-pointer touch-manipulation"
                title="Delete selected cards"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onBulkStar && (
              <button
                onClick={onBulkStar}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg transition-all cursor-pointer touch-manipulation"
                title="Star selected cards"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            {onBulkIgnore && (
              <button
                onClick={onBulkIgnore}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer touch-manipulation"
                title="Hide / Unhide selected cards"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all cursor-pointer touch-manipulation"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {onToggleSelectAll && filteredCount > 0 && (
          <button
            onClick={onToggleSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer select-none touch-manipulation"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-50 dark:fill-indigo-950" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
            <span>Select all ({filteredCount})</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default DeckCardFilterBar
