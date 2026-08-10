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
        {/* Compact Dark Glassmorphic 2-Line Banner */}
        <div className="flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-slate-800/90 text-white rounded-xl p-1.5 sm:p-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-all cursor-grab active:cursor-grabbing w-44 xs:w-48">
          
          {/* Row 1: Drag Handle, Step Badge, Close Button */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/70">
            <div className="flex items-center gap-1">
              <span title="Kéo để di chuyển vị trí" className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3 h-3 shrink-0" />
              </span>
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[9px] uppercase tracking-wider">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>{allDone ? '✓ DONE' : `BƯỚC ${currentStepIndex}/${totalSteps}`}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="w-4.5 h-4.5 rounded bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
              title="Ẩn nút chuyển bước"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Row 2: Compact Action CTA Button */}
          <div className="pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
                navigate(nextActionUrl)
              }}
              className="w-full py-1 px-2.5 rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-[10.5px] uppercase tracking-wider shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{allDone ? 'XONG 🎉' : getCleanLabel(nextActionLabel)}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
