import React from 'react'
import { Volume2, Star, EyeOff, Eye, Edit2, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react'
import { parseBBCodeToHtml } from '@/lib/text'

export interface CardData {
  id: number
  content: string
  explanation: string
  ai_explanation?: string
  hint?: string | null
  mnemonic?: string | null
  image?: string | null
  audio?: string | null
  front_img?: string | null
  back_img?: string | null
  front_audio_url?: string | null
  back_audio_url?: string | null
  is_starred?: boolean
  is_ignored?: boolean
  others?: Record<string, any> | null
  stats?: { total: number; correct: number; wrong: number }
}

export interface DeckCardItemProps {
  card: CardData
  index: number
  isSelected?: boolean
  onToggleSelect?: () => void
  onEdit: (card: CardData) => void
  onDelete: (cardId: number) => void
  onToggleStar?: (cardId: number) => void
  onToggleIgnore?: (cardId: number) => void
}

export function DeckCardItem({
  card,
  index,
  isSelected = false,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleStar,
  onToggleIgnore,
}: DeckCardItemProps) {
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false)

  const handlePlayAudio = (url?: string | null) => {
    if (!url) return
    const audio = new Audio(url)
    setIsPlayingAudio(true)
    audio.onended = () => setIsPlayingAudio(false)
    audio.onerror = () => setIsPlayingAudio(false)
    audio.play().catch(() => setIsPlayingAudio(false))
  }

  const frontAudio = card.front_audio_url || card.audio
  const frontImg = card.front_img || card.image
  const backImg = card.back_img

  return (
    <div
      className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
        card.is_ignored
          ? 'bg-slate-100/60 border-slate-200/60 opacity-60'
          : isSelected
          ? 'bg-indigo-50/40 border-indigo-300 shadow-2xs'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox / Index */}
        <div className="flex items-center gap-2 pt-0.5 shrink-0">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
          )}
          <span className="text-[11px] font-black text-slate-300 w-5 text-center">
            #{index + 1}
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Front (Mặt trước) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Mặt trước
              </span>
              {frontAudio && (
                <button
                  onClick={() => handlePlayAudio(frontAudio)}
                  disabled={isPlayingAudio}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'text-indigo-600 animate-pulse' : ''}`} />
                </button>
              )}
            </div>
            <div
              className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug break-words"
              dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(card.content || '') }}
            />
            {frontImg && (
              <div className="mt-1 w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                <img src={frontImg} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Back (Mặt sau / Giải thích) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Mặt sau
              </span>
              {card.ai_explanation && (
                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              )}
            </div>
            <div
              className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(card.explanation || '') }}
            />
            {card.hint && (
              <p className="text-[10px] text-amber-700 bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                💡 <strong>Gợi ý:</strong> {card.hint}
              </p>
            )}
            {backImg && (
              <div className="mt-1 w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                <img src={backImg} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {onToggleStar && (
            <button
              onClick={() => onToggleStar(card.id)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                card.is_starred
                  ? 'text-amber-500 bg-amber-50'
                  : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
              }`}
              title={card.is_starred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao quan trọng'}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          )}

          {onToggleIgnore && (
            <button
              onClick={() => onToggleIgnore(card.id)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                card.is_ignored
                  ? 'text-slate-600 bg-slate-200'
                  : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={card.is_ignored ? 'Bỏ ẩn thẻ' : 'Ẩn thẻ (không ôn tập)'}
            >
              {card.is_ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => onEdit(card)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
            title="Chỉnh sửa thẻ"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(card.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Xóa thẻ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckCardItem
