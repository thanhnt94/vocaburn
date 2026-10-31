import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, StickyNote, MessageSquare, BarChart3, Volume2, X, ChevronLeft, 
  ChevronRight, Edit2, Edit3, Check, Copy, Trash2, Send, ThumbsUp, 
  CornerDownRight, CheckCircle2, XCircle, Clock, RotateCcw, AlertCircle, 
  Heart, Flame, Target, Timer
} from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { speakWithEdgeTTS } from '@/lib/audio'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh'
import { useAuthStore } from '@/store/useAuthStore'

// Helper to parse BBCode & Japanese Ruby to HTML
const parseBBCodeToHtml = (text: string): string => {
  if (!text) return '';

  let html = text
    .replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>')
    .replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>')
    .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
    .replace(/\[s\](.*?)\[\/s\]/gi, '<s>$1</s>')
    .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color: $1">$2</span>')
    .replace(/\[size=(.*?)\](.*?)\[\/size\]/gi, '<span style="font-size: $1px">$2</span>')
    .replace(/\[highlight\](.*?)\[\/highlight\]/gi, '<mark class="bg-amber-200 text-slate-900 px-1 rounded">$1</mark>')
    .replace(/\[align=(.*?)\](.*?)\[\/align\]/gi, '<div style="text-align: $1">$2</div>');

  // Support Ruby Furigana markdown: [漢字|かんじ] or [漢字](かんじ)
  html = html.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');
  
  // Format bold markdown **word**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-indigo-600">$1</strong>');

  return html;
};

const MarkdownComponents = {
  code({ className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '');
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>');
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: value }} {...props} />
      );
    }
    return <code className={className} {...props}>{children}</code>;
  }
};

function parseUTCDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  try {
    let formatted = dateStr;
    if (!formatted.endsWith('Z')) {
      formatted += 'Z';
    }
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    console.error("parseUTCDate error:", e);
  }
  return new Date();
}

function formatRelativeTime(dateStr: string | null | undefined): { relative: string; full: string } {
  if (!dateStr) return { relative: 'never', full: 'Never learned this card' };
  const d = parseUTCDate(dateStr);
  if (isNaN(d.getTime())) return { relative: 'never', full: 'Never learned this card' };
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  let relative = '';
  if (diffSec < 60) {
    relative = 'just now';
  } else if (diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffHour < 24) {
    relative = `${diffHour}h ago`;
  } else if (diffDay < 30) {
    relative = `${diffDay}d ago`;
  } else if (diffMonth < 12) {
    relative = `${diffMonth}mo ago`;
  } else {
    relative = `${diffYear}y ago`;
  }
  
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  const hourStr = String(d.getHours()).padStart(2, '0');
  const minStr = String(d.getMinutes()).padStart(2, '0');
  const secStr = String(d.getSeconds()).padStart(2, '0');
  
  const full = `${dayStr}/${monthStr}/${yearStr} ${hourStr}:${minStr}:${secStr}`;
  return { relative, full };
}

function formatOverdueTime(dueIsoStr?: string | null): { relative: string; full: string; overdue: boolean; severe: boolean } {
  if (!dueIsoStr) return { relative: 'none', full: 'No due date', overdue: false, severe: false };
  const d = parseUTCDate(dueIsoStr);
  if (isNaN(d.getTime())) return { relative: 'none', full: 'No due date', overdue: false, severe: false };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  const hourStr = String(d.getHours()).padStart(2, '0');
  const minStr = String(d.getMinutes()).padStart(2, '0');
  const full = `${dayStr}/${monthStr}/${yearStr} ${hourStr}:${minStr}`;

  if (diffMs > 0) {
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    let relative = '';
    if (diffDay > 0) {
      relative = `+${diffDay}d`;
    } else if (diffHour > 0) {
      relative = `+${diffHour}h`;
    } else {
      relative = `+${Math.max(1, diffMin)}m`;
    }
    return { relative, full, overdue: true, severe: diffDay >= 3 };
  } else {
    const absMs = Math.abs(diffMs);
    const diffMin = Math.floor(absMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    let relative = '';
    if (diffDay > 0) {
      relative = `in ${diffDay}d`;
    } else if (diffHour > 0) {
      relative = `in ${diffHour}h`;
    } else {
      relative = `in ${Math.max(1, diffMin)}m`;
    }
    return { relative, full, overdue: false, severe: false };
  }
}

const handlePlayTabAudio = async (cardId?: number, tabId?: string, textContent?: string) => {
  const cleanText = (textContent || '')
    .replace(/<rt>.*?<\/rt>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\/?(b|i|u|s|color|size|highlight|align).*?\]/gi, '')
    .trim();

  if (!cleanText) return;

  if (cardId && tabId) {
    try {
      const res = await axios.get(`/api/v1/deck/question/${cardId}/tab-audio/${encodeURIComponent(tabId)}`);
      if (res.data?.audio_url) {
        const audio = new Audio(resolveMediaUrl(res.data.audio_url));
        audio.play().catch(() => speakWithEdgeTTS(cleanText));
        return;
      }
    } catch (e) {
      console.warn(`[INSIGHTS TTS] Falling back to Edge TTS.`);
    }
  }
  speakWithEdgeTTS(cleanText);
};

export type CardHubTabId = 'insight' | 'note' | 'social' | 'stats';

export interface LearningInsightsModalProps {
  card: any | null;
  onClose: () => void;
  allQuestions?: any[];
  onSelectCard?: (card: any) => void;
  canEdit?: boolean;
  onEditCard?: (card: any) => void;
  insightsColumns?: string[];
  initialTab?: 'insight' | 'content' | 'note' | 'social' | 'community' | 'stats';
  deckInfo?: any;
}

export default function LearningInsightsModal({
  card,
  onClose,
  allQuestions = [],
  onSelectCard,
  canEdit = false,
  onEditCard,
  insightsColumns,
  initialTab = 'insight',
  deckInfo
}: LearningInsightsModalProps) {
  const currentUser = useAuthStore(state => state.user);
  const modalRef = useRef<HTMLDivElement>(null);

  // Map initial tab aliases to standard 4 tabs
  const resolveTabId = (tab?: string): CardHubTabId => {
    if (tab === 'stats') return 'stats';
    if (tab === 'note') return 'note';
    if (tab === 'social' || tab === 'community') return 'social';
    return 'insight';
  };

  const [activeTab, setActiveTab] = useState<CardHubTabId>(resolveTabId(initialTab));

  // Note state
  const [cardNote, setCardNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Social / Community state
  const [contributions, setContributions] = useState<any[]>([]);
  const [isFetchingContributions, setIsFetchingContributions] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>('');
  const [contributionType, setContributionType] = useState<'comment' | 'correction'>('comment');
  const [isSubmittingContribution, setIsSubmittingContribution] = useState<boolean>(false);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});

  // Stats state
  const [detailedStats, setDetailedStats] = useState<any | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync initial tab when changed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab, card?.id]);

  // Prevent mobile pull-to-refresh
  usePreventPullToRefresh({
    isOpen: Boolean(card),
    drawerRef: modalRef,
    onClose,
  });

  // Fetch card note
  useEffect(() => {
    if (!card || !card.id) {
      setCardNote('');
      setIsEditingNote(false);
      return;
    }

    let isMounted = true;
    setIsEditingNote(false);

    const fetchNote = async () => {
      try {
        const res = await axios.get(`/api/v1/deck/question/${card.id}/note`);
        if (isMounted) {
          setCardNote(res.data?.content || '');
        }
      } catch (err) {
        if (isMounted) setCardNote('');
      }
    };

    fetchNote();
    return () => { isMounted = false; };
  }, [card?.id]);

  // Fetch community contributions
  useEffect(() => {
    if (!card || !card.id) {
      setContributions([]);
      return;
    }

    let isMounted = true;
    const fetchContributions = async () => {
      setIsFetchingContributions(true);
      try {
        const res = await axios.get(`/api/v1/deck/question/${card.id}/contributions`);
        if (isMounted && Array.isArray(res.data)) {
          setContributions(res.data);
        }
      } catch (e) {
        if (isMounted) setContributions([]);
      } finally {
        if (isMounted) setIsFetchingContributions(false);
      }
    };

    fetchContributions();
    return () => { isMounted = false; };
  }, [card?.id]);

  // Fetch detailed stats if stats tab is opened
  useEffect(() => {
    if (!card || !card.id || activeTab !== 'stats') return;

    let isMounted = true;
    const fetchStats = async () => {
      setIsStatsLoading(true);
      try {
        const res = await axios.get(`/api/v1/deck/question/${card.id}/detailed-stats`);
        if (isMounted && res.data) {
          setDetailedStats(res.data);
        }
      } catch (e) {
        // Fallback to card.stats
      } finally {
        if (isMounted) setIsStatsLoading(false);
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [card?.id, activeTab]);

  const handleSaveCardNote = async () => {
    if (!card || !card.id) return;
    setIsSavingNote(true);
    try {
      await axios.post(`/api/v1/deck/question/${card.id}/note`, { content: cardNote });
      setIsEditingNote(false);
    } catch (err) {
      console.error('Failed to save card note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    if (!text) return;
    const cleanText = text
      .replace(/<rt>.*?<\/rt>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[\/?(b|i|u|s|color|size|highlight|align).*?\]/gi, '')
      .trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePostContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !card?.id) return;
    setIsSubmittingContribution(true);
    try {
      const res = await axios.post(`/api/v1/deck/question/${card.id}/contributions`, {
        content: commentInput.trim(),
        type: contributionType
      });
      if (res.data) {
        setCommentInput('');
        // Refresh list
        const listRes = await axios.get(`/api/v1/deck/question/${card.id}/contributions`);
        if (Array.isArray(listRes.data)) {
          setContributions(listRes.data);
        }
      }
    } catch (e) {
      console.error('Failed to post contribution:', e);
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  const handleLikeContribution = async (contribId: number) => {
    try {
      const res = await axios.post(`/api/v1/deck/contributions/${contribId}/like`);
      if (res.data) {
        setContributions(prev => prev.map(c => {
          if (c.id === contribId) {
            return { ...c, is_liked_by_me: res.data.liked, likes_count: res.data.likes_count };
          }
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: c.replies.map((r: any) => r.id === contribId ? { ...r, is_liked_by_me: res.data.liked, likes_count: res.data.likes_count } : r)
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error('Failed to like contribution:', e);
    }
  };

  const handleReplyContribution = async (parentId: number) => {
    const text = replyInputs[parentId];
    if (!text?.trim() || !card?.id) return;
    try {
      await axios.post(`/api/v1/deck/question/${card.id}/contributions`, {
        content: text.trim(),
        type: 'comment',
        parent_id: parentId
      });
      setReplyInputs(prev => ({ ...prev, [parentId]: '' }));
      setActiveReplyId(null);
      const listRes = await axios.get(`/api/v1/deck/question/${card.id}/contributions`);
      if (Array.isArray(listRes.data)) {
        setContributions(listRes.data);
      }
    } catch (e) {
      console.error('Failed to reply:', e);
    }
  };

  const handleDeleteContribution = async (contribId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await axios.delete(`/api/v1/deck/contributions/${contribId}`);
      const listRes = await axios.get(`/api/v1/deck/question/${card.id}/contributions`);
      if (Array.isArray(listRes.data)) {
        setContributions(listRes.data);
      }
    } catch (e) {
      console.error('Failed to delete contribution:', e);
    }
  };

  if (!card) return null;

  // Build card columns for Insight Tab
  const fullCardTabs: { id: string; title: string; content: string }[] = [];

  if (card.content || card.front) {
    fullCardTabs.push({
      id: 'front',
      title: 'FRONT (TERMS)',
      content: card.content || card.front || ''
    });
  }

  if (card.explanation || card.back || card.ai_explanation) {
    fullCardTabs.push({
      id: 'back',
      title: 'EXPLANATION (BACK)',
      content: card.explanation || card.back || card.ai_explanation || ''
    });
  }

  let othersObj: Record<string, any> = {};
  if (card.others) {
    if (typeof card.others === 'string') {
      try {
        othersObj = JSON.parse(card.others);
      } catch (e) {}
    } else if (typeof card.others === 'object') {
      othersObj = card.others;
    }
  }

  const frontAudioContent = card.front_audio_content || othersObj.front_audio_content || othersObj['front audio content'];
  if (frontAudioContent) {
    fullCardTabs.push({
      id: 'front_audio_content',
      title: 'FRONT AUDIO CONTENT',
      content: frontAudioContent
    });
  }

  const backAudioContent = card.back_audio_content || othersObj.back_audio_content || othersObj['back audio content'];
  if (backAudioContent) {
    fullCardTabs.push({
      id: 'back_audio_content',
      title: 'BACK AUDIO CONTENT',
      content: backAudioContent
    });
  }

  if (othersObj && typeof othersObj === 'object') {
    Object.entries(othersObj).forEach(([key, value]) => {
      if (
        key !== 'ai_responses' &&
        key !== 'id' &&
        key !== 'created_at' &&
        key !== 'updated_at' &&
        key !== 'front' &&
        key !== 'back' &&
        key !== 'image' &&
        key !== 'audio' &&
        key !== 'front_audio_url' &&
        key !== 'back_audio_url' &&
        key !== 'front_audio_content' &&
        key !== 'back_audio_content' &&
        key !== 'front audio content' &&
        key !== 'back audio content' &&
        value
      ) {
        fullCardTabs.push({
          id: key,
          title: key.toUpperCase().replace(/_/g, ' '),
          content: String(value || '')
        });
      }
    });
  }

  if (card.mnemonic) {
    fullCardTabs.push({ id: 'mnemonic', title: 'MNEMONIC', content: card.mnemonic });
  }

  if (card.hint) {
    fullCardTabs.push({ id: 'hint', title: 'HINT', content: card.hint });
  }

  let displayTabs = fullCardTabs;
  if (insightsColumns && insightsColumns.length > 0) {
    displayTabs = insightsColumns
      .map(colId => fullCardTabs.find(tab => tab.id === colId))
      .filter((tab): tab is { id: string; title: string; content: string } => tab !== undefined);
  }

  // Navigation indexes
  const idx = allQuestions.findIndex(q => String(q.id) === String(card.id));
  const hasPrev = idx > 0;
  const hasNext = idx !== -1 && idx < allQuestions.length - 1;
  const displayIndex = card.original_index || card.orig_index || (idx !== -1 ? idx + 1 : card.id);

  // Tab definitions
  const tabsList = [
    {
      id: 'insight' as const,
      label: 'Insight',
      icon: Sparkles,
      color: 'text-amber-500',
      activeClass: 'bg-amber-500/15 text-amber-700 border-amber-300/80 shadow-xs'
    },
    {
      id: 'note' as const,
      label: 'Note',
      icon: StickyNote,
      color: 'text-emerald-500',
      activeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-300/80 shadow-xs',
      badge: cardNote ? '✓' : null
    },
    {
      id: 'social' as const,
      label: 'Social',
      icon: MessageSquare,
      color: 'text-purple-500',
      activeClass: 'bg-purple-500/15 text-purple-700 border-purple-300/80 shadow-xs',
      badge: contributions.length > 0 ? String(contributions.length) : null
    },
    {
      id: 'stats' as const,
      label: 'Stats',
      icon: BarChart3,
      color: 'text-indigo-500',
      activeClass: 'bg-indigo-500/15 text-indigo-700 border-indigo-300/80 shadow-xs'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md overscroll-none touch-none"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-slate-800 z-10 overscroll-contain"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 transition-colors",
                activeTab === 'insight' ? "bg-amber-50 text-amber-600 border-amber-100" :
                activeTab === 'note' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                activeTab === 'social' ? "bg-purple-50 text-purple-600 border-purple-100" :
                "bg-indigo-50 text-indigo-600 border-indigo-100"
              )}>
                {activeTab === 'insight' ? <Sparkles className="w-5 h-5" /> :
                 activeTab === 'note' ? <StickyNote className="w-5 h-5" /> :
                 activeTab === 'social' ? <MessageSquare className="w-5 h-5" /> :
                 <BarChart3 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none truncate">
                    Card Hub #{displayIndex}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                    {activeTab}
                  </span>
                </div>
                <p className="text-[10.5px] font-bold text-slate-500 mt-1 truncate max-w-[280px] sm:max-w-[360px]">
                  {card.content || card.front || 'Card Details'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => speakWithEdgeTTS(card.content || card.front || '')}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/70 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Play Audio"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4-Tab Switcher */}
          <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-150/70 shrink-0">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 rounded-2xl">
              {tabsList.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none",
                      isActive
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                    )}
                  >
                    <tab.icon className={cn("w-3.5 h-3.5 transition-colors shrink-0", isActive ? tab.color : "text-slate-400")} />
                    <span className="truncate">{tab.label}</span>
                    {tab.badge && (
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[8px] font-black leading-none",
                        isActive ? "bg-indigo-600 text-white" : "bg-slate-300 text-slate-700"
                      )}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar min-h-0 space-y-4">
            {/* ─────────────────────────────────────────────────────────────
                TAB 1: INSIGHT (Columns, Definitions, Mnemonics, AI)
               ───────────────────────────────────────────────────────────── */}
            {activeTab === 'insight' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {displayTabs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-xs">
                    No insight columns configured for this card.
                  </div>
                ) : (
                  displayTabs.map((tab) => (
                    <div 
                      key={tab.id} 
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-150/70 text-left relative group hover:border-indigo-200/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">
                          {tab.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyText(tab.id, tab.content)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center transition-all active:scale-90"
                            title="Copy text"
                          >
                            {copiedId === tab.id ? <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlayTabAudio(card?.id, tab.id, tab.content)}
                            className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-all active:scale-90"
                            title="Play pronunciation"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div
                        className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap select-text pr-1"
                        dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(tab.content) }}
                      />
                    </div>
                  ))
                )}

                {/* Shortcut to note tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('note')}
                  className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-700 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-[0.99]"
                >
                  <StickyNote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{cardNote ? 'View / Edit Personal Note' : '+ Add Personal Study Note'}</span>
                </button>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 2: NOTE (Personal Study Notes with Markdown)
               ───────────────────────────────────────────────────────────── */}
            {activeTab === 'note' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-150/70 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                      <StickyNote className="w-4 h-4 text-emerald-500" />
                      Personal Notes Journal
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingNote) {
                          handleSaveCardNote();
                        } else {
                          setIsEditingNote(true);
                        }
                      }}
                      disabled={isSavingNote}
                      className={cn(
                        "h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs",
                        isEditingNote
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      )}
                    >
                      {isEditingNote ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Edit Note</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!isEditingNote ? (
                    <div
                      onClick={() => setIsEditingNote(true)}
                      className="min-h-[140px] p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed select-text"
                      title="Click to edit personal note"
                    >
                      {cardNote ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                          {cardNote}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-slate-400 italic text-xs font-normal">
                          No personal note recorded yet for this card. Tap here or click "Edit Note" above to write mnemonics, grammar cues, or vocabulary reminders...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={cardNote}
                        onChange={(e) => setCardNote(e.target.value)}
                        placeholder="Write your personal study note here... (Markdown supported)"
                        className="w-full h-44 p-3 rounded-xl bg-white border border-emerald-300 focus:ring-2 focus:ring-emerald-400 focus:outline-none text-xs sm:text-sm font-medium text-slate-800 resize-none shadow-inner"
                        autoFocus
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
                        <span>Supports Markdown format</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingNote(false)}
                            className="text-slate-500 hover:text-slate-700 font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 3: SOCIAL / COMMUNITY (Discussions, Corrections, Likes)
               ───────────────────────────────────────────────────────────── */}
            {activeTab === 'social' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Form to post comment / suggestion */}
                <form onSubmit={handlePostContribution} className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-150 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setContributionType('comment')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        contributionType === 'comment'
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      )}
                    >
                      💬 Discussion
                    </button>
                    <button
                      type="button"
                      onClick={() => setContributionType('correction')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        contributionType === 'correction'
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      )}
                    >
                      ⚠️ Suggestion / Error Fix
                    </button>
                  </div>

                  <div className="flex gap-2 items-end">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={contributionType === 'comment' ? "Ask a question or share a mnemonic..." : "Suggest a correction or edit for this card..."}
                      className="flex-1 min-h-[44px] max-h-[90px] p-2.5 bg-white rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 border border-purple-200 focus:border-purple-400 focus:outline-none resize-y"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingContribution || !commentInput.trim()}
                      className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                      title="Post"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Discussions List */}
                <div className="space-y-2.5">
                  {isFetchingContributions ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Loading discussions...</span>
                    </div>
                  ) : contributions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      <p className="text-xs font-black uppercase tracking-wider">No discussions yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">Be the first to share a memory tip or ask a question about this card!</p>
                    </div>
                  ) : (
                    contributions.map((c) => (
                      <div key={c.id} className="p-3 rounded-2xl bg-slate-50/80 border border-slate-150/70 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                              {c.user?.username ? c.user.username.substring(0, 2) : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-800 truncate">
                                  {c.user?.full_name || c.user?.username || 'User'}
                                </span>
                                {c.user?.role === 'admin' && (
                                  <span className="px-1.5 py-0.2 rounded text-[7px] font-black uppercase bg-rose-100 text-rose-600">Admin</span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-semibold text-slate-400">
                                {c.created_at ? formatRelativeTime(c.created_at).relative : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {c.type === 'correction' && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                                Suggestion
                              </span>
                            )}
                            {(c.user_id === currentUser?.id || currentUser?.role === 'admin') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteContribution(c.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap select-text pl-8">
                          {c.content}
                        </p>

                        <div className="flex items-center gap-3 pl-8 pt-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleLikeContribution(c.id)}
                            className={cn(
                              "flex items-center gap-1 font-black cursor-pointer transition-colors active:scale-90",
                              c.is_liked_by_me ? "text-purple-600" : "text-slate-400 hover:text-purple-600"
                            )}
                          >
                            <Heart className={cn("w-3 h-3", c.is_liked_by_me && "fill-purple-600")} />
                            <span>{c.likes_count || 0}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)}
                            className="font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Reply box */}
                        {activeReplyId === c.id && (
                          <div className="pl-8 pt-2 flex gap-2">
                            <input
                              type="text"
                              value={replyInputs[c.id] || ''}
                              onChange={(e) => setReplyInputs({ ...replyInputs, [c.id]: e.target.value })}
                              placeholder="Write a reply..."
                              className="flex-1 p-2 bg-white rounded-xl text-xs font-medium text-slate-800 border border-slate-200 outline-none focus:border-purple-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleReplyContribution(c.id)}
                              className="px-3 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase hover:bg-purple-700"
                            >
                              Send
                            </button>
                          </div>
                        )}

                        {/* Nested Replies */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="pl-8 space-y-2 pt-2 border-t border-slate-100">
                            {c.replies.map((r: any) => (
                              <div key={r.id} className="p-2 rounded-xl bg-white border border-slate-100 text-left space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-800">{r.user?.username || 'User'}</span>
                                    <span className="text-slate-400 text-[8px]">{r.created_at ? formatRelativeTime(r.created_at).relative : ''}</span>
                                  </div>
                                  {(r.user_id === currentUser?.id || currentUser?.role === 'admin') && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteContribution(r.id)}
                                      className="text-slate-300 hover:text-rose-500 p-0.5"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-slate-700 leading-snug">{r.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 4: STATS (FSRS Metrics, Rating Breakdown, Review Logs)
               ───────────────────────────────────────────────────────────── */}
            {activeTab === 'stats' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 4 Hero KPI Cards */}
                {(() => {
                  const statsObj = detailedStats || card.stats || {};
                  const totalReviews = statsObj.total_reviews || statsObj.total || 0;
                  const accuracy = statsObj.accuracy_percent || (totalReviews > 0 ? Math.round(((statsObj.correct || 0) / totalReviews) * 100) : 0);
                  const totalTimeSec = Math.round(statsObj.total_time_seconds || 0);
                  const avgTimeSec = Math.round(statsObj.avg_time_seconds || 0);
                  const stability = card.fsrs?.stability ? `${card.fsrs.stability.toFixed(1)}d` : 'New';
                  const difficulty = card.fsrs?.difficulty ? `${card.fsrs.difficulty.toFixed(1)}/10` : 'Default';
                  const overdueInfo = formatOverdueTime(card.fsrs?.due);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 text-center flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reviews</span>
                        <span className="text-base sm:text-lg font-black text-slate-800">{totalReviews}</span>
                        <span className="text-[8.5px] font-bold text-emerald-600">Acc: {accuracy}%</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 text-center flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Study Time</span>
                        <span className="text-base sm:text-lg font-black text-indigo-600">{totalTimeSec}s</span>
                        <span className="text-[8.5px] font-bold text-slate-400">Avg {avgTimeSec}s</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 text-center flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stability (S)</span>
                        <span className="text-base sm:text-lg font-black text-purple-600">{stability}</span>
                        <span className="text-[8.5px] font-bold text-slate-400">Diff: {difficulty}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 text-center flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Due Time</span>
                        <span className={cn(
                          "text-base sm:text-lg font-black",
                          overdueInfo.overdue ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {overdueInfo.relative}
                        </span>
                        <span className="text-[8.5px] font-bold text-slate-400 truncate max-w-[90px]" title={overdueInfo.full}>
                          {overdueInfo.full}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Rating Distribution Breakdown */}
                {(() => {
                  const statsObj = detailedStats || card.stats || {};
                  const again = statsObj.again_count || 0;
                  const hard = statsObj.hard_count || 0;
                  const good = statsObj.good_count || 0;
                  const easy = statsObj.easy_count || 0;

                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span>FSRS Rating Distribution</span>
                        <span>Again / Hard / Good / Easy</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-center text-rose-600">
                          <span className="text-[9px] font-black uppercase block">Again</span>
                          <span className="text-sm font-black">{again}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-center text-amber-600">
                          <span className="text-[9px] font-black uppercase block">Hard</span>
                          <span className="text-sm font-black">{hard}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-center text-indigo-600">
                          <span className="text-[9px] font-black uppercase block">Good</span>
                          <span className="text-sm font-black">{good}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center text-emerald-600">
                          <span className="text-[9px] font-black uppercase block">Easy</span>
                          <span className="text-sm font-black">{easy}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Review History Logs */}
                {(() => {
                  const logs = detailedStats?.history_logs || card.history_logs || [];
                  if (!logs || logs.length === 0) {
                    return (
                      <div className="py-6 text-center text-[11px] font-semibold text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-150">
                        No review logs recorded yet for this card.
                      </div>
                    );
                  }

                  const ratingNames = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
                  const ratingColors = {
                    1: 'bg-rose-50 text-rose-600 border-rose-100',
                    2: 'bg-amber-50 text-amber-600 border-amber-100',
                    3: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                    4: 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  };

                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Recent Review History ({logs.length})
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {logs.slice(0, 15).map((log: any, i: number) => {
                          const rName = ratingNames[log.rating as keyof typeof ratingNames] || `Rating ${log.rating || '?'}`;
                          const rColor = ratingColors[log.rating as keyof typeof ratingColors] || 'bg-slate-100 text-slate-600';
                          return (
                            <div key={log.id || i} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-[10px]">
                              <div className="flex items-center gap-2">
                                <span className={cn("px-2 py-0.5 rounded-md font-black uppercase border text-[8.5px]", rColor)}>
                                  {rName}
                                </span>
                                <span className="font-bold text-slate-600">
                                  {log.created_at ? formatRelativeTime(log.created_at).relative : 'Recent'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 font-bold text-slate-400">
                                <span>⏱️ {log.active_time || log.time_taken || 0}s</span>
                                {log.is_correct ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            {canEdit && onEditCard ? (
              <button
                type="button"
                onClick={() => onEditCard(card)}
                className="h-9 px-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Card</span>
              </button>
            ) : (
              <div />
            )}

            {/* Prev / Next Card Navigation */}
            {allQuestions.length > 1 && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onSelectCard && onSelectCard(allQuestions[idx - 1])}
                  className="w-10 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:text-slate-600 transition-all active:scale-90 cursor-pointer"
                  title="Previous card"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black text-slate-500 px-2 select-none">
                  {idx + 1} / {allQuestions.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onSelectCard && onSelectCard(allQuestions[idx + 1])}
                  className="w-10 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:text-slate-600 transition-all active:scale-90 cursor-pointer"
                  title="Next card"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
