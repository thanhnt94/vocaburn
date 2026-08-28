import React from 'react'
import { Search, Star, EyeOff, ClipboardPaste, Plus, Trash2, Filter } from 'lucide-react'

export type CardFilterStatus = 'all' | 'starred' | 'ignored'

export interface DeckCardFilterBarProps {
  search: string
  onSearchChange: (val: string) => void
  status: CardFilterStatus
  onStatusChange: (val: CardFilterStatus) => void
  totalCount: number
  filteredCount: number
  selectedCount: number
  onOpenBatchPaste: () => void
  onAddNewCard: () => void
  onBulkDelete?: () => void
  onBulkIgnore?: () => void
}

export function DeckCardFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  totalCount,
  filteredCount,
  selectedCount,
  onOpenBatchPaste,
  onAddNewCard,
  onBulkDelete,
  onBulkIgnore,
}: DeckCardFilterBarProps) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3 text-left">
      {/* Top row: Search & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm từ vựng, giải thích trong bộ thẻ..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenBatchPaste}
            className="h-10 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Dán nhanh nhiều thẻ từ Excel/Google Sheets"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dán hàng loạt</span>
          </button>

          <button
            onClick={onAddNewCard}
            className="h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo thẻ chi tiết</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Filter Status Tabs & Bulk Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
          <button
            onClick={() => onStatusChange('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              status === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({totalCount})
          </button>

          <button
            onClick={() => onStatusChange('starred')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              status === 'starred'
                ? 'bg-white text-amber-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Có sao</span>
          </button>

          <button
            onClick={() => onStatusChange('ignored')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              status === 'ignored'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <EyeOff className="w-3 h-3" />
            <span>Đang ẩn</span>
          </button>
        </div>

        {/* Bulk Action Controls if items selected */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in">
            <span className="text-xs font-bold text-indigo-600">
              Đã chọn {selectedCount} thẻ
            </span>
            {onBulkIgnore && (
              <button
                onClick={onBulkIgnore}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Ẩn các thẻ đã chọn
              </button>
            )}
            {onBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa {selectedCount}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeckCardFilterBar
