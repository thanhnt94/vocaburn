import React, { useMemo } from 'react'
import { Sparkles, Bookmark, Volume2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import { getFrontFontSizeStyle } from '@/components/common/study'
import { CardImageGallery } from '@/components/common/CardImageGallery'
import { extractCardImages } from '@/lib/image-utils'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeMcqCardProps {
  currentIndex: number
  totalCards?: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  selectedOption: number | null
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onSelectOption: (index: number) => void
  onPreviewInsight?: (card: any) => void
  sessionQuestions?: Question[]
  onPlayAudio?: (face?: string, rate?: number) => void
  onNext?: () => void
  onZoomImage?: (url: string) => void
  frontFontSize?: string
  showImages?: string | boolean
}

const getVal = (card: any, key: string) => {
  if (!card) return ''
  return card[key] || card.others?.[key] || ''
}

export const PracticeMcqCard: React.FC<PracticeMcqCardProps> = ({
  currentIndex,
  totalCards,
  currentQuestion,
  practiceData,
  answered,
  selectedOption,
  starredCards,
  onToggleStar,
  onSelectOption,
  onPreviewInsight,
  sessionQuestions = [],
  onPlayAudio,
  onNext,
  onZoomImage,
  frontFontSize = 'M',
  showImages = 'always'
}) => {
  const { question, choices, choice_item_ids, correct_index, question_key, answer_key } = practiceData

  const isImageVisible = showImages !== 'off' && showImages !== 'none' && showImages !== false && showImages !== 'false'
  const imageSettings = (currentQuestion as any)?.deck_image_configs
  const questionImages = useMemo(() => {
    if (!isImageVisible) return []
    return extractCardImages(currentQuestion, 'front', imageSettings)
  }, [currentQuestion, isImageVisible, imageSettings])

  const answerImages = useMemo(() => {
    if (!isImageVisible) return []
    return extractCardImages(currentQuestion, 'back', imageSettings)
  }, [currentQuestion, isImageVisible, imageSettings])

  const getFontSizeClass = () => {
    switch (frontFontSize) {
      case 'S': return 'text-2xl sm:text-3xl'
      case 'L': return 'text-4xl sm:text-5xl lg:text-6xl'
      case 'XL': return 'text-5xl sm:text-6xl lg:text-7xl'
      default: return 'text-3xl sm:text-4xl lg:text-5xl'
    }
  }

  const promptLabel = useMemo(() => {
    const qk = String(question_key || 'front').toLowerCase()
    if (qk.includes('nghĩa') || qk.includes('meaning') || qk.includes('vi')) {
      return 'CHỌN TỪ VỰNG TIẾNG NHẬT TƯƠNG ỨNG'
    }
    if (qk.includes('front') || qk.includes('word') || qk.includes('kanji')) {
      return 'CHỌN Ý NGHĨA CHÍNH XÁC'
    }
    return 'CHỌN ĐÁP ÁN ĐÚNG NHẤT'
  }, [question_key])

  return (
    <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-slate-900 md:rounded-[2rem] rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl shadow-indigo-100/30 dark:shadow-none min-h-0 overflow-y-auto custom-scrollbar relative">
      {/* ── Ambient Soft Glow ── */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-indigo-200/20 via-purple-100/10 to-transparent dark:from-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-amber-100/20 via-slate-100/10 to-transparent dark:from-amber-500/5 blur-3xl pointer-events-none" />

      {/* ── Top Header Bar ── */}
      <div className="w-full flex items-center justify-between gap-2 relative z-10 select-none pb-2 border-b border-slate-100/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 font-black text-[11px] uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-300" />
            <span>Multiple Choice</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-black text-[11px]">
            #{currentIndex + 1}{totalCards ? ` / ${totalCards}` : ''}
          </span>

          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-400 font-bold text-[10px] tracking-wider uppercase">
            {promptLabel}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onPlayAudio && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPlayAudio(question_key || 'front')
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all active:scale-95 cursor-pointer"
              title="Phát âm câu hỏi"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (currentQuestion?.id) onToggleStar(currentQuestion.id)
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-95 cursor-pointer"
            title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Bỏ đánh dấu" : "Đánh dấu câu hỏi"}
          >
            <Bookmark className={cn("w-4 h-4 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-amber-500 text-amber-500" : "text-slate-400")} />
          </button>
        </div>
      </div>

      {/* ── Central Question Stage ── */}
      <div className="my-auto py-5 sm:py-7 flex flex-col items-center justify-center text-center relative z-10 max-w-2xl mx-auto w-full">
        {questionImages.length > 0 && (
          <CardImageGallery
            images={questionImages}
            onZoom={onZoomImage}
            maxHeight="max-h-32 sm:max-h-40"
            className="mb-4"
          />
        )}

        <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-indigo-600/90 dark:text-indigo-400 mb-2">
          {promptLabel}
        </p>

        {/* Prominent Question Heading */}
        <h2 
          className="font-black text-slate-900 dark:text-slate-50 leading-tight tracking-tight font-sans px-2 selection:bg-indigo-200"
          style={{ fontSize: getFrontFontSizeStyle(frontFontSize) }}
        >
          <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }} />
        </h2>
      </div>

      {/* ── MCQ Choices (A, B, C, D) ── */}
      <div className="w-full max-w-2xl mx-auto relative z-10 pt-2 shrink-0 space-y-3">
        {choices && choices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {choices.map((choice: string, idx: number) => {
              const isSelected = selectedOption === idx
              const isCorrectChoice = idx === correct_index
              const letter = String.fromCharCode(65 + idx) // A, B, C, D

              let cardStyle = "bg-slate-50/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-100 hover:shadow-md"
              let badgeStyle = "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"

              if (answered) {
                if (isCorrectChoice) {
                  cardStyle = "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.01]"
                  badgeStyle = "bg-emerald-600 text-white border-emerald-400"
                } else if (isSelected) {
                  cardStyle = "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/25"
                  badgeStyle = "bg-rose-600 text-white border-rose-400"
                } else {
                  cardStyle = "bg-slate-100/50 dark:bg-slate-850/40 border-slate-200/50 dark:border-slate-800 opacity-40 text-slate-400 dark:text-slate-500"
                  badgeStyle = "bg-slate-200/50 dark:bg-slate-800 text-slate-400 border-slate-300/50"
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!answered) {
                      onSelectOption(idx)
                    } else if (onPreviewInsight) {
                      // Lookup card for insight preview
                      const choiceIds = choice_item_ids || practiceData.choice_item_ids || currentQuestion?.practice?.choice_item_ids
                      if (choiceIds && sessionQuestions.length > 0 && choiceIds[idx] !== undefined) {
                        const targetCard = sessionQuestions.find((q: any) => String(q.id) === String(choiceIds[idx]))
                        if (targetCard) onPreviewInsight(targetCard)
                      }
                    }
                  }}
                  className={cn(
                    "w-full min-h-[58px] sm:min-h-[64px] p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center gap-3 text-left relative cursor-pointer select-none active:scale-[0.98]",
                    cardStyle
                  )}
                >
                  {/* Letter Badge */}
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0 transition-colors",
                    badgeStyle
                  )}>
                    {answered && isCorrectChoice ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : answered && isSelected ? (
                      <X className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{letter}</span>
                    )}
                  </div>

                  {/* Choice Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <span
                      className="font-bold text-sm sm:text-base leading-snug block truncate"
                      dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice || '') }}
                    />
                  </div>

                  {/* Keyboard shortcut hint */}
                  {!answered && (
                    <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700">
                      {idx + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Answer Explanation Images (Revealed upon answering) */}
        {answered && answerImages.length > 0 && (
          <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 text-center">
              Hình ảnh minh họa đáp án:
            </span>
            <CardImageGallery
              images={answerImages}
              onZoom={onZoomImage}
              maxHeight="max-h-28 sm:max-h-36"
            />
          </div>
        )}


      </div>
    </div>
  )
}

export default PracticeMcqCard
