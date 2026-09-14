let activeAudioElement: HTMLAudioElement | null = null;
let activeStreamAbortController: AbortController | null = null;
let activePlayToken = 0;

// Web Audio API Context & iOS Safari / Mobile Unlock state
let isAudioUnlocked = false;
let sharedAudioContext: AudioContext | null = null;

export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioContext = new AudioCtxClass();
    }
  }
  return sharedAudioContext;
};

/**
 * Unlocks Web Audio API and HTMLAudioElement playback on iOS Safari & Mobile browsers.
 * Triggers on the very first user interaction (touch/click/keydown) to eliminate audio delays.
 */
export const unlockAudio = () => {
  if (isAudioUnlocked || typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Play a tiny 1-sample silent buffer to unlock the audio hardware channel
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    // Dummy silent audio play to satisfy HTMLAudioElement autoplay policy
    const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    silentAudio.play().then(() => {
      silentAudio.pause();
      isAudioUnlocked = true;
    }).catch(() => {});
  } catch (e) {
    // Non-blocking catch
  }
};

// Auto-register touch/click unlock listeners once on client boot
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
  const handleUserInteraction = () => {
    unlockAudio();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleUserInteraction, true));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleUserInteraction, { capture: true, once: true }));
}

// Audio Preload Cache Pool (Keeps up to 40 preloaded audio elements in memory)
const preloadedAudioUrls = new Set<string>();
const preloadedAudioElements = new Map<string, HTMLAudioElement>();

export const preloadAudioUrls = (urls: (string | null | undefined)[]) => {
  if (typeof window === 'undefined') return;
  urls.filter(Boolean).forEach(url => {
    const cleanUrl = (url as string).trim();
    if (!cleanUrl || preloadedAudioUrls.has(cleanUrl)) return;
    preloadedAudioUrls.add(cleanUrl);
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = cleanUrl;
      // LRU-like eviction if cache grows beyond 40 items
      if (preloadedAudioElements.size > 40) {
        const firstKey = preloadedAudioElements.keys().next().value;
        if (firstKey) {
          const oldAudio = preloadedAudioElements.get(firstKey);
          if (oldAudio) oldAudio.src = '';
          preloadedAudioElements.delete(firstKey);
        }
      }
      preloadedAudioElements.set(cleanUrl, audio);
    } catch (e) {
      // Silently catch audio construction errors if any
    }
  });
};

export const cancelAllAudio = () => {
  activePlayToken++;
  if (activeStreamAbortController) {
    try {
      activeStreamAbortController.abort();
    } catch (e) {}
    activeStreamAbortController = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (e) {}
    activeAudioElement = null;
  }
};

export const registerAudioElement = (audio: HTMLAudioElement) => {
  cancelAllAudio();
  activeAudioElement = audio;
};

export const playCorrectSound = () => {
  try {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/correct.mp3`);
    audio.volume = 0.4;
    audio.play().catch(e => console.log("SFX autoplay blocked:", e));
  } catch (e) {
    console.error("Audio SFX failed:", e);
  }
};

export const playIncorrectSound = () => {
  try {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/incorrect.mp3`);
    audio.volume = 0.4;
    audio.play().catch(e => console.log("SFX autoplay blocked:", e));
  } catch (e) {
    console.error("Audio SFX failed:", e);
  }
};

