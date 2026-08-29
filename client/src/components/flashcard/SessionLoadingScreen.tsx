import React, { useState, useEffect } from 'react'
import { Brain, Sparkles } from 'lucide-react'

export const SessionLoadingScreen: React.FC = () => {
  const [tipIndex, setTipIndex] = useState(0)
  const tips = [
    "Đang tối ưu hóa thuật toán FSRS cho bộ nhớ của bạn...",
    "Ganbare! Hôm nay nhất định sẽ thuộc thêm nhiều từ mới! 🎌",
    "Học tập có chu kỳ giúp lưu giữ từ vựng lâu gấp 10 lần. 🧠",
    "Đang chuẩn bị giáo án và sắp xếp các thẻ học...",
    "Luyện tập đều đặn mỗi ngày để duy trì Streak ngọn lửa nhé! 🔥",
    "Tiến trình học của bạn đang được đồng bộ hóa an toàn..."
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [tips.length])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 p-6 selection:bg-indigo-100">
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Glow backdrop */}
        <div className="absolute -top-12 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl animate-pulse" />
        
        {/* Cute animated loading icon */}
        <div className="relative mb-6 flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-slate-100 animate-bounce duration-1000">
          <Brain className="w-8 h-8 text-indigo-600 animate-pulse" />
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-500 animate-spin duration-3000" />
        </div>

        {/* Pulsing ring spinner */}
        <div className="relative w-10 h-10 mb-6">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>

        {/* Loading text */}
        <h2 className="text-sm font-black text-slate-700 tracking-widest uppercase mb-2">
          Đang chuẩn bị phiên học
        </h2>
        
        {/* Rotating tip */}
        <div className="h-10 flex items-center justify-center">
          <p className="text-xs font-semibold text-slate-500 animate-pulse px-4">
            {tips[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}
