import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export interface PipelineStepStatus {
  type: 'new_cards' | 'fsrs_review' | 'mcq' | 'typing'
  done: boolean
  label: string
  url: string
  progress?: Record<string, any>
  daily_count?: number
  overdue_hours?: number
  question_count?: number
  pass_threshold?: number
}

export interface RoadmapStatusData {
  roadmap_active: boolean
  pipeline: PipelineStepStatus[]
  current_step_index: number
  all_done: boolean
  next_action_url: string
  next_action_label: string
  streak?: number
  retention_rate?: number
  unlearned_cards?: number
  estimated_completion_date?: string
}

export function useRoadmapStatus(deckId: string | number | undefined) {
  const queryClient = useQueryClient()
  const numericId = deckId ? Number(deckId) : undefined
  
  const [justCompletedStep, setJustCompletedStep] = useState<PipelineStepStatus | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const prevStatusRef = useRef<RoadmapStatusData | null>(null)

  const { data: status, isLoading, refetch } = useQuery<RoadmapStatusData>({
    queryKey: ['deck-roadmap-status', numericId],
    queryFn: async () => {
      if (!numericId) return null
      const res = await axios.get(`/api/v1/deck/${numericId}/roadmap-status`)
      return res.data
    },
    enabled: Boolean(numericId),
    staleTime: 5000,
  })

  const userDismissedRef = useRef(false)

  // Detect completed step and show floating banner
  useEffect(() => {
    if (!status || !status.roadmap_active || !status.pipeline || status.pipeline.length === 0) return

    // Find the latest completed step
    let completedStep: PipelineStepStatus | null = null
    if (status.current_step_index > 0) {
      completedStep = status.pipeline[status.current_step_index - 1] || null
    } else if (status.all_done) {
      completedStep = status.pipeline[status.pipeline.length - 1] || null
    } else if (status.pipeline[0]?.done) {
      completedStep = status.pipeline[0]
    }

    if (completedStep && !userDismissedRef.current) {
      setJustCompletedStep(completedStep)
      setShowBanner(true)
    }

    prevStatusRef.current = status
  }, [status])

  const dismissBanner = useCallback(() => {
    userDismissedRef.current = true
    setShowBanner(false)
  }, [])

  const refetchRoadmap = useCallback(async () => {
    if (!numericId) return
    await queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status', numericId] })
    await queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })
    return refetch()
  }, [numericId, queryClient, refetch])

  return {
    status,
    isLoading,
    refetchRoadmap,
    showBanner,
    setShowBanner,
    dismissBanner,
    justCompletedStep,
    currentStep: status?.pipeline?.[status.current_step_index] || null,
    isRoadmapActive: Boolean(status?.roadmap_active),
    isAllDone: Boolean(status?.all_done),
    nextActionUrl: status?.next_action_url || `/flashcard/${deckId}/roadmap`,
    nextActionLabel: status?.next_action_label || 'Tiếp Tục'
  }
}
