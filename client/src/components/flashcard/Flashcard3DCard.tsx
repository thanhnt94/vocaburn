import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, RotateCcw, Check, AlertCircle, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { MarkdownComponents } from '@/lib/markdown'
import { parseBBCodeToHtml } from '@/lib/text'
import {
  parseUTCDate,
  formatRelativeTime,
  formatOverdueTime,
  getMasteryPill,
  getFSRSIntervals
} from '@/lib/flashcard-utils'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import { getFrontFontSizeStyle } from '@/components/common/study'

export interface Flashcard3DCardProps {
  currentQuestion: any
  currentIndex: number
  isFlipped: boolean
  setIsFlipped: (val: boolean) => void
  isSelectMode: boolean
  effectiveCardFlipTrigger: string
  setIsFlyToolbarOpen: (open: boolean) => void
  setShowFeedback: (val: boolean) => void
  setJustAnswered: (val: boolean) => void
  handleStarQuestion: () => void
  frontValign: 'center' | 'top'
  frontHalign: 'left' | 'center'
  frontFontSize?: string
  backValign: 'center' | 'top'
  backHalign: 'left' | 'center'
  showImages: any
  setZoomedImage: (url: string | null) => void
  effectiveShowFsrs: boolean
  selectedOption: number | null
  hasRated: boolean
  activeDragGrade: any
  dragOffset: { x: number; y: number }
  canDragRate: boolean
  hasBackOverflow: boolean
  backScrollRef: React.RefObject<HTMLDivElement | null>
  handleCardDrag: (event: any, info: any) => void
  handleCardDragEnd: (event: any, info: any) => void
  cardDragControls: any
  activeMasteryUpgrade: any
  currentTime: Date
  showAbsoluteFirst: boolean
  setShowAbsoluteFirst: React.Dispatch<React.SetStateAction<boolean>>
  showAbsoluteLast: boolean
  setShowAbsoluteLast: React.Dispatch<React.SetStateAction<boolean>>
  renderFlyToolbarNode: (isCardSlot: boolean) => React.ReactNode
  activeMode?: string
  handleNext?: () => void
}

