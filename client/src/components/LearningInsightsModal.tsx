import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, ChevronLeft, ChevronDown, Edit2, X, Volume2 } from 'lucide-react'
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
}

export default function LearningInsightsModal({
  card,
  onClose,
  allQuestions = [],
  onSelectCard,
  canEdit = false,
  onEditCard
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
                  {allQuestions.length > 1 && (
                    <div className="flex items-center gap-0.5 ml-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                      <button
                        disabled={!hasPrev}
                        onClick={() => hasPrev && onSelectCard && onSelectCard(allQuestions[idx - 1])}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-500 transition-all border border-slate-200/40 active:scale-90"
                        title="Thẻ trước đó"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        disabled={!hasNext}
                        onClick={() => hasNext && onSelectCard && onSelectCard(allQuestions[idx + 1])}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-500 transition-all border border-slate-200/40 active:scale-90"
                        title="Thẻ tiếp theo"
                      >
                        <ChevronDown className="w-3 h-3 -rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-1">Details for Card #{displayIndex}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && onEditCard && (
                <button
                  onClick={() => onEditCard(card)}
                  className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                  title="Sửa thẻ"
                >
                  <Edit2 className="w-3 h-3 text-slate-500" />
                  <span>Sửa thẻ</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-xl mt-4 flex-shrink-0 gap-1 border border-slate-200/40">
            <button
              onClick={() => setCardModalTab('content')}
              className={cn(
                "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                cardModalTab === 'content' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-400 hover:text-slate-600"
              )}
            >
              📖 INSIGHTS CONTENT
            </button>
            <button
              onClick={() => setCardModalTab('stats')}
              className={cn(
                "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                cardModalTab === 'stats' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-400 hover:text-slate-600"
              )}
            >
              📊 CARD STATISTICS
            </button>
          </div>

          {/* Modal Body Area */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 space-y-3.5 py-1 mt-4">
            {cardModalTab === 'content' ? (
              <>
                {/* Insights list */}
                <div className="space-y-3.5">
                  {fullCardTabs.map((tab) => (
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 text-center border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">Số lần trả lời</span>
                    <span className="text-xl font-black text-slate-800">{card.stats?.total || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 text-center border border-emerald-100/50">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Trả lời đúng</span>
                    <span className="text-xl font-black text-emerald-600">{card.stats?.correct || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50/50 text-center border border-rose-100/50">
                    <span className="text-[8px] font-black text-rose-600 uppercase tracking-wider block mb-1">Trả lời sai</span>
                    <span className="text-xl font-black text-rose-600">{card.stats?.wrong || 0}</span>
                  </div>
                </div>

                {/* Success rate calculation */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>Tỷ lệ chính xác (Accuracy Rate)</span>
                    <span className="font-black text-slate-850">
                      {card.stats?.total > 0
                        ? `${Math.round((card.stats.correct / card.stats.total) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                      style={{
                        width: card.stats?.total > 0
                          ? `${(card.stats.correct / card.stats.total) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/60 text-left">
                  <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block mb-2">Gợi ý học tập</span>
                  <ul className="text-xs font-semibold text-slate-600 space-y-2 list-disc list-inside">
                    {card.stats?.total > 10 && (card.stats.correct / card.stats.total) > 0.8 && (
                      <li className="text-emerald-600">🔥 Bạn đã thành thạo thẻ này! Hầu như bạn luôn trả lời đúng.</li>
                    )}
                    {card.stats?.wrong > card.stats?.correct && (
                      <li className="text-rose-600">⚠️ Thẻ có độ khó cao. Hãy ôn tập thẻ này thường xuyên hơn.</li>
                    )}
                    <li>Tiếp tục luyện tập để tự động tối ưu hóa khoảng thời gian ôn lặp FSRS.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
