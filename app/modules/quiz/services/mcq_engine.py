import random
import re
from typing import List, Set, Dict

def strip_bbcode(text: str) -> str:
    """Safely strip BBCode tags from text."""
    if not text:
        return ""
    # Strip BBCode tags like [b], [/b], [color=#ff0000] etc.
    return re.sub(r'\[/?[a-zA-Z0-9=#_\-]+\]', '', str(text))

def _is_japanese(text: str) -> bool:
    """Returns True if the text contains Japanese characters (Kanji/Hiragana/Katakana)."""
    return any(
        ('\u4e00' <= c <= '\u9fff') or ('\u3400' <= c <= '\u4dbf') or
        ('\u3040' <= c <= '\u309f') or ('\u30a0' <= c <= '\u30ff')
        for c in text
    )

class SmartDistractorSelector:
    """
    Selects high-quality distractors (wrong answers) for MCQ.
    Language-aware: Japanese kanji overlap = good trap, Vietnamese/English word overlap = bad leak.
    """
    _MEANING_OVERLAP_THRESHOLD = 0.6

    @classmethod
    def select(
        cls,
        correct_item: Dict,
        candidate_pool: List[Dict],
        amount: int = 3,
    ) -> List[Dict]:
        """Main pipeline to select distractors."""
        if not candidate_pool or amount <= 0:
            return []

        c_disp = strip_bbcode(correct_item.get('text', '')).strip()
        c_back = strip_bbcode(correct_item.get('back', '')).strip()
        c_q_text = strip_bbcode(correct_item.get('q_text', '')).strip()
        target_pattern = cls._get_jp_pattern(c_disp)

        # Detect language of the answer text (displayed choices)
        answer_is_jp = _is_japanese(c_disp)

        # Pre-compute tokens for meaning-overlap checks (Vietnamese/non-JP only)
        c_back_tokens = cls._extract_tokens(c_back) if not _is_japanese(c_back) else set()
        c_q_tokens = cls._extract_tokens(c_q_text) if c_q_text and not _is_japanese(c_q_text) else set()
        
        # For Vietnamese answer text overlap check
        c_disp_tokens_vn = cls._extract_tokens(c_disp) if not answer_is_jp else set()

        # Step 1: Hard Filter & Dedup
        same_pattern_pool = []
        other_pool = []
        seen_texts: Set[str] = set()
        seen_texts.add(c_disp.lower())

        for cand in candidate_pool:
            d_disp = strip_bbcode(cand.get('text', '')).strip()
            d_disp_lower = d_disp.lower()

            # Hard Filter 1: Exact identity checks
            if not cls._is_not_exact_match(correct_item, cand):
                continue

            # Hard Filter 2: Display text dedup
            if d_disp_lower in seen_texts:
                continue

            # Hard Filter 3: Meaning overlap (avoid multiple correct answers)
            d_back = strip_bbcode(cand.get('back', '')).strip()

            if not _is_japanese(d_back) and c_back_tokens:
                d_back_tokens = cls._extract_tokens(d_back)
                if cls._tokens_overlap_high(d_back_tokens, c_back_tokens):
                    continue

            # Vietnamese display text overlap check
            if not answer_is_jp and c_disp_tokens_vn:
                d_disp_tokens = cls._extract_tokens(d_disp)
                if cls._tokens_overlap_high(d_disp_tokens, c_disp_tokens_vn):
                    continue

            # Question text overlap
            if c_q_tokens:
                d_back_tokens_q = cls._extract_tokens(d_back) if not _is_japanese(d_back) else set()
                if d_back_tokens_q and cls._tokens_overlap_high(d_back_tokens_q, c_q_tokens):
                    continue
                if not answer_is_jp:
                    d_disp_tokens_q = cls._extract_tokens(d_disp)
                    if cls._tokens_overlap_high(d_disp_tokens_q, c_q_tokens):
                        continue

            seen_texts.add(d_disp_lower)

            if cls._get_jp_pattern(d_disp) == target_pattern:
                same_pattern_pool.append(cand)
            else:
                other_pool.append(cand)

        # Step 2: Pool selection
        if len(same_pattern_pool) >= amount:
            final_pool = same_pattern_pool
        else:
            final_pool = same_pattern_pool + other_pool

        if not final_pool:
            return []

        # Step 3: Language-aware scoring
        scored_candidates = cls._score_candidates(correct_item, final_pool, answer_is_jp)

        # Step 4: Final selection with uniqueness enforcement
        random.shuffle(scored_candidates)
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        selected = []
        selected_texts: Set[str] = set()
        selected_texts.add(c_disp.lower())

        for score, cand in scored_candidates:
            if len(selected) >= amount:
                break
            cand_text = strip_bbcode(cand.get('text', '')).strip().lower()
            if cand_text not in selected_texts:
                selected.append(cand)
                selected_texts.add(cand_text)

        return selected

    @classmethod
    def _is_not_exact_match(cls, correct_item: Dict, cand: Dict) -> bool:
        """Returns True if the candidate is NOT identical to correct answer."""
        def clean(t):
            return strip_bbcode(str(t or '')).strip().lower()

        c_front = clean(correct_item.get('front'))
        c_back = clean(correct_item.get('back'))
        c_text = clean(correct_item.get('text'))
        c_q_text = clean(correct_item.get('q_text'))

        d_front = clean(cand.get('front'))
        d_back = clean(cand.get('back'))
        d_text = clean(cand.get('text'))

        if d_front and c_front and d_front == c_front: return False
        if d_back and c_back and d_back == c_back: return False
        if d_text and c_text and d_text == c_text: return False

        if c_q_text and d_text == c_q_text: return False
        if c_q_text and d_back and d_back == c_q_text: return False
        if c_text and d_back and d_back == c_text: return False

        return True

    @classmethod
    def _tokens_overlap_high(cls, tokens_a: Set[str], tokens_b: Set[str]) -> bool:
        if not tokens_a or not tokens_b:
            return False
        shared = tokens_a.intersection(tokens_b)
        if not shared:
            return False
        smaller_size = min(len(tokens_a), len(tokens_b))
        return len(shared) / smaller_size >= cls._MEANING_OVERLAP_THRESHOLD

    @classmethod
    def _get_jp_pattern(cls, text: str) -> str:
        if not text:
            return ""
        if _is_japanese(text):
            pattern = []
            for char in text:
                if ('\u4e00' <= char <= '\u9fff') or ('\u3400' <= char <= '\u4dbf'):
                    pattern.append('K')
                elif '\u3040' <= char <= '\u309f':
                    pattern.append('H')
                elif '\u30a0' <= char <= '\u30ff':
                    pattern.append('C')
                else:
                    pattern.append('O')
            return "".join(pattern)
        else:
            words = [w for w in re.split(r'\s+', text.strip()) if w]
            return f"W{len(words)}"

    @classmethod
    def _extract_tokens(cls, text: str) -> Set[str]:
        if not text:
            return set()
        kanji = {
            char for char in text
            if ('\u4e00' <= char <= '\u9fff') or ('\u3400' <= char <= '\u4dbf')
        }
        if kanji:
            return kanji
        words = {
            w.strip().lower()
            for w in re.split(r'[\s,.;:/|()]+', text)
            if len(w.strip()) > 1
        }
        return words

    @classmethod
    def _score_candidates(cls, correct_item: Dict, candidates: List[Dict], answer_is_jp: bool) -> List[tuple]:
        c_disp = strip_bbcode(correct_item.get('text', '')).strip()
        c_pattern = cls._get_jp_pattern(c_disp)
        c_tokens = cls._extract_tokens(c_disp)
        c_type = correct_item.get('type', '').strip().lower()

        c_front = strip_bbcode(correct_item.get('front', '')).strip()
        c_front_tokens = cls._extract_tokens(c_front)

        scored = []
        for cand in candidates:
            score = 0
            d_disp = strip_bbcode(cand.get('text', '')).strip()
            d_pattern = cls._get_jp_pattern(d_disp)
            d_tokens = cls._extract_tokens(d_disp)
            d_type = cand.get('type', '').strip().lower()

            if d_pattern == c_pattern:
                score += 100

            shared_tokens = c_tokens.intersection(d_tokens)
            if answer_is_jp:
                score += len(shared_tokens) * 150
            else:
                score -= len(shared_tokens) * 200

            d_front = strip_bbcode(cand.get('front', '')).strip()
            d_front_tokens = cls._extract_tokens(d_front)
            shared_front = c_front_tokens.intersection(d_front_tokens)
            score += len(shared_front) * 80

            if len(d_disp) == len(c_disp):
                score += 20

            if d_type and c_type and d_type == c_type:
                score += 30

            scored.append((score, cand))

        return scored


