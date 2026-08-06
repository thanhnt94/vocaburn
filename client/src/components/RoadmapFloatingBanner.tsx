import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles, CheckCircle2, GripVertical } from 'lucide-react'
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

  const getCleanLabel = (label: string) => {
    if (!label) return 'TIẾP TỤC'
    let cleaned = label.replace(/^Sang\s+/i, '').trim()
    if (cleaned.toLowerCase().includes('trắc nghiệm mcq') || cleaned.toLowerCase().includes('mcq')) return 'LÀM MCQ'
    if (cleaned.toLowerCase().includes('ôn tập fsrs') || cleaned.toLowerCase().includes('fsrs')) return 'ÔN TẬP FSRS'
    if (cleaned.toLowerCase().includes('gõ từ vựng') || cleaned.toLowerCase().includes('gõ')) return 'GÕ TỪ VỰNG'
    if (cleaned.toLowerCase().includes('học từ mới')) return 'HỌC TỪ MỚI'
    return cleaned.toUpperCase()
  }

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{
          left: -window.innerWidth + 220,
          right: 20,
          top: -window.innerHeight + 150,
          bottom: 20
        }}
        initial={{ opacity: 0, y: 40, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="fixed bottom-24 right-4 z-[999] touch-none select-none"
      >
        {/* Luxury Glassmorphic Pill Bar */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-2xl border border-orange-200/90 text-slate-900 rounded-full p-1.5 pl-2.5 pr-2 shadow-[0_12px_36px_rgba(249,115,22,0.25)] ring-1 ring-orange-500/15 transition-all cursor-grab active:cursor-grabbing">
          
          {/* Drag Handle Icon */}
          <span title="Kéo để di chuyển vị trí" className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing px-0.5">
            <GripVertical className="w-4 h-4 shrink-0" />
          </span>

          {/* Step Pill */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider shrink-0 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{allDone ? '✓ HOÀN THÀNH' : `BƯỚC ${currentStepIndex}/${totalSteps}`}</span>
          </div>

          {/* Action CTA Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
              navigate(nextActionUrl)
            }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/35 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{allDone ? 'XONG 🎉' : getCleanLabel(nextActionLabel)}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer shrink-0"
            title="Ẩn nút chuyển bước"
          >
            <X className="w-3.5 h-3.5" />
          </button>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
