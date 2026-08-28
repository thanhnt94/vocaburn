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
      case 'roadmap': return { label: 'Lộ Trình Ngày', icon: '🗺️', color: 'text-amber-600 bg-amber-50' }
      case 'mcq': return { label: 'Trắc Nghiệm MCQ', icon: '🎯', color: 'text-emerald-600 bg-emerald-50' }
      case 'typing': return { label: 'Gõ Từ Vựng', icon: '⌨️', color: 'text-purple-600 bg-purple-50' }
      case 'listening': return { label: 'Luyện Nghe', icon: '🎧', color: 'text-sky-600 bg-sky-50' }
      default: return { label: 'Lật Thẻ', icon: '🔄', color: 'text-slate-600 bg-slate-50' }
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
              Lịch Sử Luyện Tập Gần Đây
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Ghi nhận các phiên học mới nhất của bạn
            </p>
          </div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="p-6 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
          <span className="text-2xl block mb-1">🌱</span>
          <p className="text-xs font-bold text-slate-600">Chưa có lịch sử học tập</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Hãy chọn một chế độ bên trên để bắt đầu tích lũy XP!</p>
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
                      {att.score}/{att.total_cards} thẻ
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block">
                      {accuracy}% chính xác
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
