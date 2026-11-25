import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, StickyNote, MessageSquare, BarChart3, Volume2, X, ChevronLeft, 
  ChevronRight, Edit2, Edit3, Check, Copy, Trash2, Send, ThumbsUp, 
  CornerDownRight, CheckCircle2, XCircle, Clock, RotateCcw, AlertCircle, 
  Heart, Flame, Target, Timer, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
import { speakWithEdgeTTS } from '@/lib/audio'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh'
import { useAuthStore } from '@/store/useAuthStore'
import { parseUTCDate, formatRelativeTime, formatOverdueTime } from '@/lib/flashcard-utils'

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

  // Support Anki-style Furigana: 漢字[かんじ] -> <ruby>漢字<rt>かんじ</rt></ruby>
  html = html.replace(/([\u4e00-\u9fff\u3400-\u4dbf\u3005][\u4e00-\u9fff\u3400-\u4dbf\u3005\u3040-\u309f\u30a0-\u30ff]*)\[([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
  // Support Ruby Furigana markdown: [漢字|かんじ] or [漢字](かんじ)
  html = html.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');
  
  // Format bold markdown **word**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-indigo-600 dark:text-indigo-400">$1</strong>');

  // Convert LaTeX math arrows to clean Unicode arrows
  html = html
    .replace(/\$\\(?:right|r)arrow\$/gi, '➔')
    .replace(/\\(?:right|r)arrow/gi, '➔')
    .replace(/\$\\to\$/gi, '➔')
    .replace(/\\to\b/gi, '➔')
    .replace(/\$\\leftarrow\$/gi, '←')
    .replace(/\$\\leftrightarrow\$/gi, '↔')
    .replace(/\\leftrightarrow/gi, '↔')
    .replace(/\$\\Rightarrow\$/gi, '➔')
    .replace(/\$\\Leftarrow\$/gi, '←')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] sm:text-xs font-semibold">$1</code>');

  return sanitizeHtml(html);
};

const MarkdownComponents = {
  code({ className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '');
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>');
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} {...props} />
      );
    }
    return <code className={className} {...props}>{children}</code>;
  }
};

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

export const getInsightSectionPriority = (nameOrId: string): number => {
  const norm = (nameOrId || '').toLowerCase().replace(/_/g, ' ').trim();
  
  // 1. Tóm tắt & Nghĩa cốt lõi
  if (norm === 'nghĩa' || norm === 'nghia' || norm.includes('tóm tắt') || norm.includes('tom tat') || norm.includes('summary') || norm.includes('cốt lõi') || norm.includes('ý nghĩa') || norm.includes('y nghia') || norm.includes('meaning')) {
    return 1;
  }
  
  // 2. Cách kết hợp & Cấu trúc ngữ pháp
  if (norm.includes('kết hợp') || norm.includes('ket hop') || norm.includes('cấu trúc') || norm.includes('cau truc') || norm.includes('connection')) {
    return 2;
  }
  
  // 3. Từ đi kèm tiêu biểu (Collocations / Phrases)
  if (norm.includes('từ đi kèm') || norm.includes('tu di kem') || norm.includes('cụm từ') || norm.includes('cum tu') || norm.includes('collocation') || norm.includes('cụm') || norm.includes('tiêu biểu')) {
    return 3;
  }
  
  // 4. Bản chất & Sắc thái cốt lõi & Ngữ cảnh
  if (
    norm.includes('bản chất') || norm.includes('ban chat') ||
    norm.includes('sắc thái') || norm.includes('sac thai') ||
    norm.includes('cách sử dụng') || norm.includes('cach su dung') ||
    norm.includes('ngữ cảnh') || norm.includes('ngu canh') ||
    norm.includes('văn phong') || norm.includes('van phong') ||
    norm.includes('trang trọng') || norm.includes('ý chí') ||
    norm.includes('nuance') || norm.includes('usage')
  ) {
    return 4;
  }

  // 4.5. Phân biệt đúng sai (Maru vs Batsu)
  if (
    norm.includes('đúng sai') || norm.includes('dung sai') ||
    norm.includes('cách dùng đúng') || norm.includes('cach dung dung') ||
    norm.includes('maru') || norm.includes('batsu')
  ) {
    return 4.5;
  }
  
  // 5. Cặp dễ nhầm lẫn (So sánh 2D) & Phản xạ 3s & Dấu hiệu nhận biết
  if (
    norm.includes('nhầm lẫn') || norm.includes('nham lan') ||
    norm.includes('so sánh') || norm.includes('cặp dễ') ||
    norm.includes('phản xạ') || norm.includes('dấu hiệu') ||
    norm.includes('bắt bài') || norm.includes('3s')
  ) {
    return 5;
  }

  // 6. Vùng cấm, Bẫy thi, Lưu ý
  if (
    norm.includes('vùng cấm') || norm.includes('vung cam') ||
    norm.includes('bẫy thi') || norm.includes('bay thi') ||
    norm.includes('lưu ý') || norm.includes('luu y')
  ) {
    return 6;
  }
  
  // 7. Ví dụ thực tế
  if (norm.includes('ví dụ') || norm.includes('vi du') || norm.includes('example') || norm.includes('câu hỏi đục lỗ') || norm.includes('đục lỗ')) {
    return 7;
  }
  
  // 8. Mẹo nhớ & Nguồn gốc & Hán tự
  if (
    norm.includes('mẹo nhớ') || norm.includes('meo nho') ||
    norm.includes('cách ghi nhớ') || norm.includes('ghi nhớ') ||
    norm.includes('mnemonic') || norm.includes('chiết tự') ||
    norm.includes('chuyển âm') || norm.includes('kanji') ||
    norm.includes('hán tự') || norm.includes('hán việt') ||
    norm.includes('han viet') || norm.includes('nguồn gốc')
  ) {
    return 8;
  }
  
  return 9;
};

