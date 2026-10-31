import type { Question, CardLifecycleState } from '@/types/flashcard'
export type { CardLifecycleState }

export interface CardLifecycleMeta {
  id: CardLifecycleState
  label: string
  shortLabel: string
  description: string
  badgeClass: string
  pillClass: string
  borderClass: string
  textClass: string
  dotClass: string
}

export const CARD_LIFECYCLE_META: Record<CardLifecycleState, CardLifecycleMeta> = {
  due: {
    id: 'due',
    label: 'Due Recall',
    shortLabel: 'Due Recall',
    description: 'Currently due for FSRS spaced repetition review',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    pillClass: 'bg-rose-500 text-white',
    borderClass: 'border-rose-300 dark:border-rose-700',
    textClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500'
  },
  learn: {
    id: 'learn',
    label: 'Retained',
    shortLabel: 'Retained',
    description: 'Active FSRS memory retention (in interval, not due yet)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    pillClass: 'bg-emerald-500 text-white',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500'
  },
  drill: {
    id: 'drill',
    label: 'Reinforced',
    shortLabel: 'Reinforced',
    description: 'Studied via Hybrid Recall active drills',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 shadow-2xs dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    pillClass: 'bg-purple-500 text-white',
    borderClass: 'border-purple-300 dark:border-purple-700',
    textClass: 'text-purple-600 dark:text-purple-400',
    dotClass: 'bg-purple-500'
  },
  practice: {
    id: 'practice',
    label: 'Practiced',
    shortLabel: 'Practiced',
    description: 'Attempted in practice exercises (MCQ / Typing)',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-300 shadow-2xs dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    pillClass: 'bg-sky-500 text-white',
    borderClass: 'border-sky-300 dark:border-sky-700',
    textClass: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500'
  },
  skim: {
    id: 'skim',
    label: 'Previewed',
    shortLabel: 'Previewed',
    description: 'Browsed in Speed Skim or Skim Preview',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    pillClass: 'bg-amber-500 text-white',
    borderClass: 'border-amber-300 dark:border-amber-700',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500'
  },
  new: {
    id: 'new',
    label: 'Fresh',
    shortLabel: 'Fresh',
    description: 'Brand new card, never viewed or tested',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 shadow-2xs dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    pillClass: 'bg-slate-500 text-white',
    borderClass: 'border-slate-300 dark:border-slate-700',
    textClass: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-400'
  }
}

/**
 * Evaluates the strict waterfall lifecycle state for a given card.
 * Priority: Due Recall > Retained > Reinforced > Practiced > Previewed > Fresh
 */
export function getCardLifecycleState(
  card: Question | any,
  targetDrillCount = 1,
  masteredCardIds?: Set<number>
): CardLifecycleState {
  if (!card) return 'new'

  // Branch 1: FSRS Spaced Repetition (Due Recall vs Retained)
  if (card.fsrs?.last_review || (card.fsrs?.state !== undefined && card.fsrs?.state > 0)) {
    if (card.fsrs?.due) {
      const dueTime = new Date(card.fsrs.due).getTime()
      if (!isNaN(dueTime) && dueTime <= Date.now()) {
        return 'due'
      }
    }
    return 'learn'
  }

  // Branch 2: Pre-Review Waterfall Priority
  // Priority 1: Reinforced (Hybrid Recall pass target or hybrid_drill)
  const isMasteredInSet = masteredCardIds ? masteredCardIds.has(card.id) : false
  const drillCorrect = card.practice_summary?.drill_correct ?? 0
  const hasHybrid = Boolean(card.practice_summary?.has_hybrid_drill || drillCorrect >= targetDrillCount || isMasteredInSet)
  if (hasHybrid) {
    return 'drill'
  }

  // Priority 2: Practiced (MCQ/Typing/Listening)
  const totalPracticeAttempts = card.practice_summary?.total_attempts ?? 0
  const hasPractice = Boolean(card.practice_summary?.has_practice || totalPracticeAttempts > 0)
  if (hasPractice) {
    return 'practice'
  }

  // Priority 3: Previewed (Speed Skim)
  const isPreviewed = Boolean(
    card.stats?.last_answered ||
    (card.stats?.total ?? 0) > 0 ||
    card.fsrs?.first_learned
  )
  if (isPreviewed) {
    return 'skim'
  }

  // Priority 4: Fresh
  return 'new'
}

export type HybridScope = 'all' | 'new' | 'undrilled' | 'review' | 'due'
export type HybridOrder = 'sequential' | 'random'

export interface ScopeOption {
  id: HybridScope
  label: string
  description: string
}

export const HYBRID_SCOPE_OPTIONS: ScopeOption[] = [
  {
    id: 'new',
    label: 'New Cards Only (Pre-FSRS)',
    description: 'Focus on cards not yet in FSRS (New, Skim, Practice, Drill)'
  },
  {
    id: 'undrilled',
    label: 'Undrilled Cards Only',
    description: 'Cards that have not completed drill target yet'
  },
  {
    id: 'all',
    label: 'All Cards in Deck',
    description: 'Drill through the entire deck regardless of current state'
  },
  {
    id: 'review',
    label: 'Review All (Learned Cards)',
    description: 'Comprehensive review of all FSRS cards (Learned + Due)'
  },
  {
    id: 'due',
    label: 'Due for Review Only',
    description: 'Strictly cards that are currently due for FSRS review'
  }
]

/**
 * Filters a list of cards according to the selected scope.
 */
export function filterCardsByScope(
  cards: Question[],
  scope: HybridScope,
  targetDrillCount = 2,
  masteredCardIds?: Set<number>
): Question[] {
  if (!cards || cards.length === 0) return []

  return cards.filter(card => {
    const status = getCardLifecycleState(card, targetDrillCount, masteredCardIds)
    switch (scope) {
      case 'all':
        return true
      case 'new':
        // Pre-FSRS unmastered cards (new, skim, practice)
        return status === 'new' || status === 'skim' || status === 'practice'
      case 'undrilled':
        // Unmastered in Hybrid: new, skim, practice
        return status === 'new' || status === 'skim' || status === 'practice'
      case 'review':
        // All learned cards in FSRS (learn + due)
        return status === 'learn' || status === 'due'
      case 'due':
        // Only due cards
        return status === 'due'
      default:
        return true
    }
  })
}

/**
 * Finds the first card index in `cards` that is unmastered / undrilled.
 * Avoids always starting at index 0 when sequential mode is active.
 */
export function findSmartSequentialIndex(
  cards: Question[],
  targetDrillCount = 2,
  masteredCardIds?: Set<number>
): number {
  if (!cards || cards.length === 0) return 0

  const idx = cards.findIndex(card => {
    const status = getCardLifecycleState(card, targetDrillCount, masteredCardIds)
    return status === 'new' || status === 'skim' || status === 'practice'
  })

  return idx >= 0 ? idx : 0
}
