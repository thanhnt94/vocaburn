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
    label: 'Due for Review',
    shortLabel: 'Due',
    description: 'Scheduled for FSRS spaced repetition review today',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    pillClass: 'bg-rose-500 text-white',
    borderClass: 'border-rose-300 dark:border-rose-700',
    textClass: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500'
  },
  learn: {
    id: 'learn',
    label: 'Learned (Retained)',
    shortLabel: 'Learned',
    description: 'Active FSRS memory retention (not due yet)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    pillClass: 'bg-blue-500 text-white',
    borderClass: 'border-blue-300 dark:border-blue-700',
    textClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500'
  },
  drill: {
    id: 'drill',
    label: 'Drilled (Mastered)',
    shortLabel: 'Drilled',
    description: 'Deeply ingrained via Hybrid Recall active drills',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    pillClass: 'bg-emerald-500 text-white',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500'
  },
  practice: {
    id: 'practice',
    label: 'Practiced',
    shortLabel: 'Practice',
    description: 'Attempted in practice exercises but not fully drilled',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    pillClass: 'bg-amber-500 text-white',
    borderClass: 'border-amber-300 dark:border-amber-700',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500'
  },
  skim: {
    id: 'skim',
    label: 'Skimmed',
    shortLabel: 'Skim',
    description: 'Glanced over in Speed Skim or Skim Preview',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    pillClass: 'bg-purple-500 text-white',
    borderClass: 'border-purple-300 dark:border-purple-700',
    textClass: 'text-purple-600 dark:text-purple-400',
    dotClass: 'bg-purple-500'
  },
  new: {
    id: 'new',
    label: 'Fresh New',
    shortLabel: 'New',
    description: 'Brand new card, never viewed or tested',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    pillClass: 'bg-slate-500 text-white',
    borderClass: 'border-slate-300 dark:border-slate-700',
    textClass: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-400'
  }
}

/**
 * Evaluates the strict waterfall lifecycle state for a given card.
 * Priority: Due > Learn > Drill > Practice > Skim > New
 */
export function getCardLifecycleState(
  card: Question,
  targetDrillCount = 2,
  masteredCardIds?: Set<number>
): CardLifecycleState {
  if (!card) return 'new'

  // Level 6 & 5: FSRS Spaced Repetition evaluation
  if (card.fsrs?.last_review) {
    if (card.fsrs.due) {
      const dueTime = new Date(card.fsrs.due).getTime()
      if (!isNaN(dueTime) && dueTime <= Date.now()) {
        return 'due'
      }
    }
    return 'learn'
  }

  // Level 4: Drill mastery (Hybrid Recall pass target)
  const isMasteredInSet = masteredCardIds ? masteredCardIds.has(card.id) : false
  const drillCorrect = card.practice_summary?.drill_correct ?? 0
  if (isMasteredInSet || drillCorrect >= targetDrillCount) {
    return 'drill'
  }

  // Level 3: Practice attempts (standalone MCQ/Typing/Listening)
  const totalPracticeAttempts = card.practice_summary?.total_attempts ?? 0
  if (totalPracticeAttempts > 0) {
    return 'practice'
  }

  // Level 2: Skimmed (previewed or viewed)
  if (card.stats?.last_answered || (card.stats?.total ?? 0) > 0) {
    return 'skim'
  }

  // Level 1: Brand new
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
        // Pre-FSRS: not yet reviewed by FSRS (new, skim, practice, drill)
        return status === 'new' || status === 'skim' || status === 'practice' || status === 'drill'
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
