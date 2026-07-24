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

  // Detect when a step was just completed
  useEffect(() => {
    if (!status || !status.roadmap_active) return

    const prev = prevStatusRef.current
    if (prev && prev.roadmap_active) {
      // Check if current_step_index advanced or if all_done turned true from false
      if (
        (status.current_step_index > prev.current_step_index) ||
        (!prev.all_done && status.all_done)
      ) {
        const completedIdx = prev.current_step_index
        const completedStep = prev.pipeline?.[completedIdx] || status.pipeline?.[completedIdx]
        if (completedStep) {
          setJustCompletedStep(completedStep)
          setShowBanner(true)
        }
      }
    }
    prevStatusRef.current = status
  }, [status])

  const dismissBanner = useCallback(() => {
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
