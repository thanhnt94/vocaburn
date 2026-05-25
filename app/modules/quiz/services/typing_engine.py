import re

class TypingEngine:
    @staticmethod
    def generate_question(item_data: dict, config: dict) -> dict:
        """
        Generate a single Typing question for an item based on configuration.
        """
        question_key = config.get('q_col', 'back') # Default to show back (Meaning) for typing front
        answer_key = config.get('a_col', 'front')  # Default to ask user to type front (Word)

        # Extract values safely
        def get_val(data, key):
            val = data.get(key) or (data.get('others', {}) if isinstance(data.get('others'), dict) else {}).get(key) or ''
            return str(val).strip()

        question_text = get_val(item_data, question_key)
        correct_answer = get_val(item_data, answer_key)

        return {
            'id': item_data['id'],
            'question': question_text,
            'correct_answer': correct_answer,
            'question_key': question_key,
            'answer_key': answer_key
        }

    @staticmethod
    def validate_answer(user_input: str, correct_answer: str) -> dict:
        """
        Normalize both strings (lowercase, strip whitespace, remove HTML tags).
        Return True for exact matches.
        """
        if not user_input:
            user_input = ""
        if not correct_answer:
            correct_answer = ""

        # Remove HTML tags if any from correct_answer for comparison
        clean_answer = re.sub(r'<[^<]+?>', '', correct_answer)
        
        normalized_input = user_input.strip().lower()
        normalized_correct = clean_answer.strip().lower()
        
        is_correct = normalized_input == normalized_correct
        
        return {
            'is_correct': is_correct,
            'quality': 5 if is_correct else 0,
            'score_change': 15 if is_correct else 0 # Typing is harder, rewards more XP?
        }
