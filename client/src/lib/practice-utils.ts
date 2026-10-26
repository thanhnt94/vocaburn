/**
 * practice-utils.ts
 * Shared utilities for extracting field values and formatting question/answer data
 * across MCQ, Typing, Listening, and Recall Drill modes.
 */

export const getVal = (item: any, key: string): string => {
  if (!item) return "";
  const keyStr = String(key || "").trim();
  if (!keyStr) return "";

  const keyLower = keyStr.toLowerCase();

  // 1. Direct property match on item (e.g. item.front, item.back, item.content, item.explanation)
  if (item[keyStr] !== undefined && item[keyStr] !== null && String(item[keyStr]).trim()) {
    return String(item[keyStr]).trim();
  }

  // 2. Exact, case-insensitive, or semantic match in item.others FIRST!
  if (item.others && typeof item.others === 'object') {
    if (item.others[keyStr] !== undefined && item.others[keyStr] !== null && String(item.others[keyStr]).trim()) {
      return String(item.others[keyStr]).trim();
    }
    for (const [k, v] of Object.entries(item.others)) {
      if (k.toLowerCase() === keyLower && v !== undefined && v !== null && String(v).trim()) {
        return String(v).trim();
      }
    }

    // 2b. Semantic match for meaning columns (e.g. key is "nghĩa" / "meaning", matching "nghĩa tiếng việt", "định nghĩa", "ý nghĩa")
    if (keyLower === 'nghĩa' || keyLower.includes('nghĩa') || keyLower.includes('mean')) {
      for (const [k, v] of Object.entries(item.others)) {
        const kLower = k.toLowerCase();
        if ((kLower.includes('nghĩa') || kLower.includes('mean')) && v !== undefined && v !== null && String(v).trim()) {
          return String(v).trim();
        }
      }
    }

    // 2c. Semantic match for IPA / pronunciation columns (e.g. key is "ipa" / "phiên âm", matching "phiên âm ipa", "cách đọc")
    if (keyLower.includes('ipa') || keyLower.includes('phiên âm') || keyLower.includes('phát âm') || keyLower.includes('cách đọc')) {
      for (const [k, v] of Object.entries(item.others)) {
        const kLower = k.toLowerCase();
        if ((kLower.includes('ipa') || kLower.includes('phiên âm') || kLower.includes('cách đọc') || kLower.includes('phát âm')) && v !== undefined && v !== null && String(v).trim()) {
          return String(v).trim();
        }
      }
    }

    // 2d. Semantic match for part of speech columns (e.g. key is "loại từ" / "pos")
    if (keyLower.includes('loại từ') || keyLower.includes('pos')) {
      for (const [k, v] of Object.entries(item.others)) {
        const kLower = k.toLowerCase();
        if ((kLower.includes('loại từ') || kLower.includes('pos')) && v !== undefined && v !== null && String(v).trim()) {
          return String(v).trim();
        }
      }
    }
  }

  // 3. Standard alias mapping: front / content / kanji / từ vựng
  if (keyLower === 'front' || keyLower === 'content' || keyLower.includes('kanji') || keyLower.includes('gốc') || keyLower.includes('từ')) {
    const val = item.content || item.front || (item.others && (item.others.front || item.others.content || item.others.kanji || item.others.Kanji || item.others['từ vựng'] || item.others['Từ vựng']));
    if (val) return String(val).trim();
  }

  // 4. IPA / Pronunciation mapping: phiên âm / ipa / phát âm / cách đọc
  if (keyLower.includes('ipa') || keyLower.includes('phiên âm') || keyLower.includes('phát âm') || keyLower.includes('cách đọc') || keyLower.includes('pronun')) {
    const exp = String(item.explanation || item.back || '');
    const ipaMatch = exp.match(/🗣️\s*([^\n💡🌱📢📌🏷️📝]+)/);
    if (ipaMatch && ipaMatch[1].trim()) {
      return ipaMatch[1].trim();
    }
  }

  // 5. Part of speech mapping: loại từ / pos
  if (keyLower.includes('loại từ') || keyLower.includes('pos') || keyLower === 'type') {
    const exp = String(item.explanation || item.back || '');
    const posMatch = exp.match(/\((n|v|adj|adv|phrase|n phrase|v phrase|idiom|prep|pron|conj|interj)[^)]*\)/i);
    if (posMatch && posMatch[0].trim()) {
      return posMatch[0].trim();
    }
  }

  // 6. Standard alias mapping: back / explanation / nghĩa / meaning / definition
  if (keyLower === 'back' || keyLower === 'explanation' || keyLower.includes('nghĩa') || keyLower.includes('mean') || keyLower === 'definition') {
    let val = "";
    if (item.options && item.options.length > 0) {
      const correctOpt = item.options.find((o: any) => o.is_correct);
      if (correctOpt) val = correctOpt.content;
    }
    if (!val) val = item.explanation || item.back || (item.others && (item.others.back || item.others.explanation || item.others.nghĩa || item.others.Nghĩa));

    // Smart extraction if key requested was specifically 'nghĩa' or 'meaning' but fallback was whole composite explanation
    if (val && (keyLower.includes('nghĩa') || keyLower.includes('mean') || keyLower === 'definition')) {
      const strVal = String(val);
      // Priority 1: Label icon 🏷️ (frequent in Japanese / Anki cards, e.g. "🏷️ Hỗn loạn")
      const tagMatch = strVal.match(/🏷️\s*([^\n🌱💡📢📌📝🗣️]+)/);
      if (tagMatch && tagMatch[1].trim()) {
        return tagMatch[1].trim();
      }
      // Priority 2: Idea/Meaning icon 💡 (frequent in English / IELTS cards, e.g. "💡 Phát hiện bất ngờ")
      const bulbMatch = strVal.match(/💡\s*([^\n🌱📢📌📝🗣️🏷️]+)/);
      if (bulbMatch && bulbMatch[1].trim()) {
        return bulbMatch[1].trim();
      }
      // Priority 3: Target/Book icons 🎯, 📖
      const otherTagMatch = strVal.match(/(?:🎯|📖)\s*([^\n🌱📢📌📝🗣️🏷️💡]+)/);
      if (otherTagMatch && otherTagMatch[1].trim()) {
        return otherTagMatch[1].trim();
      }
    }

    if (val) return String(val).trim();
  }

  return "";
};
