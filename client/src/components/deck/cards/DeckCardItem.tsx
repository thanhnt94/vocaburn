import React from 'react'
import { Volume2, Star, EyeOff, Eye, Edit2, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react'
import { parseBBCodeToHtml } from '@/lib/text'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'

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

  const handlePlayAudio = (e: React.MouseEvent, url?: string | null) => {
    e.stopPropagation()
    if (!url) return
    const audio = new Audio(url)
    setIsPlayingAudio(true)
    audio.onended = () => setIsPlayingAudio(false)
    audio.onerror = () => setIsPlayingAudio(false)
    audio.play().catch(() => setIsPlayingAudio(false))
  }

  const frontAudio = resolveMediaUrl(card.front_audio_url || card.audio)
  const frontImg = resolveMediaUrl(card.front_img || card.image)
  const backImg = resolveMediaUrl(card.back_img)

  return (
    <div
      className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
        card.is_ignored
          ? 'bg-slate-100/60 dark:bg-slate-850/50 border-slate-200/60 dark:border-slate-800/60 opacity-60'
          : isSelected
          ? 'bg-indigo-50/40 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-2xs'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox / Index */}
        <div className="flex items-center gap-2 pt-1 shrink-0">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
            />
          )}
          <span className="text-[11px] font-black text-slate-300 dark:text-slate-600 w-5 text-center">
            #{index + 1}
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Front */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Front
              </span>
              {frontAudio && (
                <button
                  onClick={(e) => handlePlayAudio(e, frontAudio)}
                  disabled={isPlayingAudio}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer touch-manipulation"
                  title="Play pronunciation"
                >
                  <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}`} />
                </button>
              )}
            </div>
            <div
              className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug break-words"
              dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(card.content || '') }}
            />
            {frontImg && (
              <div className="mt-1 w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={frontImg} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Back */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Back
              </span>
              {card.ai_explanation && (
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              )}
            </div>
            <div
              className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(card.explanation || '') }}
            />
            {card.hint && (
              <p className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
                💡 <strong>Hint:</strong> {card.hint}
              </p>
            )}
            {backImg && (
              <div className="mt-1 w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={backImg} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Action Controls with High-Density Hit-Slop */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {onToggleStar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleStar(card.id)
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 ${
                card.is_starred
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={card.is_starred ? 'Unstar card' : 'Star card'}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          )}

          {onToggleIgnore && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleIgnore(card.id)
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 ${
                card.is_ignored
                  ? 'text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-750'
                  : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={card.is_ignored ? 'Unhide card' : 'Hide card (suspend study)'}
            >
              {card.is_ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(card)
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all cursor-pointer touch-manipulation active:scale-90"
            title="Edit card"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(card.id)
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer touch-manipulation active:scale-90"
            title="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeckCardItem
