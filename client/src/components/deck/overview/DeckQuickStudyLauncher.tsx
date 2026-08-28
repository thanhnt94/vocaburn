import React from 'react'
import { Link } from 'react-router-dom'
import { Brain, Trophy, RotateCcw, Sparkles, Compass, Headphones, Keyboard, CheckCircle2 } from 'lucide-react'

export interface DeckQuickStudyLauncherProps {
  deckId: string | number
  totalCards: number
  dueCount?: number
  practiceSettings?: any
}

export function DeckQuickStudyLauncher({
  deckId,
  totalCards,
  dueCount = 0,
  practiceSettings
}: DeckQuickStudyLauncherProps) {
  const disabledModes = practiceSettings?.disabled_modes || []

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Bắt Đầu Học & Luyện Tập
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Lựa chọn chế độ học tập phù hợp hôm nay
          </p>
        </div>
      </div>

      {/* Main Big CTA: FSRS Spaced Repetition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Link
          to={`/flashcard/${deckId}/play?mode=fsrs`}
          className="group relative p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-200/50 active:scale-[0.98] transition-all overflow-hidden flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-xl shrink-0 group-hover:scale-110 transition-transform">
            🧠
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight">Học Flashcard FSRS</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <p className="text-[11px] text-indigo-100 font-medium mt-0.5 line-clamp-1">
              {dueCount > 0 ? `Có ${dueCount} thẻ đến hạn cần ôn tập` : 'Tự động tính chu kỳ ôn thông minh'}
            </p>
          </div>
        </Link>

        <Link
          to={`/flashcard/${deckId}/play?mode=roadmap`}
          className="group relative p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200/50 active:scale-[0.98] transition-all overflow-hidden flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-xl shrink-0 group-hover:scale-110 transition-transform">
            🗺️
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight">Theo Lộ Trình Ngày</span>
            </div>
            <p className="text-[11px] text-amber-100 font-medium mt-0.5 line-clamp-1">
              Học theo chỉ tiêu từ mới & FSRS hàng ngày
            </p>
          </div>
        </Link>
      </div>

      {/* Sub-modes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        <Link
          to={`/flashcard/${deckId}/play?mode=flip`}
          className="p-3 rounded-2xl border border-slate-200/80 hover:border-indigo-500/40 hover:bg-indigo-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">🔄</span>
          <span className="text-xs font-black text-slate-800 group-hover:text-indigo-600">Lật Thẻ Tự Do</span>
          <span className="text-[9px] text-slate-400 font-bold">Flip card nhanh</span>
        </Link>

        {!disabledModes.includes('mcq') && (
          <Link
            to={`/practice/${deckId}/mcq`}
            className="p-3 rounded-2xl border border-slate-200/80 hover:border-emerald-500/40 hover:bg-emerald-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🎯</span>
            <span className="text-xs font-black text-slate-800 group-hover:text-emerald-600">Trắc Nghiệm MCQ</span>
            <span className="text-[9px] text-slate-400 font-bold">4 đáp án phản xạ</span>
          </Link>
        )}

        {!disabledModes.includes('typing') && (
          <Link
            to={`/practice/${deckId}/typing`}
            className="p-3 rounded-2xl border border-slate-200/80 hover:border-purple-500/40 hover:bg-purple-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">⌨️</span>
            <span className="text-xs font-black text-slate-800 group-hover:text-purple-600">Gõ Từ Vựng</span>
            <span className="text-[9px] text-slate-400 font-bold">Luyện nhớ mặt chữ</span>
          </Link>
        )}

        {!disabledModes.includes('listening') && (
          <Link
            to={`/practice/${deckId}/listening`}
            className="p-3 rounded-2xl border border-slate-200/80 hover:border-sky-500/40 hover:bg-sky-50/20 bg-slate-50/50 transition-all flex flex-col items-center justify-center text-center gap-1 group active:scale-95"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🎧</span>
            <span className="text-xs font-black text-slate-800 group-hover:text-sky-600">Luyện Nghe TTS</span>
            <span className="text-[9px] text-slate-400 font-bold">Nghe & chọn nghĩa</span>
          </Link>
        )}
      </div>
    </div>
  )
}

export default DeckQuickStudyLauncher
