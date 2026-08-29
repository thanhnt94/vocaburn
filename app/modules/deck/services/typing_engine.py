import re
from typing import Any, Union, List, Optional

class TypingEngine:
    @staticmethod
    def generate_question(item_data: dict, config: dict) -> dict:
        """
        Generate a single Typing question for an item based on configuration.
        Supports multiple answer columns.
        """
        question_key = config.get('q_col') or config.get('q') or 'back'
        raw_answer_keys = config.get('a_cols') or config.get('a') or config.get('a_col') or 'front'

        if isinstance(raw_answer_keys, str):
            if ',' in raw_answer_keys:
                answer_keys = [k.strip() for k in raw_answer_keys.split(',') if k.strip()]
            else:
                answer_keys = [raw_answer_keys.strip()]
        elif isinstance(raw_answer_keys, (list, tuple, set)):
            answer_keys = [str(k).strip() for k in raw_answer_keys if str(k).strip()]
        else:
            answer_keys = ['front']

        if not answer_keys:
            answer_keys = ['front']

        # Extract values safely
        def get_val(data, key):
            val = data.get(key) or (data.get('others', {}) if isinstance(data.get('others'), dict) else {}).get(key) or ''
            return str(val).strip()

        question_text = get_val(item_data, question_key)

        acceptable_answers = []
        for a_key in answer_keys:
            val = get_val(item_data, a_key)
            if val and val not in acceptable_answers:
                acceptable_answers.append(val)

        correct_answer = acceptable_answers[0] if acceptable_answers else get_val(item_data, answer_keys[0])

        return {
            'id': item_data['id'],
            'question': question_text,
            'correct_answer': correct_answer,
            'acceptable_answers': acceptable_answers if acceptable_answers else [correct_answer],
            'question_key': question_key,
            'answer_key': answer_keys if len(answer_keys) > 1 else answer_keys[0],
            'answer_keys': answer_keys
        }

    @staticmethod
    def validate_answer(user_input: str, correct_answer: Union[str, List[str]], acceptable_answers: Optional[List[str]] = None) -> dict:
        """
        Normalize strings (lowercase, strip whitespace, remove HTML tags).
        Return True if user_input matches correct_answer or any of acceptable_answers.
        """
        if not user_input:
            user_input = ""

        normalized_input = user_input.strip().lower()

        candidates = []
        if isinstance(correct_answer, list):
            candidates.extend(correct_answer)
        elif correct_answer:
            candidates.append(correct_answer)

        if acceptable_answers and isinstance(acceptable_answers, list):
            for a in acceptable_answers:
                if a and a not in candidates:
                    candidates.append(a)

        is_correct = False
        for cand in candidates:
            clean_cand = re.sub(r'<[^<]+?>', '', str(cand or '')).strip().lower()
            if normalized_input == clean_cand:
                is_correct = True
                break

        return {
            'is_correct': is_correct,
            'quality': 5 if is_correct else 0,
            'score_change': 15 if is_correct else 0
        }

