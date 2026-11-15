import { stripBBCode, isJapanese, getJpPattern, extractTokens, tokensOverlapHigh } from './text';

export interface DistractorItem {
  text: string;
  front: string;
  back: string;
  id: number;
  type: string;
  q_text?: string;
  card?: any;
}

export interface CorrectItem {
  text: string;
  q_text: string;
  front: string;
  back: string;
  id: number;
  type: string;
  card?: any;
}

export interface SmartDistractorConfig {
  enabled?: boolean;
  match_script?: boolean;        // 1. Khớp kiểu chữ & số lượng Kanji (KK, Katakana, Hiragana, v.v.)
  match_shared_kanji?: boolean;  // 2. Ưu tiên cùng chữ Hán chung (Bẫy JLPT)
  match_word_count?: boolean;    // 3. Khớp số lượng từ (Word Count)
  match_length?: boolean;        // 4. Tương đồng độ dài ký tự (±30%)
  category_col?: string;         // 5. Khớp theo Cột thuộc tính / Category (ví dụ: 'pos', 'loại từ', 'chủ đề')
}

export const DEFAULT_SMART_DISTRACTOR_CONFIG: SmartDistractorConfig = {
  enabled: true,
  match_script: true,
  match_shared_kanji: false,
  match_word_count: true,
  match_length: true,
  category_col: 'pos'
};

const getCardVal = (card: any, key: string): string => {
  if (!card || !key) return '';
  const kLower = key.trim().toLowerCase();
  if (card[key] !== undefined && card[key] !== null) return String(card[key]).trim();
  if (card.others && typeof card.others === 'object') {
    if (card.others[key] !== undefined && card.others[key] !== null) return String(card.others[key]).trim();
    for (const [k, v] of Object.entries(card.others)) {
      if (k.toLowerCase() === kLower && v !== undefined && v !== null) return String(v).trim();
    }
  }
  return '';
};

