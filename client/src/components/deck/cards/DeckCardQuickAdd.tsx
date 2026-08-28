import React, { useState, useRef } from 'react'
import { Plus, Sparkles } from 'lucide-react'

export interface DeckCardQuickAddProps {
  onAddCard: (front: string, back: string) => Promise<boolean>
  isAdding?: boolean
}

export function DeckCardQuickAdd({ onAddCard, isAdding = false }: DeckCardQuickAddProps) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const frontRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!front.trim() || !back.trim() || isAdding) return

    const success = await onAddCard(front.trim(), back.trim())
    if (success) {
      setFront('')
      setBack('')
      frontRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-4 bg-white rounded-3xl border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center gap-2.5 text-left"
    >
      <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-2">
        <input
          ref={frontRef}
          type="text"
          placeholder="Mặt trước (Từ vựng, Thuật ngữ)..."
          value={front}
          onChange={(e) => setFront(e.target.value)}
          className="w-full sm:flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
        />

        <input
          type="text"
          placeholder="Mặt sau (Ý nghĩa, Định nghĩa)..."
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className="w-full sm:flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
        />
      </div>

      <button
        type="submit"
        disabled={!front.trim() || !back.trim() || isAdding}
        className="w-full md:w-auto h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{isAdding ? 'ĐANG LƯU...' : '+ THÊM NHANH'}</span>
      </button>
    </form>
  )
}

export default DeckCardQuickAdd
