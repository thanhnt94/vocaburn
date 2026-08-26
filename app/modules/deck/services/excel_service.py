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
        metadata: Dict[str, Any] = {
            "title": "Imported Deck",
            "description": "",
            "category": "General",
            "cover_image": "",
            "instruction": "",
            "is_public": True,
            "time_limit": 0,
            "tags": [],
            "practice_settings": {},
            "collaborators": []
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
                    elif key == "cover_image": metadata["cover_image"] = value
                    elif key == "instruction": metadata["instruction"] = value
                    elif key in ("is_public", "public", "công khai"):
                        metadata["is_public"] = value.lower() in ("true", "1", "yes", "y", "công khai", "public")
                    elif key == "tags": metadata["tags"] = [t.strip() for t in value.split(",") if t.strip()]
                    elif key == "practice_settings":
                        try:
                            parsed = json.loads(value)
                            if isinstance(parsed, dict):
                                if "practice_settings" not in metadata or not isinstance(metadata["practice_settings"], dict):
                                    metadata["practice_settings"] = {}
                                metadata["practice_settings"].update(parsed)
                        except:
                            pass
                    elif key in ("custom_columns", "insight_columns", "column_order", "study_modes", "default_mode", "ai_prompts", "audio_pairs", "front_audio_config", "back_audio_config", "mcq", "typing", "listening"):
                        try:
                            parsed_val = json.loads(value)
                        except:
                            if key in ("custom_columns", "insight_columns", "column_order", "study_modes"):
                                parsed_val = [t.strip() for t in value.split(",") if t.strip()]
                            else:
                                parsed_val = value
                        
                        if "practice_settings" not in metadata or not isinstance(metadata["practice_settings"], dict):
                            metadata["practice_settings"] = {}
                        metadata["practice_settings"][key] = parsed_val
                    elif key in ("ai_prompt", "ai_prompt_explanation", "prompt_explanation"):
                        metadata["ai_prompt"] = value
                        if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                        metadata["practice_settings"]["ai_prompt"] = value
                    elif key in ("ai_prompt_hint", "prompt_hint"):
                        metadata["ai_prompt_hint"] = value
                        if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                        metadata["practice_settings"]["ai_prompt_hint"] = value
                    elif key in ("ai_prompt_mnemonic", "prompt_mnemonic"):
                        metadata["ai_prompt_mnemonic"] = value
                        if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                        metadata["practice_settings"]["ai_prompt_mnemonic"] = value
                    elif key == "time_limit": 
                        try: metadata["time_limit"] = int(float(value))
                        except: pass
                    elif key in ("active_pairs", "practice_pairs", "cấu hình luyện tập", "cặp câu hỏi luyện tập", "luyện tập", "mcq_active_pairs"):
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
                            if "mcq" not in metadata["practice_settings"] or not isinstance(metadata["practice_settings"]["mcq"], dict):
                                metadata["practice_settings"]["mcq"] = {}
                            metadata["practice_settings"]["mcq"]["active_pairs"] = pairs
                            metadata["practice_settings"]["active_pairs"] = pairs
                    elif key in ("typing_active_pairs", "typing_pairs"):
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
                            if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                            if "typing" not in metadata["practice_settings"] or not isinstance(metadata["practice_settings"]["typing"], dict):
                                metadata["practice_settings"]["typing"] = {}
                            metadata["practice_settings"]["typing"]["active_pairs"] = pairs
                    elif key in ("listening_active_pairs", "listening_pairs"):
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
                            if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                            if "listening" not in metadata["practice_settings"] or not isinstance(metadata["practice_settings"]["listening"], dict):
                                metadata["practice_settings"]["listening"] = {}
                            metadata["practice_settings"]["listening"]["active_pairs"] = pairs
                    elif key in ("num_choices", "practice_num_choices", "số lựa chọn", "mcq_num_choices"):
                        try:
                            num = int(float(value))
                            if 3 <= num <= 8:
                                if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                                if "mcq" not in metadata["practice_settings"] or not isinstance(metadata["practice_settings"]["mcq"], dict):
                                    metadata["practice_settings"]["mcq"] = {}
                                metadata["practice_settings"]["mcq"]["num_choices"] = num
                                metadata["practice_settings"]["num_choices"] = num
                        except:
                            pass
                    elif key in ("listening_num_choices", "số lựa chọn nghe"):
                        try:
                            num = int(float(value))
                            if 3 <= num <= 8:
                                if "practice_settings" not in metadata: metadata["practice_settings"] = {}
                                if "listening" not in metadata["practice_settings"] or not isinstance(metadata["practice_settings"]["listening"], dict):
                                    metadata["practice_settings"]["listening"] = {}
                                metadata["practice_settings"]["listening"]["num_choices"] = num
                        except:
                            pass
                    elif key in ("collaborators", "cộng tác viên", "contributors"):
                        collabs = []
                        parts = re.split(r'[,;]+', value)
                        for part in parts:
                            part = part.strip()
                            if not part: continue
                            if ":" in part:
                                uname, role = part.split(":", 1)
                                collabs.append({"username": uname.strip(), "role": role.strip()})
                            else:
                                collabs.append({"username": part.strip(), "role": "editor"})
                        if collabs:
                            metadata["collaborators"] = collabs
        
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
                        s_val = s_val.replace('_x000D_', '').replace('_x000d_', '')
                        s_val = s_val.replace('\\r\\n', '\n').replace('\\n', '\n')
                        return s_val
                    return default
                except:
                    return default

            # Detect content: front or question
            front_text = get_val("front") or get_val("question")
            if not front_text or front_text.lower() == "nan":
                continue

            explanation_text = get_val("back") or get_val("correct_answer") or get_val("explanation")
            
            # Options (Quiz format or standard Flashcard format)
            options_list = []
            for opt_key in ['option_a', 'option_b', 'option_c', 'option_d']:
                opt_val = get_val(opt_key)
                if opt_val and opt_val.lower() != "nan":
                    is_correct = (opt_val == explanation_text) or (opt_key == 'option_a' and not explanation_text)
                    options_list.append({
                        "content": opt_val,
                        "is_correct": is_correct
                    })
                    
            # Extract any remaining mapped columns into others
            others_dict = {}
            for col in df_data.columns:
                if col not in ('id', 'item_id', 'order_in_container', 'front', 'back', 'question', 'correct_answer', 'explanation', 
                               'option_a', 'option_b', 'option_c', 'option_d', 'front_audio_content', 'back_audio_content',
                               'front_audio_url', 'back_audio_url', 'front_img', 'back_img', 'audio', 'image'):
                    val = get_val(col)
                    if val and val.lower() != "nan":
                        others_dict[col] = val
                        
            # Check for other_content JSON blob
            raw_other_content = get_val("other_content")
            if raw_other_content and raw_other_content.lower() != "nan":
                try:
                    parsed_other = json.loads(raw_other_content)
                    if isinstance(parsed_other, dict):
                        others_dict.update(parsed_other)
                except:
                    others_dict["other_content"] = raw_other_content
                    
            question_data = {
                "id": get_val("id") or get_val("item_id") or None,
                "content": front_text,
                "explanation": explanation_text,
                "front_img": get_val("front_img") or get_val("image"),
                "back_img": get_val("back_img"),
                "front_audio_url": get_val("front_audio_url") or get_val("audio"),
                "back_audio_url": get_val("back_audio_url"),
                "front_audio_content": get_val("front_audio_content"),
                "back_audio_content": get_val("back_audio_content"),
                "options": options_list,
                "others": others_dict
            }
            questions.append(question_data)
                
        return metadata, questions

    @staticmethod
    def export_deck_to_excel(
        deck_title: str, 
        deck_description: str, 
        category_name: str, 
        tags: List[str], 
        practice_settings: Dict[str, Any], 
        cards: List[Any], 
        exclude_ids: bool = False,
        cover_image: str = "",
        instruction: str = "",
        is_public: bool = True,
        time_limit: int = 0,
        ai_prompt: str = "",
        ai_prompt_hint: str = "",
        ai_prompt_mnemonic: str = "",
        collaborators: List[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generates an Excel workbook (bytes) containing comprehensive Info and Data sheets
        for exporting a quiz/deck with 100% settings fidelity.
        """
        output = BytesIO()
        ps = practice_settings or {}
        
        # 1. Prepare Info sheet key-value data covering all 7 Edit Collection tabs
        info_data = [
            {"key": "title", "value": deck_title or ""},
            {"key": "description", "value": deck_description or ""},
            {"key": "category", "value": category_name or "General"},
            {"key": "tags", "value": ", ".join(tags) if tags else ""},
            {"key": "cover_image", "value": cover_image or ""},
            {"key": "instruction", "value": instruction or ""},
            {"key": "is_public", "value": "TRUE" if is_public else "FALSE"},
            {"key": "time_limit", "value": str(time_limit or 0)},
        ]
        
        # Column Manager
        if "column_order" in ps and isinstance(ps["column_order"], list):
            info_data.append({"key": "column_order", "value": ", ".join(ps["column_order"])})
        if "custom_columns" in ps and isinstance(ps["custom_columns"], list):
            info_data.append({"key": "custom_columns", "value": ", ".join(ps["custom_columns"])})
        if "insight_columns" in ps and isinstance(ps["insight_columns"], list):
            info_data.append({"key": "insight_columns", "value": ", ".join(ps["insight_columns"])})
            
        # Study Modes
        if "study_modes" in ps and isinstance(ps["study_modes"], list):
            info_data.append({"key": "study_modes", "value": ", ".join(ps["study_modes"])})
        if "default_mode" in ps:
            info_data.append({"key": "default_mode", "value": str(ps["default_mode"])})
            
        # Practice Defaults
        mcq = ps.get("mcq", {})
        if isinstance(mcq, dict):
            mcq_pairs = mcq.get("active_pairs", [])
            if mcq_pairs:
                info_data.append({"key": "mcq_active_pairs", "value": ", ".join([f"{p.get('q')}-{p.get('a')}" for p in mcq_pairs if isinstance(p, dict)])})
            if "num_choices" in mcq:
                info_data.append({"key": "mcq_num_choices", "value": str(mcq["num_choices"])})
                
        typing = ps.get("typing", {})
        if isinstance(typing, dict):
            typing_pairs = typing.get("active_pairs", [])
            if typing_pairs:
                info_data.append({"key": "typing_active_pairs", "value": ", ".join([f"{p.get('q')}-{p.get('a')}" for p in typing_pairs if isinstance(p, dict)])})
                
        listening = ps.get("listening", {})
        if isinstance(listening, dict):
            listening_pairs = listening.get("active_pairs", [])
            if listening_pairs:
                info_data.append({"key": "listening_active_pairs", "value": ", ".join([f"{p.get('q')}-{p.get('a')}" for p in listening_pairs if isinstance(p, dict)])})
            if "num_choices" in listening:
                info_data.append({"key": "listening_num_choices", "value": str(listening["num_choices"])})

        # AI Intelligence
        exp_prompt = ai_prompt or ps.get("ai_prompt", "")
        hint_prompt = ai_prompt_hint or ps.get("ai_prompt_hint", "")
        mne_prompt = ai_prompt_mnemonic or ps.get("ai_prompt_mnemonic", "")
        if exp_prompt: info_data.append({"key": "ai_prompt_explanation", "value": str(exp_prompt)})
        if hint_prompt: info_data.append({"key": "ai_prompt_hint", "value": str(hint_prompt)})
        if mne_prompt: info_data.append({"key": "ai_prompt_mnemonic", "value": str(mne_prompt)})
        if "ai_prompts" in ps and ps["ai_prompts"]:
            info_data.append({"key": "ai_prompts", "value": json.dumps(ps["ai_prompts"], ensure_ascii=False)})

        # Audio Pairs & Config
        if "audio_pairs" in ps and ps["audio_pairs"]:
            info_data.append({"key": "audio_pairs", "value": json.dumps(ps["audio_pairs"], ensure_ascii=False)})
        if "front_audio_config" in ps and ps["front_audio_config"]:
            info_data.append({"key": "front_audio_config", "value": json.dumps(ps["front_audio_config"], ensure_ascii=False)})
        if "back_audio_config" in ps and ps["back_audio_config"]:
            info_data.append({"key": "back_audio_config", "value": json.dumps(ps["back_audio_config"], ensure_ascii=False)})

        # Collaboration
        if collaborators:
            collab_strs = []
            for c in collaborators:
                uname = c.get("username") or c.get("email") or ""
                role = c.get("role") or "editor"
                if uname:
                    collab_strs.append(f"{uname}:{role}")
            if collab_strs:
                info_data.append({"key": "collaborators", "value": ", ".join(collab_strs)})

        # Full Practice Settings JSON (Backup / Advanced)
        if ps:
            info_data.append({"key": "practice_settings", "value": json.dumps(ps, ensure_ascii=False)})
                
        df_info = pd.DataFrame(info_data)
        
        # 2. Prepare Data sheet rows
        # Discover all custom keys present in any question's others dict
        custom_cols = set()
        for q in cards:
            if hasattr(q, 'others') and q.others and isinstance(q.others, dict):
                for k in q.others.keys():
                    if k not in ("id", "item_id", "order_in_container", "front", "back", "explanation", 
                                 "front_audio_content", "back_audio_content", "front_audio_url", "back_audio_url", 
                                 "front_img", "back_img", "options"):
                        custom_cols.add(k)
                        
        custom_cols = sorted(list(custom_cols))
        
        # Columns to output: id, standard columns, then custom_cols
        rows = []
        for q in cards:
            row = {}
            if not exclude_ids:
                row["id"] = getattr(q, 'id', None)
            row.update({
                "front": getattr(q, 'content', ""),
                "back": getattr(q, 'explanation', ""),
                "front_audio_content": getattr(q, 'front_audio_content', ""),
                "back_audio_content": getattr(q, 'back_audio_content', ""),
                "front_audio_url": getattr(q, 'front_audio_url', ""),
                "back_audio_url": getattr(q, 'back_audio_url', ""),
                "front_img": getattr(q, 'front_img', ""),
                "back_img": getattr(q, 'back_img', "")
            })
            
            # Serialize options if they exist
            options = getattr(q, 'options', [])
            for i, opt in enumerate(options):
                if i < 4:
                    row[f"option_{chr(97+i)}"] = opt.get('content', "")
            
            # Add custom columns
            others = getattr(q, 'others', {})
            if isinstance(others, dict):
                for col in custom_cols:
                    row[col] = others.get(col, "")
            rows.append(row)
            
        df_data = pd.DataFrame(rows)
        
        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_info.to_excel(writer, sheet_name="Info", index=False)
            df_data.to_excel(writer, sheet_name="Data", index=False)
            
        return output.getvalue()
