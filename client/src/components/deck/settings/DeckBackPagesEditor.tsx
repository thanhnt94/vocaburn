import React from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, BookOpen, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BackPageItem } from '@/components/common/study/StudyConstants'

interface DeckBackPagesEditorProps {
  backPages: BackPageItem[]
  availableColumns: string[]
  onChange: (pages: BackPageItem[]) => void
  compact?: boolean
}

export function DeckBackPagesEditor({
  backPages = [],
  availableColumns = [],
  onChange,
  compact = false
}: DeckBackPagesEditorProps) {
  // Normalize: ensure page 1 is always back
  const pages: BackPageItem[] = React.useMemo(() => {
    if (!Array.isArray(backPages) || backPages.length === 0) {
      return [{ id: 'page_1_default', column: 'back', label: 'Back' }]
    }
    const list = [...backPages]
    if (list[0].column !== 'back' && list[0].column !== 'explanation') {
      list.unshift({ id: 'page_1_default', column: 'back', label: 'Back' })
    }
    return list
  }, [backPages])

  // Filter columns that make sense for back pages (exclude front, media files if not text)
  const selectableColumns = React.useMemo(() => {
    const excluded = new Set(['front', 'content', 'id', 'item_id', 'order_in_container'])
    const cols = availableColumns.filter(c => !excluded.has(c))
    if (!cols.includes('back')) cols.unshift('back')
    return cols
  }, [availableColumns])

  const handleUpdatePage = (index: number, updates: Partial<BackPageItem>) => {
    const updated = pages.map((p, idx) => (idx === index ? { ...p, ...updates } : p))
    onChange(updated)
  }

  const handleAddPage = () => {
    // Pick the first column that isn't already used
    const usedCols = new Set(pages.map(p => p.column))
    const nextCol = selectableColumns.find(c => !usedCols.has(c)) || selectableColumns[0] || 'notes'
    const newPage: BackPageItem = {
      id: `page_${Date.now()}`,
      column: nextCol,
      label: nextCol.replace(/[_-]/g, ' ')
    }
    onChange([...pages, newPage])
  }

  const handleDeletePage = (index: number) => {
    if (index === 0) return // Cannot delete Page 1
    const updated = pages.filter((_, idx) => idx !== index)
    onChange(updated)
  }

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (index === 0) return // Page 1 stays at top
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex <= 0 || targetIndex >= pages.length) return

    const updated = [...pages]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    onChange(updated)
  }

  return (
    <div className={cn(
      "space-y-3 rounded-2xl bg-slate-50/70 border border-slate-200/70",
      compact ? "p-3" : "p-4 sm:p-5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Layers className="w-3.5 h-3.5" />
          </span>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Phân trang mặt sau</span>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                {pages.length} trang
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Tạo nhiều trang ở mặt sau thẻ bằng cách gán các cột dữ liệu (như Ví dụ, So sánh, Cách dùng...)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddPage}
          className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm trang</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="space-y-2">
        {pages.map((page, idx) => {
          const isFirstPage = idx === 0
          return (
            <div
              key={page.id || idx}
              className={cn(
                "p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5",
                isFirstPage
                  ? "bg-white border-slate-200/90 shadow-2xs"
                  : "bg-white/90 border-slate-200 hover:border-indigo-200 hover:shadow-2xs"
              )}
            >
              {/* Left Info / Badge */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 border",
                  isFirstPage
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  {idx + 1}
                </span>

                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isFirstPage ? "Trang 1 • Mặc định DB" : `Trang ${idx + 1}`}
                  </span>
                  <span className="text-xs font-black text-slate-800 truncate">
                    {page.label || page.column}
                  </span>
                </div>
              </div>

              {/* Controls: Select Column & Label Input */}
              <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Column Selector */}
                <div className="w-36 sm:w-44 shrink-0">
                  <select
                    disabled={isFirstPage}
                    value={page.column}
                    onChange={(e) => handleUpdatePage(idx, { 
                      column: e.target.value,
                      label: page.label || e.target.value.replace(/[_-]/g, ' ')
                    })}
                    className={cn(
                      "w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border appearance-none transition-all",
                      isFirstPage
                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 focus:border-indigo-500 cursor-pointer"
                    )}
                  >
                    {isFirstPage ? (
                      <option value="back">back (Mặt sau chuẩn)</option>
                    ) : (
                      selectableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Custom Page Label Input */}
                <input
                  type="text"
                  value={page.label || ''}
                  placeholder={page.column}
                  onChange={(e) => handleUpdatePage(idx, { label: e.target.value })}
                  className="w-28 sm:w-36 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 hover:border-indigo-300 focus:border-indigo-500 transition-all shrink-0"
                  title="Nhãn hiển thị trên thanh phân trang ở mặt sau thẻ"
                />

                {/* Reorder and Delete Actions for Page 2+ */}
                {!isFirstPage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 1}
                      onClick={() => handleMovePage(idx, 'up')}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={() => handleMovePage(idx, 'down')}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePage(idx)}
                      className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Xóa trang này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-[11px] text-slate-400 font-medium pt-1">
        💡 <strong>Mẹo:</strong> Khi thẻ có từ 2 trang trở lên, một thanh phân trang nhỏ gọn sẽ xuất hiện ở đáy mặt sau của thẻ học, cho phép bạn lật xem các trang phụ chỉ bằng 1 chạm mà không cần mở popup.
      </div>
    </div>
  )
}

export default DeckBackPagesEditor