export const stripTagsAndBBCode = (text: string): string => {
  if (!text) return "";
  let cleaned = String(text);

  // 1. Remove Anki sound tags: [sound:filename.mp3]
  cleaned = cleaned.replace(/\[sound:[^\]]+\]/gi, '');

  // 2. Remove <rt>...</rt> and <rp>...</rp> tags and their contents (ruby furigana)
  cleaned = cleaned.replace(/<rt>[\s\S]*?<\/rt>/gi, '');
  cleaned = cleaned.replace(/<rp>[\s\S]*?<\/rp>/gi, '');

  // 3. Remove all other HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // 4. Handle Anki cloze deletion: {{c1::answer::hint}} or {{c1::answer}} -> answer
  cleaned = cleaned.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, '$1');

  // 5. Remove Anki furigana in brackets: e.g. 東京[とうきょう] -> 東京, 行[い]く -> 行く
  // Keep multi-language bracket syntax if text uses [ja:...][vi:...] by protecting [lang:
  cleaned = cleaned.replace(/\[(?![a-z]{2,3}(?:-[a-zA-Z0-9]+)?:)[^\]]+\]/g, '');

  // Fallback: If text was ONLY bracket content like "[とうきょう]" and became empty
  if (!cleaned.trim()) {
    const rawNoHtml = text.replace(/<[^>]*>/g, '').trim();
    cleaned = rawNoHtml.replace(/^\[|\]$/g, '').trim();
  }

  // 6. Remove remaining BBCode tags like [color=blue], [b], [/b], [/color]
  cleaned = cleaned.replace(/\[\/?[a-zA-Z0-9_=#-]+\]/g, '');

  // 7. Clean up extra spaces around Japanese/CJK characters caused by Anki space syntax
  cleaned = cleaned.replace(/([\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])\s+([\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])/g, '$1$2');

  // 8. Normalize spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  return cleaned.trim();
};

export const speakSequentially = (segments: { text: string; langCode: string }[], delayMs = 1000) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const voices = typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : [];
  let index = 0;

  const speakNext = () => {
    if (index >= segments.length) return;
    const seg = segments[index];
    index++;

    const cleanedText = stripTagsAndBBCode(seg.text);
    if (!cleanedText) {
      speakNext();
      return;
    }

    const u = new SpeechSynthesisUtterance(cleanedText);
    u.lang = seg.langCode;
    u.rate = 0.85;

    // Apply high quality Vietnamese female voice if applicable
    if (seg.langCode.toLowerCase().startsWith('vi')) {
      const viVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        const isVi = lang === 'vi-vn' || lang.startsWith('vi');
        if (!isVi) return false;
        return name.includes('hoaimy') ||
               name.includes('linh') ||
               name.includes('an') ||
               name.includes('female') ||
               name.includes('nữ') ||
               name.includes('google');
      });
      if (viVoice) {
        u.voice = viVoice;
      } else {
        const anyVi = voices.find(v => v.lang.toLowerCase() === 'vi-vn' || v.lang.toLowerCase().startsWith('vi'));
        if (anyVi) u.voice = anyVi;
      }
    }

    // Apply Japanese voice if applicable
    if (seg.langCode.toLowerCase().startsWith('ja')) {
      const jaVoice = voices.find(v => {
        const lang = v.lang.toLowerCase();
        return lang === 'ja-jp' || lang.startsWith('ja');
      });
      if (jaVoice) u.voice = jaVoice;
    }

    u.onend = () => {
      setTimeout(() => {
        speakNext();
      }, delayMs);
    };

    u.onerror = () => {
      speakNext();
    };

    window.speechSynthesis.speak(u);
  };

  speakNext();
};

