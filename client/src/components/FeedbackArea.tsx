import React from 'react'
import { Lightbulb, Sparkles, StickyNote, X, Check, Edit3, FileText, HelpCircle, Brain, Copy, ChevronRight, MessageSquare, Heart, Trash2, Send } from 'lucide-react'
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

  const insightTabs = React.useMemo(() => {
    const tabs: any[] = []
    const insightCols = deckInfo?.practice_settings?.insight_columns
    
    if (Array.isArray(insightCols) && insightCols.length > 0) {
      insightCols.forEach((col: string) => {
        const customPrompt = deckInfo?.ai_prompts?.find((p: any) => p.column === col || p.id === col)
        tabs.push({
          id: col,
          title: customPrompt?.title || (col === 'back' ? 'Giải thích' : col === 'front' ? 'Từ vựng' : col.toUpperCase().replace(/_/g, ' ')),
          column: col
        })
      })
    }
    return tabs
  }, [deckInfo?.practice_settings?.insight_columns, deckInfo?.ai_prompts])

  const [activeInsightTab, setActiveInsightTab] = React.useState<string>('')

  React.useEffect(() => {
    if (insightTabs.length > 0) {
      if (!activeInsightTab || !insightTabs.some((t: any) => t.id === activeInsightTab)) {
        setActiveInsightTab(insightTabs[0].id)
      }
    }
  }, [insightTabs, activeInsightTab])

  const getActiveAIContent = () => {
    if (!currentQuestion) return ''
    if (activeInsightTab === 'explanation' || activeInsightTab === 'back') {
      return currentQuestion.explanation || currentQuestion.ai_explanation || ''
    }
    return currentQuestion.others?.ai_responses?.[activeInsightTab] || currentQuestion.others?.[activeInsightTab] || ''
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
  }, [activeInsightTab, activeFeedbackTab, currentQuestion?.id, deckInfo])

  const hasInsightAnyContent = () => {
    if (!currentQuestion) return false
    return insightTabs.some((tab: any) => {
      if (tab.id === 'explanation' || tab.id === 'back') {
        return !!(currentQuestion.explanation || currentQuestion.ai_explanation)
      }
      return !!(currentQuestion.others?.ai_responses?.[tab.id] || currentQuestion.others?.[tab.id])
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
    ...(insightTabs.length > 0 ? [{ id: 'insight' as const, label: 'INSIGHT', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100', hasContent: hasInsightAnyContent() }] : []),
    { id: 'community' as const, label: 'COMMUNITY', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100', hasContent: contributions.length > 0 },
    { id: 'note' as const, label: 'PERSONAL NOTE', icon: StickyNote, color: 'text-slate-400', bg: 'bg-slate-100', hasContent: !!personalNote },
    { id: 'card' as const, label: 'CARD INFO', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100', hasContent: !!selectedChoiceData }
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
          <div className="p-3 md:p-6 rounded-2xl md:rounded-[2rem] ai-glow animate-in fade-in slide-in-from-bottom-2">
            {/* Insight Sub-tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 overflow-x-auto custom-scrollbar">
               {insightTabs.map((tab: any) => {
                  const isTabActive = activeInsightTab === tab.id
                  let tabHasContent = false
                  if (tab.id === 'explanation' || tab.id === 'back') {
                     tabHasContent = !!(currentQuestion?.explanation || currentQuestion?.ai_explanation)
                  } else if (tab.id === 'mnemonic') {
                     tabHasContent = !!currentQuestion?.mnemonic
                  } else if (tab.id === 'hint') {
                     tabHasContent = !!currentQuestion?.hint
                  } else {
                     tabHasContent = !!(currentQuestion?.others?.ai_responses?.[tab.id] || currentQuestion?.others?.[tab.id])
                  }

                  return (
                     <button
                        key={tab.id}
                        onClick={() => {
                           setActiveInsightTab(tab.id)
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
                  {insightTabs.find((t: any) => t.id === activeInsightTab)?.title.toUpperCase()}
                </span>
                {canEdit && getActiveAIContent() && !isEditingAI && !isEditingPrompt && (
                  <button
                    onClick={() => clearAIExplanation(activeInsightTab)}
                    className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 shadow-sm transition-all ml-2"
                  >
                    CLEAR AI
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit && getActivePromptTemplate() && (
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
                {canEdit && getActivePromptTemplate() && !getActiveAIContent() && !isEditingAI && !isEditingPrompt && (
                  <button
                    onClick={() => askAI(activeInsightTab)}
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
                        askAI(activeInsightTab, aiInput)
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
                    {isAskingAI ? 'SAVING...' : (isEditingAI ? 'SAVE' : 'EDIT')}
                  </button>
                )}
              </div>
            </div>

            {isEditingPrompt ? (
              <div className="space-y-3 mt-2 bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">EDIT SYSTEM PROMPT FOR {insightTabs.find((t: any) => t.id === activeInsightTab)?.title.toUpperCase()}</span>
                  <button
                    onClick={() => savePrompt(activeInsightTab)}
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
                  placeholder="Enter content manually..."
                  className="w-full h-80 bg-white/50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                  autoFocus
                />
                <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE' to save changes for everyone.</p>
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
                getActiveAIContent() ? (
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
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Chưa có thông tin</p>
                  </div>
                )
              )
            )}
          </div>
        )
      case 'community':
        return (
          <div className="p-6 rounded-[2rem] bg-purple-50/20 border border-purple-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Cộng đồng thảo luận</span>
              </div>
            </div>

            {/* Form đăng bình luận / Đóng góp mới */}
            <form onSubmit={handleAddContribution} className="mb-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-inner space-y-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContributionType('comment')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
                    contributionType === 'comment' ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  💬 Thảo luận
                </button>
                <button
                  type="button"
                  onClick={() => setContributionType('correction')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
                    contributionType === 'correction' ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  ✏️ Báo sửa thẻ
                </button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={contributionType === 'comment' ? "Đặt câu hỏi hoặc thảo luận về từ vựng này..." : "Nhập nội dung đề xuất sửa đổi (Ví dụ: nghĩa đúng phải là...)"}
                  className="flex-1 min-h-[44px] max-h-[100px] p-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none border border-transparent focus:border-purple-200 resize-y"
                  required
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-90 self-end flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Danh sách bình luận */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
              {isFetchingContributions ? (
                <div className="flex flex-col items-center justify-center py-16 animate-pulse">
                  <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang tải thảo luận...</span>
                </div>
              ) : contributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-[11px] font-bold uppercase tracking-wider">Chưa có thảo luận nào. Hãy bắt đầu!</p>
                </div>
              ) : (
                contributions.map((c: any) => (
                  <div key={c.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    {/* Header: Author Info */}
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
                      {/* Badge đóng góp / Sửa đổi */}
                      <div className="flex items-center gap-1.5">
                        {c.type === 'correction' && (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            c.status === 'active' ? "bg-amber-100 text-amber-700 animate-pulse" :
                            c.status === 'resolved' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {c.status === 'active' ? 'Đề xuất sửa' : c.status === 'resolved' ? 'Đã duyệt sửa' : 'Đã bỏ qua'}
                          </span>
                        )}
                        {/* Nút xoá (chỉ hiển thị với chính chủ hoặc admin) */}
                        {(c.user_id === parseInt(document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1] || '1') || c.user.role === 'admin') && (
                          <button
                            onClick={() => handleDeleteContribution(c.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-xs font-semibold text-slate-600 whitespace-pre-wrap break-words pl-8">
                      {c.content}
                    </div>

                    {/* Actions: Like, Reply, Approve/Ignore for admin */}
                    <div className="flex items-center justify-between pl-8 border-t border-slate-50 pt-2 text-[10px]">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLike(c.id)}
                          className={cn(
                            "flex items-center gap-1 font-black transition-colors",
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
                          className="text-slate-400 hover:text-purple-500 font-black transition-colors"
                        >
                          Trả lời
                        </button>
                      </div>

                      {/* Admin action to resolve correction */}
                      {c.type === 'correction' && c.status === 'active' && canEdit && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'resolved')}
                            className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-wider hover:bg-emerald-600"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'ignored')}
                            className="px-2 py-0.5 bg-slate-300 text-slate-600 rounded text-[8px] font-black uppercase tracking-wider hover:bg-slate-400"
                          >
                            Bỏ qua
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Câu trả lời (Replies) - nested 1 level */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="pl-8 space-y-2 mt-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                        {c.replies.map((r: any) => (
                          <div key={r.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-700">{r.user.full_name || r.user.username}</span>
                                {r.user.role === 'admin' && (
                                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-600 rounded text-[6px] font-black uppercase">Admin</span>
                                )}
                                <span className="text-[8px] text-slate-400">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleLike(r.id)}
                                  className={cn("text-[9px] flex items-center gap-0.5", r.is_liked_by_me ? "text-purple-600" : "text-slate-400")}
                                >
                                  <Heart className={cn("w-3 h-3", r.is_liked_by_me && "fill-purple-600 text-purple-600")} />
                                  <span>{r.likes_count}</span>
                                </button>
                                {(r.user_id === parseInt(document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1] || '1') || r.user.role === 'admin') && (
                                  <button
                                    onClick={() => handleDeleteContribution(r.id)}
                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-600 whitespace-pre-wrap break-words">
                              {r.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hộp soạn thảo Reply */}
                    {activeReplyId === c.id && (
                      <div className="pl-8 pt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyInputs[c.id] || ''}
                          onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="Trả lời bình luận này..."
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-purple-200"
                        />
                        <button
                          onClick={() => handleAddReply(c.id)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-90"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      case 'note':
        return (
          <div className="p-3 md:p-6 rounded-2xl md:rounded-[2rem] bg-white border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
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
          <div className="p-3 md:p-6 rounded-2xl md:rounded-[2rem] bg-blue-50/30 border border-blue-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
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

      <div className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-8 custom-scrollbar">
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
            (activeFeedbackTab === 'note' && isEditingNote)
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
              : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
          )}
        >
          {(activeFeedbackTab === 'note' && isEditingNote) ? (
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
                      tab.id === 'note' ? "text-slate-600 bg-white shadow-md border border-slate-200 scale-105" :
                      "text-blue-600 bg-white shadow-md border border-blue-100/60 scale-105"
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
                      tab.id === 'note' ? "bg-slate-400" :
                      "bg-blue-500"
                    )} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="relative">
          <AnimatePresence>
            {isCopyMenuOpen && activeFeedbackTab === 'insight' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-16 right-0 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.12)] border border-slate-100/80 p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <button
                  onClick={() => copyCurrentTabContent('default', activeInsightTab)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left animate-in fade-in"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Result</span>
                </button>
                <button
                  onClick={() => copyCurrentTabContent('question', activeInsightTab)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Question</span>
                </button>
                <button
                  onClick={() => copyCurrentTabContent('prompt', activeInsightTab)}
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
              if (activeFeedbackTab === 'insight') setIsCopyMenuOpen(!isCopyMenuOpen)
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
