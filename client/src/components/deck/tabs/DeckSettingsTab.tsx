import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useAppStore } from '@/store/useAppStore'
import { DeckGeneralForm } from '../settings/DeckGeneralForm'
import { DeckPracticeConfig } from '../settings/DeckPracticeConfig'
import { DeckAutomationTools } from '../settings/DeckAutomationTools'
import { DeckExcelManager } from '../settings/DeckExcelManager'
import { DeckDangerZone } from '../settings/DeckDangerZone'
import { DeckCollaboratorsModal } from '../settings/DeckCollaboratorsModal'
import { Users } from 'lucide-react'

export interface DeckSettingsTabProps {
  embedded?: boolean
  deckId?: string | number
}

export function DeckSettingsTab({ embedded = false, deckId }: DeckSettingsTabProps) {
  const { id: paramId } = useParams()
  const id = deckId ? String(deckId) : paramId
  const { user } = useAppStore()
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false)

  // Fetch Deck metadata
  const { data: deckData, isLoading, refetch } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      if (!id) return null
      const res = await axios.get(`/api/v1/deck/${id}/data`)
      return res.data
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  const isOwner = Boolean(
    deckData?.is_creator ||
    (user && deckData?.owner_id === user.id) ||
    user?.role === 'admin'
  )

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-44 bg-white rounded-3xl border border-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-5 text-left animate-in fade-in duration-200">
      {/* Top action bar: Collaborators trigger */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Cài Đặt & Quản Trị Bộ Thẻ
        </span>

        <button
          onClick={() => setIsCollabModalOpen(true)}
          className="h-9 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>Cộng tác viên</span>
        </button>
      </div>

      {/* 1. General Deck Information */}
      <DeckGeneralForm
        deckId={id!}
        initialData={deckData}
        onSaved={() => refetch()}
      />

      {/* 2. Practice Modes Configuration */}
      <DeckPracticeConfig
        deckId={id!}
        initialSettings={deckData?.practice_settings}
        onSaved={() => refetch()}
      />

      {/* 3. Automation Tools (AI / TTS / Furigana) */}
      <DeckAutomationTools deckId={id!} />

      {/* 4. Excel Import / Export Manager */}
      <DeckExcelManager deckId={id!} />

      {/* 5. Danger Zone */}
      <DeckDangerZone deckId={id!} isOwner={isOwner} />

      {/* Collaborators Modal */}
      <DeckCollaboratorsModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        deckId={id!}
        isOwner={isOwner}
      />
    </div>
  )
}

export default DeckSettingsTab
