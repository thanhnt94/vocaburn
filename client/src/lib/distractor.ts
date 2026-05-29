import { stripBBCode, isJapanese, getJpPattern, extractTokens, tokensOverlapHigh } from './text';

export interface DistractorItem {
  text: string;
  front: string;
  back: string;
  id: number;
  type: string;
}

export interface CorrectItem {
  text: string;
  q_text: string;
  front: string;
  back: string;
  id: number;
  type: string;
}

export const selectDistractors = (
  correctItem: CorrectItem,
  candidatePool: DistractorItem[],
  amount: number
): DistractorItem[] => {
  if (!candidatePool || candidatePool.length === 0 || amount <= 0) return [];

  const c_disp = stripBBCode(correctItem.text).trim();
  const c_back = stripBBCode(correctItem.back).trim();
  const c_q_text = stripBBCode(correctItem.q_text).trim();
  const target_pattern = getJpPattern(c_disp);
  const answer_is_jp = isJapanese(c_disp);

  const c_back_tokens = !isJapanese(c_back) ? extractTokens(c_back) : new Set<string>();
  const c_q_tokens = (c_q_text && !isJapanese(c_q_text)) ? extractTokens(c_q_text) : new Set<string>();
  const c_disp_tokens_vn = !answer_is_jp ? extractTokens(c_disp) : new Set<string>();

  const same_pattern_pool: DistractorItem[] = [];
  const other_pool: DistractorItem[] = [];
  const seen_texts = new Set<string>();
  seen_texts.add(c_disp.toLowerCase());

  for (const cand of candidatePool) {
    const d_disp = stripBBCode(cand.text).trim();
    const d_disp_lower = d_disp.toLowerCase();

    // Dedup
    if (seen_texts.has(d_disp_lower)) continue;

    // Hard filters
    const d_back = stripBBCode(cand.back).trim();
    if (!isJapanese(d_back) && c_back_tokens.size > 0) {
      const d_back_tokens = extractTokens(d_back);
      if (tokensOverlapHigh(d_back_tokens, c_back_tokens)) continue;
    }

    if (!answer_is_jp && c_disp_tokens_vn.size > 0) {
      const d_disp_tokens = extractTokens(d_disp);
      if (tokensOverlapHigh(d_disp_tokens, c_disp_tokens_vn)) continue;
    }

    if (c_q_tokens.size > 0) {
      const d_back_tokens_q = !isJapanese(d_back) ? extractTokens(d_back) : new Set<string>();
      if (d_back_tokens_q.size > 0 && tokensOverlapHigh(d_back_tokens_q, c_q_tokens)) continue;

      if (!answer_is_jp) {
        const d_disp_tokens_q = extractTokens(d_disp);
        if (tokensOverlapHigh(d_disp_tokens_q, c_q_tokens)) continue;
      }
    }

    seen_texts.add(d_disp_lower);

    if (getJpPattern(d_disp) === target_pattern) {
      same_pattern_pool.push(cand);
    } else {
      other_pool.push(cand);
    }
  }

  let final_pool = same_pattern_pool;
  if (same_pattern_pool.length < amount) {
    final_pool = same_pattern_pool.concat(other_pool);
  }

  if (final_pool.length === 0) return [];

  // Score candidates
  const scored = final_pool.map(cand => {
    let score = 0;
    const d_disp = stripBBCode(cand.text).trim();
    const d_pattern = getJpPattern(d_disp);
    const d_tokens = extractTokens(d_disp);

    if (d_pattern === target_pattern) score += 100;

    const c_tokens = extractTokens(c_disp);
    const shared_tokens = new Set([...c_tokens].filter(x => d_tokens.has(x)));
    if (answer_is_jp) {
      score += shared_tokens.size * 150;
    } else {
      score -= shared_tokens.size * 200;
    }

    const c_front_tokens = extractTokens(stripBBCode(correctItem.front).trim());
    const d_front_tokens = extractTokens(stripBBCode(cand.front).trim());
    const shared_front = new Set([...c_front_tokens].filter(x => d_front_tokens.has(x)));
    score += shared_front.size * 80;

    if (d_disp.length === c_disp.length) score += 20;
    if (cand.type && correctItem.type && cand.type === correctItem.type) score += 30;

    return { score, cand };
  });

  // Shuffle first, then sort by score descending
  scored.sort(() => Math.random() - 0.5);
  scored.sort((a, b) => b.score - a.score);

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
