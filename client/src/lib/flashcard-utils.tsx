import React from 'react'
import {
  Play,
  Flame,
  Trophy,
  CheckCircle2,
  Clock,
  Target,
  Brain,
  Award
} from 'lucide-react'
import type { Question, CardBoxId } from '@/types/flashcard'
import { getCardLifecycleState } from '@/utils/cardLifecycle'

export const parseUTCDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date()
  try {
    let formatted = dateStr.trim().replace(' ', 'T')
    const tIndex = formatted.indexOf('T')
    if (tIndex !== -1) {
      const timePart = formatted.slice(tIndex)
      if (!timePart.includes('Z') && !timePart.includes('+') && !timePart.includes('-')) {
        const dotIndex = formatted.indexOf('.')
        if (dotIndex !== -1) {
          const parts = formatted.split('.')
          const base = parts[0]
          let ms = parts[1] || ''
          ms = ms.substring(0, 3)
          formatted = `${base}.${ms}Z`
        } else {
          formatted = `${formatted}Z`
        }
      }
    }
    const d = new Date(formatted)
    if (!isNaN(d.getTime())) return d
  } catch (e) {
    console.error("parseUTCDate error:", e)
  }
  return new Date()
}

export function formatRelativeTime(dateStr: string | null | undefined): { relative: string; full: string } {
  if (!dateStr) return { relative: 'never', full: 'Never learned this card' }
  const d = parseUTCDate(dateStr)
  if (isNaN(d.getTime())) return { relative: 'never', full: 'Never learned this card' }
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)
  
  let relative = ''
  if (diffSec < 60) {
    relative = 'just now'
  } else if (diffMin < 60) {
    relative = `${diffMin}m ago`
  } else if (diffHour < 24) {
    relative = `${diffHour}h ago`
  } else if (diffDay < 30) {
    relative = `${diffDay}d ago`
  } else if (diffMonth < 12) {
    relative = `${diffMonth}mo ago`
  } else {
    relative = `${diffYear}y ago`
  }
  
  const dayStr = String(d.getDate()).padStart(2, '0')
  const monthStr = String(d.getMonth() + 1).padStart(2, '0')
  const yearStr = d.getFullYear()
  const hourStr = String(d.getHours()).padStart(2, '0')
  const minStr = String(d.getMinutes()).padStart(2, '0')
  const secStr = String(d.getSeconds()).padStart(2, '0')
  
  const full = `${dayStr}/${monthStr}/${yearStr} ${hourStr}:${minStr}:${secStr}`
  
  return { relative, full }
}

export function formatOverdueTime(dueIsoStr?: string | null): { relative: string; full: string; overdue: boolean; severe: boolean } {
  if (!dueIsoStr) return { relative: 'none', full: 'No due date', overdue: false, severe: false }
  const d = parseUTCDate(dueIsoStr)
  if (isNaN(d.getTime())) return { relative: 'none', full: 'No due date', overdue: false, severe: false }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  
  const dayStr = String(d.getDate()).padStart(2, '0')
  const monthStr = String(d.getMonth() + 1).padStart(2, '0')
  const yearStr = d.getFullYear()
  const hourStr = String(d.getHours()).padStart(2, '0')
  const minStr = String(d.getMinutes()).padStart(2, '0')
  const full = `Due: ${yearStr}-${monthStr}-${dayStr} ${hourStr}:${minStr}`

  if (diffMs <= 0) {
    return { relative: 'On track', full, overdue: false, severe: false }
  }

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  let relative = ''
  let severe = false

  if (diffDay >= 1) {
    const remainingHours = diffHour % 24
    relative = remainingHours > 0 ? `${diffDay}d ${remainingHours}h` : `${diffDay}d`
    severe = diffDay >= 1
  } else if (diffHour >= 1) {
    const remainingMin = diffMin % 60
    relative = remainingMin > 0 ? `${diffHour}h ${remainingMin}m` : `${diffHour}h`
    severe = diffHour >= 24
  } else if (diffMin >= 1) {
    relative = `${diffMin}m`
    severe = false
  } else {
    relative = 'Just due'
    severe = false
  }

  return { relative, full, overdue: true, severe }
}

