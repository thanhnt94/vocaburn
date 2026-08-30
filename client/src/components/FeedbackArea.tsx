import React from 'react'
import { Lightbulb, Sparkles, StickyNote, X, Check, Edit3, FileText, Copy, ChevronRight, MessageSquare, Heart, Trash2, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { parseBBCodeToHtml } from '@/lib/text'

const MarkdownComponents = {
  code({ className, children, ...props }: any) {
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
  activeFeedbackTab: 'insight' | 'community' | 'note' | 'card'
  setActiveFeedbackTab: (tab: 'insight' | 'community' | 'note' | 'card') => void
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
  copyCurrentTabContent: (type?: 'default' | 'question' | 'prompt', activeTabId?: string) => void
  isCopied: boolean
  handleNext: () => void
  selectedChoiceData?: any
  deckInfo?: any
}

const getQuestionField = (question: any, key: string, useAiResponse: boolean = false): string => {
  if (!question || !question.others) return '';
  let othersObj = question.others;
  if (typeof othersObj === 'string') {
    try { othersObj = JSON.parse(othersObj); } catch (e) {}
  }
  if (!othersObj || typeof othersObj !== 'object') return '';
  
  const targetObj = useAiResponse ? othersObj.ai_responses : othersObj;
  if (!targetObj) return '';
  
  if (targetObj[key]) return targetObj[key];
  
  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };
  const normKey = normalize(key);
  
  if (normKey === 'cachnhotuvung' || normKey === 'cachnhocachdoc') {
    const foundKey = Object.keys(targetObj).find(k => {
      const nk = normalize(k);
      return nk === 'cachnhotuvung' || nk === 'cachnhocachdoc';
    });
    if (foundKey) return targetObj[foundKey];
  }
  
  const foundKey = Object.keys(targetObj).find(k => normalize(k) === normKey);
  if (foundKey) return targetObj[foundKey];
  
  return '';
};

export const FeedbackArea: React.FC<FeedbackAreaProps> = ({
  showFeedback,
  activeFeedbackTab,
  setActiveFeedbackTab,
  currentQuestion,
  canEdit,
  clearAIExplanation,
  askAI,
  isAskingAI,
  aiInput,
  setAiInput,
  promptInput,
  setPromptInput,
  savePrompt,
  personalNote,
  setPersonalNote,
  isEditingNote,
  setIsEditingNote,
  isMobile = false,
  setIsFeedbackOpen,
  handleEditCurrentTab,
  copyCurrentTabContent,
  isCopied,
  handleNext,
  deckInfo,
}) => {

  const insightTabs = React.useMemo(() => {
    const tabs: any[] = []
    const insightCols = deckInfo?.practice_settings?.insight_columns
    
    if (Array.isArray(insightCols) && insightCols.length > 0) {
      insightCols.forEach((col: string) => {
        const customPrompt = deckInfo?.ai_prompts?.find((p: any) => p.column === col || p.id === col)
        tabs.push({
          id: col,
          title: customPrompt?.title || (col === 'back' ? 'Giải thích chi tiết' : col === 'front' ? 'Từ vựng' : col.toUpperCase().replace(/_/g, ' ')),
          column: col
        })
      })
    } else {
      // Fallback: Always include standard insight fields so Insight tab is always rich!
      tabs.push({
        id: 'back',
        title: 'Giải thích chi tiết (Mặt sau)',
        column: 'back'
      })
      if (currentQuestion?.mnemonic) {
        tabs.push({ id: 'mnemonic', title: 'Mẹo ghi nhớ (Mnemonic)', column: 'mnemonic' })
      }
      if (currentQuestion?.hint) {
        tabs.push({ id: 'hint', title: 'Gợi ý (Hint)', column: 'hint' })
      }
      let othersObj = currentQuestion?.others;
      if (typeof othersObj === 'string') {
        try { othersObj = JSON.parse(othersObj); } catch (e) {}
      }
      if (othersObj && typeof othersObj === 'object') {
        Object.keys(othersObj).forEach((key) => {
          if (key !== 'ai_responses' && key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'front' && key !== 'back') {
            if (!tabs.some(t => t.id === key)) {
              tabs.push({
                id: key,
                title: key.toUpperCase().replace(/_/g, ' '),
                column: key
              })
            }
          }
        })
      }
    }
    return tabs
  }, [deckInfo?.practice_settings?.insight_columns, deckInfo?.ai_prompts, currentQuestion])

  const [activeInsightTab, setActiveInsightTab] = React.useState<string>('')
  const [openInsightTabs, setOpenInsightTabs] = React.useState<string[]>([])
  const [activeFullCardTab, setActiveFullCardTab] = React.useState<string>('')
  const [openFullCardTabs, setOpenFullCardTabs] = React.useState<string[]>([])
  
  const [isEditingAI, setIsEditingAI] = React.useState(false)
  const [isEditingPrompt, setIsEditingPrompt] = React.useState(false)

  const allTabs = React.useMemo(() => {
    const tabs: any[] = [
      { id: 'front', title: 'Mặt trước (Front)', column: 'front' },
      { id: 'back', title: 'Mặt sau (Back)', column: 'back' }
    ]
    let othersObj = currentQuestion?.others;
    if (typeof othersObj === 'string') {
      try { othersObj = JSON.parse(othersObj); } catch (e) {}
    }
    if (othersObj && typeof othersObj === 'object') {
      Object.keys(othersObj).forEach((key) => {
        if (key !== 'ai_responses' && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          if (key !== 'front' && key !== 'back' && !tabs.some(t => t.id === key)) {
            tabs.push({
              id: key,
              title: key.toUpperCase().replace(/_/g, ' '),
              column: key
            })
          }
        }
      })
    }
    if (currentQuestion?.mnemonic && !tabs.some(t => t.id === 'mnemonic')) {
      tabs.push({ id: 'mnemonic', title: 'MNEMONIC', column: 'mnemonic' })
    }
    if (currentQuestion?.hint && !tabs.some(t => t.id === 'hint')) {
      tabs.push({ id: 'hint', title: 'HINT', column: 'hint' })
    }
    return tabs
  }, [currentQuestion])

  const getTabContent = (tabId: string) => {
    if (!currentQuestion) return ''
    if (tabId === 'front' || tabId === 'content') return currentQuestion.content || ''
    if (tabId === 'back' || tabId === 'explanation') return currentQuestion.explanation || ''
    if (tabId === 'mnemonic') return currentQuestion.mnemonic || ''
    if (tabId === 'hint') return currentQuestion.hint || ''
    return getQuestionField(currentQuestion, tabId) || ''
  }

  React.useEffect(() => {
    if (insightTabs.length > 0) {
      if (!activeInsightTab || !insightTabs.some((t: any) => t.id === activeInsightTab)) {
        const firstId = insightTabs[0].id
        setActiveInsightTab(firstId)
      }
      // Expand all tabs by default when loading a new card/deck
      setOpenInsightTabs(insightTabs.map((t: any) => t.id))
    }
  }, [insightTabs])

  React.useEffect(() => {
    if (allTabs.length > 0) {
      if (!activeFullCardTab || !allTabs.some((t: any) => t.id === activeFullCardTab)) {
        const firstId = allTabs[0].id
        setActiveFullCardTab(firstId)
      }
      // Expand all tabs by default when loading a new card/deck
      setOpenFullCardTabs(allTabs.map((t: any) => t.id))
    }
  }, [allTabs])

  const getActiveAIContent = () => {
    if (!currentQuestion) return ''
    if (activeInsightTab === 'explanation' || activeInsightTab === 'back') {
      return currentQuestion.explanation || currentQuestion.ai_explanation || ''
    }
    return getQuestionField(currentQuestion, activeInsightTab, true) || getQuestionField(currentQuestion, activeInsightTab) || ''
  }

  const getActivePromptTemplate = () => {
    if (activeInsightTab === 'explanation' || activeInsightTab === 'back') return deckInfo?.ai_prompt || ''
    const custom = deckInfo?.ai_prompts?.find((p: any) => p.id === activeInsightTab || p.column === activeInsightTab)
    return custom?.prompt || ''
  }

  React.useEffect(() => {
    if (activeFeedbackTab === 'insight') {
      setAiInput(getActiveAIContent())
      setPromptInput(getActivePromptTemplate())
      setIsEditingAI(false)
      setIsEditingPrompt(false)
    }
  }, [activeInsightTab, activeFeedbackTab, currentQuestion?.id, deckInfo?.ai_prompt, JSON.stringify(deckInfo?.ai_prompts)])

  const hasInsightAnyContent = () => {
    if (!currentQuestion) return false
    return insightTabs.some((tab: any) => {
      if (tab.id === 'explanation' || tab.id === 'back') {
        return !!(currentQuestion.explanation || currentQuestion.ai_explanation)
      }
      return !!(getQuestionField(currentQuestion, tab.id, true) || getQuestionField(currentQuestion, tab.id))
    })
  }

  const [contributions, setContributions] = React.useState<any[]>([])
  const [isFetchingContributions, setIsFetchingContributions] = React.useState(false)
  const [commentInput, setCommentInput] = React.useState('')
  const [contributionType, setContributionType] = React.useState<'comment' | 'correction'>('comment')
  const [activeReplyId, setActiveReplyId] = React.useState<number | null>(null)
  const [replyInputs, setReplyInputs] = React.useState<Record<number, string>>({})

  const fetchContributions = async () => {
    if (!currentQuestion?.id) return
    setIsFetchingContributions(true)
    try {
      const res = await fetch(`/api/v1/deck/question/${currentQuestion.id}/contributions`)
      if (res.ok) {
        const data = await res.json()
        setContributions(data)
      }
    } catch (e) {
      console.error("Failed to fetch contributions:", e)
    } finally {
      setIsFetchingContributions(false)
    }
  }

  React.useEffect(() => {
    if (activeFeedbackTab === 'community' && currentQuestion?.id) {
      fetchContributions()
    }
  }, [activeFeedbackTab, currentQuestion?.id])

  const handleLike = async (contribId: number) => {
    try {
      const res = await fetch(`/api/v1/deck/contributions/${contribId}/like`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        const updateList = (list: any[]): any[] => {
          return list.map(c => {
            if (c.id === contribId) {
              return { ...c, is_liked_by_me: data.liked, likes_count: data.likes_count }
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateList(c.replies) }
            }
            return c
          })
        }
        setContributions(prev => updateList(prev))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || !currentQuestion?.id) return
    try {
      const res = await fetch(`/api/v1/deck/question/${currentQuestion.id}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentInput,
          type: contributionType
        })
      })
      if (res.ok) {
        setCommentInput('')
        fetchContributions()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddReply = async (parentId: number) => {
    const text = replyInputs[parentId]
    if (!text?.trim() || !currentQuestion?.id) return
    try {
      const res = await fetch(`/api/v1/deck/question/${currentQuestion.id}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          type: 'comment',
          parent_id: parentId
        })
      })
      if (res.ok) {
        setReplyInputs(prev => ({ ...prev, [parentId]: '' }))
        setActiveReplyId(null)
        fetchContributions()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteContribution = async (contribId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá bình luận này?")) return
    try {
      const res = await fetch(`/api/v1/deck/contributions/${contribId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchContributions()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateStatus = async (contribId: number, status: string) => {
    try {
      const res = await fetch(`/api/v1/deck/contributions/${contribId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        fetchContributions()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const tabs = [
    { id: 'insight' as const, label: 'Giải thích', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100', hasContent: hasInsightAnyContent() },
    { id: 'card' as const, label: 'Toàn bộ thẻ', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100', hasContent: allTabs.some(t => !!getTabContent(t.id)) },
    { id: 'note' as const, label: 'Ghi chú', icon: StickyNote, color: 'text-emerald-500', bg: 'bg-emerald-100', hasContent: !!personalNote },
    { id: 'community' as const, label: 'Thảo luận', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100', hasContent: contributions.length > 0 }
  ]

  React.useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === activeFeedbackTab)) {
      setActiveFeedbackTab(tabs[0].id)
    }
  }, [tabs, activeFeedbackTab])

  const renderTabContent = () => {
    switch (activeFeedbackTab) {
      case 'insight':
        return (
          <div className="p-1.5 md:p-3 rounded-2xl md:rounded-[2rem] ai-glow animate-in fade-in slide-in-from-bottom-2">
            {insightTabs.map((tab: any) => {
              const isOpen = openInsightTabs.includes(tab.id)
              let tabHasContent = false
              let content = ''
              
              if (tab.id === 'explanation' || tab.id === 'back') {
                 content = currentQuestion?.explanation || currentQuestion?.ai_explanation || ''
                 tabHasContent = !!content
              } else if (tab.id === 'mnemonic') {
                 content = currentQuestion?.mnemonic || ''
                 tabHasContent = !!content
              } else if (tab.id === 'hint') {
                 content = currentQuestion?.hint || ''
                 tabHasContent = !!content
              } else {
                 content = getQuestionField(currentQuestion, tab.id, true) || getQuestionField(currentQuestion, tab.id) || ''
                 tabHasContent = !!content
              }

              return (
                <div key={tab.id} className="border border-slate-100 rounded-xl overflow-hidden mb-3 bg-white shadow-sm transition-all duration-300">
                  {/* Collapse Header */}
                  <button
                    onClick={() => {
                      if (isOpen) {
                        setOpenInsightTabs(openInsightTabs.filter(id => id !== tab.id))
                        if (activeInsightTab === tab.id) setActiveInsightTab('')
                      } else {
                        setOpenInsightTabs([tab.id]) // Accordion default: collapse others
                        setActiveInsightTab(tab.id)
                        setIsEditingAI(false)
                        setIsEditingPrompt(false)
                      }
                    }}
                    className={cn(
                      "w-full px-4 py-3 flex items-center justify-between text-left transition-all duration-300",
                      isOpen ? "bg-slate-50 border-b border-slate-100" : "bg-white hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        {tab.title}
                      </span>
                      {tabHasContent && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Ask AI button on header if no content */}
                      {!tabHasContent && canEdit && getActivePromptTemplate() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveInsightTab(tab.id);
                            askAI(tab.id);
                          }}
                          disabled={isAskingAI}
                          className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md border border-indigo-100 shadow-sm transition-all active:scale-95 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                          <span>{isAskingAI && activeInsightTab === tab.id ? 'HỎI AI...' : 'HỎI AI'}</span>
                        </button>
                      )}
                      <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-90")} />
                    </div>
                  </button>

                  {/* Collapse Content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-white/50 border-t border-slate-50">
                          {/* Content actions toolbar */}
                          <div className="flex justify-end gap-2 mb-3">
                            {canEdit && content && !isEditingAI && !isEditingPrompt && (
                              <button
                                onClick={() => clearAIExplanation(tab.id)}
                                className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 shadow-sm transition-all"
                              >
                                CLEAR AI
                              </button>
                            )}
                            {canEdit && getActivePromptTemplate() && (
                              <button
                                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                                className={cn(
                                   "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                                   isEditingPrompt ? "bg-amber-600 text-white shadow-sm" : "text-amber-500 hover:text-amber-600 hover:bg-slate-50"
                                )}
                              >
                                {isEditingPrompt ? 'CLOSE PROMPT' : 'PROMPT'}
                              </button>
                            )}
                            {canEdit && getActivePromptTemplate() && !content && !isEditingAI && !isEditingPrompt && (
                              <button
                                onClick={() => askAI(tab.id)}
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
                                    askAI(tab.id, aiInput)
                                    setIsEditingAI(false)
                                  } else {
                                    setAiInput(content)
                                    setIsEditingAI(true)
                                  }
                                }}
                                disabled={isAskingAI}
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                                  isEditingAI ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-400 hover:text-indigo-600 hover:bg-slate-50"
                                )}
                              >
                                {isAskingAI ? 'SAVING...' : (isEditingAI ? 'SAVE' : 'EDIT')}
                              </button>
                            )}
                          </div>

                          {isEditingPrompt ? (
                            <div className="space-y-3 bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider">EDIT SYSTEM PROMPT FOR {tab.title.toUpperCase()}</span>
                                <button
                                  onClick={() => savePrompt(tab.id)}
                                  className="text-[9px] font-black bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                >
                                  SAVE PROMPT
                                </button>
                              </div>
                              <textarea
                                value={promptInput}
                                onChange={(e) => setPromptInput(e.target.value)}
                                placeholder="Enter System Prompt to guide the AI..."
                                className="w-full h-48 bg-white rounded-xl p-3 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none border border-amber-200 resize-none transition-all"
                              />
                            </div>
                          ) : isEditingAI ? (
                            <div className="space-y-2">
                              <textarea
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="Enter content manually..."
                                className="w-full h-48 bg-slate-50/50 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border border-slate-200 resize-none transition-all"
                                autoFocus
                              />
                              <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE' to save changes for everyone.</p>
                            </div>
                          ) : isAskingAI ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-pulse">
                              <div className="relative w-8 h-8 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping" />
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                              </div>
                              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.15em]">AI DEEP ANALYSIS...</p>
                            </div>
                          ) : (
                            content ? (
                              <div className="text-slate-700 font-medium text-xs leading-relaxed markdown-content break-words pr-2 select-text">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    ...MarkdownComponents,
                                    p: ({ children }) => <span className="inline-block">{children}</span>
                                  }}
                                >
                                  {parseBBCodeToHtml(content)}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="py-6 text-center text-slate-400 italic text-xs">
                                No content available yet.
                              </div>
                            )
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )
    case 'community':
      return (
        <div className="flex-1 flex flex-col min-h-full bg-white rounded-2xl border border-slate-100 shadow-xs animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-purple-100/60 bg-purple-50/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider block">
                  Cộng đồng thảo luận ({contributions.length})
                </span>
                <span className="text-[9px] font-semibold text-slate-400">
                  Trao đổi kinh nghiệm & đóng góp ý kiến
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {isFetchingContributions ? (
              <div className="flex flex-col items-center justify-center py-16 animate-pulse">
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang tải thảo luận...</span>
              </div>
            ) : contributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <MessageSquare className="w-9 h-9 opacity-30 mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chưa có thảo luận nào</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ mẹo nhớ!</p>
              </div>
            ) : (
              contributions.map((c: any) => (
                <div key={c.id} className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-[10px] font-black uppercase">
                        {c.user.username.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-700">{c.user.full_name || c.user.username}</span>
                          {c.user.role === 'admin' && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-600 rounded text-[7px] font-black uppercase">Admin</span>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.type === 'correction' && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                          c.status === 'active' ? "bg-amber-100 text-amber-700 animate-pulse" :
                          c.status === 'resolved' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {c.status === 'active' ? 'Góp ý' : c.status === 'resolved' ? 'Đã duyệt' : 'Đã bỏ qua'}
                        </span>
                      )}
                      {(c.user_id === parseInt(document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1] || '1') || c.user.role === 'admin') && (
                        <button
                          onClick={() => handleDeleteContribution(c.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                          title="Xóa bình luận"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 whitespace-pre-wrap break-words pl-8">
                    {c.content}
                  </div>
                  <div className="flex items-center justify-between pl-8 border-t border-slate-100 pt-2 text-[10px]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLike(c.id)}
                        className={cn(
                          "flex items-center gap-1 font-black transition-colors cursor-pointer",
                          c.is_liked_by_me ? "text-purple-600" : "text-slate-400 hover:text-purple-500"
                        )}
                      >
                        <Heart className={cn("w-3.5 h-3.5", c.is_liked_by_me && "fill-purple-600 text-purple-600")} />
                        <span>{c.likes_count}</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveReplyId(activeReplyId === c.id ? null : c.id)
                        }}
                        className="text-slate-400 hover:text-purple-500 font-black transition-colors cursor-pointer"
                      >
                        {activeReplyId === c.id ? 'Đóng trả lời' : 'Trả lời'}
                      </button>
                    </div>
                  </div>
                  {c.replies && c.replies.length > 0 && (
                    <div className="pl-6 space-y-2 border-l-2 border-purple-100 ml-4 mt-2">
                      {c.replies.map((r: any) => (
                        <div key={r.id} className="bg-purple-50/40 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-700 text-[11px]">{r.user.full_name || r.user.username}</span>
                            <span className="text-[8px] font-bold text-slate-400">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <p className="text-slate-600 font-medium">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeReplyId === c.id && (
                    <div className="pl-6 mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyInputs[c.id] || ''}
                          onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="Nhập câu trả lời..."
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-purple-200 rounded-xl text-xs outline-none focus:bg-white"
                        />
                        <button
                          onClick={() => handleAddReply(c.id)}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 cursor-pointer"
                        >
                          Gửi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddContribution} className="p-3 bg-slate-50/60 border-t border-purple-100/80 rounded-b-2xl space-y-2 flex-shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContributionType('comment')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                  contributionType === 'comment' ? "bg-purple-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                💬 Thảo luận
              </button>
              <button
                type="button"
                onClick={() => setContributionType('correction')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                  contributionType === 'correction' ? "bg-amber-500 text-white shadow-2xs" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                ⚠️ Góp ý / Báo lỗi
              </button>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={contributionType === 'comment' ? "Đặt câu hỏi hoặc thảo luận về từ vựng này..." : "Nhập nội dung đề xuất sửa đổi (Ví dụ: nghĩa đúng phải là...)"}
                className="flex-1 min-h-[38px] max-h-[80px] p-2 bg-white rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 focus:border-purple-300 resize-y"
                required
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-90 flex-shrink-0 cursor-pointer shadow-xs"
                title="Gửi bình luận"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )
    case 'note':
      return (
        <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 border border-slate-100 shadow-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              PERSONAL NOTE
            </span>
          </div>
          {!isEditingNote ? (
            <div 
              onClick={() => setIsEditingNote(true)}
              className="text-slate-700 font-medium text-sm leading-relaxed markdown-content min-h-[120px] p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-dashed border-slate-200 hover:border-emerald-300 transition-all cursor-pointer break-words"
              title="Click to edit personal note"
            >
              {personalNote ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                  {personalNote}
                </ReactMarkdown>
              ) : (
                <p className="text-slate-400 italic text-xs">Empty note. Tap here or click EDIT NOTE below to write...</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Write your study notes here... (Supports Markdown)"
                className="w-full h-72 bg-slate-50/80 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none border border-slate-200 resize-none transition-all"
                autoFocus
              />
              <p className="text-[9px] font-semibold text-slate-400 italic">
                Supports Markdown format. Click "SAVE NOTE" below to save.
              </p>
            </div>
          )}
        </div>
      )
    case 'card':
      return (
        <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-tight">
                  Cấu trúc & Dữ liệu thẻ bài
                </h4>
                <p className="text-[10px] font-semibold text-blue-600/80">
                  Mã thẻ: #{currentQuestion?.id || 'N/A'} • {allTabs.length} trường thông tin
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Mặt trước (Front / Câu hỏi)
              </span>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={handleEditCurrentTab}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    title="Edit Front"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => copyCurrentTabContent('question')}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  title="Copy Front"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
            <div className="text-slate-900 font-extrabold text-sm sm:text-base leading-relaxed break-words bg-slate-50/70 p-3 rounded-xl border border-slate-100 select-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  ...MarkdownComponents,
                  p: ({ children }) => <span>{children}</span>
                }}
              >
                {parseBBCodeToHtml(currentQuestion?.content || 'Chưa có nội dung')}
              </ReactMarkdown>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Mặt sau (Back / Đáp án gốc)
              </span>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={handleEditCurrentTab}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                    title="Edit Back"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => copyCurrentTabContent('default')}
                  className="text-[10px] font-bold text-orange-500 hover:text-orange-700 flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                  title="Copy Back"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
            <div className="text-slate-800 font-bold text-xs sm:text-sm leading-relaxed break-words bg-orange-50/30 p-3 rounded-xl border border-orange-100/50 select-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  ...MarkdownComponents,
                  p: ({ children }) => <span>{children}</span>
                }}
              >
                {parseBBCodeToHtml(currentQuestion?.explanation || currentQuestion?.ai_explanation || 'Chưa có đáp án')}
              </ReactMarkdown>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Các thuộc tính & Cột mở rộng ({allTabs.filter(t => t.id !== 'front' && t.id !== 'back').length})
            </span>
            {allTabs.filter(t => t.id !== 'front' && t.id !== 'back').length === 0 ? (
              <p className="text-[11px] font-medium text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                Thẻ này chỉ bao gồm 2 mặt cơ bản: Mặt trước và Mặt sau.
              </p>
            ) : (
              <div className="space-y-2">
                {allTabs.filter(t => t.id !== 'front' && t.id !== 'back').map((tab: any) => {
                  const val = getTabContent(tab.id)
                  return (
                    <div key={tab.id} className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <span>{tab.title}</span>
                        <div className="flex items-center gap-1.5">
                          {canEdit && (
                            <button
                              onClick={handleEditCurrentTab}
                              className="text-blue-500 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                              title={`Edit ${tab.title}`}
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                          )}
                          {val && (
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(val);
                                if (navigator.vibrate) navigator.vibrate(8);
                              }}
                              className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                              title="Copy Value"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 break-words select-text">
                        {val ? parseBBCodeToHtml(val) : <span className="text-slate-400 italic">Trống</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
  }
}

if (!showFeedback) return null;

return (
  <div className="flex flex-col h-full bg-[#F8FAFC]">
    <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-2xs">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
          {activeFeedbackTab === 'insight' ? <Lightbulb className="w-4 h-4" /> :
           activeFeedbackTab === 'card' ? <FileText className="w-4 h-4 text-blue-500" /> :
           activeFeedbackTab === 'note' ? <StickyNote className="w-4 h-4 text-emerald-500" /> :
           <MessageSquare className="w-4 h-4 text-purple-500" />}
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            {activeFeedbackTab === 'insight' ? 'Trợ lý Giải thích & Ghi nhớ' :
             activeFeedbackTab === 'card' ? 'Toàn bộ dữ liệu thẻ' :
             activeFeedbackTab === 'note' ? 'Sổ tay Ghi chú cá nhân' :
             'Cộng đồng thảo luận & Góp ý'}
          </h3>
        </div>
      </div>
    </div>
    <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4 lg:p-6 custom-scrollbar pb-6">
      {renderTabContent()}
    </div>
    <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 sticky bottom-0 z-50 flex-shrink-0 shadow-lg">
      <div className="px-3 py-1.5 border-b border-slate-50 flex items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isMobile && setIsFeedbackOpen && (
            <button
              onClick={() => setIsFeedbackOpen(false)}
              className="h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer shrink-0"
              title="Close Assistant"
            >
              <X className="w-3.5 h-3.5" />
              <span>CLOSE</span>
            </button>
          )}
          {activeFeedbackTab === 'note' && (
            <button
              onClick={handleEditCurrentTab}
              className={cn(
                "h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0",
                isEditingNote
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
              )}
            >
              {isEditingNote ? (
                <>
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>SAVE NOTE</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" />
                  <span>EDIT NOTE</span>
                </>
              )}
            </button>
          )}
          {activeFeedbackTab === 'card' && (
            <button
              onClick={handleEditCurrentTab}
              className="h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Edit3 className="w-3 h-3" />
              <span>EDIT CARD</span>
            </button>
          )}
          {(activeFeedbackTab === 'insight' || activeFeedbackTab === 'card') && (
            <button
              onClick={() => copyCurrentTabContent()}
              className={cn(
                "h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0",
                isCopied
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
              )}
            >
              {isCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'COPIED' : 'COPY'}</span>
            </button>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => {
              handleNext();
              if (setIsFeedbackOpen) setIsFeedbackOpen(false);
            }}
            className="h-8 px-3 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <span>NEXT</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="w-full grid grid-cols-4 bg-white p-0 relative">
        {tabs.map((tab) => {
          const isActive = activeFeedbackTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(8);
                setActiveFeedbackTab(tab.id);
              }}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
            >
              {isActive && (
                <motion.div
                  layoutId="activeFeedbackBottomTab"
                  className="absolute inset-0 bg-orange-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center justify-center">
                <tab.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-orange-600" : "text-slate-400")} />
                {tab.id === 'community' && contributions.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-purple-600 text-white text-[8px] font-black rounded-full">
                    {contributions.length}
                  </span>
                )}
              </div>
              <span className={cn(
                "relative z-10 text-[9px] font-extrabold uppercase tracking-wider truncate transition-colors",
                isActive ? "text-orange-600 font-black" : "text-slate-400"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
)
}
