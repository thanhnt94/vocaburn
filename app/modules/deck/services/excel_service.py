import pandas as pd
from typing import List, Dict, Any, Tuple
from io import BytesIO
import json
import re

# MindStack COLUMN_ALIASES
COLUMN_ALIASES = {
    # Common
    'item_id': {'item_id', 'id', 'id câu hỏi', 'id item'},
    'order_in_container': {'order', 'stt', 'order_in_container', 'thứ tự', 'sắp xếp'},

    # Flashcard
    'front': {'front', 'mặt trước', 'mat truoc', 'term', 'từ vựng', 'tu vung', 'từ', 'text 1', 'question'},
    'back': {'back', 'mặt sau', 'mat sau', 'definition', 'định nghĩa', 'dinh nghia', 'nghĩa', 'nghia', 'answer', 'text 2'},
    'front_img': {'front_img', 'ảnh mặt trước', 'anh mat truoc', 'front image', 'image 1', 'image'},
    'back_img': {'back_img', 'ảnh mặt sau', 'anh mat sau', 'back image', 'image 2'},
    'front_audio_url': {'front_audio_url', 'audio mặt trước', 'audio mat truoc', 'audio 1', 'audio front', 'audio'},
    'back_audio_url': {'back_audio_url', 'audio mặt sau', 'audio mat sau', 'audio 2', 'audio back'},
    'front_audio_content': {'front_audio_content', 'văn bản audio mặt trước', 'front audio content'},
    'back_audio_content': {'back_audio_content', 'văn bản audio mặt sau', 'back audio content'},

    # Quiz
    'question': {'question', 'câu hỏi', 'cau hoi', 'nội dung câu hỏi', 'noidung', 'content', 'text 1', 'q'},
    'correct_answer': {'correct_answer', 'correct answer', 'đáp án đúng', 'dap an dung', 'đáp án', 'dap an', 'answer', 'ans', 'correct', 'key', 'result'},
    'explanation': {'explanation', 'giải thích', 'giai thich', 'lời giải', 'loi giai', 'explain', 'suggest', 'hint', 'gợi ý', 'goi y', 'guidance'},
    'option_a': {'option_a', 'option a', 'lựa chọn a', 'lua chon a', 'a', 'đáp án a', 'dap an a', 'choice a'},
    'option_b': {'option_b', 'option b', 'lựa chọn b', 'lua chon b', 'b', 'đáp án b', 'dap an b', 'choice b'},
    'option_c': {'option_c', 'option c', 'lựa chọn c', 'lua chon c', 'c', 'đáp án c', 'dap an c', 'choice c'},
    'option_d': {'option_d', 'option d', 'lựa chọn d', 'lua chon d', 'd', 'đáp án d', 'dap an d', 'choice d'},
    'pre_question_text': {'pre_question_text', 'pre question', 'đoạn văn trước', 'doan van truoc', 'context', 'bối cảnh'},
    
    # AI
    'ai_explanation': {'ai_explanation', 'ai giải thích', 'ai giai thich'},
    'ai_prompt': {'ai_prompt', 'ai prompt', 'prompt'},

    # Custom Game Modes & Data
    'other_content': {'other_content', 'other content', 'nội dung khác', 'noi dung khac', 'custom_data', 'others', 'other_data'}
}

def normalize_column_headers(columns: List[str]) -> Dict[str, str]:
    """
    Map raw column names to standardized field names based on aliases.
    Exclusively maps each standard name to at most one raw column.
    """
    mapping = {}
    used_standards = set()
    
    # Pass 1: Case-insensitive Exact Match (Priority)
    for col in columns:
        clean_col = str(col).strip().lower()
        if clean_col in COLUMN_ALIASES and clean_col not in used_standards:
            mapping[col] = clean_col
            used_standards.add(clean_col)
            
    # Pass 2: Alias Match for remaining columns
    for col in columns:
        if col in mapping:
            continue
            
        clean_col = str(col).strip().lower()
        for standard, aliases in COLUMN_ALIASES.items():
            if standard in used_standards:
                continue
            if clean_col in aliases:
                mapping[col] = standard
                used_standards.add(standard)
                break
                
    # Unmapped columns map to lowered original name
    for col in columns:
        if col not in mapping:
            mapping[col] = str(col).strip().lower()
            
    return mapping

