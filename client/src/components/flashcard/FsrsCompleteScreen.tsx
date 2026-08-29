import React from 'react'
import { Brain, Clock, RefreshCw, BookOpen } from 'lucide-react'

export interface FsrsCompleteScreenProps {
  fsrsCompletionData: any
  session: any
  deckId: string | undefined
  onFreeReview: () => void
  onViewDeckDetail: () => void
  onBackToLibrary: () => void
}

export const FsrsCompleteScreen: React.FC<FsrsCompleteScreenProps> = ({
  fsrsCompletionData,
  session,
  onFreeReview,
  onViewDeckDetail,
  onBackToLibrary
}) => {
  const nextDueText = fsrsCompletionData?.next_due_text || 'Một vài giờ nữa'
  const totalCards = fsrsCompletionData?.total_cards || session?.questions?.length || 0
  const learnedCards = fsrsCompletionData?.learned_cards || totalCards

  return (
    <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 p-6 md:p-10 flex flex-col items-center justify-center text-center gap-6 shadow-2xl shadow-indigo-100/40 min-h-[480px] w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
      {/* Brain / Glow Icon Badge */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white border-indigo-300 shadow-indigo-200">
        <Brain className="w-10 h-10 animate-bounce" />
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          🎉 XUẤT SẮC! HOÀN THÀNH FSRS
        </h2>
        <p className="text-xs md:text-sm font-medium text-slate-500 leading-relaxed">
          Bạn đã hoàn thành toàn bộ từ vựng cần ôn tập và từ mới của bộ thẻ này hôm nay.
        </p>
      </div>

      {/* FSRS Waiting / Countdown Card */}
      <div className="w-full max-w-md bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-pink-50/40 border border-indigo-100 rounded-3xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-indigo-700 font-bold text-xs">
          <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="uppercase tracking-wider">Hãy quay lại ôn tập sau:</span>
        </div>
        <div className="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight py-1">
          ⏳ {nextDueText}
        </div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
          Khoảng cách ôn tập được thuật toán FSRS v6 tối ưu hóa tự động theo chu kỳ ghi nhớ để đạt hiệu suất cao nhất.
        </p>
      </div>

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Đã thuộc</span>
          <span className="text-xl font-black text-emerald-600 block mt-0.5">
            {learnedCards}/{totalCards}
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cần ôn</span>
          <span className="text-xl font-black text-indigo-600 block mt-0.5">
            0 thẻ
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trạng thái</span>
          <span className="text-xl font-black text-purple-600 block mt-0.5">
            Tối ưu 🧠
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3 pt-2">
        <button
          onClick={onFreeReview}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>🔄 ÔN TẬP TỰ DO (LẬT THẺ / FREE REVIEW)</span>
        </button>

        <button
          onClick={onViewDeckDetail}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span>Xem chi tiết & thống kê bộ thẻ</span>
        </button>

        <button
          onClick={onBackToLibrary}
          className="w-full py-3 px-4 rounded-xl bg-slate-100/60 hover:bg-slate-100 border border-slate-200/60 text-slate-500 hover:text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
        >
          Về Thư Viện
        </button>
      </div>
    </div>
  )
}
