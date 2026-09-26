import React, { useState, useEffect } from 'react'
import {
  Layers,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  FolderTree,
  ChevronDown,
  Info,
  CheckCircle2,
  BookOpen
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckSubLessonSettingsProps {
  deckId: string | number
  onSaved?: () => void
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

export function DeckSubLessonSettings({ deckId, onSaved }: DeckSubLessonSettingsProps) {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState<boolean>(false)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch sub-lessons info & candidate columns
  const { data: subLessonsData, isLoading, refetch } = useQuery<SubLessonsResponse>({
    queryKey: ['deck-sub-lessons-settings', String(deckId), selectedColumn],
    queryFn: async () => {
      const url = selectedColumn 
        ? `/api/v1/deck/${deckId}/sub-lessons?column=${encodeURIComponent(selectedColumn)}`
        : `/api/v1/deck/${deckId}/sub-lessons`
      const res = await axios.get(url)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000
  })

  // Synchronize initial configuration from backend
  useEffect(() => {
    if (subLessonsData) {
      setEnabled(subLessonsData.enabled ?? false)
      if (subLessonsData.configured_column) {
        setSelectedColumn(subLessonsData.configured_column)
      } else if (!selectedColumn && subLessonsData.available_columns?.[0]?.column) {
        setSelectedColumn(subLessonsData.available_columns[0].column)
      }
    }
  }, [subLessonsData])

  const handleSave = async () => {
    if (!deckId) return
    setIsSaving(true)
    setMessage(null)

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        sub_lesson_grouping: {
          enabled,
          column: selectedColumn || null
        },
        settings: {
          sub_lesson_grouping: {
            enabled,
            column: selectedColumn || null
          }
        }
      })

      setMessage({ type: 'success', text: 'Sub-lesson configuration saved successfully.' })
      queryClient.invalidateQueries({ queryKey: ['deck-sub-lessons', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-sub-lessons-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      if (onSaved) onSaved()
      refetch()
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to save settings'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setIsSaving(false)
    }
  }

  const availableCols = subLessonsData?.available_columns || []
  const previewGroups = subLessonsData?.groups || []
  const totalCards = subLessonsData?.total_cards || 0

  if (isLoading && !subLessonsData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-32 w-full bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-8 space-y-6 shadow-xs text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Sub-Lessons & Grouping
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Dynamic
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Divide large decks into bite-sized lessons using any custom column (Topic, Category, Part of Speech, Unit, etc.).
            </p>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer",
            isSaving
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 shadow-indigo-200/50"
          )}
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div
          className={cn(
            "p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-150",
            message.type === 'success'
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* MAIN SETTINGS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: CONTROLS */}
        <div className="space-y-5">
          {/* TOGGLE SWITCH */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label htmlFor="toggle-sublessons" className="text-xs sm:text-sm font-black text-slate-800 cursor-pointer">
                Enable Sub-Lessons on Dashboard
              </label>
              <p className="text-[11px] text-slate-500 font-medium">
                When turned on, the deck overview displays sub-lessons with separate study and practice actions.
              </p>
            </div>
            <button
              id="toggle-sublessons"
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                enabled ? "bg-indigo-600" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* COLUMN PICKER */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Grouping Criteria Column
            </label>
            <p className="text-[11px] text-slate-500 font-medium">
              Choose which Excel column to use for partitioning cards into sub-lessons.
            </p>

            {availableCols.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-amber-800 text-xs font-medium flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  No categorical columns with multiple distinct values detected in this deck yet. You can add columns in the <strong>Columns</strong> tab or import an Excel spreadsheet with columns like <code>Category</code>, <code>Topic</code>, or <code>Unit</code>.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
                  >
                    {availableCols.map((c) => (
                      <option key={c.column} value={c.column}>
                        {c.label} ({c.distinct_count} groups detected)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* COLUMN PILLS QUICK SELECT */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400">Available:</span>
                  {availableCols.map((c) => {
                    const isSelected = selectedColumn === c.column
                    return (
                      <button
                        key={c.column}
                        type="button"
                        onClick={() => setSelectedColumn(c.column)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer",
                          isSelected
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        )}
                      >
                        {c.label}
                        <span className={cn("ml-1.5 text-[9px] font-bold opacity-80")}>
                          {c.distinct_count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* INFORMATION CARD */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 text-indigo-900 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <h4 className="text-xs font-black">How Sub-Lessons Work</h4>
            </div>
            <ul className="text-[11px] text-slate-600 font-medium space-y-1 list-disc list-inside">
              <li>Cards are automatically assigned based on their value in the chosen column.</li>
              <li>Spaced repetition (FSRS), XP, and mastery progress update the shared cards in real time.</li>
              <li>Learners can study individual lessons or study all cards together at any time.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Live Group Preview
            </h3>
            <span className="text-[11px] font-black text-slate-500">
              {previewGroups.length} Sub-Lessons ({totalCards} total cards)
            </span>
          </div>

          <div className="border border-slate-200/80 rounded-2xl bg-slate-50/50 p-3 max-h-[380px] overflow-y-auto space-y-2">
            {previewGroups.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                No groups found for this column.
              </div>
            ) : (
              previewGroups.map((g) => (
                <div
                  key={g.value}
                  className="bg-white p-3 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-200 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {g.label}
                      </span>
                      {g.due_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          {g.due_count} due
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-bold">
                      <span>{g.total_cards} cards</span>
                      <span>•</span>
                      <span className="text-emerald-600">{g.mastered_count} mastered</span>
                      <span>•</span>
                      <span className="text-amber-600">{g.learning_count} learning</span>
                    </div>

                    {/* MINI MASTERY PROGRESS BAR */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${g.mastered_pct}%` }}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{
                          width: `${g.total_cards > 0 ? (g.learning_count / g.total_cards) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-700 shrink-0">
                    {g.mastered_pct}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeckSubLessonSettings
