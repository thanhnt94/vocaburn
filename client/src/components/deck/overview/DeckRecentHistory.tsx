import React from 'react'
import { History, Clock, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface StudyAttempt {
  id: number
  mode: string
  score: number
  total_cards: number
  accuracy?: number
  started_at: string
  completed_at?: string | null
}

export interface DeckRecentHistoryProps {
  attempts?: StudyAttempt[]
  isLoading?: boolean
  deckId: string | number
}

export function DeckRecentHistory({ attempts = [], isLoading, deckId }: DeckRecentHistoryProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/4" />
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
    )
  }

  const formatMode = (m: string) => {
    switch (m) {
      case 'fsrs': return { label: 'Flashcard FSRS', icon: '🧠', color: 'text-indigo-600 bg-indigo-50' }
      case 'skim':
      case 'speed_skim': return { label: 'Speed Skim', icon: '⚡', color: 'text-amber-600 bg-amber-50' }
      case 'review': return { label: 'Continuous Review', icon: '📚', color: 'text-teal-600 bg-teal-50' }
      case 'new': return { label: 'Learn New Cards', icon: '✨', color: 'text-purple-600 bg-purple-50' }
      case 'roadmap': return { label: 'Daily Roadmap', icon: '🗺️', color: 'text-amber-600 bg-amber-50' }
      case 'mcq':
      case 'roadmap_mcq': return { label: 'MCQ Quiz Test', icon: '🎯', color: 'text-emerald-600 bg-emerald-50' }
      case 'typing':
      case 'roadmap_typing': return { label: 'Typing Test', icon: '⌨️', color: 'text-purple-600 bg-purple-50' }
      case 'listening': return { label: 'Listening Test', icon: '🎧', color: 'text-sky-600 bg-sky-50' }
      default: return { label: 'Practice Session', icon: '🔄', color: 'text-slate-600 bg-slate-50' }
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
              Recent Study History
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Latest study & practice sessions for this deck
            </p>
          </div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="p-6 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
          <span className="text-2xl block mb-1">🌱</span>
          <p className="text-xs font-bold text-slate-600">No study history recorded yet</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Start a flashcard or practice session below to build your streak & XP!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attempts.slice(0, 5).map((att) => {
            const modeInfo = formatMode(att.mode)
            const accuracy = att.total_cards > 0 ? Math.round((att.score / att.total_cards) * 100) : 0
            return (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${modeInfo.color}`}>
                    {modeInfo.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 block truncate">
                      {modeInfo.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {formatDate(att.started_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-black text-indigo-600 block">
                      {att.score}/{att.total_cards} cards
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block">
                      {accuracy}% accuracy
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DeckRecentHistory
