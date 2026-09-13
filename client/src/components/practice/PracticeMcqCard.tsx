import React from 'react'
import { Sparkles, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface PracticeMcqCardProps {
  currentIndex: number
  currentQuestion: Question | null
  practiceData: PracticeQuestionData
  answered: boolean
  selectedOption: number | null
  starredCards: Record<number, boolean>
  onToggleStar: (cardId: number) => void
  onSelectOption: (index: number) => void
  onPreviewInsight: (card: any) => void
  sessionQuestions?: Question[]
}

const getVal = (card: any, key: string) => {
  if (!card) return ''
  return card[key] || card.others?.[key] || ''
}

export const PracticeMcqCard: React.FC<PracticeMcqCardProps> = ({
  currentIndex,
  currentQuestion,
  practiceData,
  answered,
  selectedOption,
  starredCards,
  onToggleStar,
  onSelectOption,
  onPreviewInsight,
  sessionQuestions = []
}) => {
  const { question, choices, choice_item_ids, correct_index, question_key, answer_key } = practiceData

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-amber-50/15 to-slate-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 md:rounded-[2.5rem] rounded-[1.5rem] border border-slate-100/80 dark:border-slate-800 md:p-6 p-3 flex flex-col justify-between gap-3 md:gap-5 shadow-2xl shadow-amber-100/20 dark:shadow-none min-h-0 overflow-y-auto custom-scrollbar">
      {/* ── Top Question Card (Clean Warm Amber Mesh Glassmorphism) ── */}
      <div className="w-full max-w-2xl mx-auto my-auto animate-in fade-in slide-in-from-top-3 duration-500 shrink-0">
        <div className="w-full bg-gradient-to-b from-amber-50/80 via-orange-50/30 to-white/95 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-900/95 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-[0_12px_36px_rgba(245,158,11,0.08)] dark:shadow-none border border-amber-100/80 dark:border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-200/25 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-orange-100/35 dark:bg-orange-500/10 blur-2xl pointer-events-none" />

          {/* Top Row: Question Pill on Left, Bookmark on Right */}
          <div className="w-full flex items-center justify-between mb-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-black text-xs shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-300" />
              <span>Question {currentIndex + 1}</span>
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (currentQuestion?.id) {
                  onToggleStar(currentQuestion.id)
                }
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-400 hover:text-amber-600 dark:text-amber-400/80 dark:hover:text-amber-300 hover:bg-amber-50/80 dark:hover:bg-amber-950/40 transition-all active:scale-90 cursor-pointer touch-manipulation"
              title={currentQuestion?.id && starredCards[currentQuestion.id] ? "Remove bookmark" : "Bookmark question"}
            >
              <Bookmark className={cn("w-5 h-5 transition-colors", currentQuestion?.id && starredCards[currentQuestion.id] ? "fill-amber-500 text-amber-500" : "text-amber-400")} />
            </button>
          </div>

          {/* Question Text */}
          <div className="my-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 leading-tight tracking-wide font-sans px-2">
              <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }} />
            </h2>
          </div>
        </div>
      </div>

      {/* ── MCQ Choices (A, B, C, D) ── */}
      <div className="w-full max-w-2xl mx-auto shrink-0">
        {choices && choices.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 md:gap-3 mb-1 md:mb-2">
            {choices.map((choice: string, idx: number) => {
              const isSelected = selectedOption === idx
              const isCorrectChoice = idx === correct_index
              const letter = String.fromCharCode(65 + idx) // A, B, C, D

              let cardStyle = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-md text-slate-800 dark:text-slate-100"
              let badgeStyle = "bg-amber-50/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-100/80 dark:border-amber-800/60"

              const oppositeText = answered ? (() => {
                const qKey = practiceData.question_key || currentQuestion?.practice?.question_key || 'front'
                const rawAKey = practiceData.answer_key || currentQuestion?.practice?.answer_key || 'back'
                const aKey = Array.isArray(rawAKey) ? (rawAKey[0] || 'back') : (rawAKey || 'back')

                // 1. Primary: Direct lookup from choices_data
                const cData = practiceData.choices_data?.[idx] || currentQuestion?.practice?.choices_data?.[idx]
                if (cData) {
                  const qVal = cData.q_text || cData.front || (cData.card && (getVal(cData.card, qKey) || cData.card.content || cData.card.front))
                  if (qVal && String(qVal).trim() && String(qVal).trim().toLowerCase() !== String(choice || "").trim().toLowerCase()) {
                    return String(qVal).trim()
                  }
                }

                // 2. Secondary: lookup by choice_item_ids
                const choiceIds = choice_item_ids || practiceData.choice_item_ids || currentQuestion?.practice?.choice_item_ids
                let qData: any = null
                if (choiceIds && sessionQuestions.length > 0 && choiceIds[idx] !== undefined) {
                  const selectedId = choiceIds[idx]
                  qData = sessionQuestions.find((q: any) => String(q.id) === String(selectedId))
                }

                // 3. Tertiary: lookup in sessionQuestions matching choice text
                if (!qData && sessionQuestions.length > 0) {
                  const choiceNorm = String(choice || "").trim().toLowerCase()
                  qData = sessionQuestions.find((q: any) => {
                    const valA = (getVal(q, aKey) || "").toLowerCase()
                    const valBack = (getVal(q, 'back') || q.explanation || "").toLowerCase()
                    return (valA && valA === choiceNorm) || (valBack && valBack === choiceNorm)
                  })
                  if (!qData) {
                    qData = sessionQuestions.find((q: any) => {
                      const valQ = (getVal(q, qKey) || "").toLowerCase()
                      const valFront = (getVal(q, 'front') || q.content || "").toLowerCase()
                      return (valQ && valQ === choiceNorm) || (valFront && valFront === choiceNorm)
                    })
                  }
                }

                if (qData) {
                  const result = getVal(qData, qKey) || qData.content || qData.front || ''
                  if (result && result.toLowerCase() !== String(choice || "").trim().toLowerCase()) {
                    return result
                  }
                }

                return ''
              })() : ''

              if (answered) {
                if (isCorrectChoice) {
                  cardStyle = "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 shadow-md shadow-emerald-100/50 dark:shadow-none scale-[1.01]"
                  badgeStyle = "bg-emerald-500 text-white border-emerald-500"
                } else if (isSelected) {
                  cardStyle = "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 shadow-md shadow-rose-100/50 dark:shadow-none"
                  badgeStyle = "bg-rose-500 text-white border-rose-500"
                } else {
                  cardStyle = "bg-slate-50/60 dark:bg-slate-850/60 border-slate-100/60 dark:border-slate-800/60 opacity-50 text-slate-400 dark:text-slate-500"
                  badgeStyle = "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!answered) {
                      onSelectOption(idx)
                    } else {
                      let choiceObj: any = null
                      if (practiceData.choices_data && practiceData.choices_data[idx]) {
                        choiceObj = practiceData.choices_data[idx]
                      }

                      const choiceText = choice
                      const choiceNorm = String(choiceText || "").trim().toLowerCase()
                      const qKey = practiceData.question_key || 'front'
                      const rawAKey = practiceData.answer_key || 'back'
                      const aKey = Array.isArray(rawAKey) ? (rawAKey[0] || 'back') : (rawAKey || 'back')

                      let qData: any = null
                      if (choice_item_ids && sessionQuestions.length > 0 && choice_item_ids[idx] !== undefined) {
                        const selectedId = choice_item_ids[idx]
                        qData = sessionQuestions.find((q: any) => String(q.id) === String(selectedId))
                      }

                      if (!qData && sessionQuestions.length > 0) {
                        qData = sessionQuestions.find((q: any) => {
                          const valA = getVal(q, aKey).toLowerCase()
                          const valBack = (getVal(q, 'back') || q.explanation || "").toLowerCase()
                          return (valA && valA === choiceNorm) || (valBack && valBack === choiceNorm)
                        })

                        if (!qData) {
                          qData = sessionQuestions.find((q: any) => {
                            const valQ = getVal(q, qKey).toLowerCase()
                            const valFront = (getVal(q, 'front') || q.content || "").toLowerCase()
                            return (valQ && valQ === choiceNorm) || (valFront && valFront === choiceNorm)
                          })
                        }
                      }

                      const cardIdFromChoice = choice_item_ids?.[idx] || choiceObj?.card?.id || choiceObj?.id
                      const rawCardFromSession = sessionQuestions.find((q: any) => String(q.id) === String(cardIdFromChoice))
                      const targetCard = rawCardFromSession || qData || choiceObj?.card || choiceObj

                      if (targetCard) {
                        onPreviewInsight(targetCard)
                      } else {
                        onPreviewInsight({
                          content: choiceText,
                          explanation: oppositeText,
                          front: choiceText,
                          back: oppositeText
                        })
                      }
                    }
                  }}
                  className={cn(
                    "group w-full p-3.5 md:p-4 rounded-2xl md:rounded-[1.25rem] border text-left font-bold text-sm md:text-base transition-all duration-200 flex items-center justify-between gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)] active:scale-[0.99] cursor-pointer touch-manipulation",
                    cardStyle
                  )}
                >
                  {/* Left: Letter Badge + Choice Text */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn(
                        "w-8.5 h-8.5 md:w-9.5 md:h-9.5 rounded-full flex items-center justify-center text-xs md:text-sm font-black border flex-shrink-0 transition-colors shadow-sm",
                        badgeStyle
                      )}>
                        {letter}
                      </span>
                      <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[8.5px] font-mono font-bold rounded border border-slate-300/80 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-2xs">
                        {idx + 1}
                      </kbd>
                    </div>
                    <span className="leading-snug truncate" dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice) }} />
                  </div>

                  {/* Right: Split Word Badge (when answered) OR Radio Circle (when not answered) */}
                  {answered ? (
                    oppositeText ? (
                      <div className="flex items-center shrink-0 pl-3 border-l border-slate-200/80 dark:border-slate-800">
                        <span className={cn(
                          "px-2.5 py-1 rounded-xl text-xs md:text-sm font-black tracking-wide shadow-sm font-sans transition-all",
                          isCorrectChoice
                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                            : isSelected
                            ? "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        )}>
                          {oppositeText}
                        </span>
                      </div>
                    ) : null
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-amber-300 dark:group-hover:border-amber-500/50 flex items-center justify-center flex-shrink-0 transition-all" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PracticeMcqCard
