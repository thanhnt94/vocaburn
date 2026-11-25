/**
 * Lightweight, zero-dependency HTML sanitizer for rich flashcard & comment content.
 * Strips dangerous tags (script, iframe, object, embed, style, form) and inline event handlers (on*).
 */
const BLOCKED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'style', 'form', 'input', 'textarea', 'button', 'meta', 'link']);

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allElements = doc.body.querySelectorAll('*');
    for (let i = allElements.length - 1; i >= 0; i--) {
      const el = allElements[i];
      const tag = el.tagName.toLowerCase();
      if (BLOCKED_TAGS.has(tag)) {
        el.remove();
        continue;
      }
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();
        if (name.startsWith('on') || (name === 'href' || name === 'src') && (val.startsWith('javascript:') || val.startsWith('data:text/html'))) {
          el.removeAttribute(attr.name);
        }
      }
    }
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}