export const selectDistractors = (
  correctItem: CorrectItem,
  candidatePool: DistractorItem[],
  amount: number,
  config?: SmartDistractorConfig
): DistractorItem[] => {
  if (!candidatePool || candidatePool.length === 0 || amount <= 0) return [];

  const c_disp = stripBBCode(correctItem.text).trim();
  const c_back = stripBBCode(correctItem.back).trim();
  const c_q_text = stripBBCode(correctItem.q_text).trim();
  const target_pattern = getJpPattern(c_disp);
  const answer_is_jp = isJapanese(c_disp);

  const effectiveConfig: SmartDistractorConfig = config
    ? { ...DEFAULT_SMART_DISTRACTOR_CONFIG, ...config }
    : DEFAULT_SMART_DISTRACTOR_CONFIG;

  const isSmart = effectiveConfig.enabled !== false;

  // If Smart Distractor is explicitly turned OFF, return fast randomized candidates
  if (!isSmart) {
    const pool = candidatePool.filter(c => stripBBCode(c.text).trim().toLowerCase() !== c_disp.toLowerCase());
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const result: DistractorItem[] = [];
    const seen = new Set<string>();
    seen.add(c_disp.toLowerCase());
    for (const cand of shuffled) {
      if (result.length >= amount) break;
      const textNorm = stripBBCode(cand.text).trim().toLowerCase();
      if (!seen.has(textNorm)) {
        seen.add(textNorm);
        result.push(cand);
      }
    }
    return result;
  }

  const c_back_tokens = !isJapanese(c_back) ? extractTokens(c_back) : new Set<string>();
  const c_q_tokens = (c_q_text && !isJapanese(c_q_text)) ? extractTokens(c_q_text) : new Set<string>();
  const c_disp_tokens_vn = !answer_is_jp ? extractTokens(c_disp) : new Set<string>();

  const valid_candidates: DistractorItem[] = [];
  const seen_texts = new Set<string>();
  seen_texts.add(c_disp.toLowerCase());

  for (const cand of candidatePool) {
    const d_disp = stripBBCode(cand.text).trim();
    const d_disp_lower = d_disp.toLowerCase();

    // Dedup
    if (seen_texts.has(d_disp_lower)) continue;

    // Hard filters: avoid semantic collision (words that mean almost the same thing)
    const d_back = stripBBCode(cand.back).trim();
    if (!isJapanese(d_back) && c_back_tokens.size > 0 && c_back.length < 250 && d_back.length < 250) {
      const d_back_tokens = extractTokens(d_back);
      if (tokensOverlapHigh(d_back_tokens, c_back_tokens)) continue;
    }

    if (!answer_is_jp && c_disp_tokens_vn.size > 0) {
      const d_disp_tokens = extractTokens(d_disp);
      if (tokensOverlapHigh(d_disp_tokens, c_disp_tokens_vn)) continue;
    }

    if (c_q_tokens.size > 0) {
      const d_back_tokens_q = (!isJapanese(d_back) && d_back.length < 250) ? extractTokens(d_back) : new Set<string>();
      if (d_back_tokens_q.size > 0 && tokensOverlapHigh(d_back_tokens_q, c_q_tokens)) continue;

      if (!answer_is_jp) {
        const d_disp_tokens_q = extractTokens(d_disp);
        if (tokensOverlapHigh(d_disp_tokens_q, c_q_tokens)) continue;
      }
    }

    seen_texts.add(d_disp_lower);
    valid_candidates.push(cand);
  }

  if (valid_candidates.length === 0) return [];

  // Prepare category matching info
  const categoryCol = effectiveConfig.category_col?.trim();
  const c_category_val = categoryCol ? getCardVal(correctItem.card, categoryCol).toLowerCase() : '';

  // Prepare shared kanji characters
  const c_kanji_matches = answer_is_jp ? (c_disp.match(/[\u4e00-\u9fff]/g) || []) : [];
  const c_kanji_set = new Set(c_kanji_matches);

  // Word count & length references
  const c_word_count = c_disp.split(/\s+/).filter(Boolean).length;
  const c_len = Math.max(1, c_disp.length);

  // Score candidates with active smart filter rules
  const scored = valid_candidates.map(cand => {
    let score = 0;
    const d_disp = stripBBCode(cand.text).trim();
    const d_pattern = getJpPattern(d_disp);
    const d_tokens = extractTokens(d_disp);

    // 1. Script Pattern Matching (Kanji count, Katakana, Hiragana)
    if (effectiveConfig.match_script) {
      if (d_pattern === target_pattern) {
        score += 260;
      } else if (target_pattern.startsWith('K') && d_pattern.startsWith('K') && Math.abs(target_pattern.length - d_pattern.length) <= 1) {
        score += 90;
      }
    }

    // 2. Category / Column Match (e.g. pos, loại từ, chủ đề)
    if (categoryCol && c_category_val) {
      const d_category_val = getCardVal(cand.card, categoryCol).toLowerCase();
      if (d_category_val && d_category_val === c_category_val) {
        score += 380; // Huge boost for same part of speech / category!
      } else if (d_category_val && (c_category_val.includes(d_category_val) || d_category_val.includes(c_category_val))) {
        score += 160;
      }
    }

    // 3. Shared Kanji Matching (JLPT Trap Mode)
    if (effectiveConfig.match_shared_kanji && answer_is_jp && c_kanji_set.size > 0) {
      const d_kanji_matches = d_disp.match(/[\u4e00-\u9fff]/g) || [];
      let sharedCount = 0;
      for (const k of d_kanji_matches) {
        if (c_kanji_set.has(k)) sharedCount += 1;
      }
      if (sharedCount > 0) {
        score += sharedCount * 300; // Tremendous priority for shared kanji trap!
      }
    }

    // 4. Word Count Matching (especially effective for Vietnamese & phrases)
    if (effectiveConfig.match_word_count) {
      const d_word_count = d_disp.split(/\s+/).filter(Boolean).length;
      if (d_word_count === c_word_count) {
        score += 180;
      } else if (Math.abs(d_word_count - c_word_count) <= 1) {
        score += 60;
      }
    }

    // 5. Length Similarity Matching (±30% character length)
    if (effectiveConfig.match_length) {
      const d_len = Math.max(1, d_disp.length);
      const ratio = Math.min(c_len, d_len) / Math.max(c_len, d_len);
      if (ratio >= 0.75) {
        score += 130;
      } else if (ratio >= 0.5) {
        score += 50;
      }
    }

    // Front/Back lexical connection bonus
    const c_tokens = extractTokens(c_disp);
    const shared_tokens = new Set([...c_tokens].filter(x => d_tokens.has(x)));
    if (answer_is_jp) {
      score += shared_tokens.size * 120;
    } else {
      score -= shared_tokens.size * 200;
    }

    const c_front_tokens = extractTokens(stripBBCode(correctItem.front).trim());
    const d_front_tokens = extractTokens(stripBBCode(cand.front).trim());
    const shared_front = new Set([...c_front_tokens].filter(x => d_front_tokens.has(x)));
    score += shared_front.size * 70;

    return { score, cand };
  });

  // Add slight random jitter (0-25 pts) so choices are varied across sessions, then sort descending
  scored.sort((a, b) => (b.score + Math.random() * 25) - (a.score + Math.random() * 25));

  const selected: DistractorItem[] = [];
  const selected_texts = new Set<string>();
  selected_texts.add(c_disp.toLowerCase());

  for (const item of scored) {
    if (selected.length >= amount) break;
    const cand_text = stripBBCode(item.cand.text).trim().toLowerCase();
    if (!selected_texts.has(cand_text)) {
      selected.push(item.cand);
      selected_texts.add(cand_text);
    }
  }

  return selected;
};
