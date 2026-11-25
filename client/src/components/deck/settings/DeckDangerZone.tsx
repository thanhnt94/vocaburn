import React, { useState } from 'react'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'

export interface DeckDangerZoneProps {
  deckId: string | number
  isOwner?: boolean
}

export function DeckDangerZone({ deckId, isOwner = true }: DeckDangerZoneProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isResetting, setIsResetting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleResetProgress = async () => {
    if (
      !window.confirm(
        'Reset all learning progress and FSRS v6 metrics for this deck back to 0?'
      )
    )
      return

    setIsResetting(true)
    try {
      await axios.post(`/api/v1/deck/${deckId}/reset-progress`)
      queryClient.invalidateQueries({ queryKey: ['quiz-mastery', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-roadmap-status', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-sub-lessons', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-sub-lessons-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-study-stats', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Learning progress reset successfully!')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to reset learning progress')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteDeck = async () => {
    if (
      !window.confirm(
        'WARNING: Permanently delete this deck along with all cards and study history? This action cannot be undone!'
      )
    )
      return

    setIsDeleting(true)
    try {
      await axios.delete(`/api/v1/deck/${deckId}`)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Deck deleted successfully!')
      navigate('/decks')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to delete deck')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-150 shadow-sm text-left space-y-4">
      <div className="flex items-center gap-2.5 border-b border-rose-100 pb-3">
        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest leading-none">
            Vùng Nguy Hiểm (Danger Zone)
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Các tác vụ ảnh hưởng trực tiếp đến dữ liệu và tiến độ học
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reset Progress */}
        <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 flex flex-col justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-slate-800">Đặt lại tiến độ học</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Xóa lịch sử trả lời và đưa các chỉ số FSRS v6, chu kỳ ôn tập về trạng thái mới ban đầu.
            </p>
          </div>

          <button
            onClick={handleResetProgress}
            disabled={isResetting}
            className="h-9 px-4 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isResetting ? 'ĐANG ĐẶT LẠI...' : 'Đặt lại tiến độ'}</span>
          </button>
        </div>

        {/* Delete Deck (Owner/Admin only) */}
        {isOwner && (
          <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-rose-800">Xóa vĩnh viễn bộ thẻ</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Xóa toàn bộ câu hỏi, âm thanh, ảnh và cài đặt liên kết của bộ thẻ này khỏi hệ thống.
              </p>
            </div>

            <button
              onClick={handleDeleteDeck}
              disabled={isDeleting}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs shadow-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'ĐANG XÓA...' : 'Xóa bộ thẻ này'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeckDangerZone
