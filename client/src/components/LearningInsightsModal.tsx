import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, ChevronLeft, ChevronRight, ChevronDown, Edit2, X, Volume2 } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { speakWithEdgeTTS } from '@/lib/audio'

// Helper to parse BBCode to HTML
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
    .replace(/\[align=(.*?)\](.*?)\[\/align\]/gi, '<div style="text-align: $1">$2</div>')

  // Support Ruby Furigana markdown: [漢字|かんじ] or [漢字](かんじ)
  html = html.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>')
  
  // Format bold markdown **word**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-indigo-600">$1</strong>')

  return html;
};

// Audio Edge TTS helper
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
  if (!dueIsoStr) return { relative: 'none', full: 'Chưa có hạn ôn', overdue: false, severe: false };
  const d = parseUTCDate(dueIsoStr);
  if (isNaN(d.getTime())) return { relative: 'none', full: 'Chưa có hạn ôn', overdue: false, severe: false };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  const hourStr = String(d.getHours()).padStart(2, '0');
  const minStr = String(d.getMinutes()).padStart(2, '0');
  const full = `Hạn ôn: ${dayStr}/${monthStr}/${yearStr} ${hourStr}:${minStr}`;

  if (diffMs <= 0) {
    return { relative: 'Đúng hạn', full, overdue: false, severe: false };
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  let relative = '';
  let severe = false;

  if (diffDay >= 1) {
    const remainingHours = diffHour % 24;
    relative = remainingHours > 0 ? `${diffDay}d ${remainingHours}h` : `${diffDay}d`;
    severe = diffDay >= 1;
  } else if (diffHour >= 1) {
    const remainingMin = diffMin % 60;
    relative = remainingMin > 0 ? `${diffHour}h ${remainingMin}m` : `${diffHour}h`;
    severe = diffHour >= 24;
  } else if (diffMin >= 1) {
    relative = `${diffMin}m`;
    severe = false;
  } else {
    relative = 'Vừa đến';
    severe = false;
  }

  return { relative, full, overdue: true, severe };
}

const handlePlayTabAudio = async (cardId: number | undefined, tabId: string, text: string) => {
  if (!text || typeof window === 'undefined') return;
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/\[.*?\]/g, '').trim();
  if (!cleanText) return;

  if (cardId) {
    try {
      console.log(`[INSIGHTS TTS] Requesting Edge TTS for card ${cardId} (${tabId})...`);
      const res = await axios.get(`/api/v1/deck/generate-audio/${cardId}?face=${encodeURIComponent(tabId)}`);
      if (res.data?.url) {
        const audio = new Audio(`${res.data.url}?t=${Date.now()}`);
        audio.play().catch(() => speakWithEdgeTTS(cleanText));
        return;
      }
    } catch (e) {
      console.warn(`[INSIGHTS TTS SERVER ERROR] Falling back to Edge TTS stream.`);
    }
  }
  speakWithEdgeTTS(cleanText);
};

export interface LearningInsightsModalProps {
  card: any | null;
  onClose: () => void;
  allQuestions?: any[];
  onSelectCard?: (card: any) => void;
  canEdit?: boolean;
  onEditCard?: (card: any) => void;
  insightsColumns?: string[];
}

export default function LearningInsightsModal({
  card,
  onClose,
  allQuestions = [],
  onSelectCard,
  canEdit = false,
  onEditCard,
  insightsColumns
}: LearningInsightsModalProps) {
  const [cardModalTab, setCardModalTab] = useState<'content' | 'stats'>('content');
  const [cardNote, setCardNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Fetch personal note when card changes
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

    return () => {
      isMounted = false;
    };
  }, [card?.id]);

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

  if (!card) return null;

  // Build card tabs list
  const fullCardTabs: { id: string; title: string; content: string }[] = [];

  if (card.content || card.front) {
    fullCardTabs.push({
      id: 'front',
      title: 'MẶT TRƯỚC (FRONT)',
      content: card.content || card.front || ''
    });
  }

  if (card.explanation || card.back || card.ai_explanation) {
    fullCardTabs.push({
      id: 'back',
      title: 'MẶT SAU (BACK)',
      content: card.explanation || card.back || card.ai_explanation || ''
    });
  }

  // Extract from others dict safely
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

  // Reorder and filter using insightsColumns if provided
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

  const displayIndex = card.orig_index !== undefined ? card.orig_index : (idx !== -1 ? idx + 1 : card.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100/60 overflow-hidden flex flex-col max-h-[88vh] text-slate-800 z-10"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <StickyNote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Learning Insights</h3>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-1">Details for Card #{displayIndex}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 custom-scrollbar min-h-0 py-4 mt-2">
            {cardModalTab === 'content' ? (
              <>
                {/* Insights list */}
                <div className="space-y-4">
                  {displayTabs.map((tab) => (
                    <div key={tab.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-150/60 text-left relative group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">{tab.title}</span>
                        <button
                          onClick={() => handlePlayTabAudio(card?.id, tab.id, tab.content)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-all active:scale-90 shrink-0"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div
                        className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap pr-1"
                        dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(tab.content) }}
                      />
                    </div>
                  ))}
                </div>

                {/* Personal Note Box */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-150/60 text-left space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block">Ghi chú cá nhân (Personal Note)</span>
                    <button
                      onClick={() => {
                        if (isEditingNote) {
                          handleSaveCardNote();
                        } else {
                          setIsEditingNote(true);
                        }
                      }}
                      disabled={isSavingNote}
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all active:scale-95 border border-indigo-100"
                    >
                      {isSavingNote ? 'Đang lưu...' : (isEditingNote ? 'Lưu ghi chú' : 'Sửa ghi chú')}
                    </button>
                  </div>

                  {isEditingNote ? (
                    <textarea
                      value={cardNote}
                      onChange={(e) => setCardNote(e.target.value)}
                      placeholder="Nhập ghi chú cá nhân hoặc mẹo ghi nhớ cho thẻ này..."
                      className="w-full h-24 bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">
                      {cardNote || 'Chưa có ghi chú cá nhân cho thẻ này.'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Stats tab view */
              <div className="space-y-4 py-2">
                {(() => {
                  const stats = card.stats || { 
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

                  return (
                    <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">
                        <span>Card Performance Stats</span>
                        <span>{allTimeTotal} reviews {allTimeTotal > 0 && `(Accuracy: ${allTimeAccuracy}%)`}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-rose-50/80 border border-rose-100/50 text-rose-600 shadow-sm">
                          <span className="text-[9px] font-black tracking-wider uppercase mb-0.5">Again</span>
                          <span className="text-sm font-black">{stats.again_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50/80 border border-amber-100/50 text-amber-600 shadow-sm">
                          <span className="text-[9px] font-black tracking-wider uppercase mb-0.5">Hard</span>
                          <span className="text-sm font-black">{stats.hard_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-orange-50/80 border border-orange-100/50 text-orange-600 shadow-sm">
                          <span className="text-[9px] font-black tracking-wider uppercase mb-0.5">Good</span>
                          <span className="text-sm font-black">{stats.good_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50/80 border border-emerald-100/50 text-emerald-600 shadow-sm">
                          <span className="text-[9px] font-black tracking-wider uppercase mb-0.5">Easy</span>
                          <span className="text-sm font-black">{stats.easy_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* FSRS Stats Row */}
                {card.fsrs && (() => {
                  const stateLabels = ['New', 'Learning', 'Review', 'Relearning'];
                  const stateColors = [
                    'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-sm shadow-blue-500/5',
                    'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-sm shadow-amber-500/5',
                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm shadow-emerald-500/5',
                    'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-sm shadow-rose-500/5'
                  ];
                  const stateDots = [
                    'bg-blue-500 shadow-blue-500/50',
                    'bg-amber-50 shadow-amber-500/50',
                    'bg-emerald-50 shadow-emerald-500/50',
                    'bg-rose-500 shadow-rose-500/50'
                  ];
                  const stateIdx = card.fsrs.state || 0;
                  
                  const firstLearnedInfo = formatRelativeTime(card.fsrs.first_learned);
                  const lastReviewedInfo = formatRelativeTime(card.fsrs.last_reviewed);
                  
                  return (
                    <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 rounded-2xl px-2 py-3 border border-slate-100/90 text-[10px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.01),inset_0_1px_2px_rgba(255,255,255,0.6)] backdrop-blur-md w-full gap-2">
                      {/* Overdue / Quá hạn */}
                      {(() => {
                        const overdueInfo = formatOverdueTime(card.fsrs?.due);
                        return (
                          <div className="flex flex-col items-center gap-1 flex-1 justify-center min-w-0 cursor-pointer select-none" title={overdueInfo.full}>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Overdue</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 truncate shadow-2xs",
                              overdueInfo.overdue
                                ? (overdueInfo.severe ? "bg-rose-500/10 text-rose-600 border-rose-500/25 shadow-rose-500/5" : "bg-amber-500/10 text-amber-600 border-amber-500/25 shadow-amber-500/5")
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 shadow-emerald-500/5"
                            )}>
                              {overdueInfo.overdue && (
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-ping", overdueInfo.severe ? "bg-rose-500" : "bg-amber-500")} />
                              )}
                              <span>{overdueInfo.relative}</span>
                            </span>
                          </div>
                        );
                      })()}
                      <div className="w-px h-8 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                      {/* Stability */}
                      <div className="flex flex-col items-center gap-1 flex-1 justify-center min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Stability</span>
                        <span className="bg-indigo-50/40 text-indigo-600 border border-indigo-100/30 px-2 py-0.5 rounded-lg font-black text-[11px] shadow-sm flex items-center gap-0.5 truncate">
                          {card.fsrs.stability ? (
                            <>
                              <span className="tracking-tight">{card.fsrs.stability.toFixed(2)}</span>
                              <span className="text-[9px] font-bold opacity-75">d</span>
                            </>
                          ) : (
                            'none'
                          )}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                      {/* Difficulty */}
                      <div className="flex flex-col items-center gap-1 flex-1 justify-center min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Difficulty</span>
                        <span className="bg-purple-50/40 text-purple-600 border border-purple-100/30 px-2 py-0.5 rounded-lg font-black text-[11px] shadow-sm flex items-center gap-0.5 truncate">
                          {card.fsrs.difficulty ? (
                            <span className="tracking-tight">{card.fsrs.difficulty.toFixed(2)}</span>
                          ) : (
                            'none'
                          )}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                      {/* First Learned */}
                      <div 
                        className="flex flex-col items-center gap-1 flex-1 justify-center min-w-0 cursor-pointer select-none hover:opacity-80 transition-opacity"
                        title={firstLearnedInfo.full}
                      >
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">First</span>
                        <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-2 py-0.5 rounded-lg font-black text-[10px] shadow-sm truncate">
                          {firstLearnedInfo.relative}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                      {/* Last Reviewed */}
                      <div 
                        className="flex flex-col items-center gap-1 flex-1 justify-center min-w-0 cursor-pointer select-none hover:opacity-80 transition-opacity"
                        title={lastReviewedInfo.full}
                      >
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">Last</span>
                        <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-2 py-0.5 rounded-lg font-black text-[10px] shadow-sm truncate">
                          {lastReviewedInfo.relative}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer (Mobile friendly) */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm flex-shrink-0 flex flex-col gap-4">
            {/* Tab Navigation */}
            <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200/60 shadow-sm">
              <button
                onClick={() => setCardModalTab('content')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                  cardModalTab === 'content' ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                📖 INSIGHTS
              </button>
              <button
                onClick={() => setCardModalTab('stats')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                  cardModalTab === 'stats' ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                📊 STATS
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              {canEdit && onEditCard ? (
                <button
                  onClick={() => onEditCard(card)}
                  className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                  <span>Sửa thẻ</span>
                </button>
              ) : (
                <div />
              )}

              {allQuestions.length > 1 && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button
                    disabled={!hasPrev}
                    onClick={() => hasPrev && onSelectCard && onSelectCard(allQuestions[idx - 1])}
                    className="w-12 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:text-slate-600 transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    disabled={!hasNext}
                    onClick={() => hasNext && onSelectCard && onSelectCard(allQuestions[idx + 1])}
                    className="w-12 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:text-slate-600 transition-all active:scale-90"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
