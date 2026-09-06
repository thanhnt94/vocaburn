import React from 'react'
import { cn } from '@/lib/utils'

interface ToggleRowProps {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  desc: string
  checked: boolean
  onChange: (checked: boolean) => void
  compact?: boolean
}

export function ToggleRow({ icon: Icon, label, desc, checked, onChange, compact = false }: ToggleRowProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-200 transition-all cursor-pointer group shadow-2xs",
        compact ? "p-2.5" : "p-3 sm:p-3.5"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {Icon && (
          <div className={cn(
            "rounded-xl bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0",
            compact ? "w-7 h-7" : "w-8 h-8"
          )}>
            <Icon className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-xs font-black text-slate-800 uppercase tracking-tight block truncate">{label}</span>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{desc}</p>
        </div>
      </div>
      <div className={cn("w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0", checked ? "bg-indigo-600" : "bg-slate-200")}>
        <div className={cn("w-4 h-4 rounded-full bg-white transition-transform shadow-xs", checked ? "translate-x-4" : "translate-x-0")} />
      </div>
    </div>
  )
}
