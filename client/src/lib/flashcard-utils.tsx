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
  if (!dueIsoStr) return { relative: 'none', full: 'Chưa có hạn ôn', overdue: false, severe: false }
  const d = parseUTCDate(dueIsoStr)
  if (isNaN(d.getTime())) return { relative: 'none', full: 'Chưa có hạn ôn', overdue: false, severe: false }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  
  const dayStr = String(d.getDate()).padStart(2, '0')
  const monthStr = String(d.getMonth() + 1).padStart(2, '0')
  const yearStr = d.getFullYear()
  const hourStr = String(d.getHours()).padStart(2, '0')
  const minStr = String(d.getMinutes()).padStart(2, '0')
  const full = `Hạn ôn: ${dayStr}/${monthStr}/${yearStr} ${hourStr}:${minStr}`

  if (diffMs <= 0) {
    return { relative: 'Đúng hạn', full, overdue: false, severe: false }
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
    relative = 'Vừa đến'
    severe = false
  }

  return { relative, full, overdue: true, severe }
}

export const getMapTitleInfo = (mode: string) => {
  switch (mode) {
    case 'unseen':
      return {
        title: "Unseen",
        subtitle: "Brand new cards not yet studied"
      }
    case 'learning':
      return {
        title: "Learning",
        subtitle: "Cards currently in progress across retention stages"
      }
    case 'mastered':
      return {
        title: "Mastered",
        subtitle: "Cards fully memorized and retained"
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
  if (item.box_level === 5 && total >= 4) return 'mastered'
  const hasLearned = Boolean(item.fsrs?.last_review || (item.fsrs?.state !== undefined && item.fsrs?.state > 0) || total > 0);
  if (!hasLearned) return 'unseen'
  return 'learning'
}

export const getMasteryPill = (q: any): React.ReactElement => {
  const boxId = getCardBoxId(q)
  switch (boxId) {
    case 'ignored':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-500 border border-slate-300 shadow-sm animate-fadeIn">
          🚫 BỎ QUA
        </span>
      )
    case 'starred':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white border border-amber-600 shadow-sm animate-fadeIn">
          ★ ĐÃ GẮN SAO
        </span>
      )
    case 'hard':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm animate-fadeIn">
          ⚠️ THẺ KHÓ
        </span>
      )
    case 'mastered':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm animate-fadeIn">
          🏆 ĐÃ THUỘC
        </span>
      )
    case 'learning':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm animate-fadeIn">
          🌱 ĐANG HỌC
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-650 border border-slate-500/20 shadow-sm animate-fadeIn">
          ⭐ MỚI
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
    const again = "<10m";
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
    1: "<1m",
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
