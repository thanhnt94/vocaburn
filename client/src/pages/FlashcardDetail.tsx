import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Award, BookOpen, Search, StickyNote, BarChart2, Settings, Edit2, X, Save, Brain, HelpCircle, Plus, Sparkles, Trophy, Layers, RotateCcw, Compass, Flame, Target, ChevronDown, ChevronUp, Pencil, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { parseBBCodeToHtml } from '@/lib/text'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'

interface Question {
  id: number
  content: string
  orig_index: number
  stats: { total: number, correct: number, wrong: number }
  explanation?: string
  ai_explanation?: string
  mnemonic?: string | null
  hint?: string | null
  options?: any[]
  others?: Record<string, any> | null
}

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [editTab, setEditTab] = useState<'props' | 'collabs'>('props')
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [quickAddFront, setQuickAddFront] = useState('')
  const [quickAddBack, setQuickAddBack] = useState('')
  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [collaborators, setCollaborators] = useState<any[]>([])

  const [dailyNewInput, setDailyNewInput] = useState(10)
  const [passThresholdInput, setPassThresholdInput] = useState(80)
  const [dailyReviewInput, setDailyReviewInput] = useState(50)
  const [roadmapTypeInput, setRoadmapTypeInput] = useState<'completion' | 'accumulation'>('completion')
  const [isSavingRoadmapSettings, setIsSavingRoadmapSettings] = useState(false)
  const [isRoadmapSettingsOpen, setIsRoadmapSettingsOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isResettingProgress, setIsResettingProgress] = useState(false)
  const [showFlashcardMenu, setShowFlashcardMenu] = useState(false)
  const [showPracticeMenu, setShowPracticeMenu] = useState(false)

  // Bottom bar mode: 'learn' (default) or 'creator' (quick add + search)
  const [bottomBarMode, setBottomBarMode] = useState<'learn' | 'creator'>('learn')
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false)
  const [isProgressExpanded, setIsProgressExpanded] = useState(false)

  // Selected card detail modal states
  const [selectedCard, setSelectedCard] = useState<Question | null>(null)
  const [selectedCardNote, setSelectedCardNote] = useState('')
  const [isEditingCardNote, setIsEditingCardNote] = useState(false)
  const [isSavingCardNote, setIsSavingCardNote] = useState(false)
  const [cardModalTab, setCardModalTab] = useState<'content' | 'stats'>('content')
  
  // Inline card editing states
  const [editCardFormData, setEditCardFormData] = useState<any>(null)
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [isSavingCardEdit, setIsSavingCardEdit] = useState(false)

  const quickAddFrontRef = useRef<HTMLInputElement>(null)

  const handleQuickAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddFront.trim() || !quickAddBack.trim()) return
    setIsQuickAdding(true)
    try {
      await axios.post(`/api/v1/deck/${id}/flashcard`, {
        content: quickAddFront.trim(),
        explanation: quickAddBack.trim(),
        options: []
      })
      setQuickAddFront('')
      setQuickAddBack('')
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
      // Focus front input for rapid adding
      quickAddFrontRef.current?.focus()
    } catch (err) {
      alert('Failed to add card')
    } finally {
      setIsQuickAdding(false)
    }
  }

  // Load card note when selected card changes
  useEffect(() => {
    if (!selectedCard) {
      setSelectedCardNote('')
      setIsEditingCardNote(false)
      return
    }
    const fetchCardNote = async () => {
      try {
        const res = await axios.get(`/api/v1/deck/question/${selectedCard.id}/note`)
        setSelectedCardNote(res.data.content || '')
      } catch (e) {
        console.error("Failed to fetch card note:", e)
      }
    }
    fetchCardNote()
    setCardModalTab('content')
  }, [selectedCard])

  const handleSaveCardNote = async () => {
    if (!selectedCard) return
    setIsSavingCardNote(true)
    try {
      await axios.post(`/api/v1/deck/question/${selectedCard.id}/note`, { 
        content: selectedCardNote 
      })
      // Invalidate notes query so the main list gets updated
      queryClient.invalidateQueries({ queryKey: ['quiz-notes', id] })
      setIsEditingCardNote(false)
    } catch (e) {
      alert("Failed to save note.")
    } finally {
      setIsSavingCardNote(false)
    }
  }

  const handleSaveInlineCardEdit = async (updatedCardData: any) => {
    if (!selectedCard || !updatedCardData) return
    setIsSavingCardEdit(true)
    try {
      const finalOthers = { ...updatedCardData.others }
      const systemFields = ['front_img', 'back_img', 'front_audio_url', 'back_audio_url', 'front_audio_content', 'back_audio_content']
      systemFields.forEach(f => delete finalOthers[f])
      
      if (finalOthers.other_content) {
        try {
          finalOthers.other_content = typeof finalOthers.other_content === 'string'
            ? JSON.parse(finalOthers.other_content)
            : finalOthers.other_content
        } catch (je) {}
      }

      const updatedOptions = (updatedCardData.options || []).map((opt: any) => {
        if (opt.is_correct && updatedCardData.explanation) {
          return { ...opt, content: updatedCardData.explanation }
        }
        return opt
      })

      const payload = {
        content: updatedCardData.content,
        explanation: updatedCardData.explanation,
        ai_explanation: updatedCardData.ai_explanation,
        image: updatedCardData.image || null,
        audio: updatedCardData.audio || null,
        front_img: updatedCardData.front_img || '',
        back_img: updatedCardData.back_img || '',
        front_audio_url: updatedCardData.front_audio_url || '',
        back_audio_url: updatedCardData.back_audio_url || '',
        front_audio_content: updatedCardData.front_audio_content || '',
        back_audio_content: updatedCardData.back_audio_content || '',
        others: finalOthers,
        options: updatedOptions
      }

      await axios.patch(`/api/v1/deck/question/${selectedCard.id}`, payload)
      
      // Update locally rendered selected card
      setSelectedCard((prev: any) => ({
        ...prev,
        ...payload,
        options: updatedOptions
      }))
      
      // Invalidate queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz', id] })
      
      setIsEditingCard(false)
      setEditCardFormData(null)
    } catch (e) {
      console.error(e)
      alert("Failed to save card edits.")
    } finally {
      setIsSavingCardEdit(false)
    }
  }

  useEffect(() => {
    if (id === 'import') {
      navigate('/manage', { replace: true })
    }
  }, [id, navigate])

  useEffect(() => {
    if (isEditModalOpen && editTab === 'collabs') {
      fetchCollaborators()
    }
  }, [isEditModalOpen, editTab])

  const fetchCollaborators = async () => {
    try {
      const res = await axios.get(`/api/v1/deck/${id}/collaborators`)
      setCollaborators(res.data)
    } catch (e) {}
  }

  const handleSearchUsers = async (q: string) => {
    setUserSearch(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    try {
      const res = await axios.get(`/api/v1/deck/users/search`, { params: { q } })
      setSearchResults(res.data)
    } catch (e) {}
  }

  const addCollaborator = async (userId: number) => {
    try {
      await axios.post(`/api/v1/deck/${id}/collaborators`, { user_id: userId })
      fetchCollaborators()
      setUserSearch('')
      setSearchResults([])
    } catch (e) {
      alert("Error adding collaborator!")
    }
  }

  const removeCollaborator = async (userId: number) => {
    try {
      await axios.delete(`/api/v1/deck/${id}/collaborators/${userId}`)
      fetchCollaborators()
    } catch (e) {
      alert("Error removing collaborator!")
    }
  }

  const { data: quiz } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/data`) // Need this endpoint
      return res.data
    }
  })

  const { data: masteryData } = useQuery({
    queryKey: ['quiz-mastery', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/decks/${id}/mastery`)
      return res.data
    }
  })

  const { data: notes } = useQuery({
    queryKey: ['quiz-notes', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/notes`)
      return res.data
    }
  })

  const { data: sessionData } = useQuery({
    queryKey: ['quiz-session', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/session`)
      return res.data
    }
  })

  const { data: roadmapStatus, refetch: refetchRoadmapStatus } = useQuery({
    queryKey: ['quiz-roadmap-status', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${id}/roadmap-status`)
      return res.data
    }
  })

  useEffect(() => {
    if (roadmapStatus) {
      setDailyNewInput(roadmapStatus.roadmap_daily_new || 10)
      setDailyReviewInput(roadmapStatus.roadmap_daily_review_max || 50)
      setPassThresholdInput(roadmapStatus.roadmap_pass_threshold || 80)
      setRoadmapTypeInput(roadmapStatus.roadmap_type || 'completion')
    }
  }, [roadmapStatus])

  const handleResetProgress = async () => {
    setIsResettingProgress(true)
    try {
      await axios.post(`/api/v1/deck/${id}/reset-progress`)
      queryClient.invalidateQueries({ queryKey: ['quiz-roadmap-status', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz-mastery', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', id] })
      queryClient.invalidateQueries({ queryKey: ['quiz-session', id] })
      refetchRoadmapStatus()
      setIsResetModalOpen(false)
    } catch (e) {
      console.error("Error resetting deck progress", e)
      alert("Không thể đặt lại tiến độ. Vui lòng thử lại!")
    } finally {
      setIsResettingProgress(false)
    }
  }

  const handleSaveRoadmap = async (active: boolean, overrideType?: 'completion' | 'accumulation') => {
    setIsSavingRoadmapSettings(true)
    try {
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        settings: {
          roadmap_active: active,
          roadmap_type: overrideType || roadmapTypeInput,
          roadmap_daily_new: dailyNewInput,
          roadmap_daily_review_max: dailyReviewInput,
          roadmap_pass_threshold: passThresholdInput
        },
        is_creator: false
      })
      refetchRoadmapStatus()
      queryClient.invalidateQueries({ queryKey: ['roadmapDecks'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })
      setIsRoadmapSettingsOpen(false)
    } catch (e) {
      console.error("Error updating roadmap settings", e)
    } finally {
      setIsSavingRoadmapSettings(false)
    }
  }

  const { 
    data: questionsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['quiz-questions', id, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get(`/api/v1/deck/${id}/questions`, {
        params: { page: pageParam, size: 50, search: searchQuery }
      })
      return res.data
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentLoaded = allPages.length * 50
      return currentLoaded < lastPage.total ? allPages.length + 1 : undefined
    },
    initialPageParam: 1
  })

  const allQuestions = questionsData?.pages.flatMap(p => p.questions) || []
  const canEdit = quiz?.creator_id === user?.id || user?.id === 1 || quiz?.is_collaborator

  // Parse insight columns dynamic tabs (like in FeedbackArea)
  const fullCardTabs = selectedCard ? [
    { id: 'front', title: 'MẶT TRƯỚC (FRONT)', content: selectedCard.content || '' },
    { id: 'back', title: 'MẶT SAU (BACK)', content: selectedCard.explanation || selectedCard.ai_explanation || '' },
    ...(selectedCard.others ? Object.entries(selectedCard.others)
      .filter(([key]) => key !== 'ai_responses' && key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'front' && key !== 'back')
      .map(([key, value]) => ({
        id: key,
        title: key.toUpperCase().replace(/_/g, ' '),
        content: String(value || '')
      })) : []),
    ...(selectedCard.mnemonic ? [{ id: 'mnemonic', title: 'MNEMONIC', content: selectedCard.mnemonic }] : []),
    ...(selectedCard.hint ? [{ id: 'hint', title: 'HINT', content: selectedCard.hint }] : [])
  ].filter(t => t.content.trim() !== '') : []

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ═══════════════ COMPACT NAV HEADER ═══════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-[120] bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-indigo-600 shadow-sm active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Compact Title + Badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/60 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h1 className="text-sm font-black text-slate-900 truncate tracking-tight">{quiz?.title}</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest flex-shrink-0">
              {quiz?.questions_count || 0}
            </span>
          </div>
        </div>

        {/* Inline Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canEdit && (
            <>
              <Link
                to={`/manage/edit/${id}/flashcards`}
                className="h-8 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 active:scale-95 transition-all"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Manage</span>
              </Link>
              <Link 
                to={`/manage/edit/${id}`}
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
                title="Edit Collection"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="pt-16 pb-28">
        {/* ═══════════════ DESCRIPTION LINE (if exists) ═══════════════ */}
        {quiz?.description && (
          <div className="px-4 max-w-5xl mx-auto mt-2 mb-3">
            <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 pl-1">{quiz.description}</p>
          </div>
        )}

        {/* ═══════════════ UNIFIED LEARNING PROGRESS BLOCK ═══════════════ */}
        <div className="px-4 max-w-5xl mx-auto mb-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 relative overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Learning Progress</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-150 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-90"
                  title="Đặt lại tiến độ học (Reset Progress)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigate(`/flashcard/${id}/roadmap`)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95 cursor-pointer"
                  title="Mở Trang Lộ Trình Bộ Thẻ"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Trang Lộ Trình 🗺️</span>
                </button>
                {roadmapStatus?.roadmap_active && (
                  <button
                    onClick={() => setIsRoadmapSettingsOpen(true)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-150 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
                    title="Roadmap Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-150 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
                  title={isProgressExpanded ? "Collapse" : "Expand details"}
                >
                  {isProgressExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* ── Row 1: Mastery Progress Bar ── */}
            {masteryData && masteryData.total > 0 && (
              <div className="mb-4">
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-50">
                  <div className="h-full bg-slate-300 transition-all duration-500" style={{ width: `${(masteryData.new / masteryData.total) * 100}%` }} title={`New: ${masteryData.new}`} />
                  <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${(masteryData.learning / masteryData.total) * 100}%` }} title={`Learning: ${masteryData.learning}`} />
                  <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(masteryData.familiar / masteryData.total) * 100}%` }} title={`Familiar: ${masteryData.familiar}`} />
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(masteryData.mastered / masteryData.total) * 100}%` }} title={`Mastered: ${masteryData.mastered}`} />
                </div>
                <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300 rounded-full" /><span className="text-[8px] font-black text-slate-400 uppercase">{masteryData.new} New</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-400 rounded-full" /><span className="text-[8px] font-black text-slate-400 uppercase">{masteryData.learning} Learning</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-400 rounded-full" /><span className="text-[8px] font-black text-slate-400 uppercase">{masteryData.familiar} Familiar</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-[8px] font-black text-slate-400 uppercase">{masteryData.mastered} Mastered</span></div>
                </div>
              </div>
            )}

            {/* ── Row 2: Quick Stats Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Total Progress */}
              {roadmapStatus && (
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100/60">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block mb-1">Progress</span>
                  <span className="text-sm font-black text-slate-800 leading-none">{roadmapStatus.learned_cards}/{roadmapStatus.total_cards}</span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${roadmapStatus.total_cards > 0 ? Math.round((roadmapStatus.learned_cards / roadmapStatus.total_cards) * 100) : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Today's New */}
              {roadmapStatus?.roadmap_active && (
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100/60">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block mb-1">{roadmapStatus.roadmap_type === 'accumulation' ? 'Nhập & Học' : 'New Today'}</span>
                  <span className="text-sm font-black text-slate-800 leading-none">{roadmapStatus.roadmap_type === 'accumulation' ? roadmapStatus.created_today_count : roadmapStatus.new_learned_today}/{roadmapStatus.new_target_today}</span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all" style={{ width: `${roadmapStatus.new_target_today > 0 ? Math.min(100, Math.round(((roadmapStatus.roadmap_type === 'accumulation' ? roadmapStatus.created_today_count : roadmapStatus.new_learned_today) / roadmapStatus.new_target_today) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Today's Review */}
              {roadmapStatus?.roadmap_active && (
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100/60">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block mb-1">Review Today</span>
                  <span className="text-sm font-black text-slate-800 leading-none">{roadmapStatus.review_completed_today}/{roadmapStatus.review_due_today}</span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${roadmapStatus.review_due_today > 0 ? Math.min(100, Math.round((roadmapStatus.review_completed_today / roadmapStatus.review_due_today) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Retention Rate */}
              {roadmapStatus?.roadmap_active && (
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
                  <span className="text-[7px] font-black text-indigo-500 uppercase tracking-wider block mb-1">Retention Rate</span>
                  <span className="text-sm font-black text-indigo-700 leading-none">
                    {roadmapStatus.retention_rate > 0 ? `${roadmapStatus.retention_rate}%` : '—'}
                  </span>
                  <p className="text-[7px] font-bold text-slate-400 mt-1 truncate">
                    {roadmapStatus.retention_rate >= 80 ? '🧠 Ghi nhớ tốt' : (roadmapStatus.retention_rate > 0 ? '📚 Cần rèn luyện' : 'Chưa có bài test')}
                  </p>
                </div>
              )}

              {/* Streak or Estimated */}
              {roadmapStatus?.roadmap_active && (
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100/60">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block mb-1">Streak</span>
                  <div className="flex items-center gap-1.5">
                    {roadmapStatus.streak > 0 ? (
                      <span className="text-sm font-black text-orange-600 leading-none flex items-center gap-1">
                        🔥 {roadmapStatus.streak}d
                      </span>
                    ) : (
                      <span className="text-sm font-black text-slate-300 leading-none">—</span>
                    )}
                  </div>
                  {roadmapStatus.roadmap_type === 'accumulation' ? (
                    <span className="text-[7px] font-bold text-amber-600 mt-1 block">📈 Tích lũy vô tận</span>
                  ) : roadmapStatus.estimated_completion_date ? (
                    <span className="text-[7px] font-bold text-slate-400 mt-1 block flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5 text-emerald-500 inline" />
                      {new Date(roadmapStatus.estimated_completion_date).toLocaleDateString('vi-VN')}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Roadmap Stage Progress (Inline) ── */}
            {roadmapStatus?.roadmap_active && (
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-100/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: roadmapStatus.roadmap_type === 'accumulation' ? '#b45309' : '#4f46e5' }}>
                    {roadmapStatus.roadmap_type === 'accumulation' ? '📈 Lộ trình tích lũy' : '📘 Lộ trình hoàn thành'} — Hôm nay
                  </span>
                  {roadmapStatus.stage_2_done ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black border border-emerald-100">✓ Xong</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[8px] font-black border border-amber-100">Đang thực hiện</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 border", roadmapStatus.stage_1_done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-500 border-slate-200")}>
                    {roadmapStatus.stage_1_done ? '✓' : '1.'} {roadmapStatus.roadmap_type === 'accumulation' ? `Nhập & học (${roadmapStatus.created_today_count || 0}/${roadmapStatus.new_target_today})` : `Học từ mới (${roadmapStatus.new_learned_today}/${roadmapStatus.new_target_today})`}
                  </div>
                  {roadmapStatus.has_stage_2 !== false && (
                    <div className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 border", roadmapStatus.stage_2_done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-indigo-600 border-indigo-200")}>
                      {roadmapStatus.stage_2_done ? '✓' : '2.'} Bài Test (≥{roadmapStatus.roadmap_pass_threshold || 80}%)
                    </div>
                  )}
                  <button
                    onClick={() => navigate(roadmapStatus.next_action_url || `/flashcard/${id}/roadmap`)}
                    className={cn(
                      "ml-auto px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer",
                      roadmapStatus.stage_2_done
                        ? "bg-emerald-600 text-white"
                        : roadmapStatus.roadmap_type === 'accumulation'
                          ? "bg-amber-600 text-white"
                          : "bg-indigo-600 text-white"
                    )}
                  >
                    {roadmapStatus.next_action_label || 'Tiếp tục'} →
                  </button>
                </div>
              </div>
            )}

            {/* ── Roadmap Not Active Banner ── */}
            {roadmapStatus && !roadmapStatus.roadmap_active && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/40 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Smart Roadmap</span>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">Enable daily learning goals and spaced schedule.</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number" min="1" value={dailyNewInput}
                    onChange={(e) => setDailyNewInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 h-7 px-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-center outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleSaveRoadmap(true)}
                    disabled={isSavingRoadmapSettings}
                    className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    Activate
                  </button>
                </div>
              </div>
            )}

            {/* ── Expanded: 7-day Calendar ── */}
            <AnimatePresence>
              {isProgressExpanded && roadmapStatus?.seven_days && roadmapStatus.seven_days.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-2">7-Day Activity</span>
                    <div className="grid grid-cols-7 gap-1.5">
                      {roadmapStatus.seven_days.map((day: any) => {
                        const dateObj = new Date(day.date)
                        const formattedDate = dateObj.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
                        return (
                          <div key={day.date} className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-slate-50/50">
                            <span className="text-[7px] font-black text-slate-400 uppercase">{day.day_name}</span>
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                              day.active
                                ? "bg-amber-500 text-white scale-105"
                                : "bg-slate-100 text-slate-300"
                            )}>
                              {day.active ? (
                                <Flame className="w-3.5 h-3.5 fill-white text-white" />
                              ) : (
                                <span className="text-[7px] font-black text-slate-400">{dateObj.getDate()}</span>
                              )}
                            </div>
                            <span className="text-[7px] font-bold text-slate-400 leading-none">{formattedDate}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════════════ TABS ═══════════════ */}
        <div className="px-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-8 border-b border-slate-100 mb-5 overflow-x-auto no-scrollbar">
            {['list', 'stats'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={cn(
                  "pb-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                  activeTab === tab ? 'text-indigo-600' : 'text-slate-400'
                )}
              >
                {tab === 'list' ? 'CARD LIST' : 'STATISTICS'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
              </button>
            ))}
          </div>

          {activeTab === 'list' ? (
            <div className="space-y-1">
              {/* Question Items */}
              <div className="space-y-1.5">
                {allQuestions.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => setSelectedCard(q)}
                    className="group bg-white p-3.5 md:p-4 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/10 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 flex-shrink-0 w-6 text-right">#{q.orig_index}</span>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 
                          className="text-xs font-bold text-slate-700 leading-relaxed md:line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(q.content) }}
                        />
                        {notes?.[q.id] && (
                          <div className="mt-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/30">
                            <p className="text-[9px] font-medium text-slate-500 italic line-clamp-1">{notes[q.id]}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                        <StatItem label="ATT" value={q.stats?.total || 0} color="slate" />
                        <StatItem label="OK" value={q.stats?.correct || 0} color="emerald" />
                        <StatItem label="NG" value={q.stats?.wrong || 0} color="rose" />
                        {notes?.[q.id] && (
                          <div className="flex items-center text-indigo-400 md:hidden" title={notes[q.id]}>
                            <StickyNote className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <button 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                    className="px-6 py-2.5 bg-white border border-slate-100 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'LOADING...' : 'LOAD MORE'}
                  </button>
                </div>
              )}

              {allQuestions.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No cards yet</p>
                  <p className="text-[10px] text-slate-400 mt-1">Add cards using the + button below</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-10 md:p-16 rounded-2xl text-center border border-slate-100 shadow-sm">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                <BarChart2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">In-Depth Analytics</h3>
              <p className="text-slate-500 font-medium text-sm mb-8 max-w-md mx-auto">Detailed statistics and learning metrics will populate once you start practicing this deck.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ FLOATING BOTTOM BAR ═══════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-[130]">
        {/* Creator Panel (Quick Add) - slides up above the bar */}
        <AnimatePresence>
          {bottomBarMode === 'creator' && !isSearchPanelOpen && canEdit && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white/95 backdrop-blur-xl border-t border-indigo-50/80 p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]"
            >
              <form onSubmit={handleQuickAddCard} className="max-w-5xl mx-auto flex flex-col sm:flex-row items-end gap-2.5">
                <div className="flex flex-1 gap-2.5 w-full">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Front</label>
                    <input
                      ref={quickAddFrontRef}
                      type="text"
                      placeholder="Kanji, word, question..."
                      value={quickAddFront}
                      onChange={(e) => setQuickAddFront(e.target.value)}
                      className="w-full h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Back</label>
                    <input
                      type="text"
                      placeholder="Translation, meaning..."
                      value={quickAddBack}
                      onChange={(e) => setQuickAddBack(e.target.value)}
                      className="w-full h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isQuickAdding}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  {isQuickAdding ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Panel - slides up above the bar */}
        <AnimatePresence>
          {isSearchPanelOpen && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white/95 backdrop-blur-xl border-t border-indigo-50/80 p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]"
            >
              <div className="max-w-5xl mx-auto relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cards by content..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Bottom Bar */}
        <div className="bg-white/90 backdrop-blur-2xl border-t border-slate-100 px-3 py-2.5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            {bottomBarMode === 'learn' && !isSearchPanelOpen ? (
              /* ── LEARN MODE ── */
              <>
                {/* Flashcard Button with Dropdown */}
                <div className="flex-1 flex relative">
                  <button 
                    onClick={() => {
                      const savedMode = localStorage.getItem('quiz_learning_mode') || 'fsrs'
                      navigate(`/flashcard/${id}/play?mode=${savedMode}`)
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] md:text-xs rounded-l-xl shadow-lg shadow-indigo-500/15 active:scale-[0.97] transition-all tracking-widest uppercase flex items-center justify-center gap-1.5"
                  >
                    <Brain className="w-4 h-4" /> Flashcard
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowFlashcardMenu(!showFlashcardMenu)
                      setShowPracticeMenu(false)
                    }}
                    className="px-2.5 bg-indigo-600 hover:bg-indigo-700 border-l border-indigo-500/50 text-white rounded-r-xl active:scale-95 transition-all flex items-center justify-center"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Flashcard Dropdown */}
                  {showFlashcardMenu && (
                    <>
                      <div className="fixed inset-0 z-[135]" onClick={() => setShowFlashcardMenu(false)} />
                      <div className="absolute bottom-full mb-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-60 bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-xl shadow-2xl p-1.5 z-[140] flex flex-col gap-0.5 animate-in slide-in-from-bottom-2 duration-200">
                        <span className="px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100/50 text-left">Flashcard Mode</span>
                        {[
                          { mode: 'fsrs', icon: '🧠', label: 'Spaced Repetition (FSRS)' },
                          { mode: 'flip', icon: '🔄', label: 'Flip Card' },
                          { mode: 'review', icon: '📚', label: 'Review Only' },
                          { mode: 'new', icon: '✨', label: 'Learn New Only' },
                          { mode: 'roadmap', icon: '🗺️', label: 'Roadmap Mode' },
                        ].map(item => (
                          <button
                            key={item.mode}
                            onClick={() => {
                              localStorage.setItem('quiz_learning_mode', item.mode)
                              navigate(`/flashcard/${id}/play?mode=${item.mode}`)
                            }}
                            className="px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all text-left flex items-center gap-2"
                          >
                            {item.icon} {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Roadmap Smart Button (only when roadmap is active) */}
                {roadmapStatus?.roadmap_active && (
                  <div className="flex-1 flex">
                    <button
                      onClick={() => navigate(roadmapStatus.next_action_url || `/flashcard/${id}/roadmap`)}
                      className={cn(
                        "flex-1 py-3 font-black text-[10px] md:text-xs rounded-xl shadow-lg active:scale-[0.97] transition-all tracking-widest uppercase flex items-center justify-center gap-1.5",
                        roadmapStatus.stage_2_done
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/15"
                          : roadmapStatus.roadmap_type === 'accumulation'
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/15"
                            : "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white shadow-indigo-500/15"
                      )}
                    >
                      <Compass className="w-4 h-4" />
                      {roadmapStatus.stage_2_done ? '✓ Xong Hôm Nay' : (roadmapStatus.next_action_label || 'Roadmap')}
                    </button>
                  </div>
                )}

                {/* Practice Button with Dropdown (rendered if at least 1 of 3 practice modes is setup) */}
                {((quiz?.enabled_practice_modes ? quiz.enabled_practice_modes.length > 0 : (quiz?.has_practice_setup !== false && quiz?.has_mcq_setup !== false)) && !quiz?.practice_disabled) && (
                <div className="flex-1 flex relative">
                  <button 
                    onClick={() => {
                      const savedSub = localStorage.getItem('vocab_practice_submode') || 'mcq'
                      navigate(`/practice/${id}/${savedSub}`)
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] md:text-xs rounded-l-xl shadow-lg shadow-emerald-500/15 active:scale-[0.97] transition-all tracking-widest uppercase flex items-center justify-center gap-1.5"
                  >
                    <Trophy className="w-4 h-4" /> Practice
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPracticeMenu(!showPracticeMenu)
                      setShowFlashcardMenu(false)
                    }}
                    className="px-2.5 bg-emerald-600 hover:bg-emerald-700 border-l border-emerald-500/50 text-white rounded-r-xl active:scale-95 transition-all flex items-center justify-center"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Practice Dropdown */}
                  {showPracticeMenu && (
                    <>
                      <div className="fixed inset-0 z-[135]" onClick={() => setShowPracticeMenu(false)} />
                      <div className="absolute bottom-full mb-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-60 bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-xl shadow-2xl p-1.5 z-[140] flex flex-col gap-0.5 animate-in slide-in-from-bottom-2 duration-200">
                        <span className="px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100/50 text-left">Practice Mode</span>
                        {[
                          { mode: 'mcq', icon: '🎯', label: 'Multiple Choice (MCQ)' },
                          { mode: 'typing', icon: '⌨️', label: 'Typing Practice' },
                          { mode: 'listening', icon: '🎧', label: 'Listening Practice' },
                        ].filter(item => {
                          if (quiz?.enabled_practice_modes && Array.isArray(quiz.enabled_practice_modes)) {
                            return quiz.enabled_practice_modes.includes(item.mode);
                          }
                          return true;
                        }).map(item => (
                          <button
                            key={item.mode}
                            onClick={() => {
                              localStorage.setItem('vocab_practice_submode', item.mode)
                              navigate(`/practice/${id}/${item.mode}`)
                            }}
                            className="px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all text-left flex items-center gap-2"
                          >
                            {item.icon} {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                )}
              </>
            ) : (
              /* ── CREATOR MODE ── */
              <>
                <button
                  onClick={() => setIsSearchPanelOpen(false)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95",
                    !isSearchPanelOpen
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Card
                </button>
                <button
                  onClick={() => setIsSearchPanelOpen(true)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95",
                    isSearchPanelOpen
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  <Search className="w-3.5 h-3.5" /> Search
                </button>
              </>
            )}

            {/* Toggle Button (Creator Tools for editors, Search for normal users) */}
            {canEdit ? (
              <button
                onClick={() => {
                  setBottomBarMode(prev => prev === 'learn' ? 'creator' : 'learn')
                  setShowFlashcardMenu(false)
                  setShowPracticeMenu(false)
                  setIsSearchPanelOpen(false)
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0",
                  bottomBarMode === 'creator'
                    ? "bg-indigo-100 text-indigo-600 border border-indigo-200"
                    : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-indigo-600"
                )}
                title={bottomBarMode === 'learn' ? 'Creator Tools' : 'Back to Learn'}
              >
                {bottomBarMode === 'creator' ? <Brain className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSearchPanelOpen(prev => !prev)
                  setShowFlashcardMenu(false)
                  setShowPracticeMenu(false)
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0",
                  isSearchPanelOpen
                    ? "bg-indigo-100 text-indigo-600 border border-indigo-200"
                    : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-indigo-600"
                )}
                title={isSearchPanelOpen ? 'Close Search' : 'Search Cards'}
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ CARD INSIGHTS & STATS POPUP MODAL ═══════════════ */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-5 shadow-2xl border border-slate-100/60 overflow-hidden flex flex-col max-h-[85vh] text-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Learning Insights</h3>
                      <div className="flex items-center gap-0.5 ml-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                        {(() => {
                          const idx = allQuestions.findIndex(q => q.id === selectedCard.id)
                          const hasPrev = idx > 0
                          const hasNext = idx !== -1 && idx < allQuestions.length - 1
                          return (
                            <>
                              <button
                                disabled={!hasPrev}
                                onClick={() => hasPrev && setSelectedCard(allQuestions[idx - 1])}
                                className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-500 hover:text-indigo-650 disabled:opacity-30 disabled:hover:text-slate-500 transition-all border border-slate-200/40 active:scale-90"
                                title="Thẻ trước đó"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                disabled={!hasNext}
                                onClick={() => hasNext && setSelectedCard(allQuestions[idx + 1])}
                                className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-500 hover:text-indigo-650 disabled:opacity-30 disabled:hover:text-slate-500 transition-all border border-slate-200/40 active:scale-90"
                                title="Thẻ tiếp theo"
                              >
                                <ChevronDown className="w-3 h-3 rotate-270" style={{ transform: 'rotate(-90deg)' }} />
                              </button>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">Details for Card #{selectedCard.orig_index}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => {
                      setEditCardFormData(selectedCard)
                      setIsEditingCard(true)
                    }}
                      className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                      title="Sửa thẻ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Sửa thẻ</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedCard(null)}
                    className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub tabs: Insights vs Card Stats */}
              <div className="flex border-b border-slate-100 flex-shrink-0 my-3 bg-slate-50/50 p-1 rounded-xl">
                <button
                  onClick={() => setCardModalTab('content')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    cardModalTab === 'content' ? "bg-white text-indigo-600 shadow-sm border border-slate-150/40" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  📖 Insights Content
                </button>
                <button
                  onClick={() => setCardModalTab('stats')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                    cardModalTab === 'stats' ? "bg-white text-indigo-600 shadow-sm border border-slate-150/40" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  📊 Card Statistics
                </button>
              </div>

              {/* Modal Body Area */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 space-y-4 py-2">
                {cardModalTab === 'content' ? (
                  <>
                    {/* Insights list */}
                    <div className="space-y-3.5">
                      {fullCardTabs.map((tab) => (
                        <div key={tab.id} className="p-3.5 rounded-xl bg-slate-50/40 border border-slate-100 text-left">
                          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-1.5">{tab.title}</span>
                          <div 
                            className="text-xs font-semibold text-slate-700 leading-relaxed pr-1 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(tab.content) }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Personal Note Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50/40 border border-slate-100 text-left space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">Personal Note</span>
                        <button
                          onClick={() => {
                            if (isEditingCardNote) {
                              handleSaveCardNote()
                            } else {
                              setIsEditingCardNote(true)
                            }
                          }}
                          disabled={isSavingCardNote}
                          className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-all active:scale-95"
                        >
                          {isSavingCardNote ? 'Saving...' : (isEditingCardNote ? 'Save' : 'Edit Note')}
                        </button>
                      </div>

                      {isEditingCardNote ? (
                        <textarea
                          value={selectedCardNote}
                          onChange={(e) => setSelectedCardNote(e.target.value)}
                          placeholder="Type personal notes or mnemonic tricks for this card..."
                          className="w-full h-24 bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-all resize-none"
                        />
                      ) : (
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">
                          {selectedCardNote || 'No personal note for this card yet.'}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Stats tab view */
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 text-center border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">Total Attempts</span>
                        <span className="text-lg font-black text-slate-800">{selectedCard.stats?.total || 0}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/50 text-center border border-emerald-100/50">
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Correct</span>
                        <span className="text-lg font-black text-emerald-600">{selectedCard.stats?.correct || 0}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-50/50 text-center border border-rose-100/50">
                        <span className="text-[8px] font-black text-rose-600 uppercase tracking-wider block mb-1">Wrong</span>
                        <span className="text-lg font-black text-rose-600">{selectedCard.stats?.wrong || 0}</span>
                      </div>
                    </div>

                    {/* Success rate calculation */}
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Accuracy Rate</span>
                        <span className="font-black text-slate-850">
                          {selectedCard.stats?.total > 0 
                            ? `${Math.round((selectedCard.stats.correct / selectedCard.stats.total) * 100)}%` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                          style={{ 
                            width: selectedCard.stats?.total > 0 
                              ? `${(selectedCard.stats.correct / selectedCard.stats.total) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-50/20 border border-indigo-100/50 text-left">
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block mb-2">Practice Insights</span>
                      <ul className="text-xs font-semibold text-slate-600 space-y-2 list-disc list-inside">
                        {selectedCard.stats?.total > 10 && (selectedCard.stats.correct / selectedCard.stats.total) > 0.8 && (
                          <li className="text-emerald-600">🔥 You have mastered this card! You answer correctly almost every time.</li>
                        )}
                        {selectedCard.stats?.wrong > selectedCard.stats?.correct && (
                          <li className="text-rose-600">⚠️ Hard card detected. Review this more often using Flashcard Play mode.</li>
                        )}
                        <li>Keep practicing to update spaced repetition intervals.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ ROADMAP SETTINGS MODAL ═══════════════ */}
      <AnimatePresence>
        {isRoadmapSettingsOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoadmapSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100/60 overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">🎯 Roadmap Settings</h3>
                <button onClick={() => setIsRoadmapSettingsOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Live Completion Calculation */}
              {(() => {
                const totalCards = roadmapStatus?.total_cards || quiz?.questions_count || 0;
                const learnedCards = roadmapStatus?.learned_cards || 0;
                const remainingCards = Math.max(0, totalCards - learnedCards);
                const daysNeeded = dailyNewInput > 0 ? Math.ceil(remainingCards / dailyNewInput) : 0;
                
                const estDate = new Date();
                estDate.setDate(estDate.getDate() + daysNeeded);
                const formattedEstDate = daysNeeded > 0 
                  ? estDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : "Hoàn thành hôm nay!";

                return (
                  <div className="space-y-5 mb-6 text-left">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số thẻ mới mỗi ngày</label>
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">{dailyNewInput} thẻ/ngày</span>
                      </div>

                      {/* Number Input */}
                      <input
                        type="number" min="1" max="200" value={dailyNewInput}
                        onChange={(e) => setDailyNewInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-base font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all mb-3"
                      />

                      {/* Interactive Range Slider */}
                      <input 
                        type="range" min="5" max="100" step="5" 
                        value={Math.min(100, Math.max(5, dailyNewInput))}
                        onChange={(e) => setDailyNewInput(parseInt(e.target.value) || 5)}
                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg mb-3"
                      />

                      {/* Quick Select Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[5, 10, 15, 20, 30, 50].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDailyNewInput(val)}
                            className={cn(
                              "px-2.5 py-1 rounded-xl text-[9px] font-black transition-all cursor-pointer border",
                              dailyNewInput === val 
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                : "bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pass Threshold Setting */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ngưỡng điểm đỗ bài test</label>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">≥ {passThresholdInput}%</span>
                      </div>
                      <input 
                        type="range" min="50" max="100" step="5" 
                        value={passThresholdInput}
                        onChange={(e) => setPassThresholdInput(parseInt(e.target.value) || 80)}
                        className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-100 rounded-lg mb-1"
                      />
                      <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
                        Cần đạt tối thiểu {passThresholdInput}% điểm bài kiểm tra để duy trì Streak học tập mỗi ngày.
                      </p>
                    </div>

                    {/* Dynamic Completion Date Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/40 border border-indigo-100/80 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Dự kiến hoàn thành bộ thẻ</span>
                      </div>
                      <div className="text-base font-black text-slate-900 tracking-tight">
                        {daysNeeded > 0 ? `Ngày ${formattedEstDate}` : 'Đã học hết từ mới!'}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">
                        {daysNeeded > 0 ? `Cần ~${daysNeeded} ngày nữa cho ${remainingCards} thẻ chưa học` : 'Bạn chỉ cần duy trì ôn tập hàng ngày.'}
                      </p>
                    </div>
                  </div>
                )
              })()}
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveRoadmap(false)}
                  disabled={isSavingRoadmapSettings}
                  className="flex-1 h-12 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-rose-100 cursor-pointer"
                >
                  {isSavingRoadmapSettings ? 'Đang lưu...' : 'Tắt Roadmap'}
                </button>
                <button
                  onClick={() => handleSaveRoadmap(true)}
                  disabled={isSavingRoadmapSettings}
                  className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  {isSavingRoadmapSettings ? 'Đang lưu...' : 'Kích Hoạt'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* ═══════════════ RESET PROGRESS CONFIRMATION MODAL ═══════════════ */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isResettingProgress && setIsResetModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100/60 overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Đặt Lại Tiến Độ</h3>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">Reset Deck Progress</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsResetModalOpen(false)} 
                  disabled={isResettingProgress}
                  className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-6 text-left">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/50 space-y-2">
                  <p className="text-xs font-bold text-amber-900 leading-relaxed">
                    Bạn có chắc chắn muốn làm sạch tiến độ để học lại bộ thẻ này từ đầu?
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-[10px] font-semibold text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-600">✨</span>
                    <span><strong>Tất cả {roadmapStatus?.total_cards || 0} thẻ</strong> sẽ trở thành "Từ Mới" để bắt đầu lại từ đầu.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500">🧹</span>
                    <span><strong>Lịch sử ghi nhớ FSRS & Tỷ lệ đúng/sai</strong> riêng của bộ thẻ này sẽ được xoá trắng.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500">🏆</span>
                    <span><strong>Tổng điểm XP & Level cá nhân ĐƯỢC GIỮ NGUYÊN</strong> (không bị trừ điểm tích lũy).</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResettingProgress}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleResetProgress}
                  disabled={isResettingProgress}
                  className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isResettingProgress ? 'Đang Reset...' : 'Xác Nhận Reset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ EDIT QUIZ MODAL ═══════════════ */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => !isSavingEdit && setIsEditModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                     <Settings className="w-6 h-6" />
                   </div>
                   <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
                     <button 
                       onClick={() => setEditTab('props')}
                       className={cn(
                         "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                         editTab === 'props' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       PROPERTIES
                     </button>
                     <button 
                       onClick={() => setEditTab('collabs')}
                       className={cn(
                         "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                         editTab === 'collabs' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       COLLABORATORS
                     </button>
                   </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {editTab === 'props' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Quiz Title</label>
                         <input 
                          type="text"
                          value={editFormData?.title}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Description</label>
                         <textarea 
                          rows={4}
                          value={editFormData?.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Global Instruction</label>
                         <textarea 
                          rows={4}
                          value={editFormData?.instruction}
                          onChange={(e) => setEditFormData({ ...editFormData, instruction: e.target.value })}
                          className="w-full px-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-indigo-900"
                         />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <Brain className="w-5 h-5 text-indigo-400" />
                               <label className="text-[10px] font-black uppercase tracking-[0.2em]">AI System Prompt</label>
                            </div>
                            <button onClick={() => setShowHelpModal(true)} className="text-white/40 hover:text-white transition-all"><HelpCircle className="w-4 h-4" /></button>
                         </div>
                         <textarea 
                          rows={8}
                          value={editFormData?.ai_prompt}
                          onChange={(e) => setEditFormData({ ...editFormData, ai_prompt: e.target.value })}
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-medium outline-none focus:border-indigo-400 transition-all custom-scrollbar"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Tags (comma separated)</label>
                         <input 
                          type="text"
                          value={editFormData?.tags}
                          onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Add Collaborator</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          value={userSearch}
                          onChange={(e) => handleSearchUsers(e.target.value)}
                          placeholder="Search by username or name..."
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[10] overflow-hidden">
                            {searchResults.map(u => (
                              <button 
                                key={u.id}
                                onClick={() => addCollaborator(u.id)}
                                className="w-full px-6 py-3 flex items-center justify-between hover:bg-indigo-50 transition-all text-left"
                              >
                                <div>
                                  <p className="text-xs font-black text-slate-700">{u.username}</p>
                                  <p className="text-[10px] text-slate-400">{u.full_name}</p>
                                </div>
                                <Plus className="w-4 h-4 text-indigo-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Collaborator List ({collaborators.length})</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {collaborators.map(c => (
                          <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">
                                {c.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-700 leading-none mb-1">{c.username}</p>
                                <p className="text-[9px] text-slate-400 font-medium">{c.full_name}</p>
                              </div>
                            </div>
                            {(quiz?.creator_id === user?.id || user?.id === 1) && (
                              <button 
                                onClick={() => removeCollaborator(c.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {collaborators.length === 0 && (
                          <div className="col-span-2 py-10 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Collaborators Assigned</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {editTab === 'props' && (
                <div className="mt-10 flex gap-4">
                   <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    disabled={isSavingEdit}
                    onClick={async () => {
                       setIsSavingEdit(true)
                       try {
                         await axios.patch(`/api/v1/deck/${id}`, {
                           ...editFormData,
                           tags: editFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                         })
                         queryClient.invalidateQueries({ queryKey: ['quiz', id] })
                         setIsEditModalOpen(false)
                       } catch (e) {
                         alert("Error saving changes!")
                       } finally {
                         setIsSavingEdit(false)
                       }
                    }}
                    className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     {isSavingEdit ? (
                       <>Saving...</>
                     ) : (
                       <>
                         <Save className="w-4 h-4" />
                         Save Changes
                       </>
                     )}
                   </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ HELP MODAL ═══════════════ */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowHelpModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Prompting Guide</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Use placeholder tags to personalize prompts</p>
                </div>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">
                You can insert the following placeholder tags into the AI System Prompt. The system will dynamically replace them with actual values:
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { tag: '{{question}}', desc: 'Current question text content' },
                  { tag: '{{options}}', desc: 'Formatted list of options (A. text, B. text...)' },
                  { tag: '{{correct_answer}}', desc: 'Correct answer label (e.g. A, B, C, D)' },
                  { tag: '{{global_instruction}}', desc: 'Global instructions for the quiz deck' },
                  { tag: '{{quiz_title}}', desc: 'Title of the quiz deck' },
                  { tag: '{{quiz_description}}', desc: 'Description of the quiz deck' },
                  { tag: '{{option_a}}', desc: 'Raw text content of option A' },
                  { tag: '{{option_b}}', desc: 'Raw text content of option B' },
                  { tag: '{{option_c}}', desc: 'Raw text content of option C' },
                  { tag: '{{option_d}}', desc: 'Raw text content of option D' },
                ].map((item) => (
                  <div key={item.tag} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <code className="text-xs font-black text-indigo-650 group-hover:scale-105 transition-transform">{item.tag}</code>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <FlashcardEditModal
        isOpen={isEditingCard}
        onClose={() => {
          setIsEditingCard(false)
          setEditCardFormData(null)
        }}
        flashcard={editCardFormData}
        onSave={handleSaveInlineCardEdit}
        isSaving={isSavingCardEdit}
      />
    </div>
  )
}

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
  const textColors: any = {
    slate: 'text-slate-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500'
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{label}</span>
      <span className={cn("text-[10px] font-black", textColors[color])}>{value}</span>
    </div>
  )
}
