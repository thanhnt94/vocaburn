import React from 'react'
import { Link } from 'react-router-dom'
import { Map, Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

interface RoadmapHeaderTrackerProps {
  pipeline: PipelineStepStatus[]
  currentStepIndex: number
  allDone: boolean
  deckId: string | number
  className?: string
}

export const RoadmapHeaderTracker: React.FC<RoadmapHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex,
  allDone,
  deckId,
  className
}) => {
  if (!pipeline || pipeline.length === 0) return null

  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1", className)}>
      <Link
        to={`/flashcard/${deckId}/roadmap`}
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border border-indigo-100"
        title="Xem trang cài đặt lộ trình"
      >
        <Map className="w-3 h-3 text-indigo-600" />
        <span>Roadmap</span>
      </Link>

      <div className="flex items-center gap-1 shrink-0">
        {pipeline.map((step, idx) => {
          const isDone = step.done
          const isCurrent = idx === currentStepIndex && !allDone

          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}

              <Link
                to={step.url || '#'}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 border shrink-0",
                  isDone
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : isCurrent
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-sm shadow-indigo-200 animate-pulse"
                    : "bg-slate-50 text-slate-400 border-slate-200/60"
                )}
              >
                {isDone ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">
                    ✓
                  </span>
                ) : (
                  <span className="font-black opacity-80">{idx + 1}.</span>
                )}
                <span>{step.label}</span>

                {/* Progress details if present */}
                {!isDone && (
                  <span className="opacity-90 text-[9px] font-black">
                    {(step.type === 'mcq' || step.type === 'typing') && `(Mục tiêu ≥${step.pass_threshold || 80}%)`}
                    {step.type === 'new_cards' && `(${step.progress?.learned || 0}/${step.daily_count || 10})`}
                    {step.type === 'fsrs_review' && `(${step.progress?.reviewed_today || 0}/${step.progress?.due_count || 0})`}
                  </span>
                )}
              </Link>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
