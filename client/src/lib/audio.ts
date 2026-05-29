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

  // Try bracket format first: e.g. [ja:人生][vi:cuộc đời]
  const bracketRegex = /\[([a-z]{2,3}(?:-[a-zA-Z0-9]+)?):\s*([^\]]+)\]/g;
  let bracketMatch;
  let hasBrackets = false;

  while ((bracketMatch = bracketRegex.exec(text)) !== null) {
    hasBrackets = true;
    const rawLang = bracketMatch[1].toLowerCase();
    const content = bracketMatch[2].trim();
    const langCode = langMap[rawLang] || rawLang;
    segments.push({ text: content, langCode });
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
        segments.push({ text: content, langCode });
      } else {
        segments.push({ text: line.trim(), langCode: lastLang });
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

    console.log(`[CLIENT TTS - WEB SPEECH] Speaking: "${seg.text}" | Lang: "${seg.langCode}" | Selected Voice: "${u.voice ? u.voice.name : 'Default/System voice'}"`);
    window.speechSynthesis.speak(u);
  });
};
