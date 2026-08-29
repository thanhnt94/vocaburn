import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { DeckFsrsStatsCard } from '../overview/DeckFsrsStatsCard'
import { DeckQuickStudyLauncher } from '../overview/DeckQuickStudyLauncher'
import { DeckRecentHistory } from '../overview/DeckRecentHistory'
import { BookOpen, Compass, Layers, Sparkles, Tag } from 'lucide-react'

export interface DeckOverviewTabProps {
  embedded?: boolean
  deckId?: string | number
  onNavigateTab?: (tab: string) => void
}

export function DeckOverviewTab({
  embedded = false,
  deckId,
  onNavigateTab
}: DeckOverviewTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const navigate = useNavigate()

  // 1. Fetch Deck metadata
  const { data: deckData, isLoading: isDeckLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/data`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  // 2. Fetch FSRS Mastery stats
  const { data: masteryData, isLoading: isMasteryLoading } = useQuery({
    queryKey: ['quiz-mastery', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/mastery`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  // 3. Fetch Roadmap status
  const { data: roadmapStatus } = useQuery({
    queryKey: ['deck-roadmap-status', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-status`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  const totalCards = deckData?.questions_count ?? 0
  const dueCount = masteryData?.due_count ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-5 text-left animate-in fade-in duration-200">
      {/* Description & Tag Banner (if available) */}
      {(deckData?.description || (deckData?.tags && deckData.tags.length > 0)) && (
        <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {deckData?.description && (
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-2xl">
              {deckData.description}
            </p>
          )}

          {deckData?.tags && deckData.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {deckData.tags.map((t: string) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-indigo-700 text-[10px] font-black"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. FSRS Mastery Analytics Card */}
      <DeckFsrsStatsCard
        stats={masteryData}
        isLoading={isMasteryLoading || isDeckLoading}
        totalCards={totalCards}
      />

      {/* 2. Quick Study Launcher */}
      <DeckQuickStudyLauncher
        deckId={id!}
        totalCards={totalCards}
        dueCount={dueCount}
        practiceSettings={deckData?.practice_settings}
      />

      {/* 3. Recent Practice History */}
      <DeckRecentHistory
        attempts={deckData?.recent_attempts || []}
        isLoading={isDeckLoading}
        deckId={id!}
      />
    </div>
  )
}

export default DeckOverviewTab
