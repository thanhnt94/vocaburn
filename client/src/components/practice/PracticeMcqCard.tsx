import React, { useMemo } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml, isJapanese } from '@/lib/text'
import { extractCardImages } from '@/lib/image-utils'
import { PracticeCardShell } from './PracticeCardShell'
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
  hideHeaderActions?: boolean
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
  showImages = 'always',
  hideHeaderActions = false
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
    const backImgs = extractCardImages(currentQuestion, 'back', imageSettings)
    const questionUrls = new Set(questionImages)
    return backImgs.filter(url => !questionUrls.has(url))
  }, [currentQuestion, isImageVisible, imageSettings, questionImages])

  const promptLabel = useMemo(() => {
    const qk = String(question_key || 'front').toLowerCase()
    if (qk.includes('nghĩa') || qk.includes('meaning') || qk.includes('vi')) {
      return 'CHOOSE THE MATCHING JAPANESE TERM'
    }
    if (qk.includes('front') || qk.includes('word') || qk.includes('kanji')) {
      return 'CHOOSE THE CORRECT MEANING'
    }
    return 'CHOOSE THE BEST ANSWER'
  }, [question_key])

  return (
    <PracticeCardShell
      badgeLabel="Multiple Choice"
      badgeIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-300" />}
      badgeColorClass="bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300"
      currentIndex={currentIndex}
      totalCards={totalCards}
      currentQuestion={currentQuestion}
      promptLabel={promptLabel}
      questionText={question}
      questionImages={questionImages}
      questionSubtext={practiceData.question_subtext}
      questionSubtextLabel={practiceData.hint_col ? `${String(practiceData.hint_col).replace(/_/g, ' ')}:` : 'HINT:'}
      frontFontSize={frontFontSize}
      starredCards={starredCards}
      onToggleStar={onToggleStar}
      onPlayAudio={onPlayAudio ? () => onPlayAudio(question_key || 'front') : undefined}
      onZoomImage={onZoomImage}
      hideHeaderActions={hideHeaderActions}
      answerImages={answerImages}
      answered={answered}
      glowColor="indigo"
    >
      {/* ── MCQ Choices (A, B, C, D) ── */}
      <div className="w-full max-w-2xl mx-auto relative z-10 pt-2 shrink-0 space-y-3">
        {choices && choices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {choices.map((choice: string, idx: number) => {
              const isSelected = selectedOption === idx
              const isCorrectChoice = idx === correct_index
              const letter = String.fromCharCode(65 + idx) // A, B, C, D

              // Robust card lookup for preview and metadata
              const choiceData = practiceData.choices_data && practiceData.choices_data[idx]
              const choiceIds = choice_item_ids || practiceData.choice_item_ids || currentQuestion?.practice?.choice_item_ids
              let targetCard: any = null
              if (choiceData?.card) {
                targetCard = choiceData.card
              }
              if (!targetCard && choiceIds && choiceIds[idx] !== undefined) {
                targetCard = sessionQuestions.find((q: any) => String(q.id) === String(choiceIds[idx]))
              }
              if (!targetCard && choiceIds && (currentQuestion as any)?.distractor_pool) {
                targetCard = (currentQuestion as any).distractor_pool.find((q: any) => String(q.id) === String(choiceIds[idx]))
              }
              if (!targetCard) {
                targetCard = sessionQuestions.find((q: any) =>
                  getVal(q, 'front') === choice ||
                  getVal(q, 'mẫu_ngữ_pháp') === choice ||
                  getVal(q, 'content') === choice ||
                  getVal(q, 'nghĩa') === choice
                )
              }

              // Compute revealed subtext when answered
              let subtext = choiceData?.subtext || ''
              if (!subtext && targetCard) {
                const configuredSubtextCol = practiceData.subtext_col
                if (configuredSubtextCol) {
                  subtext = getVal(targetCard, configuredSubtextCol)
                }
                if (!subtext) {
                  const isJpChoice = isJapanese(choice) || (answer_key && (String(answer_key).includes('mẫu') || String(answer_key).includes('front') || String(answer_key).includes('kanji')))
                  if (isJpChoice) {
                    subtext = getVal(targetCard, 'nghĩa') || getVal(targetCard, 'meaning') || getVal(targetCard, 'dịch_nghĩa') || getVal(targetCard, 'back') || ''
                    if (!subtext && targetCard.explanation) {
                      subtext = targetCard.explanation.split('\n')[0].replace(/^[#*-\s]+/, '').slice(0, 80)
                    }
                  } else {
                    subtext = getVal(targetCard, 'mẫu_ngữ_pháp') || getVal(targetCard, 'front') || getVal(targetCard, 'từ_vựng') || getVal(targetCard, 'kanji') || targetCard.content || ''
                  }
                }
              }
              if (!subtext && choiceData?.q_text && choiceData.q_text !== choice) {
                subtext = choiceData.q_text
              }

              let cardStyle = "bg-slate-50/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-100 hover:shadow-md"
              let badgeStyle = "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"

              if (answered) {
                if (isCorrectChoice) {
                  cardStyle = "bg-emerald-700 dark:bg-emerald-800 border-emerald-800 dark:border-emerald-600 text-white shadow-lg shadow-emerald-700/30 scale-[1.01]"
                  badgeStyle = "bg-emerald-800 dark:bg-emerald-900 text-white border-emerald-600 dark:border-emerald-500 shadow-xs"
                } else if (isSelected) {
                  cardStyle = "bg-rose-600 dark:bg-rose-700 border-rose-700 dark:border-rose-600 text-white shadow-lg shadow-rose-600/30"
                  badgeStyle = "bg-rose-700 dark:bg-rose-800 text-white border-rose-500 shadow-xs"
                } else {
                  cardStyle = "bg-white/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-750"
                  badgeStyle = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                }
              }

              const hasSubtext = Boolean(answered && subtext)

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!answered) {
                      onSelectOption(idx)
                    } else if (onPreviewInsight && targetCard) {
                      onPreviewInsight(targetCard)
                    }
                  }}
                  className={cn(
                    "w-full min-h-[58px] sm:min-h-[64px] h-auto p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex gap-3 text-left relative cursor-pointer select-none active:scale-[0.98]",
                    hasSubtext ? "items-start" : "items-center",
                    cardStyle
                  )}
                >
                  {/* Letter Badge */}
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0 transition-colors",
                    hasSubtext ? "self-start mt-0.5" : "",
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

                  {/* Choice Content & Revealed Extra Subtext */}
                  <div className="flex-1 min-w-0 pr-1">
                    <span
                      className={cn(
                        "font-bold text-sm sm:text-base leading-snug block whitespace-normal break-words",
                        answered && (isCorrectChoice || isSelected) ? "text-white" : "text-slate-800 dark:text-slate-100"
                      )}
                      dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice || '') }}
                    />
                    {hasSubtext && (
                      <div className={cn(
                        "text-xs mt-1.5 font-medium leading-relaxed transition-all duration-200 whitespace-normal break-words",
                        isCorrectChoice
                          ? "inline-block px-2.5 py-1 rounded-xl bg-emerald-800/80 dark:bg-emerald-950/80 border border-emerald-600/50 text-emerald-50 font-semibold shadow-2xs"
                          : isSelected
                            ? "inline-block px-2.5 py-1 rounded-xl bg-rose-700/80 dark:bg-rose-950/80 border border-rose-500/50 text-rose-50 font-semibold shadow-2xs"
                            : "text-slate-500 dark:text-slate-400"
                      )}>
                        <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(subtext) }} />
                      </div>
                    )}
                  </div>

                  {/* Keyboard shortcut hint */}
                  {!answered && (
                    <span className="hidden sm:inline-flex items-center justify-center text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 shrink-0 ml-auto">
                      {idx + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </PracticeCardShell>
  )
}
