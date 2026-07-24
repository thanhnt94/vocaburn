import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, CheckCircle2, GripHorizontal, Sparkles } from 'lucide-react'
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
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{
          left: -window.innerWidth + 280,
          right: 20,
          top: -window.innerHeight + 150,
          bottom: 20
        }}
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="fixed bottom-20 right-4 z-[999] touch-none select-none"
      >
        <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 text-white rounded-2xl p-2 pl-3 shadow-2xl shadow-indigo-900/40 ring-1 ring-white/10 hover:border-indigo-400 transition-all cursor-grab active:cursor-grabbing">
          {/* Drag handle */}
          <div className="flex items-center text-slate-500 hover:text-slate-300 transition-colors" title="Kéo để di chuyển vị trí">
            <GripHorizontal className="w-4 h-4" />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{allDone ? '✓ Xong' : `Bước ${currentStepIndex}/${totalSteps}`}</span>
          </div>

          {/* Label / Description */}
          <div className="hidden xs:flex flex-col min-w-0 pr-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              {allDone ? 'Đã hoàn thành' : completedStep ? `Xong ${completedStep.label}` : 'Sẵn sàng'}
            </span>
          </div>

          {/* Jump Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
              navigate(nextActionUrl)
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{allDone ? 'Xong Lộ Trình 🎉' : `Sang ${nextActionLabel}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Close / Dismiss icon */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title="Đóng nút chuyển"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
