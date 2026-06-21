import React from 'react'
import { Lightbulb, Sparkles, StickyNote, X, Check, Edit3, FileText, HelpCircle, Brain, Copy, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'

const MarkdownComponents = {
  code({ node, className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '')
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>')
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: value }} {...props} />
      )
    }
    return <code className={className} {...props}>{children}</code>
  }
}

interface Question {
  id: number
  content: string
  explanation: string
  ai_explanation?: string
  mnemonic?: string | null
  hint?: string | null
  options: any[]
  others?: Record<string, any> | null
}

interface FeedbackAreaProps {
  showFeedback: boolean
  activeFeedbackTab: 'insight' | 'ai' | 'note' | 'card'
  setActiveFeedbackTab: (tab: 'insight' | 'ai' | 'note' | 'card') => void
  getInsightText: () => string
  isEditingInsight: boolean
  insightInput: string
  setInsightInput: (val: string) => void
  currentQuestion: Question | null
  canEdit: boolean
  clearAIExplanation: (field?: string) => void
  isEditingAI: boolean
  setIsEditingAI: (val: boolean) => void
  isEditingPrompt: boolean
  setIsEditingPrompt: (val: boolean) => void
  askAI: (field: string, customPrompt?: string) => void
  isAskingAI: boolean
  aiInput: string
  setAiInput: (val: string) => void
  promptInput: string
  setPromptInput: (val: string) => void
  savePrompt: (field: string) => void
  saveNote: () => void
  personalNote: string
  setPersonalNote: (val: string) => void
  isEditingNote: boolean
  setIsEditingNote: (val: boolean) => void
  isMobile?: boolean
  setIsFeedbackOpen?: (val: boolean) => void
  handleEditCurrentTab: () => void
  isCopyMenuOpen: boolean
  setIsCopyMenuOpen: (val: boolean) => void
  copyCurrentTabContent: (type?: 'default' | 'question' | 'prompt') => void
  isCopied: boolean
  handleNext: () => void
  selectedChoiceData?: any
  deckInfo?: any
}