class MCQEngine:
    @staticmethod
    def generate_question(item_data: dict, all_items_data: list, config: dict) -> dict:
        """
        Generate a single MCQ question for an item based on configuration.
        """
        question_key = config.get('q_col', 'front')
        answer_key = config.get('a_col', 'back')
        num_choices = config.get('num_choices', 4)

        # Extract values safely
        def get_val(data, key):
            val = data.get(key) or (data.get('others', {}) if isinstance(data.get('others'), dict) else {}).get(key) or ''
            return str(val).strip()

        question_text = get_val(item_data, question_key)
        correct_answer = get_val(item_data, answer_key)
        
        item_front = get_val(item_data, 'front')
        item_back = get_val(item_data, 'back')

        # Select a random sample of candidates to avoid shuffling the entire list
        shuffled_items = random.sample(all_items_data, min(len(all_items_data), 20))

        distractor_pool = []
        for other in shuffled_items:
            if len(distractor_pool) >= 8:
                break
            if other['id'] != item_data['id']:
                d_val = get_val(other, answer_key)
                d_front = get_val(other, 'front')
                d_back = get_val(other, 'back')
                
                # Make sure the distractor has a valid value for the answer column
                if d_val and d_val.lower() != "nan":
                    distractor_pool.append({
                        'text': d_val,
                        'front': d_front,
                        'back': d_back,
                        'id': other['id'],
                        'type': (other.get('others') or {}).get('type') or (other.get('others') or {}).get('pos') or ''
                    })

        correct_item_data = {
            'text': correct_answer,
            'q_text': question_text,
            'front': item_front,
            'back': item_back,
            'id': item_data['id'],
            'type': (item_data.get('others') or {}).get('type') or (item_data.get('others') or {}).get('pos') or ''
        }

        # Request num_choices - 1 distractors
        needed = num_choices - 1
        selected_items = SmartDistractorSelector.select(
            correct_item=correct_item_data,
            candidate_pool=distractor_pool,
            amount=needed
        )

        # Assemble choices
        choices_data = [correct_item_data] + selected_items
        random.shuffle(choices_data)

        choices = [c['text'] for c in choices_data]
        choice_item_ids = [c.get('id') for c in choices_data]
        correct_index = choices.index(correct_answer) if correct_answer in choices else 0

        return {
            'id': item_data['id'],
            'question': question_text,
            'choices': choices,
            'choice_item_ids': choice_item_ids,
            'correct_index': correct_index,
            'correct_answer': correct_answer,
            'question_key': question_key,
            'answer_key': answer_key
        }