export const speakWithEdgeTTS = async (text: string, lang?: string) => {
  if (!text || !text.trim()) return;
  const clean = stripTagsAndBBCode(text);
  if (!clean) return;

  cancelAllAudio();
  const currentToken = activePlayToken;
  const controller = new AbortController();
  activeStreamAbortController = controller;

  try {
    const res = await fetch(
      `/api/v1/deck/tts/stream?text=${encodeURIComponent(clean)}&lang=${encodeURIComponent(lang || 'multi')}`,
      { signal: controller.signal }
    );
    if (activePlayToken !== currentToken) return;

    if (res.ok) {
      const data = await res.json();
      if (activePlayToken !== currentToken) return;

      if (data.url) {
        const audio = new Audio(`${data.url}?t=${Date.now()}`);
        registerAudioElement(audio);
        audio.play().catch(e => {
          console.warn('[EDGE TTS AUTOPLAY BLOCKED]', e);
        });
        return;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.warn('[EDGE TTS STREAM ERROR]', err);
  } finally {
    if (activeStreamAbortController === controller) {
      activeStreamAbortController = null;
    }
  }
};

export const speakWithEdgeTTSPromise = (text: string, lang?: string): Promise<void> => {
  return new Promise(async (resolve) => {
    if (!text || !text.trim()) return resolve();
    const clean = stripTagsAndBBCode(text);
    if (!clean) return resolve();

    cancelAllAudio();
    const currentToken = activePlayToken;
    const controller = new AbortController();
    activeStreamAbortController = controller;

    try {
      const res = await fetch(
        `/api/v1/deck/tts/stream?text=${encodeURIComponent(clean)}&lang=${encodeURIComponent(lang || 'multi')}`,
        { signal: controller.signal }
      );
      if (activePlayToken !== currentToken) return resolve();

      if (res.ok) {
        const data = await res.json();
        if (activePlayToken !== currentToken) return resolve();

        if (data.url) {
          const audio = new Audio(`${data.url}?t=${Date.now()}`);
          registerAudioElement(audio);
          audio.onended = () => resolve();
          audio.onerror = () => {
            resolve();
          };
          audio.play().catch(e => {
            console.warn('[EDGE TTS AUTOPLAY BLOCKED]', e);
            resolve();
          });
          return;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return resolve();
      console.warn('[EDGE TTS STREAM ERROR]', err);
    } finally {
      if (activeStreamAbortController === controller) {
        activeStreamAbortController = null;
      }
    }

    resolve();
  });
};

export const speakEdgeTTSSequentially = async (segments: { text: string; langCode: string }[], delayMs = 1000) => {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.text) continue;
    
    await speakWithEdgeTTSPromise(seg.text, seg.langCode);
    
    if (i < segments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

export const speakMultiLanguage = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const segments: { text: string; langCode: string }[] = [];
  const langMap: Record<string, string> = {
    'ja': 'ja-JP',
    'vi': 'vi-VN',
    'en': 'en-US',
    'zh': 'zh-CN',
    'ko': 'ko-KR',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'es': 'es-ES',
    'ru': 'ru-RU',
    'it': 'it-IT',
  };

  const isFemaleViVoice = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    const isVi = lang === 'vi-vn' || lang.startsWith('vi');
    if (!isVi) return false;
    if (name.includes('nam') || name.includes('hieu') || name.includes('male') || name.includes('man')) {
      return false;
    }
    return name.includes('hoaimy') ||
           name.includes('linh') ||
           name.includes('an') ||
           name.includes('female') ||
           name.includes('nữ') ||
           name.includes('chi') ||
           name.includes('google') ||
           name.includes('natural');
  };

  // Try bracket format first: e.g. [ja:人生][vi:cuộc đời]
  const bracketRegex = /\[([a-z]{2,3}(?:-[a-zA-Z0-9]+)?):\s*([^\]]+)\]/g;
  let bracketMatch;
  let hasBrackets = false;

  while ((bracketMatch = bracketRegex.exec(text)) !== null) {
    hasBrackets = true;
    const rawLang = bracketMatch[1].toLowerCase();
    const content = bracketMatch[2].trim();
    const langCode = langMap[rawLang] || rawLang;
    segments.push({ text: stripTagsAndBBCode(content), langCode });
  }

  if (!hasBrackets) {
    // Fallback to line-by-line format
    const lines = text.split('\n');
    const lineRegex = /^\s*([a-z]{2,3}(?:-[a-zA-Z0-9]+)?)\s*:\s*(.+)$/;
    const containsJapanese = (str: string) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
    const containsVietnamese = (str: string) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);

    let lastLang = 'en-US';
    if (containsJapanese(text)) {
      lastLang = 'ja-JP';
    } else if (containsVietnamese(text)) {
      lastLang = 'vi-VN';
    }

    for (const line of lines) {
      if (!line.trim()) continue;

      const match = line.match(lineRegex);
      if (match) {
        const rawLang = match[1].toLowerCase();
        const content = match[2].trim();
        const langCode = langMap[rawLang] || rawLang;
        lastLang = langCode;
        segments.push({ text: stripTagsAndBBCode(content), langCode });
      } else {
        let lineLang = lastLang;
        if (containsJapanese(line)) {
          lineLang = 'ja-JP';
        } else if (containsVietnamese(line)) {
          lineLang = 'vi-VN';
        }
        segments.push({ text: stripTagsAndBBCode(line.trim()), langCode: lineLang });
      }
    }
  }

  const voices = typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : [];

  segments.forEach((seg) => {
    if (!seg.text) return;
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = seg.langCode;
    u.rate = 0.85;

    // Tự động tìm giọng Nữ chất lượng cao cho tiếng Việt (vi-VN)
    if (seg.langCode.toLowerCase().startsWith('vi')) {
      const viVoice = voices.find(isFemaleViVoice);
      if (viVoice) {
        u.voice = viVoice;
      } else {
        const anyVi = voices.find(v => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          return (lang === 'vi-vn' || lang.startsWith('vi')) && 
                 !(name.includes('nam') || name.includes('hieu') || name.includes('male'));
        });
        if (anyVi) u.voice = anyVi;
      }
    }

    console.log(`[CLIENT TTS - WEB SPEECH] Speaking: "${seg.text}" | Lang: "${seg.langCode}" | Selected Voice: "${u.voice ? u.voice.name : 'Default/System voice'}"`);
    window.speechSynthesis.speak(u);
  });
};