export const Flashcard3DCard: React.FC<Flashcard3DCardProps> = ({
  currentQuestion,
  currentIndex,
  isFlipped,
  setIsFlipped,
  isSelectMode,
  effectiveCardFlipTrigger,
  setIsFlyToolbarOpen,
  setShowFeedback,
  setJustAnswered,
  handleStarQuestion,
  frontValign,
  frontHalign,
  frontFontSize,
  backValign,
  backHalign,
  showImages,
  setZoomedImage,
  effectiveShowFsrs,
  selectedOption,
  hasRated,
  activeDragGrade,
  dragOffset,
  canDragRate,
  hasBackOverflow,
  backScrollRef,
  handleCardDrag,
  handleCardDragEnd,
  cardDragControls,
  activeMasteryUpgrade,
  currentTime,
  showAbsoluteFirst,
  setShowAbsoluteFirst,
  showAbsoluteLast,
  setShowAbsoluteLast,
  renderFlyToolbarNode,
  activeMode,
  handleNext
}) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 relative perspective-1000">
      <motion.div
        className="w-full h-full relative cursor-grab active:cursor-grabbing"
        drag={canDragRate ? true : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.65}
        onDrag={handleCardDrag}
        onDragEnd={handleCardDragEnd}
        animate={cardDragControls}
        style={{
          touchAction: isSelectMode
            ? 'auto'
            : (canDragRate ? (hasBackOverflow ? 'pan-y' : 'none') : 'pan-y'),
        }}
      >
        <div
          className="preserve-3d w-full h-full relative transition-transform duration-700 ease-out-quint"
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* ═══════════ FRONT SIDE ═══════════ */}
          <div
            onClick={(e) => {
              if (isSelectMode) return;
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[data-no-flip]')) {
                return;
              }
              if (effectiveCardFlipTrigger !== 'button_only') {
                setIsFlipped(true);
                setIsFlyToolbarOpen(false);
                setShowFeedback(true);
                setJustAnswered(true);
              }
            }}
            className={cn(
              "absolute inset-0 backface-hidden bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 px-3 md:px-8 pt-2.5 md:pt-2 pb-2.5 md:pb-4 flex flex-col justify-between shadow-2xl shadow-indigo-100/40",
              !isSelectMode && effectiveCardFlipTrigger !== 'button_only' && "cursor-pointer",
              isSelectMode && "cursor-text select-text"
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'none',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              pointerEvents: 'auto',
              zIndex: isFlipped ? 1 : 2,
              visibility: isFlipped ? 'hidden' : 'visible',
              transition: 'visibility 0s ' + (isFlipped ? '0.7s' : '0s'),
            }}
          >
            {/* Top Stats Banner */}
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 uppercase shadow-sm">
                  FRONT
                </span>
                <span className="text-[10px] font-black tracking-wider text-white bg-indigo-500 px-3 py-1.5 rounded-xl border border-indigo-600 shadow-sm">
                  {currentQuestion?.original_index ?? (currentIndex + 1)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {currentQuestion && getMasteryPill(currentQuestion)}
                {currentQuestion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStarQuestion();
                    }}
                    className={cn(
                      "w-7.5 h-7.5 flex items-center justify-center rounded-xl border transition-all active:scale-90",
                      currentQuestion.is_starred
                        ? "bg-amber-50 border-amber-300 text-amber-500 shadow-sm"
                        : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                    )}
                    title={currentQuestion.is_starred ? "Unstar Card" : "Star Card"}
                  >
                    <Star className={cn("w-4 h-4", currentQuestion.is_starred && "fill-amber-500 text-amber-500")} />
                  </button>
                )}
              </div>
            </div>

            {/* Word / Question Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-2 py-2 flex flex-col">
              <div className={cn(
                "w-full flex flex-col gap-6",
                frontValign === 'top' ? "mt-0 mb-auto" : "my-auto",
                frontHalign === 'center' ? "items-center text-center" : "items-start text-left"
              )}>
                {(showImages as any === 'always' || showImages as any === 'front' || showImages as any === true || showImages as any === 'true') && (currentQuestion?.front_img || currentQuestion?.others?.front_img) && (
                  <img 
                    src={resolveMediaUrl(currentQuestion.front_img || currentQuestion.others?.front_img) || undefined} 
                    alt="Front Visual" 
                    className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500 cursor-zoom-in hover:opacity-95 transition-opacity"
                    onClick={() => setZoomedImage(resolveMediaUrl(currentQuestion.front_img || currentQuestion.others?.front_img) || null)}
                  />
                )}
                <div 
                  className={cn(
                    "font-black text-slate-800 tracking-tight leading-normal max-w-2xl markdown-content whitespace-pre-wrap flex flex-col w-full",
                    frontHalign === 'center' ? "items-center text-center" : "items-start text-left"
                  )}
                  style={{
                    textAlign: frontHalign === 'center' ? 'center' : 'left',
                    fontSize: getFrontFontSizeStyle(frontFontSize)
                  }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeRaw]} 
                    components={{
                      ...MarkdownComponents,
                      p: ({ children }) => (
                        <p 
                          className={cn("mb-2 last:mb-0 whitespace-pre-wrap w-full", frontHalign === 'center' ? "text-center" : "text-left")}
                          style={{ textAlign: frontHalign === 'center' ? 'center' : 'left' }}
                        >
                          {children}
                        </p>
                      )
                    }}
                  >
                    {parseBBCodeToHtml(currentQuestion?.content || '')}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Bottom Slot on FRONT Face */}
            <div className="mt-2 shrink-0 relative w-full h-[46px] select-none flex items-center">
              <div className="absolute inset-0 rounded-full border border-transparent bg-transparent pointer-events-none" />
              <div className="absolute left-[4px] bottom-1 z-30">
                {renderFlyToolbarNode(true)}
              </div>
            </div>
          </div>

          {/* ═══════════ BACK SIDE ═══════════ */}
          <div
            onClick={(e) => {
              if (isSelectMode) return;
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea') || target.closest('[data-no-flip]')) {
                return;
              }
              if (window.getSelection() && window.getSelection()!.toString().length > 0) {
                return;
              }
              if (effectiveCardFlipTrigger !== 'button_only') {
                if (activeMode === 'speed_skim' || activeMode === 'skim') {
                  handleNext?.();
                } else {
                  setIsFlipped(false);
                  setIsFlyToolbarOpen(false);
                }
              }
            }}
            className={cn(
              "absolute inset-0 backface-hidden bg-white md:rounded-[2rem] rounded-[1.25rem] border px-3 md:px-8 pt-2.5 md:pt-2 pb-2.5 md:pb-4 flex flex-col justify-between shadow-2xl transition-all duration-200",
              !isSelectMode && effectiveCardFlipTrigger !== 'button_only' && "cursor-pointer",
              isSelectMode && "cursor-text select-text",
              activeDragGrade?.direction === 'again' ? "border-rose-400 shadow-rose-200/60 ring-2 ring-rose-400/20" :
              activeDragGrade?.direction === 'good' ? "border-indigo-400 shadow-indigo-200/60 ring-2 ring-indigo-400/20" :
              activeDragGrade?.direction === 'hard' ? "border-amber-400 shadow-amber-200/60 ring-2 ring-amber-400/20" :
              activeDragGrade?.direction === 'easy' ? "border-emerald-400 shadow-emerald-200/60 ring-2 ring-emerald-400/20" :
              "border-slate-200 shadow-indigo-100/40"
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              pointerEvents: 'auto',
              zIndex: isFlipped ? 2 : 1,
              visibility: isFlipped ? 'visible' : 'hidden',
              transition: 'visibility 0s ' + (isFlipped ? '0s' : '0.7s'),
            }}
          >
            {/* Top Banner */}
            <div 
              className="flex items-center justify-between select-none"
              style={{ touchAction: 'none' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase shadow-sm">
                  BACK
                </span>
                <span className="text-[10px] font-black tracking-wider text-white bg-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-600 shadow-sm">
                  {currentQuestion?.original_index ?? (currentIndex + 1)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {currentQuestion && getMasteryPill(currentQuestion)}
                {currentQuestion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStarQuestion();
                    }}
                    className={cn(
                      "w-7.5 h-7.5 flex items-center justify-center rounded-xl border transition-all active:scale-90",
                      currentQuestion.is_starred
                        ? "bg-amber-50 border-amber-300 text-amber-500 shadow-sm"
                        : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                    )}
                    title={currentQuestion.is_starred ? "Unstar Card" : "Star Card"}
                  >
                    <Star className={cn("w-4 h-4", currentQuestion.is_starred && "fill-amber-500 text-amber-500")} />
                  </button>
                )}
              </div>
            </div>

            {/* Definition & explanation */}
            <div 
              ref={backScrollRef}
              className={cn("flex-1 overflow-y-auto custom-scrollbar my-2 md:my-3 flex flex-col pr-1 md:pr-2 pb-16", isSelectMode && "select-text cursor-text")}
              style={{
                touchAction: isSelectMode ? 'auto' : (hasBackOverflow ? 'pan-y' : (canDragRate ? 'none' : 'pan-y')),
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              <div className={cn(
                "w-full flex flex-col gap-3 md:gap-4",
                backValign === 'top' ? "mt-0 mb-auto" : "my-auto",
                backHalign === 'center' ? "items-center text-center" : "items-start text-left",
                isSelectMode && "select-text cursor-text"
              )}>
                {/* Show the correct options or direct explanation */}
                {currentQuestion?.options && currentQuestion.options.length > 0 && (
                  <div className={cn("space-y-2 w-full", backHalign === 'center' ? "flex justify-center" : "")}>
                    <div className="md:p-6 p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100/80 flex items-start gap-4 w-full">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 mt-0.5">
                        ✓
                      </div>
                      <div 
                        className={cn(
                          "text-slate-800 font-extrabold text-2xl md:text-3xl lg:text-4xl leading-snug markdown-content flex-1 whitespace-pre-wrap",
                          backHalign === 'center' ? "text-center" : "text-left",
                          isSelectMode && "select-text cursor-text"
                        )}
                        style={{ textAlign: backHalign === 'center' ? 'center' : 'left' }}
                      >
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeRaw]} 
                          components={{
                            ...MarkdownComponents,
                            p: ({ children }) => (
                              <p 
                                className={cn("mb-2 last:mb-0 whitespace-pre-wrap w-full", backHalign === 'center' ? "text-center" : "text-left")}
                                style={{ textAlign: backHalign === 'center' ? 'center' : 'left' }}
                              >
                                {children}
                              </p>
                            )
                          }}
                        >
                          {parseBBCodeToHtml(currentQuestion.options.find((o: any) => o.is_correct)?.content || "Definition revealed.")}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {(showImages as any === 'always' || showImages as any === 'back' || showImages as any === true || showImages as any === 'true') && (currentQuestion?.back_img || currentQuestion?.others?.back_img) && (
                  <div className="space-y-2 flex justify-center w-full">
                    <img 
                      src={resolveMediaUrl(currentQuestion.back_img || currentQuestion.others?.back_img) || undefined} 
                      alt="Back Visual" 
                      className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500 cursor-zoom-in hover:opacity-95 transition-opacity"
                      onClick={() => setZoomedImage(resolveMediaUrl(currentQuestion.back_img || currentQuestion?.others?.back_img) || null)}
                    />
                  </div>
                )}

                {currentQuestion?.mnemonic && (
                  <div className={cn("p-4 rounded-2xl bg-amber-50/50 border border-amber-100/60 flex items-start gap-3 shadow-inner mt-2 animate-in slide-in-from-bottom-3 duration-500 w-full text-left", isSelectMode && "select-text cursor-text")}>
                    <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 mt-0.5">
                      💡
                    </div>
                    <div className={cn("text-slate-700 font-bold text-xs md:text-sm leading-relaxed flex-1 whitespace-pre-wrap", isSelectMode && "select-text cursor-text")}>
                      <span className="font-black text-[9px] uppercase tracking-wider text-amber-500 block mb-0.5">AI Mnemonic</span>
                      {currentQuestion.mnemonic}
                    </div>
                  </div>
                )}

                {currentQuestion?.explanation && (
                  <div 
                    className={cn("w-full bg-white flex flex-col min-h-0", backHalign === 'center' ? "text-center items-center" : "text-left items-start", isSelectMode && "select-text cursor-text")}
                    style={{ textAlign: backHalign === 'center' ? 'center' : 'left' }}
                  >
                    <div 
                      className={cn(
                        "text-slate-700 font-bold text-xl md:text-2xl leading-relaxed markdown-content w-full whitespace-pre-wrap",
                        backHalign === 'center' ? "text-center" : "text-left",
                        isSelectMode && "select-text cursor-text"
                      )}
                      style={{ textAlign: backHalign === 'center' ? 'center' : 'left' }}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeRaw]} 
                        components={{
                          ...MarkdownComponents,
                          p: ({ children }) => (
                            <p 
                              className={cn("mb-2 last:mb-0 whitespace-pre-wrap w-full", backHalign === 'center' ? "text-center" : "text-left")}
                              style={{ textAlign: backHalign === 'center' ? 'center' : 'left' }}
                            >
                              {children}
                            </p>
                          )
                        }}
                      >
                        {parseBBCodeToHtml(currentQuestion.explanation)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Answer Frequency & Statistics Bar */}
            {(() => {
              const stats = currentQuestion?.stats || { 
                total: 0, 
                correct: 0, 
                wrong: 0, 
                avg_time: 0,
                again_count: 0,
                hard_count: 0,
                good_count: 0,
                easy_count: 0
              };
              const allTimeTotal = stats.total || 0;
              const allTimeCorrect = stats.correct || 0;
              const allTimeAccuracy = allTimeTotal > 0 ? Math.round((allTimeCorrect / allTimeTotal) * 100) : 0;

              return effectiveShowFsrs ? (
                <div className="md:mt-3 mt-1.5 p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>Card Performance Stats</span>
                    <span>{allTimeTotal} reviews {allTimeTotal > 0 && `(Accuracy: ${allTimeAccuracy}%)`}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-rose-50/80 border border-rose-100/50 text-rose-600 shadow-sm">
                      <span className="text-[8px] font-black tracking-wider uppercase">Again</span>
                      <span className="text-xs font-black">{stats.again_count || 0}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-amber-50/80 border border-amber-100/50 text-amber-600 shadow-sm">
                      <span className="text-[8px] font-black tracking-wider uppercase">Hard</span>
                      <span className="text-xs font-black">{stats.hard_count || 0}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-indigo-50/80 border border-indigo-100/50 text-indigo-600 shadow-sm">
                      <span className="text-[8px] font-black tracking-wider uppercase">Good</span>
                      <span className="text-xs font-black">{stats.good_count || 0}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100/50 text-emerald-600 shadow-sm">
                      <span className="text-[8px] font-black tracking-wider uppercase">Easy</span>
                      <span className="text-xs font-black">{stats.easy_count || 0}</span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* FSRS Stats Row */}
            {effectiveShowFsrs && currentQuestion?.fsrs && (() => {
              const firstLearnedInfo = formatRelativeTime(currentQuestion.fsrs.first_learned);
              const lastReviewedInfo = formatRelativeTime(currentQuestion.fsrs.last_reviewed);
              
              return (
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 rounded-2xl px-1 py-1.5 sm:px-1.5 sm:py-2 border border-slate-100/90 text-[9px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.01),inset_0_1px_2px_rgba(255,255,255,0.6)] backdrop-blur-md w-full md:mt-3 mt-1.5 gap-0.5 sm:gap-1.5 animate-fadeIn">
                  {/* Overdue */}
                  {(() => {
                    const overdueInfo = formatOverdueTime(currentQuestion.fsrs?.due);
                    return (
                      <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0 cursor-pointer select-none" title={overdueInfo.full}>
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Overdue</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-lg border text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-0.5 truncate transition-all duration-300 shadow-2xs",
                          overdueInfo.overdue
                            ? (overdueInfo.severe ? "bg-rose-500/10 text-rose-600 border-rose-500/25 shadow-rose-500/5" : "bg-amber-500/10 text-amber-600 border-amber-500/25 shadow-amber-500/5")
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 shadow-emerald-500/5"
                        )}>
                          {overdueInfo.overdue && (
                            <span className={cn("w-1 h-1 rounded-full animate-ping", overdueInfo.severe ? "bg-rose-500" : "bg-amber-500")} />
                          )}
                          <span>{overdueInfo.relative}</span>
                        </span>
                      </div>
                    );
                  })()}
                  <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                  {/* Stability */}
                  <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Stability</span>
                    <span className="bg-indigo-50/40 text-indigo-600 border border-indigo-100/30 px-1.5 py-0.5 rounded-lg font-black text-[10px] sm:text-[11.5px] shadow-sm flex items-center gap-0.5 truncate">
                      {currentQuestion.fsrs.stability ? (
                        <>
                          <span className="tracking-tight">{currentQuestion.fsrs.stability.toFixed(2)}</span>
                          <span className="text-[8.5px] font-bold opacity-75">d</span>
                        </>
                      ) : (
                        'none'
                      )}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                  {/* Difficulty */}
                  <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Difficulty</span>
                    <span className="bg-purple-50/40 text-purple-600 border border-purple-100/30 px-1.5 py-0.5 rounded-lg font-black text-[10px] sm:text-[11.5px] shadow-sm flex items-center gap-0.5 truncate">
                      {currentQuestion.fsrs.difficulty ? (
                        <span className="tracking-tight">{currentQuestion.fsrs.difficulty.toFixed(2)}</span>
                      ) : (
                        'none'
                      )}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                  {/* First Learned */}
                  <div 
                    className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0 cursor-pointer select-none hover:opacity-80 transition-opacity"
                    onClick={() => setShowAbsoluteFirst(prev => !prev)}
                    title={firstLearnedInfo.full}
                  >
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">First</span>
                    <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-1.5 py-0.5 rounded-lg font-black text-[9.5px] sm:text-[11px] shadow-sm truncate">
                      {showAbsoluteFirst ? firstLearnedInfo.full : firstLearnedInfo.relative}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                  {/* Last Reviewed */}
                  <div 
                    className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0 cursor-pointer select-none hover:opacity-80 transition-opacity"
                    onClick={() => setShowAbsoluteLast(prev => !prev)}
                    title={lastReviewedInfo.full}
                  >
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Last</span>
                    <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-1.5 py-0.5 rounded-lg font-black text-[9.5px] sm:text-[11px] shadow-sm truncate">
                      {showAbsoluteLast ? lastReviewedInfo.full : lastReviewedInfo.relative}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Slot on BACK Face */}
            {(() => {
              const isCardRated = isFlipped && hasRated && selectedOption !== null && selectedOption !== undefined;
              let countdownStr = "";
              if (isCardRated) {
                const dueTimeStr = currentQuestion?.fsrs?.due;
                if (dueTimeStr) {
                  const diff = parseUTCDate(dueTimeStr).getTime() - currentTime.getTime();
                  if (diff > 0) {
                    const secs = Math.floor(diff / 1000) % 60;
                    const mins = Math.floor(diff / (1000 * 60)) % 60;
                    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    
                    const parts = [];
                    if (days > 0) parts.push(`${days}d`);
                    if (hours > 0 || days > 0) parts.push(`${hours}h`);
                    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
                    parts.push(`${secs}s`);
                    countdownStr = parts.join(' ');
                  }
                }
                
                if (!countdownStr) {
                  const dynamicIntervals = getFSRSIntervals(currentQuestion?.fsrs);
                  if (selectedOption === 0) countdownStr = dynamicIntervals[1] || "1m";
                  else if (selectedOption === 1) countdownStr = dynamicIntervals[2] || "5m";
                  else if (selectedOption === 2) countdownStr = dynamicIntervals[3] || "10m";
                  else countdownStr = dynamicIntervals[4] || "4d";
                }
              }

              return (
                <div className="mt-2 shrink-0 relative w-full h-[46px] select-none flex items-center">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full border flex items-center justify-center font-bold transition-all duration-300 pointer-events-none px-4",
                      isCardRated
                        ? cn(
                            "opacity-100",
                            selectedOption === 0 ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" :
                            selectedOption === 1 ? "bg-amber-50 border-amber-200 text-amber-700" :
                            selectedOption === 2 ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                            "bg-emerald-50 border-emerald-200 text-emerald-700"
                          )
                        : "opacity-0 border-transparent bg-transparent"
                    )}
                  >
                    {isCardRated && (
                      <div className="flex items-center justify-center gap-1.5 text-center truncate px-20">
                        <span className="text-xs sm:text-sm font-black tracking-wide">
                          ✓ {selectedOption === 0 ? "AGAIN" : selectedOption === 1 ? "HARD" : selectedOption === 2 ? "GOOD" : "EASY"}
                        </span>
                        <span className="opacity-80 text-xs font-semibold">
                          — Unlocks in {countdownStr} ⏳
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="absolute left-[4px] bottom-1 z-30">
                    {renderFlyToolbarNode(true)}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Floating Dynamic Stamp Badge */}
        {activeDragGrade && (
          <div 
            className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center"
            style={{ opacity: Math.min(Math.max((Math.hypot(dragOffset.x, dragOffset.y) - 20) / 45, 0), 1) }}
          >
            <div
              className={cn(
                "px-6 py-3 rounded-2xl border-4 font-black text-2xl md:text-3xl tracking-widest shadow-2xl backdrop-blur-md transform uppercase flex items-center gap-3",
                activeDragGrade.direction === 'again' && "border-rose-500 text-rose-600 bg-rose-50/95 -rotate-12 shadow-rose-500/30",
                activeDragGrade.direction === 'good' && "border-indigo-500 text-indigo-600 bg-indigo-50/95 rotate-12 shadow-indigo-500/30",
                activeDragGrade.direction === 'hard' && "border-amber-500 text-amber-600 bg-amber-50/95 shadow-amber-500/30",
                activeDragGrade.direction === 'easy' && "border-emerald-500 text-emerald-600 bg-emerald-50/95 -rotate-6 shadow-emerald-500/30",
              )}
            >
              {activeDragGrade.direction === 'again' && <RotateCcw className="w-7 h-7 stroke-[2.5]" />}
              {activeDragGrade.direction === 'good' && <Check className="w-7 h-7 stroke-[2.5]" />}
              {activeDragGrade.direction === 'hard' && <AlertCircle className="w-7 h-7 stroke-[2.5]" />}
              {activeDragGrade.direction === 'easy' && <Zap className="w-7 h-7 stroke-[2.5]" />}
              <span>{activeDragGrade.label}</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Level Up Celebration Overlay */}
      <AnimatePresence>
        {activeMasteryUpgrade && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-md z-[250] flex flex-col items-center justify-center text-center p-6 md:rounded-[2rem] rounded-[1.25rem] border-2 border-indigo-200/50 shadow-2xl"
          >
            <motion.div 
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 150 }}
              className="text-6xl mb-3 drop-shadow-lg"
            >
              🎉
            </motion.div>
            <h3 className="text-xl font-black text-indigo-600 uppercase tracking-widest mb-1.5 animate-pulse">
              Card Leveled Up!
            </h3>
            <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">
              Memory Stability Upgraded
            </p>
            
            <div className="flex items-center gap-5 bg-slate-50/80 px-5 py-4 rounded-3xl border border-slate-100 shadow-inner">
              <div className="text-center">
                <span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Previous Level</span>
                <span className="px-3.5 py-1.5 bg-slate-200/80 text-slate-600 rounded-xl text-xs font-black">Level {activeMasteryUpgrade.old_level}</span>
              </div>
              <div className="text-indigo-500 font-black text-lg animate-pulse">➔</div>
              <div className="text-center">
                <span className="text-[8px] font-black text-emerald-400 block mb-1 uppercase tracking-widest">New Level</span>
                <span className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200/60 flex items-center gap-1">
                  Level {activeMasteryUpgrade.new_level} ⚡
                </span>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-300 italic mt-6">Card Mastered Successfully!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
