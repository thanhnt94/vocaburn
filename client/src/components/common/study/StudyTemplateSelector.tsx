import React from 'react'
import { Check, Sparkles, Zap, Headphones, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudyTemplateItem } from './StudyConstants'
import { getSettingsSpecPills } from './StudyConstants'

interface StudyTemplateSelectorProps {
  templates: StudyTemplateItem[]
  selectedId: string
  onSelect: (template: StudyTemplateItem) => void
  compact?: boolean
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  zap: Zap,
  headphones: Headphones,
  book: BookOpen,
}

export function StudyTemplateSelector({
  templates,
  selectedId,
  onSelect,
  compact = false,
}: StudyTemplateSelectorProps) {
  if (templates.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
        <p className="text-xs text-slate-400 font-medium">No templates available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {templates.map((tpl) => {
        const isSelected = selectedId === tpl.id
        const s = tpl.settings || {}
        const specs = getSettingsSpecPills(s)
        const IconComp = ICON_MAP[tpl.icon] || Sparkles

        return (
          <div
            key={tpl.id}
            onClick={() => onSelect(tpl)}
            className={cn(
              "rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none",
              compact ? "p-3" : "p-3.5",
              isSelected
                ? "bg-indigo-50/30 border-indigo-500 shadow-xs ring-1 ring-indigo-400/30"
                : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            {/* Radio Dot */}
            <div className="pt-0.5 shrink-0">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white"
              )}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                  isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                )}>
                  <IconComp className="w-3.5 h-3.5" />
                </div>
                <span className={cn("text-xs font-black truncate", isSelected ? "text-indigo-900" : "text-slate-800")}>
                  {tpl.name}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                  tpl.isCustom
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : tpl.isDeckDefault
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isSelected
                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                )}>
                  {tpl.badge}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
              </div>

              {!compact && (
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-2">
                  {tpl.desc}
                </p>
              )}

              {/* Spec Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {specs.map((spec) => (
                  <span
                    key={spec.label}
                    className="px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-200/60 text-[9.5px] font-bold text-slate-600"
                  >
                    {spec.label}: {spec.val}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
