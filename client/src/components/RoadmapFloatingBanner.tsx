import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, CheckCircle2, GripHorizontal } from 'lucide-react'
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
    if (!label) return 'TIẾP'
    let cleaned = label.replace(/^Sang\s+/i, '').trim()
    if (cleaned.toLowerCase().includes('trắc nghiệm mcq') || cleaned.toLowerCase().includes('mcq')) return 'MCQ'
    if (cleaned.toLowerCase().includes('ôn tập fsrs') || cleaned.toLowerCase().includes('fsrs')) return 'FSRS'
    if (cleaned.toLowerCase().includes('gõ từ vựng') || cleaned.toLowerCase().includes('gõ')) return 'GÕ TỪ'
    if (cleaned.toLowerCase().includes('học từ mới')) return 'TỪ MỚI'
    return cleaned.toUpperCase()
  }

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{
          left: -window.innerWidth + 200,
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
        <div className="flex flex-col items-center bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 text-white rounded-2xl p-1.5 px-2.5 shadow-2xl shadow-indigo-900/50 ring-1 ring-white/10 hover:border-indigo-400 transition-all cursor-grab active:cursor-grabbing">
          {/* Top Row: Step Badge */}
          <div className="flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 leading-none">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span>{allDone ? '✓ XONG' : `BƯỚC ${currentStepIndex}/${totalSteps}`}</span>
          </div>

          {/* Bottom Row: Grip + Action Button + Close */}
          <div className="flex items-center gap-1.5">
            <span title="Kéo để di chuyển">
              <GripHorizontal className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 shrink-0" />
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
                navigate(nextActionUrl)
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{allDone ? 'XONG 🎉' : getCleanLabel(nextActionLabel)}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Đóng"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