export const FeedbackArea: React.FC<FeedbackAreaProps> = ({
  showFeedback,
  activeFeedbackTab,
  setActiveFeedbackTab,
  getInsightText,
  isEditingInsight,
  insightInput,
  setInsightInput,
  currentQuestion,
  canEdit,
  clearAIExplanation,
  isEditingAI,
  setIsEditingAI,
  isEditingPrompt,
  setIsEditingPrompt,
  askAI,
  isAskingAI,
  aiInput,
  setAiInput,
  promptInput,
  setPromptInput,
  savePrompt,
  saveNote,
  personalNote,
  setPersonalNote,
  isEditingNote,
  setIsEditingNote,
  isMobile = false,
  setIsFeedbackOpen,
  handleEditCurrentTab,
  isCopyMenuOpen,
  setIsCopyMenuOpen,
  copyCurrentTabContent,
  isCopied,
  handleNext,
  selectedChoiceData,
  deckInfo,
}) => {
  if (!showFeedback) return null

  const aiTabs = React.useMemo(() => {
    const tabs = []
    if (deckInfo?.ai_prompt || !(deckInfo?.ai_prompts && deckInfo.ai_prompts.length > 0)) {
      tabs.push({ id: 'explanation', title: 'Giải thích' })
    }
    if (deckInfo?.ai_prompts && Array.isArray(deckInfo.ai_prompts)) {
      tabs.push(...deckInfo.ai_prompts)
    }
    return tabs
  }, [deckInfo?.ai_prompt, deckInfo?.ai_prompts])

  const [activeAITab, setActiveAITab] = React.useState<string>(aiTabs[0]?.id || 'explanation')

  React.useEffect(() => {
    if (aiTabs.length > 0 && !aiTabs.some((t: any) => t.id === activeAITab)) {
      setActiveAITab(aiTabs[0].id)
    }
  }, [aiTabs, activeAITab])


  const getActiveAIContent = () => {
    if (!currentQuestion) return ''
    if (activeAITab === 'explanation') return currentQuestion.ai_explanation || ''
    return currentQuestion.others?.ai_responses?.[activeAITab] || ''
  }

  const getActivePromptTemplate = () => {
    if (activeAITab === 'explanation') return deckInfo?.ai_prompt || ''
    const custom = deckInfo?.ai_prompts?.find((p: any) => p.id === activeAITab)
    return custom?.prompt || ''
  }

  React.useEffect(() => {
    if (activeFeedbackTab === 'ai') {
      setAiInput(getActiveAIContent())
      setPromptInput(getActivePromptTemplate())
      setIsEditingAI(false)
      setIsEditingPrompt(false)
    }
  }, [activeAITab, activeFeedbackTab, currentQuestion?.id, deckInfo])

  const hasAIAnyContent = () => {
    if (!currentQuestion) return false
    if (currentQuestion.ai_explanation) return true
    if (currentQuestion.others?.ai_responses && Object.keys(currentQuestion.others.ai_responses).length > 0) return true
    return false
  }

  const tabs = [
    { id: 'insight' as const, label: 'INSIGHT', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100', hasContent: !!getInsightText() && getInsightText() !== 'No detail.' },
    { id: 'ai' as const, label: 'AI ANALYSIS', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-100', hasContent: hasAIAnyContent() },
    { id: 'note' as const, label: 'PERSONAL NOTE', icon: StickyNote, color: 'text-slate-400', bg: 'bg-slate-100', hasContent: !!personalNote },
    { id: 'card' as const, label: 'CARD INFO', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100', hasContent: !!selectedChoiceData }
  ]

  const renderTabContent = () => {
    switch (activeFeedbackTab) {
      case 'insight':
        return (
          <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 fill-amber-500" />
              </div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">INSIGHT</span>
            </div>
            <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words pr-2">
              {isEditingInsight ? (
                <textarea
                  value={insightInput}
                  onChange={(e) => setInsightInput(e.target.value)}
                  className="w-full h-80 p-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  placeholder="Enter explanation for this question..."
                />
              ) : (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                    {parseBBCodeToHtml(getInsightText())}
                  </ReactMarkdown>

                  {currentQuestion?.hint && (
                    <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 flex items-start gap-3 shadow-inner text-left animate-in slide-in-from-bottom-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black text-xs shadow shrink-0 mt-0.5">
                        💡
                      </div>
                      <div className="text-slate-700 font-semibold text-xs leading-relaxed flex-1 whitespace-pre-wrap">
                        <span className="font-black text-[9px] uppercase tracking-wider text-indigo-500 block mb-0.5">Gợi ý (Hint)</span>
                        {currentQuestion.hint}
                      </div>
                    </div>
                  )}

                  {currentQuestion?.mnemonic && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100/60 flex items-start gap-3 shadow-inner text-left animate-in slide-in-from-bottom-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-xs shadow shrink-0 mt-0.5">
                        🧠
                      </div>
                      <div className="text-slate-700 font-semibold text-xs leading-relaxed flex-1 whitespace-pre-wrap">
                        <span className="font-black text-[9px] uppercase tracking-wider text-amber-500 block mb-0.5">Mẹo nhớ (Mnemonic)</span>
                        {currentQuestion.mnemonic}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      case 'ai':
        return (
          <div className="p-6 rounded-[2rem] ai-glow animate-in fade-in slide-in-from-bottom-2">
            {/* AI Sub-tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 overflow-x-auto custom-scrollbar">
               {aiTabs.map((tab: any) => {
                  const isTabActive = activeAITab === tab.id
                  let tabHasContent = false
                  if (tab.id === 'explanation') tabHasContent = !!currentQuestion?.ai_explanation
                  else if (tab.id === 'mnemonic') tabHasContent = !!currentQuestion?.mnemonic
                  else if (tab.id === 'hint') tabHasContent = !!currentQuestion?.hint
                  else tabHasContent = !!currentQuestion?.others?.ai_responses?.[tab.id]

                  return (
                     <button
                        key={tab.id}
                        onClick={() => {
                           setActiveAITab(tab.id)
                           setIsEditingAI(false)
                           setIsEditingPrompt(false)
                        }}
                        className={cn(
                           "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5",
                           isTabActive ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        )}
                     >
                        <span>{tab.title || tab.label}</span>
                        {tabHasContent && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                     </button>
                  )
               })}
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                  AI {aiTabs.find((t: any) => t.id === activeAITab)?.title.toUpperCase()}
                </span>
                {canEdit && getActiveAIContent() && !isEditingAI && !isEditingPrompt && (
                  <button
                    onClick={() => clearAIExplanation(activeAITab)}
                    className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 shadow-sm transition-all ml-2"
                  >
                    CLEAR AI
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                      isEditingPrompt ? "bg-amber-600 text-white shadow-sm" : "text-amber-500 hover:text-amber-600 hover:bg-white"
                    )}
                  >
                    {isEditingPrompt ? 'CLOSE PROMPT' : 'PROMPT'}
                  </button>
                )}
                {!getActiveAIContent() && !isEditingAI && !isEditingPrompt && (
                  <button
                    onClick={() => askAI(activeAITab)}
                    disabled={isAskingAI}
                    className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    {isAskingAI ? 'ANALYZING...' : 'ASK AI INSIGHT'}
                  </button>
                )}
                {canEdit && !isEditingPrompt && (
                  <button
                    onClick={() => {
                      if (isEditingAI) {
                        askAI(activeAITab, aiInput)
                      } else {
                        setAiInput(getActiveAIContent())
                        setIsEditingAI(true)
                      }
                    }}
                    disabled={isAskingAI}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                      isEditingAI ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-400 hover:text-indigo-600 hover:bg-white"
                    )}
                  >
                    {isAskingAI ? 'SAVING...' : (isEditingAI ? 'SAVE AI' : 'EDIT')}
                  </button>
                )}
              </div>
            </div>

            {isEditingPrompt ? (
              <div className="space-y-3 mt-2 bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">EDIT SYSTEM PROMPT FOR {aiTabs.find((t: any) => t.id === activeAITab)?.title.toUpperCase()}</span>
                  <button
                    onClick={() => savePrompt(activeAITab)}
                    className="text-[9px] font-black bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                  >
                    SAVE PROMPT
                  </button>
                </div>
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Enter System Prompt to guide the AI..."
                  className="w-full h-80 bg-white rounded-xl p-4 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none border border-amber-200 resize-none transition-all"
                />
                <p className="text-[9px] font-medium text-amber-600/80 italic leading-relaxed">
                  * Guide: Use variables <code>{"{{question}}"}</code>, <code>{"{{options}}"}</code>, <code>{"{{correct_answer}}"}</code> to insert dynamic data. The new prompt will be applied to all subsequently regenerated questions.
                </p>
              </div>
            ) : isEditingAI ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Enter AI Analysis content manually..."
                  className="w-full h-80 bg-white/50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                  autoFocus
                />
                <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE AI' to save changes for everyone.</p>
              </div>
            ) : (
              isAskingAI ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-pulse">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping" />
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <Sparkles className="w-4 h-4 text-indigo-500 absolute animate-pulse" />
                  </div>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] text-center animate-bounce">
                    AI DEEP ANALYSIS IN PROGRESS...
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 max-w-xs text-center leading-relaxed">
                    Please wait a moment, the AI is deeply analyzing the grammar and vocabulary of this question.
                  </p>
                </div>
              ) : (
                getActiveAIContent() && (
                  <div className="text-slate-700 font-medium text-sm leading-relaxed markdown-content break-words pr-2 mt-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        ...MarkdownComponents,
                        p: ({ children }) => <span className="inline-block">{children}</span>
                      }}
                    >
                      {parseBBCodeToHtml(getActiveAIContent())}
                    </ReactMarkdown>
                  </div>
                )
              )
            )}
          </div>
        )
      case 'note':
        return (
          <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PERSONAL NOTE</span>
              </div>
              <button
                onClick={() => {
                  if (isEditingNote) {
                    saveNote()
                  }
                  setIsEditingNote(!isEditingNote)
                }}
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1 rounded-md",
                  isEditingNote ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                )}
              >
                {isEditingNote ? 'SAVE & CLOSE' : 'EDIT'}
              </button>
            </div>

            {!isEditingNote ? (
              <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content min-h-[100px] break-words pr-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                  {personalNote || '*Empty note.*'}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="Write your study notes here... (Supports Markdown)"
                  className="w-full h-80 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                  autoFocus
                />
                <p className="text-[8px] font-medium text-slate-300 italic">Supports Markdown syntax. Click 'SAVE & CLOSE' to complete.</p>
              </div>
            )}
          </div>
        )
      case 'card':
        if (!selectedChoiceData) {
          return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">Click on an option to view its full card info.</p>
            </div>
          )
        }
        return (
          <div className="p-6 rounded-[2rem] bg-blue-50/30 border border-blue-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
              </div>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">CARD INFO</span>
            </div>
            
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">FRONT (QUESTION)</h5>
                <div className="text-slate-800 font-bold text-lg leading-relaxed markdown-content whitespace-pre-wrap break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                    {parseBBCodeToHtml(selectedChoiceData.content || '')}
                  </ReactMarkdown>
                </div>
              </div>
              
              <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">BACK (EXPLANATION)</h5>
                <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                    {parseBBCodeToHtml(selectedChoiceData.explanation || '*No explanation available.*')}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {!isMobile && (
        <div className="p-6 border-b border-slate-50 flex items-center justify-center bg-white sticky top-0 z-10">
          <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Learning Insights</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        {renderTabContent()}
      </div>

      <div className={cn(
        "flex items-center justify-between gap-1.5 sm:gap-3 py-4 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-2 sm:px-6"
      )}>
        {isMobile && setIsFeedbackOpen && (
          <button
            onClick={() => setIsFeedbackOpen(false)}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 rounded-xl hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 active:scale-90 transition-all shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleEditCurrentTab}
          className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-90",
            ((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight))
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
              : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
          )}
        >
          {((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight)) ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] animate-pulse" />
          ) : (
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        <div className="flex items-center bg-slate-50 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl h-11 sm:h-14 border border-slate-200/60 shadow-inner gap-0.5 sm:gap-1">
          {tabs.map((tab) => {
            const isActive = activeFeedbackTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeedbackTab(tab.id)}
                className={cn(
                  "w-9 sm:w-12 h-9 sm:h-11 flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300 relative",
                  isActive
                    ? (
                      tab.id === 'insight' ? "text-amber-500 bg-white shadow-md border border-amber-100/60 scale-105" :
                      tab.id === 'ai' ? "text-indigo-600 bg-white shadow-md border border-indigo-100/60 scale-105" :
                      "text-emerald-600 bg-white shadow-md border border-emerald-100/60 scale-105"
                    )
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                )}
              >
                <div className="relative">
                  <tab.icon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300", isActive && "scale-110")} />
                  {tab.hasContent && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border border-white animate-pulse",
                      tab.id === 'insight' ? "bg-amber-500" :
                      tab.id === 'ai' ? "bg-indigo-600" :
                      "bg-emerald-500"
                    )} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="relative">
          <AnimatePresence>
            {isCopyMenuOpen && activeFeedbackTab === 'ai' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-16 right-0 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.12)] border border-slate-100/80 p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <button
                  onClick={() => copyCurrentTabContent('default')}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left animate-in fade-in"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Result</span>
                </button>
                <button
                  onClick={() => copyCurrentTabContent('question')}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Question</span>
                </button>
                <button
                  onClick={() => copyCurrentTabContent('prompt')}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-xl transition-all text-left"
                >
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-wider">Copy Prompt</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => {
              if (activeFeedbackTab === 'ai') setIsCopyMenuOpen(!isCopyMenuOpen)
              else copyCurrentTabContent()
            }}
            className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-90 shadow-sm",
              isCopied
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
                : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
            )}
          >
            {isCopied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        {isMobile && (
          <button
            onClick={() => {
              handleNext()
              if (setIsFeedbackOpen) setIsFeedbackOpen(false)
            }}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200/60 active:scale-90 hover:scale-105 hover:rotate-3 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
