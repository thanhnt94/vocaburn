import React from 'react'
import { Search, Star, EyeOff, ClipboardPaste, Plus, Trash2, CheckSquare, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CardFilterStatus = 'all' | 'starred' | 'ignored'

export interface DeckCardFilterBarProps {
  search: string
  onSearchChange: (val: string) => void
  status: CardFilterStatus
  onStatusChange: (val: CardFilterStatus) => void
  totalCount: number
  filteredCount: number
  selectedCount: number
  isAllSelected?: boolean
  onToggleSelectAll?: () => void
  onOpenBatchPaste: () => void
  onAddNewCard: () => void
  onBulkDelete?: () => void
  onBulkIgnore?: () => void
  onBulkStar?: () => void
  onClearSelection?: () => void
}

export function DeckCardFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  totalCount,
  filteredCount,
  selectedCount,
  isAllSelected,
  onToggleSelectAll,
  onOpenBatchPaste,
  onAddNewCard,
  onBulkDelete,
  onBulkIgnore,
  onBulkStar,
  onClearSelection,
}: DeckCardFilterBarProps) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs space-y-2.5 text-left">
      {/* Top row: Search & Action Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm từ vựng, kanji, nghĩa..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-8 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenBatchPaste}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
            title="Dán nhanh nhiều thẻ từ Excel/Google Sheets"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Dán nhiều</span>
          </button>

          <button
            onClick={onAddNewCard}
            className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Tạo thẻ</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Filter Chips & Select All */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/60">
          <button
            onClick={() => onStatusChange('all')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer",
              status === 'all'
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/70"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Tất cả ({totalCount})
          </button>

          <button
            onClick={() => onStatusChange('starred')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer",
              status === 'starred'
                ? "bg-white text-amber-600 shadow-2xs border border-slate-200/70"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Có sao</span>
          </button>

          <button
            onClick={() => onStatusChange('ignored')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer",
              status === 'ignored'
                ? "bg-white text-slate-800 shadow-2xs border border-slate-200/70"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <EyeOff className="w-3 h-3" />
            <span>Đang ẩn</span>
          </button>
        </div>

        {/* Select All Toggle */}
        {onToggleSelectAll && filteredCount > 0 && (
          <button
            onClick={onToggleSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer select-none"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Chọn tất cả ({filteredCount})</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default DeckCardFilterBar
