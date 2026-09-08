import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Trophy, Swords, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsRowProps {
  onOpenRoomModal: () => void
  onOpenPractice: () => void
  className?: string
}

export function QuickActionsRow({
  onOpenRoomModal,
  onOpenPractice,
  className
}: QuickActionsRowProps) {
  const actions = [
    {
      id: 'decks',
      label: 'All Decks',
      desc: 'Browse Library',
      icon: BookOpen,
      to: '/decks',
      bg: 'bg-orange-50/70 hover:bg-orange-100/80',
      border: 'border-orange-200/80',
      textColor: 'text-orange-950',
      iconColor: 'text-orange-600',
      iconBg: 'bg-white text-orange-600 shadow-2xs'
    },
    {
      id: 'stats',
      label: 'Rankings',
      desc: 'Stats & Rank',
      icon: Trophy,
      to: '/stats',
      bg: 'bg-indigo-50/70 hover:bg-indigo-100/80',
      border: 'border-indigo-200/80',
      textColor: 'text-indigo-950',
      iconColor: 'text-indigo-600',
      iconBg: 'bg-white text-indigo-600 shadow-2xs'
    },
    {
      id: 'room',
      label: 'Arena',
      desc: 'Battle Room',
      icon: Swords,
      onClick: onOpenRoomModal,
      bg: 'bg-rose-50/70 hover:bg-rose-100/80',
      border: 'border-rose-200/80',
      textColor: 'text-rose-950',
      iconColor: 'text-rose-600',
      iconBg: 'bg-white text-rose-600 shadow-2xs'
    },
    {
      id: 'practice',
      label: 'Practice',
      desc: 'Quick Quiz',
      icon: Target,
      onClick: onOpenPractice,
      bg: 'bg-emerald-50/70 hover:bg-emerald-100/80',
      border: 'border-emerald-200/80',
      textColor: 'text-emerald-950',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-white text-emerald-600 shadow-2xs'
    }
  ]

  return (
    <div className={cn("w-full flex flex-col gap-2.5", className)}>
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Quick Actions</h4>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {actions.map((act) => {
          const Icon = act.icon
          const content = (
            <div
              className={cn(
                "p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs",
                act.bg,
                act.border
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", act.iconBg)}>
                <Icon className={cn("w-4 h-4 stroke-[2.2]", act.iconColor)} />
              </div>
              <div className="min-w-0 w-full">
                <span className={cn("text-[11px] sm:text-xs font-black block truncate leading-tight", act.textColor)}>
                  {act.label}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 hidden sm:block truncate leading-none mt-0.5">
                  {act.desc}
                </span>
              </div>
            </div>
          )

          if (act.to) {
            return (
              <Link key={act.id} to={act.to} className="block">
                {content}
              </Link>
            )
          }

          return (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              className="w-full text-left p-0 bg-transparent border-0"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
