import os
import re
import json
import hashlib
import asyncio
import time
import random
import edge_tts
import logging

logger = logging.getLogger(__name__)

# Global concurrency lock & pacing control across requests to prevent Microsoft Edge TTS rate-limiting
_tts_lock = asyncio.Lock()
_last_tts_call_time = 0.0
MIN_PACE_DELAY_SECONDS = 0.8  # Giãn cách tối thiểu giữa các lần gọi Edge-TTS (800ms)


class AudioGenerator:
    PROMPT_REGEX = re.compile(r'^\s*([a-z]{2})(?:\(([mf])\))?:\s*(.+)$', re.MULTILINE)
    
    # Premium Microsoft Edge TTS Voices mapping with aliases
    EDGE_VOICES = {
        'ja': 'ja-JP-NanamiNeural',
        'ja-jp': 'ja-JP-NanamiNeural',
        'jp': 'ja-JP-NanamiNeural',
        'vi': 'vi-VN-HoaiMyNeural',
        'vi-vn': 'vi-VN-HoaiMyNeural',
        'vn': 'vi-VN-HoaiMyNeural',
        'en': 'en-US-AriaNeural',
        'en-us': 'en-US-AriaNeural',
        'en-gb': 'en-GB-SoniaNeural',
        'zh': 'zh-CN-XiaoxiaoNeural',
        'zh-cn': 'zh-CN-XiaoxiaoNeural',
        'cn': 'zh-CN-XiaoxiaoNeural',
        'ko': 'ko-KR-SunHiNeural',
        'ko-kr': 'ko-KR-SunHiNeural',
        'kr': 'ko-KR-SunHiNeural',
        'fr': 'fr-FR-DeniseNeural',
        'fr-fr': 'fr-FR-DeniseNeural',
        'de': 'de-DE-KillianNeural',
        'de-de': 'de-DE-KillianNeural',
        'es': 'es-ES-ElviraNeural',
        'es-es': 'es-ES-ElviraNeural',
        'ru': 'ru-RU-SvetlanaNeural',
        'ru-ru': 'ru-RU-SvetlanaNeural',
        'it': 'it-IT-ElsaNeural',
        'it-it': 'it-IT-ElsaNeural',
        'th': 'th-TH-PremwadeeNeural',
        'th-th': 'th-TH-PremwadeeNeural',
        'id': 'id-ID-GadisNeural',
        'id-id': 'id-ID-GadisNeural',
    }

    @classmethod
    async def _pace_request(cls):
        """
        Enforce safe delay and jitter between Edge TTS calls to prevent Microsoft from blocking requests.
        """
        global _last_tts_call_time
        now = time.time()
        elapsed = now - _last_tts_call_time
        # Random jitter 0.1s - 0.3s to avoid deterministic bot fingerprint
        jitter = random.uniform(0.1, 0.3)
        needed_delay = (MIN_PACE_DELAY_SECONDS + jitter) - elapsed
        if needed_delay > 0:
            await asyncio.sleep(needed_delay)
        _last_tts_call_time = time.time()

    @classmethod
    def resolve_voice(cls, lang: str) -> str:
        """
        Resolves voice name from language code or direct voice identifier.
        """
        if not lang:
            return cls.EDGE_VOICES['vi']
        
        # If user directly passed a full Edge TTS voice name (contains 'Neural')
        clean_lang = lang.strip().replace("gtts:", "")
        if "Neural" in clean_lang:
            return clean_lang

        lang_lower = clean_lang.lower()
        if lang_lower in cls.EDGE_VOICES:
            return cls.EDGE_VOICES[lang_lower]
        
        # Check prefix before hyphen (e.g. 'en-US' -> 'en')
        prefix = lang_lower.split('-')[0]
        if prefix in cls.EDGE_VOICES:
            return cls.EDGE_VOICES[prefix]

        return cls.EDGE_VOICES.get('vi', 'vi-VN-HoaiMyNeural')

    @staticmethod
    def parse_segments(text: str, default_lang: str = "vi"):
        if not text:
            return []
            
        segments = []
        
        # Check if text is in bracket format, e.g., [ja:人生][vi:cuộc đời]
        bracket_matches = re.findall(r'\[([a-z]{2,3}(?:-[a-zA-Z0-9]+)?):\s*([^\]]+)\]', text)
        if bracket_matches:
            for lang, content in bracket_matches:
                segments.append({
                    'text': content.strip(),
                    'lang': lang.strip().lower()
                })
            return segments
            
        # Fallback to line-by-line format
        lines = text.split('\n')
        current_lang = default_lang if default_lang not in ("multi", "auto") else "vi"
        
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue 
                
            match = AudioGenerator.PROMPT_REGEX.match(line)
            if match:
                lang = match.group(1).strip().lower()
                content = match.group(3).strip()
                current_lang = lang
                segments.append({
                    'text': content,
                    'lang': lang
                })
            else:
                segments.append({
                    'text': line_str,
                    'lang': current_lang
                })
                
        return segments

    @classmethod
    async def generate_tts(cls, text: str, output_path: str, lang: str = None) -> bool:
        """
        Generates 100% pure Microsoft Edge TTS audio file with pacing rate-limiting
        and exponential backoff retry. NO gTTS fallback to ensure consistent voice quality.
        Supports multi-language segments and merges them if pydub is available.
        """
        try:
            # Ensure /usr/bin and /usr/local/bin are in PATH so pydub/ffmpeg can be found
            extra_paths = ["/usr/bin", "/usr/local/bin"]
            current_path = os.environ.get("PATH", "")
            for p in extra_paths:
                if p not in current_path:
                    current_path += os.pathsep + p
            os.environ["PATH"] = current_path

            if lang and lang not in ('multi', 'auto'):
                segments = [{'text': text.strip(), 'lang': lang.strip().lower()}]
            else:
                segments = cls.parse_segments(text, default_lang=lang or "multi")
                
            if not segments:
                return False
                
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # 1. Synthesize all segments to temp files using paced Edge TTS with retries
            temp_files = []
            import tempfile
            
            for i, seg in enumerate(segments):
                seg_text = seg['text']
                if not seg_text.strip():
                    continue
                    
                # Clean furigana / bracket annotations e.g. 変更[へんこう] -> 変更
                clean_seg_text = re.sub(r'\[(?![a-z]{2,3}(?:-[a-zA-Z0-9]+)?:)[^\]]+\]', '', seg_text).strip()
                if not clean_seg_text:
                    clean_seg_text = seg_text.strip()
                seg_text = clean_seg_text

                raw_lang = seg['lang']
                voice_edge = cls.resolve_voice(raw_lang)
                
                # Create Temp File
                fd, temp_path = tempfile.mkstemp(suffix=f"_{i}.mp3")
                os.close(fd)
                
                # Try Edge TTS with rate pacing and exponential backoff retry (NO gTTS)
                success_edge = False
                last_err = None
                MAX_RETRIES = 3

                for attempt in range(1, MAX_RETRIES + 1):
                    try:
                        async with _tts_lock:
                            # Enforce pacing delay between calls to avoid Microsoft block
                            await cls._pace_request()
                            communicate = edge_tts.Communicate(seg_text, voice_edge)
                            await communicate.save(temp_path)

                        # Verify output file has content
                        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                            success_edge = True
                            log_msg = f"[TTS GENERATOR] [SUCCESS EDGE] Voice: '{voice_edge}' | Lang: '{raw_lang}' | Attempt: {attempt} | Text: '{seg_text[:30]}...'"
                            print(log_msg)
                            logger.info(log_msg)
                            break
                        else:
                            raise IOError("Edge TTS generated an empty file (0 bytes).")

                    except Exception as ee:
                        last_err = ee
                        warn_msg = f"[TTS GENERATOR] [RETRY {attempt}/{MAX_RETRIES}] Edge TTS call failed for voice '{voice_edge}': {ee}"
                        print(warn_msg)
                        logger.warning(warn_msg)

                        if attempt < MAX_RETRIES:
                            # Exponential backoff: ~1.5s, ~3.5s with random jitter
                            backoff = (attempt * 1.5) + random.uniform(0.3, 0.7)
                            await asyncio.sleep(backoff)

                if not success_edge:
                    if os.path.exists(temp_path):
                        try:
                            os.remove(temp_path)
                        except Exception:
                            pass
                    error_detail = f"Edge TTS failed after {MAX_RETRIES} attempts for voice '{voice_edge}'. Error: {last_err}"
                    print(f"\n==================================================\n[TTS CRITICAL ERROR] {error_detail}\n==================================================")
                    logger.error(error_detail)
                    raise RuntimeError(error_detail)
                        
                temp_files.append(temp_path)
                
            if not temp_files:
                return False
                
            # 2. Concatenate segments
            if len(temp_files) == 1:
                # Only 1 segment, direct copy from temp to final
                import shutil
                shutil.copyfile(temp_files[0], output_path)
                success = True
            else:
                # Merge using pydub
                try:
                    from pydub import AudioSegment
                    
                    # Programmatically search and set standard ffmpeg/ffprobe paths if PATH is restricted on VPS
                    for fpath in ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg.exe"]:
                        if os.path.exists(fpath):
                            AudioSegment.converter = fpath
                            break
                    for fpath in ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe", "/usr/bin/ffprobe.exe"]:
                        if os.path.exists(fpath):
                            AudioSegment.ffprobe = fpath
                            break
                    
                    def concat_task():
                        combined = AudioSegment.empty()
                        pause = AudioSegment.silent(duration=300) # 300ms pause between segments
                        
                        for idx, tf in enumerate(temp_files):
                            if idx > 0:
                                combined += pause
                            combined += AudioSegment.from_file(tf)
                            
                        combined.export(output_path, format="mp3")
                        
                    await asyncio.to_thread(concat_task)
                    success = True
                except Exception as pe:
                    logger.error(f"Pydub concatenation failed (missing ffmpeg), falling back to first segment: {pe}")
                    import shutil
                    shutil.copyfile(temp_files[0], output_path)
                    success = True
                    
            # 3. Clean up temp files
            for tf in temp_files:
                if os.path.exists(tf):
                    try:
                        os.remove(tf)
                    except Exception:
                        pass
                        
            return success
        except Exception as e:
            logger.error(f"AudioGenerator error: {e}")
            raise e

    @classmethod
    def get_voice_hash(cls, text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()