export const getMapTitleInfo = (mode: string) => {
  switch (mode) {
    case 'due':
      return {
        title: "Due Recall",
        subtitle: "Cards currently due for FSRS spaced repetition review"
      }
    case 'learn':
    case 'mastered':
      return {
        title: "Retained",
        subtitle: "Cards with active FSRS memory retention (in interval, not due yet)"
      }
    case 'drill':
      return {
        title: "Reinforced",
        subtitle: "Cards studied via Hybrid Recall active drills"
      }
    case 'practice':
      return {
        title: "Practiced",
        subtitle: "Cards attempted in practice exercises (MCQ / Typing)"
      }
    case 'skim':
    case 'skimmed':
      return {
        title: "Previewed",
        subtitle: "Cards glanced over in Speed Skim or Skim Preview"
      }
    case 'new':
    case 'unseen':
      return {
        title: "Fresh",
        subtitle: "Brand new cards, never viewed or tested"
      }
    case 'learning':
      return {
        title: "In Progress",
        subtitle: "Cards currently in learning across retention stages"
      }
    case 'hard':
      return {
        title: "Difficult Cards",
        subtitle: "Cards you frequently struggle with or answered incorrectly"
      }
    case 'starred':
      return {
        title: "Starred",
        subtitle: "High-priority cards bookmarked by you"
      }
    case 'ignored':
      return {
        title: "Ignored",
        subtitle: "Cards excluded from current study sessions"
      }
    case 'all':
    default:
      return {
        title: "Card Map - All",
        subtitle: "Track and browse all vocabulary cards in this session"
      }
  }
}

export const getCardBoxId = (item: any): CardBoxId => {
  if (item.is_ignored) return 'ignored'
  if (item.is_starred) return 'starred'
  
  const stats = item.stats || { total: 0, again_count: 0, hard_count: 0 }
  const total = stats.total || 0
  const again = stats.again_count || 0
  const hard = stats.hard_count || 0
  const isHard = (item.fsrs?.difficulty !== undefined && item.fsrs.difficulty !== null)
    ? (
        item.fsrs.difficulty >= 8.0 &&
        (item.fsrs.stability === undefined || item.fsrs.stability === null || item.fsrs.stability < 5.0) &&
        total >= 20 &&
        ((again + hard) / total >= 0.4)
      )
    : (total >= 20 && (again + hard) >= 8 && ((again + hard) / total >= 0.4))
    
  if (isHard) return 'hard'
  const state = getCardLifecycleState(item)
  if (state === 'due' || state === 'learn') return 'mastered'
  if (state === 'drill' || state === 'practice') return 'learning'
  if (state === 'skim') return 'skimmed'
  return 'unseen'
}

export const getMasteryPill = (q: any): React.ReactElement => {
  if (q?.is_ignored) {
    return (
      <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-slate-200 text-slate-500 border border-slate-300 shadow-2xs animate-fadeIn">
        🚫 IGNORED
      </span>
    )
  }

  const state = getCardLifecycleState(q)
  switch (state) {
    case 'due':
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-300/80 shadow-2xs animate-pulse">
          ⏰ DUE RECALL
        </span>
      )
    case 'learn':
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-2xs animate-fadeIn">
          🌱 RETAINED
        </span>
      )
    case 'drill':
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-300/80 shadow-2xs animate-fadeIn">
          ⚡ REINFORCED
        </span>
      )
    case 'practice':
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-300/80 shadow-2xs animate-fadeIn">
          🎯 PRACTICED
        </span>
      )
    case 'skim':
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300/80 shadow-2xs animate-fadeIn">
          👀 PREVIEWED
        </span>
      )
    case 'new':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs animate-fadeIn">
          ✨ FRESH
        </span>
      )
  }
}

export function getFSRSIntervals(fsrs?: any): Record<number, string> {
  if (fsrs?.intervals && typeof fsrs.intervals === 'object' && Object.keys(fsrs.intervals).length > 0) {
    return fsrs.intervals;
  }
  
  // Dynamic FSRS estimation based on stability if in review
  const stability = fsrs?.stability;
  const state = fsrs?.state;
  
  if (state === 2 && typeof stability === 'number' && stability > 0) {
    const again = "10m";
    const hardDays = Math.max(1, Math.round(stability * 1.2));
    const goodDays = Math.max(2, Math.round(stability * 2.5));
    const easyDays = Math.max(4, Math.round(stability * 4.0));
    
    return {
      1: again,
      2: `${hardDays}d`,
      3: `${goodDays}d`,
      4: `${easyDays}d`
    };
  }
  
  // Standard defaults for New / Learning cards
  return {
    1: "1m",
    2: "5m",
    3: "10m",
    4: "4d"
  };
}

export const getBadgeIcon = (badgeId: string) => {
  switch (badgeId) {
    case 'first_steps':
      return Play
    case 'streak_starter':
      return Flame
    case 'streak_legend':
      return Trophy
    case 'perfect_score':
      return CheckCircle2
    case 'speed_demon':
      return Clock
    case 'goal_crusher':
      return Target
    case 'card_master':
      return Brain
    default:
      return Award
  }
}

export const formatHeaderTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const hours = Math.floor(mins / 60)
  if (hours > 0) {
    return `${hours}h ${mins % 60}m`
  }
  return `${mins}m`
}
