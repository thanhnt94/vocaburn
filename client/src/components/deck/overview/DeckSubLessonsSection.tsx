import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  FolderTree,
  Play,
  Brain,
  Sliders,
  Sparkles,
  ChevronRight,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  Settings,
  ChevronDown,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DeckSubLessonsSectionProps {
  deckId: string | number
  isOwner?: boolean
  onNavigateTab?: (tab: string, params?: Record<string, string>) => void
}

interface AvailableColumn {
  column: string
  label: string
  distinct_count: number
  sample_values: string[]
}

interface SubLessonGroup {
  value: string
  label: string
  total_cards: number
  mastered_count: number
  learning_count: number
  new_count: number
  due_count: number
  mastered_pct: number
}

interface SubLessonsResponse {
  enabled: boolean
  is_configured: boolean
  configured_column: string | null
  active_column: string | null
  active_column_label: string | null
  total_cards: number
  total_groups: number
  groups: SubLessonGroup[]
  available_columns: AvailableColumn[]
}

export function DeckSubLessonsSection({
  deckId,
  isOwner,
  onNavigateTab
}: DeckSubLessonsSectionProps) {
  const navigate = useNavigate()
  const [selectedColumnOverride, setSelectedColumnOverride] = useState<string | null>(null)

  const { data: subData, isLoading } = useQuery<SubLessonsResponse>({
    queryKey: ['deck-sub-lessons', String(deckId), selectedColumnOverride],
    queryFn: async () => {
      const url = selectedColumnOverride
        ? `/api/v1/deck/${deckId}/sub-lessons?column=${encodeURIComponent(selectedColumnOverride)}`
        : `/api/v1/deck/${deckId}/sub-lessons`
      const res = await axios.get(url)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000
  })

  // Do not render section if loading or no candidate columns exist at all
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 space-y-4 shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-slate-100 rounded-lg" />
          <div className="h-8 w-28 bg-slate-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-50 rounded-2xl border border-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  // If no columns or no groups, return null
  if (!subData || (!subData.enabled && subData.available_columns.length === 0)) {
    return null
  }

  const {
    enabled,
    active_column,
    active_column_label,
    total_cards,
    total_groups,
    groups,
    available_columns
  } = subData

  // If creator hasn't enabled and learner hasn't selected override, and no groups, hide or show prompt if owner
  if (!enabled && !selectedColumnOverride) {
    if (available_columns.length > 0 && isOwner) {
      return (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 rounded-3xl border border-indigo-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Organize this deck into Bite-Sized Sub-Lessons
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                We detected {available_columns.length} grouping column{available_columns.length > 1 ? 's' : ''} (e.g. {available_columns[0]?.label}). Enable sub-lessons so learners can study by group!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('settings', { subtab: 'sublessons' }) : navigate(`?tab=settings&subtab=sublessons`)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs shrink-0 cursor-pointer transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Configure Sub-Lessons</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
    return null
  }

  const handleStudySubLesson = (col: string, val: string) => {
    navigate(`/quiz/${deckId}/flashcard?sub_col=${encodeURIComponent(col)}&sub_val=${encodeURIComponent(val)}`)
  }

  const handlePracticeSubLesson = (col: string, val: string) => {
    navigate(`/quiz/${deckId}/practice?sub_col=${encodeURIComponent(col)}&sub_val=${encodeURIComponent(val)}`)
  }

  const handleViewCards = (col: string, val: string) => {
    if (onNavigateTab) {
      onNavigateTab('cards', { sub_col: col, sub_val: val })
    } else {
      navigate(`?tab=cards&sub_col=${encodeURIComponent(col)}&sub_val=${encodeURIComponent(val)}`)
    }
  }

  const handleStudyFullDeck = () => {
    navigate(`/quiz/${deckId}/flashcard`)
  }

  const handlePracticeFullDeck = () => {
    navigate(`/quiz/${deckId}/practice`)
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 space-y-4 shadow-sm text-left">
      {/* SECTION TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Sub-Lessons & Modules
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {total_groups} Lessons
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Study by specific topic or practice all cards together.
            </p>
          </div>
        </div>

        {/* CONTROLS: GROUP BY SELECTOR + SETTINGS LINK */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {available_columns.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 shrink-0">Group by:</span>
              <div className="relative">
                <select
                  value={active_column || ''}
                  onChange={(e) => setSelectedColumnOverride(e.target.value)}
                  className="appearance-none bg-transparent pr-5 text-[11px] font-black text-slate-800 focus:outline-none cursor-pointer"
                >
                  {available_columns.map((col) => (
                    <option key={col.column} value={col.column}>
                      {col.label} ({col.distinct_count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('settings', { subtab: 'sublessons' }) : navigate(`?tab=settings&subtab=sublessons`)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Configure Sub-Lessons"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* FULL DECK COMBINED STUDY BANNER */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Full Deck Master Mode
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black">
              All {total_cards} Cards
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">
            Learn and review the entire curriculum combined across all sub-lessons.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleStudyFullDeck}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Study All</span>
          </button>
          <button
            type="button"
            onClick={handlePracticeFullDeck}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-all cursor-pointer active:scale-95 border border-white/10"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Practice</span>
          </button>
        </div>
      </div>

      {/* SUB-LESSON MODULE CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map((group) => {
          const colKey = active_column || ''
          const dueCount = group.due_count || 0
          const hasCards = group.total_cards > 0

          return (
            <div
              key={group.value}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 hover:border-indigo-200 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group/card"
            >
              {/* CARD TOP INFO */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {active_column_label || 'Lesson'}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate" title={group.label}>
                      {group.label}
                    </h3>
                  </div>

                  {dueCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                      {dueCount} due
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 shrink-0">
                      {group.total_cards} cards
                    </span>
                  )}
                </div>

                {/* MASTERY STATS PILL & METRICS */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-0.5">
                  <span className="text-emerald-700">
                    {group.mastered_count} mastered
                  </span>
                  <span className="text-amber-700">
                    {group.learning_count} learning
                  </span>
                  <span className="text-slate-400">
                    {group.new_count} new
                  </span>
                </div>

                {/* TRI-COLOR MINI MASTERY BAR */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${group.mastered_pct}%` }}
                    title={`${group.mastered_pct}% Mastered`}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all"
                    style={{
                      width: `${hasCards ? (group.learning_count / group.total_cards) * 100 : 0}%`
                    }}
                    title={`${group.learning_count} Learning`}
                  />
                </div>
              </div>

              {/* ACTION BUTTONS (THUMB REACHABLE) */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleStudySubLesson(colKey, group.value)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-[11px] font-black transition-all cursor-pointer active:scale-95 group-hover/card:bg-indigo-600 group-hover/card:text-white"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Study</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePracticeSubLesson(colKey, group.value)}
                  className="inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-black transition-all cursor-pointer active:scale-95 border border-slate-200/70"
                  title="Practice MCQ / Typing"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleViewCards(colKey, group.value)}
                  className="inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-[11px] font-black transition-all cursor-pointer active:scale-95 border border-slate-200/70"
                  title="View Cards in this group"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DeckSubLessonsSection
