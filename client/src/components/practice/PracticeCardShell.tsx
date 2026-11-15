import React from 'react'
import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import { getFrontFontSizeStyle } from '@/components/common/study'
import { CardImageGallery } from '@/components/common/CardImageGallery'
import type { Question } from '@/types/flashcard'

export interface PracticeCardShellProps {
  badgeLabel?: string
  badgeIcon?: React.ReactNode
  badgeColorClass?: string
  currentIndex: number
  totalCards?: number
  currentQuestion: Question | null
  promptLabel?: string
  questionText?: string
  questionImages?: string[]
  questionSubtext?: string
  questionSubtextLabel?: string
  frontFontSize?: string
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onPlayAudio?: () => void | Promise<any>
  onZoomImage?: (url: string) => void
  hideHeaderActions?: boolean
  customCenterStage?: React.ReactNode
  answerImages?: string[]
  answered?: boolean
  children: React.ReactNode
  className?: string
  glowColor?: 'indigo' | 'cyan' | 'purple'
}

export const PracticeCardShell: React.FC<PracticeCardShellProps> = ({
  badgeLabel,
  badgeIcon,
  badgeColorClass = 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300',
  currentIndex,
  totalCards,
  currentQuestion,
  promptLabel,
  questionText,
  questionImages = [],
  questionSubtext,
  questionSubtextLabel = 'INFO:',
  frontFontSize = 'M',
  starredCards,
  onToggleStar,
  onPlayAudio,
  onZoomImage,
  hideHeaderActions = false,
  customCenterStage,
  answerImages = [],
  answered = false,
  children,
  className,
  glowColor = 'indigo'
}) => {
  const cardIndexDisplay = currentQuestion?.original_index ?? (currentIndex + 1)
  const isStarred = Boolean(currentQuestion?.id && starredCards[currentQuestion.id])

  // Card Performance & FSRS Stats
  const fsrs = currentQuestion?.fsrs
  const fsrsState = fsrs?.state
  const stability = fsrs?.stability
  const difficulty = fsrs?.difficulty
  const stats = currentQuestion?.stats
  const pSummary = currentQuestion?.practice_summary
  const totalEncounters = stats?.encounter_count ?? stats?.total ?? 0
  const correctRevs = stats?.correct ?? 0
  const accuracy = totalEncounters > 0 ? Math.round((correctRevs / totalEncounters) * 100) : null
  const streak = (currentQuestion as any)?.consecutive_correct ?? (stats as any)?.consecutive_correct ?? 0

  // Per-mode Drill Counts
  const mcqCount = stats?.mcq_count ?? pSummary?.mcq_count ?? 0
  const typingCount = stats?.typing_count ?? pSummary?.typing_count ?? 0
  const listeningCount = stats?.listening_count ?? pSummary?.listening_count ?? 0

  const glowFrom = glowColor === 'cyan'
    ? 'from-cyan-200/20 via-sky-100/10 to-transparent dark:from-cyan-500/5'
    : 'from-indigo-200/20 via-purple-100/10 to-transparent dark:from-indigo-500/5'

  return (
    <div className={cn(
      "w-full h-full flex flex-col justify-between bg-white dark:bg-slate-900 md:rounded-[2rem] rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl shadow-indigo-100/30 dark:shadow-none min-h-0 overflow-x-hidden overflow-y-auto custom-scrollbar relative",
      className
    )}>
      {/* ── Ambient Soft Glow ── */}
      <div className={cn("absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl blur-3xl pointer-events-none", glowFrom)} />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-amber-100/20 via-slate-100/10 to-transparent dark:from-amber-500/5 blur-3xl pointer-events-none" />

      {/* ── Top Header Bar ── */}
      <div className="w-full flex items-center justify-between gap-2 relative z-10 select-none pb-2.5 border-b border-slate-100/80 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-black text-[10px] border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            #{cardIndexDisplay}{totalCards ? ` / ${totalCards}` : ''}
          </span>

          {/* FSRS State Badge */}
          {(!fsrs || fsrsState === undefined || fsrsState === 0) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/60 font-black text-[10px] tracking-wider uppercase shadow-2xs shrink-0">
              ⭐ NEW
            </span>
          )}
          {fsrsState === 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 font-black text-[10px] tracking-wider uppercase shadow-2xs shrink-0">
              ⚡ LEARNING
            </span>
          )}
          {fsrsState === 2 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 font-black text-[10px] tracking-wider uppercase shadow-2xs shrink-0">
              🌱 REVIEW{typeof stability === 'number' && stability > 0 ? ` · ${stability >= 10 ? Math.round(stability) : stability.toFixed(1)}d` : ''}
            </span>
          )}
          {fsrsState === 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 font-black text-[10px] tracking-wider uppercase shadow-2xs shrink-0">
              🔄 RELEARN
            </span>
          )}

          {/* Unified Compact Encounter & Drill Stats Capsule */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs shrink-0 whitespace-nowrap">
            <span title={`Đã gặp ${totalEncounters} lần (${correctRevs} đúng${accuracy !== null ? `, ${accuracy}%` : ''})`}>
              Gặp: <span className="font-black text-slate-800 dark:text-slate-100">{totalEncounters}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span title={`Đã test trắc nghiệm: ${mcqCount} lần`}>
              MCQ: <span className="font-black text-slate-800 dark:text-slate-100">{mcqCount}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span title={`Đã test gõ chữ: ${typingCount} lần`}>
              Type: <span className="font-black text-slate-800 dark:text-slate-100">{typingCount}</span>
            </span>
            {listeningCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span title={`Đã test nghe: ${listeningCount} lần`}>
                  Listen: <span className="font-black text-slate-800 dark:text-slate-100">{listeningCount}</span>
                </span>
              </>
            )}
          </div>

          {/* Consecutive Streak */}
          {streak > 1 && (
            <span 
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200/60 font-black text-[10px] shadow-2xs shrink-0"
              title={`${streak} lần trả lời đúng liên tiếp`}
            >
              🔥 {streak}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (currentQuestion?.id) onToggleStar(currentQuestion.id)
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-95 cursor-pointer"
            title={isStarred ? "Unstar question" : "Star question"}
          >
            <Bookmark className={cn("w-4 h-4 transition-colors", isStarred ? "fill-amber-500 text-amber-500" : "text-slate-400")} />
          </button>
        </div>
      </div>

      {/* ── Central Stage (Default Question Heading OR Custom Center Stage) ── */}
      {customCenterStage ? (
        customCenterStage
      ) : (
        <div className="my-auto py-5 sm:py-7 flex flex-col items-center justify-center text-center relative z-10 max-w-2xl mx-auto w-full">
          {questionImages.length > 0 && (
            <CardImageGallery
              images={questionImages}
              onZoom={onZoomImage}
              maxHeight="max-h-32 sm:max-h-40"
              className="mb-4"
            />
          )}

          {promptLabel && (
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-indigo-600/90 dark:text-indigo-400 mb-2">
              {promptLabel}
            </p>
          )}

          {/* Prominent Question Heading */}
          {questionText !== undefined && (
            <h2 
              className="font-black text-slate-900 dark:text-slate-50 leading-tight tracking-tight font-sans px-2 selection:bg-indigo-200"
              style={{ fontSize: getFrontFontSizeStyle(frontFontSize) }}
            >
              <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(questionText || '') }} />
            </h2>
          )}

          {/* Supplementary Question Info / Subtext / Hint (e.g. Từ loại, Dạng từ, N-suru, v.v.) */}
          {questionSubtext && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs font-bold shadow-2xs max-w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600/80 dark:text-indigo-400">
                {questionSubtextLabel}
              </span>
              <span className="truncate">{questionSubtext}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Interactive Stage (Slot for MCQ / Typing / Listening) ── */}
      <div className="relative z-10 w-full mt-auto">
        {children}
      </div>

      {/* ── Optional Answer Gallery (when answered) ── */}
      {answered && answerImages.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 relative z-10">
          <CardImageGallery
            images={answerImages}
            onZoom={onZoomImage}
            maxHeight="max-h-24 sm:max-h-28"
          />
        </div>
      )}
    </div>
  )
}