const getBoxMeta = (title: string, id: string) => {
  const norm = (title || id || '').toLowerCase().replace(/_/g, ' ').trim();

  // 1. Ý nghĩa & Nghĩa cốt lõi
  if (norm === 'nghĩa' || norm === 'nghia' || norm.includes('ý nghĩa') || norm.includes('y nghia') || norm.includes('nghĩa cốt lõi') || norm.includes('tóm tắt') || norm.includes('cốt lõi') || norm.includes('meaning')) {
    return {
      label: '🎯 Ý NGHĨA CỐT LÕI',
      badgeClass: 'text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border-amber-300/80',
      borderClass: 'border-amber-200/80 dark:border-amber-800/60 hover:border-amber-300',
      bgClass: 'bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20 dark:from-amber-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 2. Cách kết hợp ngữ pháp
  if (norm.includes('kết hợp') || norm.includes('ket hop') || norm.includes('cấu trúc') || norm.includes('cau truc') || norm.includes('connection')) {
    return {
      label: '🧩 CÁCH KẾT HỢP NGỮ PHÁP',
      badgeClass: 'text-violet-900 dark:text-violet-200 bg-violet-100/90 dark:bg-violet-950/70 border-violet-300/80',
      borderClass: 'border-violet-200/80 dark:border-violet-800/60 hover:border-violet-300',
      bgClass: 'bg-gradient-to-br from-violet-50/40 via-white to-violet-50/15 dark:from-violet-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 3. Từ đi kèm tiêu biểu & Collocations
  if (norm.includes('từ đi kèm') || norm.includes('tu di kem') || norm.includes('cụm từ') || norm.includes('cum tu') || norm.includes('collocation') || norm.includes('tiêu biểu')) {
    return {
      label: '🌟 TỪ ĐI KÈM TIÊU BIỂU (COLLOCATIONS)',
      badgeClass: 'text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/70 border-emerald-300/80',
      borderClass: 'border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-300',
      bgClass: 'bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/15 dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 4. Vùng cấm & Bẫy thi
  if (norm.includes('vùng cấm') || norm.includes('vung cam') || norm.includes('bẫy thi') || norm.includes('bay thi')) {
    return {
      label: '🚫 VÙNG CẤM & BẪY THI',
      badgeClass: 'text-rose-900 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-950/70 border-rose-300/80',
      borderClass: 'border-rose-200/80 dark:border-rose-800/60 hover:border-rose-300',
      bgClass: 'bg-gradient-to-br from-rose-50/40 via-white to-rose-50/15 dark:from-rose-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 5. Cặp dễ nhầm lẫn (So sánh 2D)
  if (norm.includes('nhầm lẫn') || norm.includes('nham lan') || norm.includes('so sánh') || norm.includes('cặp dễ')) {
    return {
      label: '⚖️ CẶP DỄ NHẦM LẪN (SO SÁNH 2D)',
      badgeClass: 'text-indigo-900 dark:text-indigo-200 bg-indigo-100/90 dark:bg-indigo-950/70 border-indigo-300/80',
      borderClass: 'border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-300',
      bgClass: 'bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/15 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 5.5. Phân biệt đúng sai (⭕ Maru vs ❌ Batsu)
  if (norm.includes('đúng sai') || norm.includes('dung sai') || norm.includes('cách dùng đúng') || norm.includes('cach dung dung') || norm.includes('maru') || norm.includes('batsu')) {
    return {
      label: '⚖️ CÁCH DÙNG ĐÚNG (⭕ MARU) & SAI (❌ BATSU)',
      badgeClass: 'text-sky-900 dark:text-sky-200 bg-sky-100/90 dark:bg-sky-950/70 border-sky-300/80',
      borderClass: 'border-sky-200/80 dark:border-sky-800/60 hover:border-sky-300',
      bgClass: 'bg-gradient-to-br from-sky-50/40 via-white to-blue-50/15 dark:from-sky-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 6. Dấu hiệu nhận biết & Phản xạ 3s
  if (norm.includes('dấu hiệu') || norm.includes('dau hieu') || norm.includes('nhận biết') || norm.includes('phản xạ') || norm.includes('3s') || norm.includes('bắt bài')) {
    return {
      label: '⚡ DẤU HIỆU NHẬN BIẾT & PHẢN XẠ 3S',
      badgeClass: 'text-teal-900 dark:text-teal-200 bg-teal-100/90 dark:bg-teal-950/70 border-teal-300/80',
      borderClass: 'border-teal-200/80 dark:border-teal-800/60 hover:border-teal-300',
      bgClass: 'bg-gradient-to-br from-teal-50/40 via-white to-teal-50/15 dark:from-teal-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 7. Nguồn gốc & Hán tự
  if (norm.includes('nguồn gốc') || norm.includes('nguon goc') || norm.includes('kanji') || norm.includes('chiết tự') || norm.includes('hán tự')) {
    return {
      label: '🔍 NGUỒN GỐC & CẤU TẠO HÁN TỰ',
      badgeClass: 'text-cyan-900 dark:text-cyan-200 bg-cyan-100/90 dark:bg-cyan-950/70 border-cyan-300/80',
      borderClass: 'border-cyan-200/80 dark:border-cyan-800/60 hover:border-cyan-300',
      bgClass: 'bg-gradient-to-br from-cyan-50/40 via-white to-cyan-50/15 dark:from-cyan-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 8. Ngữ cảnh sử dụng
  if (norm.includes('ngữ cảnh') || norm.includes('ngu canh') || norm.includes('bối cảnh')) {
    return {
      label: '🌐 NGỮ CẢNH SỬ DỤNG',
      badgeClass: 'text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/70 border-emerald-300/80',
      borderClass: 'border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-300',
      bgClass: 'bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/15 dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 9. Bản chất & Sắc thái
  if (norm.includes('bản chất') || norm.includes('ban chat') || norm.includes('sắc thái') || norm.includes('sac thai') || norm.includes('sử dụng') || norm.includes('nuance')) {
    return {
      label: '🧬 BẢN CHẤT & SẮC THÁI CỐT LÕI',
      badgeClass: 'text-sky-900 dark:text-sky-200 bg-sky-100/90 dark:bg-sky-950/70 border-sky-300/80',
      borderClass: 'border-sky-200/80 dark:border-sky-800/60 hover:border-sky-300',
      bgClass: 'bg-gradient-to-br from-sky-50/40 via-white to-sky-50/15 dark:from-sky-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 10. Văn phong
  if (norm.includes('văn phong') || norm.includes('van phong')) {
    return {
      label: '🖋️ VĂN PHONG',
      badgeClass: 'text-purple-900 dark:text-purple-200 bg-purple-100/90 dark:bg-purple-950/70 border-purple-300/80',
      borderClass: 'border-purple-200/80 dark:border-purple-800/60 hover:border-purple-300',
      bgClass: 'bg-gradient-to-br from-purple-50/40 via-white to-purple-50/15 dark:from-purple-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 11. Độ trang trọng
  if (norm.includes('trang trọng') || norm.includes('trang trong')) {
    return {
      label: '👑 ĐỘ TRANG TRỌNG',
      badgeClass: 'text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border-amber-300/80',
      borderClass: 'border-amber-200/80 dark:border-amber-800/60 hover:border-amber-300',
      bgClass: 'bg-gradient-to-br from-amber-50/40 via-white to-amber-50/15 dark:from-amber-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  // 12. Tính ý chí & Quan hệ hai vế
  if (norm.includes('ý chí') || norm.includes('y chi')) {
    return {
      label: '🧠 TÍNH Ý CHÍ',
      badgeClass: 'text-blue-900 dark:text-blue-200 bg-blue-100/90 dark:bg-blue-950/70 border-blue-300/80',
      borderClass: 'border-blue-200/80 dark:border-blue-800/60 hover:border-blue-300',
      bgClass: 'bg-gradient-to-br from-blue-50/40 via-white to-blue-50/15 dark:from-blue-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }
  if (norm.includes('quan hệ') || norm.includes('hai vế')) {
    return {
      label: '🔀 QUAN HỆ HAI VẾ',
      badgeClass: 'text-teal-900 dark:text-teal-200 bg-teal-100/90 dark:bg-teal-950/70 border-teal-300/80',
      borderClass: 'border-teal-200/80 dark:border-teal-800/60 hover:border-teal-300',
      bgClass: 'bg-gradient-to-br from-teal-50/40 via-white to-teal-50/15 dark:from-teal-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }
  if (norm.includes('hướng đánh giá') || norm.includes('danh gia')) {
    return {
      label: '⚖️ HƯỚNG ĐÁNH GIÁ',
      badgeClass: 'text-indigo-900 dark:text-indigo-200 bg-indigo-100/90 dark:bg-indigo-950/70 border-indigo-300/80',
      borderClass: 'border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-300',
      bgClass: 'bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/15 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }
  if (norm.includes('chủ ngữ') || norm.includes('chu ngu')) {
    return {
      label: '👤 NGÔI CHỦ NGỮ',
      badgeClass: 'text-pink-900 dark:text-pink-200 bg-pink-100/90 dark:bg-pink-950/70 border-pink-300/80',
      borderClass: 'border-pink-200/80 dark:border-pink-800/60 hover:border-pink-300',
      bgClass: 'bg-gradient-to-br from-pink-50/40 via-white to-pink-50/15 dark:from-pink-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }
  if (norm.includes('chuyển âm')) {
    return {
      label: '🎵 QUY TẮC CHUYỂN ÂM',
      badgeClass: 'text-indigo-800 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-950/70 border-indigo-300/80',
      borderClass: 'border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-300',
      bgClass: 'bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/15 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }
  if (norm.includes('ví dụ') || norm.includes('example')) {
    return {
      label: '🌱 CÂU VÍ DỤ THỰC TẾ',
      badgeClass: 'text-violet-800 dark:text-violet-300 bg-violet-100/90 dark:bg-violet-950/70 border-violet-300/80',
      borderClass: 'border-violet-200/80 dark:border-violet-800/60 hover:border-violet-300',
      bgClass: 'bg-gradient-to-br from-violet-50/40 via-white to-violet-50/15 dark:from-violet-950/20 dark:via-slate-900/40 dark:to-slate-900/60'
    };
  }

  return {
    label: title,
    badgeClass: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    borderClass: 'border-slate-200/80 dark:border-slate-800',
    bgClass: 'bg-slate-50/80 dark:bg-slate-900/50'
  };
};

const getKeyBadgeStyle = (keyText: string) => {
  const norm = keyText.toLowerCase().trim();
  if (norm.includes('cốt lõi') || norm.includes('bản chất')) {
    return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700';
  }
  if (norm.includes('sắc thái') || norm.includes('văn phong')) {
    return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700';
  }
  if (norm.includes('bối cảnh') || norm.includes('ngữ cảnh')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700';
  }
  if (norm.includes('cấm') || norm.includes('lưu ý') || norm.includes('bẫy')) {
    return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700';
  }
  if (norm.includes('vế trước') || norm.includes('vế 1') || norm.includes('trước')) {
    return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700';
  }
  if (norm.includes('vế sau') || norm.includes('vế 2') || norm.includes('sau')) {
    return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700';
  }
  if (norm.includes('bắt bài') || norm.includes('mẹo') || norm.includes('khẩu quyết') || norm.includes('thần chú')) {
    return 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700';
  }
  if (norm.includes('hán tự') || norm.includes('nguồn gốc') || norm.includes('gốc') || norm.includes('chiết tự')) {
    return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700';
  }
  return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700';
};

const renderFormattedInsight = (content: string, tabId?: string, tabTitle?: string) => {
  if (!content) return null;

  const normId = (tabId || tabTitle || '').toLowerCase().replace(/_/g, ' ').trim();

  // 1. DEDICATED RENDERER: Ý nghĩa cốt lõi
  if (normId === 'nghĩa' || normId === 'nghia' || normId === 'ý nghĩa' || normId === 'y nghia' || normId === 'meaning') {
    const trimmed = content.trim();
    const match = trimmed.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
    const mainText = match ? match[1].trim() : trimmed;
    const nuanceText = match && match[2] ? match[2].trim() : null;

    return (
      <div className="py-1 space-y-2.5 select-text">
        <div className="text-[15px] sm:text-[16px] font-black text-slate-900 dark:text-slate-100 leading-snug tracking-tight">
          <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(mainText) }} />
        </div>
        {nuanceText && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-[13px] font-medium leading-relaxed shadow-2xs">
            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💡</span>
            <span>{nuanceText}</span>
          </div>
        )}
      </div>
    );
  }

  // 2. DEDICATED RENDERER: Cách kết hợp ngữ pháp
  if (normId.includes('kết hợp') || normId.includes('ket hop')) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    return (
      <div className="space-y-2 select-text">
        {lines.map((line, idx) => {
          const hasPlus = line.includes('＋') || line.includes('+');
          if (hasPlus) {
            const tokens = line.split(/[＋+]/);
            return (
              <div 
                key={idx} 
                className="p-2.5 px-3 rounded-xl bg-white/95 dark:bg-slate-850/90 border border-violet-200/80 dark:border-violet-800/60 shadow-2xs flex items-center flex-wrap gap-1.5 sm:gap-2 leading-relaxed"
              >
                {tokens.map((token, tIdx) => {
                  const isLast = tIdx === tokens.length - 1;
                  const trimmed = token.trim();
                  
                  if (isLast && tokens.length > 1) {
                    return (
                      <div key={tIdx} className="flex items-center gap-1.5">
                        <span className="text-violet-500 dark:text-violet-400 font-black text-sm select-none">＋</span>
                        <span 
                          className="font-black text-[14px] sm:text-[15px] text-violet-700 dark:text-violet-300 tracking-wide"
                          dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(trimmed) }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={tIdx} className="flex items-center gap-1.5 flex-wrap">
                      {tIdx > 0 && <span className="text-violet-500 dark:text-violet-400 font-black text-sm select-none">＋</span>}
                      {trimmed.split('/').map((sub, sIdx, sArr) => (
                        <span key={sIdx} className="flex items-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[12.5px] shadow-2xs">
                            {sub.trim()}
                          </span>
                          {sIdx < sArr.length - 1 && <span className="text-slate-400 font-bold text-xs select-none">/</span>}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div 
              key={idx}
              className="p-2.5 px-3 rounded-xl bg-white/95 dark:bg-slate-850/90 border border-violet-200/80 dark:border-violet-800/60 shadow-2xs font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(line) }}
            />
          );
        })}
      </div>
    );
  }

  // 3. DEDICATED RENDERER: Từ đi kèm tiêu biểu (Collocations)
  if (normId.includes('từ đi kèm') || normId.includes('tu di kem') || normId.includes('collocation')) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    return (
      <div className="space-y-2 select-text">
        {lines.map((line, idx) => {
          const clean = line.replace(/^[•\-\*]\s*/, '').trim();
          const m = clean.match(/^(.*?)\s*[:：]\s*(.*)$/);
          if (m) {
            const jaPart = m[1].trim();
            const viPart = m[2].trim();
            return (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-white/95 dark:bg-slate-850/90 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col gap-1"
              >
                <div className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 leading-normal flex items-baseline gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2 select-none" />
                  <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(jaPart) }} />
                </div>
                {viPart && (
                  <div className="text-xs sm:text-[13px] text-emerald-800/90 dark:text-emerald-300/90 font-medium italic pl-3.5 flex items-start gap-1.5">
                    <span className="text-emerald-500 shrink-0 select-none">↳</span>
                    <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(viPart) }} />
                  </div>
                )}
              </div>
            );
          }

          return (
            <div 
              key={idx}
              className="p-2.5 px-3 rounded-xl bg-white/95 dark:bg-slate-850/90 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(clean) }}
            />
          );
        })}
      </div>
    );
  }

  // 4. DEDICATED RENDERER: Phản xạ 3s (JSON / dict format)
  if (normId.includes('phản xạ') || normId.includes('phan xa') || normId.includes('3s') || content.trim().startsWith('{')) {
    let pxObj: Record<string, string> | null = null;
    if (content.trim().startsWith('{')) {
      try {
        pxObj = JSON.parse(content);
      } catch (e) {
        try {
          const jsonStr = content.replace(/'/g, '"');
          pxObj = JSON.parse(jsonStr);
        } catch (e2) {}
      }
    }

    if (pxObj && typeof pxObj === 'object') {
      return (
        <div className="space-y-2.5 select-text">
          {pxObj['tín_hiệu_vế_1'] && (
            <div className="p-3 rounded-xl bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 shadow-2xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900/80 dark:text-teal-200 font-black text-[10.5px] uppercase tracking-wider mb-1.5 shadow-2xs select-none">
                ⚡ TÍN HIỆU VẾ 1
              </span>
              <div 
                className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(pxObj['tín_hiệu_vế_1']) }}
              />
            </div>
          )}
          {pxObj['quy_luật_vế_2'] && (
            <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 font-black text-[10.5px] uppercase tracking-wider mb-1.5 shadow-2xs select-none">
                🎯 QUY LUẬT VẾ 2
              </span>
              <div 
                className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(pxObj['quy_luật_vế_2']) }}
              />
            </div>
          )}
          {pxObj['thần_chú_3s'] && (
            <div className="p-3 rounded-xl bg-violet-50/90 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/60 shadow-2xs">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-900/80 dark:text-violet-200 font-black text-[10.5px] uppercase tracking-wider mb-1.5 shadow-2xs select-none">
                💡 THẦN CHÚ 3 GIÂY
              </span>
              <div 
                className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(pxObj['thần_chú_3s']) }}
              />
            </div>
          )}
        </div>
      );
    }
  }

  // 5. Short metadata values (văn phong, độ trang trọng, tính ý chí, quan hệ hai vế...)
  const isShortMetaField = (
    normId === 'văn phong' || normId === 'van phong' ||
    normId === 'độ trang trọng' || normId === 'do trang trong' ||
    normId === 'tính ý chí' || normId === 'tinh y chi' ||
    normId === 'ngôi chủ ngữ' || normId === 'ngoi chu ngu' ||
    normId === 'hướng đánh giá' || normId === 'huong danh gia' ||
    normId === 'quan hệ hai vế' || normId === 'quan he hai ve' ||
    normId === 'mức độ jlpt' || normId === 'muc do jlpt' ||
    normId === 'kiểu cấu trúc' || normId === 'kieu cau truc'
  );

  if (isShortMetaField && !content.includes('\n') && content.length < 90) {
    return (
      <div className="py-1 flex items-center select-text">
        <div 
          className="text-sm sm:text-[15px] font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2"
          dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(content) }}
        />
      </div>
    );
  }

  // 6. Support full Markdown Tables in Insight (e.g. Cặp dễ nhầm lẫn)
  const hasMarkdownTable = content.includes('|') && (content.includes('\n|') || content.startsWith('|'));
  if (hasMarkdownTable) {
    return (
      <div className="markdown-content text-[13px] sm:text-sm overflow-x-auto select-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-[13px] sm:text-sm leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1.5" />;
        }

        // Markdown Header ### ...
        if (line.startsWith('### ') || line.startsWith('## ')) {
          const headerText = line.replace(/^#{2,3}\s*/, '');
          
          if (headerText.includes('🧩')) {
            const cleanWord = headerText.replace(/^🧩\s*/, '').trim();
            return (
              <div key={idx} className="pt-2.5 pb-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-black text-xs uppercase tracking-wider shadow-2xs">
                  🧩 {cleanWord}
                </span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-[15px] pt-3 pb-1 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 first:pt-0"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(headerText) }} />
            </div>
          );
        }

        // Dedicated callout for synthesis / tổng hòa: ➔ ...
        if (line.startsWith('➔') || line.startsWith('->')) {
          const contentText = line.replace(/^(?:➔|->)+\s*/, '');
          return (
            <div
              key={idx}
              className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-transparent border border-amber-300/80 dark:border-amber-800/80 font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100 shadow-2xs leading-relaxed flex items-start gap-2.5"
            >
              <span className="text-amber-600 dark:text-amber-400 font-black text-base shrink-0 mt-0.5">✦</span>
              <div
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(contentText) }}
              />
            </div>
          );
        }

        // Maru / Cách dùng đúng highlight: ⭕ ... or ○ ... or [ĐÚNG]
        if (line.startsWith('⭕') || line.startsWith('○') || line.startsWith('[ĐÚNG]') || line.toLowerCase().startsWith('đúng:')) {
          const contentText = line.replace(/^(?:⭕|○|\[ĐÚNG\]|đúng:)\s*/i, '');
          return (
            <div
              key={idx}
              className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/80 font-medium text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 shadow-2xs leading-relaxed flex items-start gap-2.5 my-1.5"
            >
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-base shrink-0 mt-0.5">⭕</span>
              <div
                className="flex-1 min-w-0"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(contentText) }}
              />
            </div>
          );
        }

        // Batsu / Cách dùng sai highlight: ❌ ... or × ... or [SAI]
        if (line.startsWith('❌') || line.startsWith('×') || line.startsWith('[SAI]') || line.toLowerCase().startsWith('sai:') || line.toLowerCase().startsWith('cấm:')) {
          const contentText = line.replace(/^(?:❌|×|\[SAI\]|sai:|cấm:)\s*/i, '');
          return (
            <div
              key={idx}
              className="p-3 sm:p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300/80 dark:border-rose-800/80 font-medium text-xs sm:text-sm text-rose-950 dark:text-rose-100 shadow-2xs leading-relaxed flex items-start gap-2.5 my-1.5"
            >
              <span className="text-rose-600 dark:text-rose-400 font-black text-base shrink-0 mt-0.5">❌</span>
              <div
                className="flex-1 min-w-0"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(contentText) }}
              />
            </div>
          );
        }

        // Audio Mnemonic highlight: 🎧 ...
        if (line.includes('🎧') || line.toLowerCase().includes('mẹo liên tưởng âm đọc') || line.toLowerCase().includes('mẹo âm đọc')) {
          const cleanText = line.replace(/^[•\-\*]\s*/, '');
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/5 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-transparent border border-purple-200/80 dark:border-purple-800/60 font-semibold text-xs sm:text-sm text-purple-950 dark:text-purple-100 shadow-2xs leading-relaxed flex items-start gap-2.5"
            >
              <span className="text-purple-600 dark:text-purple-400 font-black text-base shrink-0 mt-0.5">🎧</span>
              <div
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(cleanText.replace(/^🎧\s*/, '')) }}
              />
            </div>
          );
        }

        // Warning / Note / Trap highlight: ⚠️ ... or Lưu ý: ...
        if (line.includes('⚠️') || line.toLowerCase().startsWith('lưu ý:') || line.toLowerCase().startsWith('• lưu ý:') || line.toLowerCase().startsWith('- lưu ý:')) {
          const cleanText = line.replace(/^[•\-\*]\s*/, '');
          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 font-medium text-xs sm:text-sm text-amber-950 dark:text-amber-100 shadow-2xs leading-relaxed flex items-start gap-2"
            >
              <span className="text-amber-600 dark:text-amber-400 font-black text-sm shrink-0 mt-0.5">⚠️</span>
              <div
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(cleanText.replace(/^⚠️\s*/, '')) }}
              />
            </div>
          );
        }

        // Key : Value format (e.g. • Key: Value or - Key: Value or Key: Value)
        const kvMatch = line.match(/^([•\-\*]?\s*)([^:：\n]+)\s*[:：]\s*(.*)$/);
        if (kvMatch) {
          const plainKey = kvMatch[2].replace(/<[^>]+>/g, '').trim();
          if (plainKey.length > 0 && plainKey.length <= 35) {
            const keyPart = kvMatch[2].trim();
            const valPart = kvMatch[3].trim();
            const badgeStyle = getKeyBadgeStyle(plainKey);

            return (
              <div key={idx} className="flex items-start gap-2.5 py-1 select-text">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-lg border font-black text-[10.5px] uppercase tracking-wider shrink-0 mt-0.5 shadow-2xs select-none",
                  badgeStyle
                )}>
                  {keyPart}
                </span>
                <div
                  className="flex-1 text-slate-700 dark:text-slate-200 font-medium leading-relaxed min-w-0"
                  dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(valPart) }}
                />
              </div>
            );
          }
        }

        const isBullet = line.startsWith('• ') || line.startsWith('- ');
        const strippedLine = isBullet ? line.slice(2).trim() : line;

        // Regular bullet line
        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-2 shrink-0" />
              <div
                className="flex-1 text-slate-700 dark:text-slate-300 font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(strippedLine) }}
              />
            </div>
          );
        }

        // Default paragraph
        return (
          <div
            key={idx}
            className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(line) }}
          />
        );
      })}
    </div>
  );
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

  // Reorder state
  const [isReorderOpen, setIsReorderOpen] = useState<boolean>(false);
  const [reorderList, setReorderList] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [orderSaveMsg, setOrderSaveMsg] = useState<string | null>(null);
  const [localInsightOrder, setLocalInsightOrder] = useState<string[] | null>(null);

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

  if (card.back || card.explanation || card.ai_explanation) {
    fullCardTabs.push({
      id: 'back',
      title: 'MẶT SAU (BACK)',
      content: card.back || card.explanation || card.ai_explanation || ''
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

  // Exclude technical, audio and system metadata fields from polluting Learning Insights
  const isExcludedField = (key: string) => {
    const k = key.toLowerCase().trim();
    return (
      k === 'ai_responses' ||
      k === 'id' ||
      k === 'item_id' ||
      k === 'created_at' ||
      k === 'updated_at' ||
      k === 'front' ||
      k === 'back' ||
      k === 'image' ||
      k === 'audio' ||
      k.includes('audio_url') ||
      k.includes('audio_content') ||
      k.includes('audio url') ||
      k.includes('audio content') ||
      k.endsWith('_url') ||
      k.endsWith('_content') ||
      k === 'choices' ||
      k === 'choices_data' ||
      k === 'distractor_pool' ||
      k === 'choice_item_ids' ||
      k === 'practice' ||
      k === 'practice_settings' ||
      k === 'creator_settings'
    );
  };

  if (othersObj && typeof othersObj === 'object') {
    Object.entries(othersObj).forEach(([key, value]) => {
      if (!isExcludedField(key) && value) {
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

  // Resolve configured insight columns from props or card/session metadata (supports both insight_columns and insights_columns)
  const rawInsightCols = Array.isArray(insightsColumns)
    ? insightsColumns
    : (
        (card as any)?.insight_columns 
        ?? (card as any)?.insights_columns
        ?? (card as any)?.practice_settings?.insight_columns
        ?? (card as any)?.practice_settings?.insights_columns
        ?? (card as any)?.creator_settings?.insight_columns
        ?? (card as any)?.creator_settings?.insights_columns
      );
  const effectiveInsightColumns: string[] | undefined = Array.isArray(rawInsightCols) ? rawInsightCols : undefined;

  const activeOrderList = localInsightOrder || effectiveInsightColumns;

  let displayTabs: { id: string; title: string; content: string }[] = [];
  if (activeOrderList && Array.isArray(activeOrderList) && activeOrderList.length > 0) {
    // Only display columns that have the Learning Insights checkbox explicitly enabled
    displayTabs = activeOrderList
      .map(colId => fullCardTabs.find(tab => tab.id.toLowerCase() === colId.toLowerCase()))
      .filter((tab): tab is { id: string; title: string; content: string } => tab !== undefined);

    // If order was not manually saved by user, apply the standard priority order:
    // Tóm tắt ➔ Cụm từ ➔ Cách dùng & Sắc thái ➔ Ví dụ ➔ Mẹo nhớ
    const isExplicitlyCustomized = (card as any)?.practice_settings?.insight_columns_customized 
      || (card as any)?.creator_settings?.insight_columns_customized 
      || Boolean(localInsightOrder);

    if (!isExplicitlyCustomized) {
      displayTabs.sort((a, b) => getInsightSectionPriority(a.title || a.id) - getInsightSectionPriority(b.title || b.id));
    }
  } else {
    // Fallback only when deck has no custom insight configuration defined
    displayTabs = [...fullCardTabs].sort((a, b) => getInsightSectionPriority(a.title || a.id) - getInsightSectionPriority(b.title || b.id));
  }
  // Filter out empty boxes so they never clutter the UI
  displayTabs = displayTabs.filter(tab => Boolean(tab.content && String(tab.content).trim() !== '' && String(tab.content).trim() !== '-'));

  const handleOpenReorder = () => {
    const currentCols = activeOrderList && activeOrderList.length > 0
      ? activeOrderList
      : displayTabs.map(t => t.id);
    setReorderList([...currentCols]);
    setOrderSaveMsg(null);
    setIsReorderOpen(true);
  };

  const handleMoveReorder = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const next = [...reorderList];
      const tmp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = tmp;
      setReorderList(next);
    } else if (direction === 'down' && index < reorderList.length - 1) {
      const next = [...reorderList];
      const tmp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = tmp;
      setReorderList(next);
    }
  };

  const handleApplyStandardOrder = () => {
    const sorted = [...reorderList].sort((a, b) => getInsightSectionPriority(a) - getInsightSectionPriority(b));
    setReorderList(sorted);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    setOrderSaveMsg(null);
    try {
      const currentDeckId = card?.deck_id || deckInfo?.id;
      if (currentDeckId) {
        await axios.post(`/api/v1/deck/${currentDeckId}/practice-settings`, {
          is_creator: true,
          settings: {
            insight_columns: reorderList,
            insights_columns: reorderList,
            insight_columns_customized: true
          }
        });
      }
      setLocalInsightOrder(reorderList);
      setOrderSaveMsg('Đã lưu thứ tự hiển thị thành công!');
      setTimeout(() => {
        setIsReorderOpen(false);
        setOrderSaveMsg(null);
      }, 700);
    } catch (e: any) {
      console.error('Failed to save insight column order', e);
      setOrderSaveMsg(e?.response?.data?.error || 'Không thể lưu thứ tự.');
    } finally {
      setIsSavingOrder(false);
    }
  };

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
                <p 
                  className="text-[10.5px] font-bold text-slate-500 mt-1 truncate max-w-[280px] sm:max-w-[360px]"
                  dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(card.content || card.front || 'Card Details') }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeTab === 'insight' && (
                <button
                  type="button"
                  onClick={handleOpenReorder}
                  className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Sắp xếp thứ tự mục Insight (Reorder)"
                >
                  <ArrowUpDown className="w-4 h-4 text-amber-600" />
                </button>
              )}
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
                <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-bold">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {displayTabs.length} mục phân tích
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenReorder}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/90 hover:bg-amber-100 text-amber-800 text-[11px] font-black border border-amber-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                    Sắp xếp thứ tự
                  </button>
                </div>
                {displayTabs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-xs">
                    No insight columns configured for this card.
                  </div>
                ) : (
                  displayTabs.map((tab) => {
                    const meta = getBoxMeta(tab.title, tab.id);
                    return (
                      <div 
                        key={tab.id} 
                        className={cn(
                          "p-4 sm:p-5 rounded-2xl border text-left relative group transition-all shadow-xs",
                          meta.bgClass,
                          meta.borderClass
                        )}
                      >
                        <div className="flex items-center justify-between mb-3 border-b border-slate-150/60 dark:border-slate-800/80 pb-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-black text-[11px] uppercase tracking-wider shadow-2xs",
                            meta.badgeClass
                          )}>
                            {meta.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyText(tab.id, tab.content)}
                              className="w-7 h-7 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-all active:scale-90"
                              title="Copy text"
                            >
                              {copiedId === tab.id ? <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePlayTabAudio(card?.id, tab.id, tab.content)}
                              className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all active:scale-90"
                              title="Play pronunciation"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {renderFormattedInsight(tab.content, tab.id, tab.title)}
                      </div>
                    );
                  })
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

        {/* Reorder Modal Sheet */}
        <AnimatePresence>
          {isReorderOpen && (
            <div className="fixed inset-0 z-[1050] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overscroll-none touch-none">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] p-5 z-20"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                        Sắp xếp thứ tự Insight
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Ưu tiên mục muốn nhìn thấy trước khi học thẻ
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReorderOpen(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Action: Reset to Standard Order */}
                <div className="py-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleApplyStandardOrder}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Đặt thứ tự chuẩn (Tóm tắt ➔ Cụm từ ➔ Cách dùng ➔ Ví dụ ➔ Mẹo nhớ)</span>
                  </button>
                </div>

                {/* Column List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 custom-scrollbar min-h-0">
                  {reorderList.map((colId, index) => {
                    const meta = getBoxMeta(colId.toUpperCase().replace(/_/g, ' '), colId);
                    return (
                      <div
                        key={colId}
                        className="p-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-2 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-200/80 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider truncate max-w-[200px] sm:max-w-[260px]",
                              meta.badgeClass
                            )}>
                              {meta.label}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono font-medium truncate mt-0.5">
                              {colId}
                            </p>
                          </div>
                        </div>

                        {/* Up / Down Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveReorder(index, 'up')}
                            disabled={index === 0}
                            className={cn(
                              "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                              index === 0
                                ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                : "bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 active:scale-90"
                            )}
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveReorder(index, 'down')}
                            disabled={index === reorderList.length - 1}
                            className={cn(
                              "w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                              index === reorderList.length - 1
                                ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                                : "bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 active:scale-90"
                            )}
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {orderSaveMsg && (
                  <div className={cn(
                    "mt-2 p-2 rounded-xl text-center text-xs font-bold animate-in fade-in shrink-0",
                    orderSaveMsg.includes('Không thể') || orderSaveMsg.includes('Failed')
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  )}>
                    {orderSaveMsg}
                  </div>
                )}

                {/* Footer buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsReorderOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-black transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOrder}
                    disabled={isSavingOrder}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                  >
                    {isSavingOrder ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>Lưu thứ tự</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