class ExcelDeckService:
    @staticmethod
    def parse_deck_excel(file_content: bytes) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Parses an Excel file matching MindStack's structure with 'Info' and 'Data' sheets.
        Handles both Quiz Format (MCQ) and Flashcard/Vocab Format (front/back).
        """
        try:
            print(f"DEBUG: Loading Excel file into pandas...")
            excel_file = pd.ExcelFile(BytesIO(file_content))
            print(f"DEBUG: Sheet names found: {excel_file.sheet_names}")
        except Exception as e:
            print(f"CRITICAL: Excel loading error: {e}")
            return {}, []

        # 1. Parse 'Info' sheet for metadata
        metadata = {
            "title": "Imported Deck",
            "description": "",
            "category": "General",
            "time_limit": 0
        }
        
        if "Info" in excel_file.sheet_names:
            print("DEBUG: Parsing 'Info' sheet...")
            df_info = excel_file.parse("Info")
            # Normalize Info sheet columns
            df_info.columns = [str(c).strip().lower() for c in df_info.columns]
            
            if "key" in df_info.columns and "value" in df_info.columns:
                for _, row in df_info.iterrows():
                    key = str(row.get("key", "")).strip().lower()
                    value = str(row.get("value", "")).strip()
                    if not value or value.lower() == "nan": continue
                    
                    if key == "title": metadata["title"] = value
                    elif key == "description": metadata["description"] = value
                    elif key == "category": metadata["category"] = value
                    elif key == "tags": metadata["tags"] = [t.strip() for t in value.split(",") if t.strip()]
                    elif key == "practice_settings":
                        try:
                            metadata["practice_settings"] = json.loads(value)
                        except:
                            pass
                    elif key == "time_limit": 
                        try: metadata["time_limit"] = int(float(value))
                        except: pass
                    elif key in ("active_pairs", "practice_pairs", "cấu hình luyện tập", "cặp câu hỏi luyện tập", "luyện tập"):
                        pairs = []
                        parts = re.split(r'[,;]+', value)
                        for part in parts:
                            part = part.strip()
                            if not part: continue
                            subparts = re.split(r'->|-|:', part)
                            if len(subparts) >= 2:
                                q_col = subparts[0].strip().lower()
                                a_col = subparts[1].strip().lower()
                                if q_col and a_col:
                                    pairs.append({"q": q_col, "a": a_col})
                        if pairs:
                            if "practice_settings" not in metadata:
                                metadata["practice_settings"] = {}
                            metadata["practice_settings"]["active_pairs"] = pairs
                            
                    elif key in ("num_choices", "practice_num_choices", "số lựa chọn"):
                        try:
                            num = int(float(value))
                            if 3 <= num <= 8:
                                if "practice_settings" not in metadata:
                                    metadata["practice_settings"] = {}
                                metadata["practice_settings"]["num_choices"] = num
                        except:
                            pass
        
        print(f"DEBUG: Metadata extracted: {metadata['title']}")

        # 2. Parse 'Data' sheet for questions / cards
        questions = []
        if not excel_file.sheet_names:
            return metadata, []
            
        sheet_name = "Data" if "Data" in excel_file.sheet_names else excel_file.sheet_names[0]
        print(f"DEBUG: Parsing '{sheet_name}' sheet...")
        df_data = excel_file.parse(sheet_name)
        
        # Normalize columns using MindStack COLUMN_ALIASES
        raw_cols = [str(c).strip() for c in df_data.columns]
        mapping = normalize_column_headers(raw_cols)
        df_data.rename(columns=mapping, inplace=True)
        print(f"DEBUG: Column mapping completed. Normalized headers: {list(df_data.columns)}")
        print(f"DEBUG: Found {len(df_data)} rows in data sheet.")
        
        for idx, row in df_data.iterrows():
            def get_val(col, default=""):
                try:
                    val = row.get(col)
                    if pd.notna(val):
                        s_val = str(val).strip()
                        s_val = s_val.replace('\\r\\n', '\n').replace('\\n', '\n')
                        return s_val
                    return default
                except:
                    return default

            # Detect content: front or question
            front_text = get_val("front") or get_val("question")
            if not front_text or front_text.lower() == "nan":
                continue

            # Detect explanation: back or explanation
            back_text = get_val("back") or get_val("explanation")
            if back_text.lower() == "nan":
                back_text = ""

            # Check if option columns exist and are populated
            has_options = False
            for opt_key in ["option_a", "option_b", "option_c", "option_d"]:
                if get_val(opt_key):
                    has_options = True
                    break

            # Collect all columns into others dict for full compatibility
            others_dict = {}
            for col in df_data.columns:
                val = get_val(col)
                if val and val.lower() != "nan":
                    others_dict[col] = val

            # Check if there is an explicit other_content column and parse it as JSON if possible
            other_content_raw = get_val("other_content")
            if other_content_raw:
                try:
                    parsed_json = json.loads(other_content_raw)
                    if isinstance(parsed_json, dict):
                        others_dict.update(parsed_json)
                    else:
                        others_dict["other_content"] = parsed_json
                except Exception:
                    others_dict["other_content"] = other_content_raw

            # Explicitly guarantee standardized key mappings in others for the frontend
            others_dict["front_img"] = get_val("front_img") or get_val("image")
            others_dict["back_img"] = get_val("back_img")
            others_dict["front_audio_url"] = get_val("front_audio_url") or get_val("audio")
            others_dict["back_audio_url"] = get_val("back_audio_url")
            others_dict["front_audio_content"] = get_val("front_audio_content")
            others_dict["back_audio_content"] = get_val("back_audio_content")

            # Get ID if present
            id_val = get_val("item_id")
            q_id = None
            if id_val and id_val.lower() != "nan":
                try:
                    q_id = int(float(id_val))
                except:
                    pass

            options_list = []
            q_type = "flashcard"

            question_data = {
                "id": q_id,
                "content": front_text,
                "explanation": back_text,
                "ai_explanation": get_val("ai_explanation"),
                "question_type": q_type,
                "image": get_val("front_img") or get_val("image"),
                "audio": get_val("front_audio_url") or get_val("audio"),
                "options": options_list,
                "others": others_dict
            }
            questions.append(question_data)
                
        return metadata, questions

    @staticmethod
    def export_deck_to_excel(deck_title: str, deck_description: str, category_name: str, tags: List[str], practice_settings: Dict[str, Any], cards: List[Any], exclude_ids: bool = False) -> bytes:
        """
        Generates an Excel workbook (bytes) containing Info and Data sheets
        for exporting a quiz/deck.
        """
        output = BytesIO()
        
        # 1. Prepare Info sheet key-value data
        info_data = [
            {"key": "title", "value": deck_title},
            {"key": "description", "value": deck_description or ""},
            {"key": "category", "value": category_name or "General"},
            {"key": "tags", "value": ", ".join(tags) if tags else ""}
        ]
        
        if practice_settings:
            info_data.append({"key": "practice_settings", "value": json.dumps(practice_settings, ensure_ascii=False)})
            
            active_pairs = practice_settings.get("active_pairs", [])
            num_choices = practice_settings.get("num_choices", 4)
            if active_pairs:
                pairs_str = ", ".join([f"{p['q']}-{p['a']}" for p in active_pairs if "q" in p and "a" in p])
                info_data.append({"key": "practice_pairs", "value": pairs_str})
                info_data.append({"key": "practice_num_choices", "value": str(num_choices)})
                
        df_info = pd.DataFrame(info_data)
        
        # 2. Prepare Data sheet rows
        # Discover all custom keys present in any question's others dict
        custom_cols = set()
        for q in cards:
            if q.others and isinstance(q.others, dict):
                for k in q.others.keys():
                    if k not in ("id", "item_id", "order_in_container", "front", "back", "explanation", "ai_explanation", "front_img", "front_audio_url", "image", "audio"):
                        custom_cols.add(k)
                        
        custom_cols = sorted(list(custom_cols))
        
        # Columns to output: id, front, back, explanation, ai_explanation, front_img, front_audio_url, then custom_cols
        rows = []
        for q in cards:
            row = {}
            if not exclude_ids:
                row["id"] = q.id
            row.update({
                "front": q.content,
                "back": q.explanation or "",
                "explanation": q.explanation or "",
                "ai_explanation": q.ai_explanation or "",
                "front_img": q.image or "",
                "front_audio_url": q.audio or ""
            })
            if q.others and isinstance(q.others, dict):
                for col in custom_cols:
                    row[col] = q.others.get(col, "")
            else:
                for col in custom_cols:
                    row[col] = ""
            rows.append(row)
            
        df_data = pd.DataFrame(rows)
        
        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_info.to_excel(writer, sheet_name="Info", index=False)
            df_data.to_excel(writer, sheet_name="Data", index=False)
            
        return output.getvalue()

