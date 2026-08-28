import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Trophy, 
  BookOpen, 
  Compass, 
  Archive, 
  RotateCcw, 
  X, 
  ChevronRight,
  Sparkles,
  Layers,
  Share2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Quiz } from '@/pages/DecksPage'

export interface DeckActionSheetProps {
  isOpen: boolean
  onClose: () => void
  deck: Quiz | null
  activeTab: 'my' | 'discover' | 'archived'
  onStudy: (mode: 'flashcard' | 'practice') => void
  onArchive?: (deckId: number) => void
  onEnroll?: (deckId: number) => void
}

export function DeckActionSheet({
  isOpen,
  onClose,
  deck,
  activeTab,
  onStudy,
  onArchive,
  onEnroll,
}: DeckActionSheetProps) {
  const navigate = useNavigate()

  if (!isOpen || !deck) return null

  const learned = deck.learned_count || 0
  const total = deck.questions_count || 1
  const pct = deck.progress_percent ?? Math.round((learned / total) * 100)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Bottom Sheet Drawer */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl relative z-10 p-5 sm:p-6 border-t border-slate-100 flex flex-col max-h-[85vh] text-left"
        >
          {/* Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />

          {/* Deck Header Info */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-2xs overflow-hidden shrink-0">
              {deck.cover_image ? (
                <img src={deck.cover_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>🎴</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                {deck.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-bold">
                <span>{deck.questions_count} thẻ</span>
                <span>•</span>
                <span className="text-indigo-600 font-bold">
                  {learned > 0 ? `Đã học ${pct}% (${learned}/${deck.questions_count})` : 'Chưa học'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action List (Thumb Reachable) */}
          <div className="py-3 space-y-2 flex-1 overflow-y-auto">
            {activeTab === 'my' && (
              <>
                {/* 1. Học Flashcard */}
                <button
                  onClick={() => {
                    onClose()
                    onStudy('flashcard')
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-xs shadow-indigo-200 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                      <Brain className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <span className="text-xs sm:text-sm font-black block">Học Flashcard</span>
                      <span className="text-[10px] text-white/80 font-medium block">
                        FSRS v6 Spaced Repetition & Roadmap
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>

                {/* 2. Luyện tập MCQ / Typing */}
                <button
                  onClick={() => {
                    onClose()
                    onStudy('practice')
                  }}
                  className="w-full p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-950 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <span className="text-xs sm:text-sm font-black block text-emerald-900">
                        Luyện Tập Đa Chế Độ
                      </span>
                      <span className="text-[10px] text-emerald-700/80 font-medium block">
                        Trắc nghiệm 4 đáp án, gõ từ & nghe audio
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600" />
                </button>

                {/* 3. Xem Chi tiết bộ thẻ */}
                <button
                  onClick={() => {
                    onClose()
                    navigate(`/decks/${deck.id}`)
                  }}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-black text-slate-800 block">Xem Chi Tiết Bộ Thẻ</span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Danh sách từ vựng, thông số & cài đặt
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 4. Ẩn vào kho lưu trữ */}
                {onArchive && (
                  <button
                    onClick={() => {
                      onClose()
                      onArchive(deck.id)
                    }}
                    className="w-full p-3 rounded-2xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center gap-3 transition-all cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Archive className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold">Ẩn vào kho lưu trữ</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'discover' && (
              <>
                {/* Enroll in deck */}
                <button
                  onClick={() => {
                    onClose()
                    if (onEnroll) onEnroll(deck.id)
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-black">
                      +
                    </span>
                    <div className="text-left">
                      <span className="text-xs sm:text-sm font-black block">Thêm Vào Học Ngay</span>
                      <span className="text-[10px] text-white/80 font-medium block">
                        Đăng ký bộ thẻ này vào danh sách cá nhân
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>

                {/* View Details */}
                <button
                  onClick={() => {
                    onClose()
                    navigate(`/decks/${deck.id}`)
                  }}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-black text-slate-800">Xem trước nội dung</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </>
            )}

            {activeTab === 'archived' && (
              <>
                <button
                  onClick={() => {
                    onClose()
                    if (onArchive) onArchive(deck.id)
                  }}
                  className="w-full p-3.5 rounded-2xl bg-indigo-600 text-white flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                      <RotateCcw className="w-4 h-4" />
                    </span>
                    <span className="text-xs sm:text-sm font-black">Khôi phục về Đang Học</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckActionSheet
