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
    <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-left">
      {/* Left: Status Filter Chips */}
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

      {/* Right: Select All & Bulk Actions */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-xl text-xs font-bold text-indigo-700">
            <span>Đã chọn {selectedCount}</span>
            {onBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="p-1 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                title="Xóa các thẻ đã chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onBulkStar && (
              <button
                onClick={onBulkStar}
                className="p-1 hover:bg-amber-100 text-amber-600 rounded-lg transition-all cursor-pointer"
                title="Gắn sao các thẻ đã chọn"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            {onBulkIgnore && (
              <button
                onClick={onBulkIgnore}
                className="p-1 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
                title="Ẩn/Hiện các thẻ đã chọn"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
                title="Bỏ chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

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
