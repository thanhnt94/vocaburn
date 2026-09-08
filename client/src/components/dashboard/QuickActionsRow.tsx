import React from 'react'
import { Layers, BarChart3, Swords, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsRowProps {
  navigate: (path: string) => void
  onOpenBattleModal?: () => void
  onOpenPracticeModal?: () => void
}

export function QuickActionsRow({
  navigate,
  onOpenBattleModal,
  onOpenPracticeModal
}: QuickActionsRowProps) {
  const actions = [
    {
      id: 'decks',
      label: 'All Decks',
      icon: Layers,
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100',
      iconBg: 'bg-indigo-500 text-white',
      onClick: () => navigate('/decks')
    },
    {
      id: 'stats',
      label: 'Analytics',
      icon: BarChart3,
      bg: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100',
      iconBg: 'bg-amber-500 text-white',
      onClick: () => navigate('/stats')
    },
    {
      id: 'battle',
      label: 'Battle 1v1',
      icon: Swords,
      bg: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100',
      iconBg: 'bg-rose-500 text-white',
      onClick: () => {
        if (onOpenBattleModal) onOpenBattleModal()
        else navigate('/decks')
      }
    },
    {
      id: 'practice',
      label: 'Practice',
      icon: Dumbbell,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100',
      iconBg: 'bg-emerald-500 text-white',
      onClick: () => {
        if (onOpenPracticeModal) onOpenPracticeModal()
        else navigate('/decks')
      }
    }
  ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 select-none">
      {actions.map((act) => {
        const Icon = act.icon
        return (
          <button
            key={act.id}
            type="button"
            onClick={act.onClick}
            className={cn(
              "flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs group",
              act.bg
            )}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-110", act.iconBg)}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="mt-1.5 text-[11px] font-black tracking-tight truncate max-w-full">
              {act.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
