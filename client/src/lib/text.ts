export const parseBBCodeToHtml = (text: string): string => {
  if (!text) return '';
  let html = text;
  // Convert Markdown bold/italic to HTML tags first to avoid parser confusion with raw HTML <ruby>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  html = html.replace(/\[b\]/gi, '<strong>');
  html = html.replace(/\[\/b\]/gi, '</strong>');
  html = html.replace(/\[i\]/gi, '<em>');
  html = html.replace(/\[\/i\]/gi, '</em>');
  html = html.replace(/\[u\]/gi, '<u>');
  html = html.replace(/\[\/u\]/gi, '</u>');
  html = html.replace(/\[s\]/gi, '<del>');
  html = html.replace(/\[\/s\]/gi, '</del>');
  html = html.replace(/\[color=([^\]]+)\]/gi, (_, color) => `<span style="color: ${color}">`);
  html = html.replace(/\[\/color\]/gi, '</span>');
  html = html.replace(/\[size=([^\]]+)\]/gi, (_, size) => `<span style="font-size: ${size}">`);
  html = html.replace(/\[\/size\]/gi, '</span>');
  
  // Furigana (Anki-style: Kanji[Furigana] -> <ruby>Kanji<rt>Furigana</rt></ruby>)
  html = html.replace(/([\u4e00-\u9fff\u3400-\u4dbf][\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]*)\[([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
  
  return html;
};

export const stripBBCode = (text: string): string => {
  if (!text) return "";
  return text.replace(/\[\/?[a-zA-Z0-9=#_\-]+\]/g, '');
};

export const isJapanese = (text: string): boolean => {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (
      (c >= '\u4e00' && c <= '\u9fff') ||
      (c >= '\u3400' && c <= '\u4dbf') ||
      (c >= '\u3040' && c <= '\u309f') ||
      (c >= '\u30a0' && c <= '\u30ff')
    ) {
      return true;
    }
  }
  return false;
};

export const getJpPattern = (text: string): string => {
  if (!text) return "";
  if (isJapanese(text)) {
    const pattern: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if ((char >= '\u4e00' && char <= '\u9fff') || (char >= '\u3400' && char <= '\u4dbf')) {
        pattern.push('K');
      } else if (char >= '\u3040' && char <= '\u309f') {
        pattern.push('H');
      } else if (char >= '\u30a0' && char <= '\u30ff') {
        pattern.push('C');
      } else {
        pattern.push('O');
      }
    }
    return pattern.join('');
  } else {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return `W${words.length}`;
  }
};

export const extractTokens = (text: string): Set<string> => {
  if (!text) return new Set();
  const kanji = new Set<string>();
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if ((char >= '\u4e00' && char <= '\u9fff') || (char >= '\u3400' && char <= '\u4dbf')) {
      kanji.add(char);
    }
  }
  if (kanji.size > 0) return kanji;

  const words = text.split(/[\s,.;:/|()]+/).map(w => w.trim().toLowerCase()).filter(w => w.length > 1);
  return new Set(words);
};

export const tokensOverlapHigh = (tokensA: Set<string>, tokensB: Set<string>): boolean => {
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  let sharedCount = 0;
  tokensA.forEach(t => {
    if (tokensB.has(t)) sharedCount++;
  });
  if (sharedCount === 0) return false;
  const smallerSize = Math.min(tokensA.size, tokensB.size);
  return (sharedCount / smallerSize) >= 0.6;
};
