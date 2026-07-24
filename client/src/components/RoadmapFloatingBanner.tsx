import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X, CheckCircle2, Trophy, Flame } from 'lucide-react'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

interface RoadmapFloatingBannerProps {
  show: boolean
  onClose: () => void
  completedStep?: PipelineStepStatus | null
  nextActionUrl: string
  nextActionLabel: string
  currentStepIndex: number
  totalSteps: number
  allDone?: boolean
}

export const RoadmapFloatingBanner: React.FC<RoadmapFloatingBannerProps> = ({
  show,
  onClose,
  completedStep,
  nextActionUrl,
  nextActionLabel,
  currentStepIndex,
  totalSteps,
  allDone = false
}) => {
  const navigate = useNavigate()

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-4 sm:mx-0"
      >
        <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 text-white rounded-3xl p-5 shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
          {/* Subtle animated gradient accent background */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-full blur-2xl pointer-events-none" />
          
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 shrink-0">
              {allDone ? '🏆' : '🎉'}
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {allDone ? 'Hoàn Thành Lộ Trình' : `Xong Bước ${currentStepIndex}/${totalSteps}`}
                </span>
              </div>

              <h4 className="text-sm font-black text-white tracking-tight leading-snug">
                {allDone
                  ? 'Tuyệt vời! Bạn đã hoàn thành tất cả bài học lộ trình hôm nay! 🎉'
                  : completedStep
                  ? `Đã xong "${completedStep.label}"!`
                  : 'Đã xong bước hiện tại!'}
              </h4>

              <p className="text-[11px] text-slate-300 font-medium mt-1 leading-relaxed">
                {allDone
                  ? 'Hãy duy trì chuỗi Streak và ôn tập lại khi cần nhé.'
                  : `Sẵn sàng để tiếp tục bước tiếp theo "${nextActionLabel}"?`}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Để Sau
            </button>

            <button
              onClick={() => {
                onClose()
                navigate(nextActionUrl)
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{allDone ? 'Xem Kết Quả Lộ Trình' : `Sang ${nextActionLabel}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
