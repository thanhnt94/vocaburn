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
    <div className={cn("flex items-center py-0.5", className)}>
      <Link
        to={`/flashcard/${deckId}/roadmap`}
        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition-all shrink-0 shadow-sm hover:brightness-110 active:scale-95"
        title="Xem cài đặt Lộ trình Roadmap"
      >
        <Map className="w-3.5 h-3.5 text-white" />
        <span>ROADMAP</span>
        <span className="bg-white/25 px-1.5 py-0.5 rounded-md text-[9px] font-black">
          {allDone ? '✓ XONG' : `BƯỚC ${currentStepIndex + 1}/${pipeline.length}`}
        </span>
      </Link>
    </div>
  )
}
