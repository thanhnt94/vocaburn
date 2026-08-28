import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { DeckRoadmapPipelineCard } from '../roadmap/DeckRoadmapPipelineCard'
import { DeckRoadmapGoalForm } from '../roadmap/DeckRoadmapGoalForm'
import { TelegramRoadmapReminderToggle } from '@/components/TelegramRoadmapReminderToggle'
import { Compass, Zap, Settings as SettingsIcon } from 'lucide-react'

export interface DeckRoadmapTabProps {
  embedded?: boolean
  deckId?: string | number
}

export function DeckRoadmapTab({ embedded = false, deckId }: DeckRoadmapTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const [activeSubTab, setActiveSubTab] = useState<'today' | 'config'>('today')

  // Fetch roadmap status
  const { data: status, isLoading: isStatusLoading, refetch } = useQuery({
    queryKey: ['deck-roadmap-status', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-status`)
      return res.data
    },
    enabled: !!id,
    staleTime: 15 * 1000,
  })

  // Fetch practice settings
  const { data: deckData } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/data`)
      return res.data
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-4 text-left animate-in fade-in duration-200">
      {/* Sub-tab Pills Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeSubTab === 'today'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tiến Độ Hôm Nay</span>
          </button>

          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeSubTab === 'config'
                ? 'bg-white text-amber-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Cài Đặt Mục Tiêu</span>
          </button>
        </div>

        {/* Telegram Reminder Toggle */}
        <div className="hidden sm:block">
          <TelegramRoadmapReminderToggle />
        </div>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'today' ? (
        <DeckRoadmapPipelineCard
          deckId={id!}
          status={status}
          isLoading={isStatusLoading}
        />
      ) : (
        <DeckRoadmapGoalForm
          deckId={id!}
          initialSettings={deckData?.practice_settings}
          onSaved={() => refetch()}
        />
      )}
    </div>
  )
}

export default DeckRoadmapTab
