/**
 * Grammar Card Back Formula Standard
 * Single Source of Truth for generating the rich 3-section back face:
 * 1. 🎯 Ý NGHĨA + TAG/CHÚ Ý (Hero title + Badges + subtle sub-meaning nuance)
 * 2. 🧩 CÁCH KẾT HỢP (Pill-formatted formation syntax)
 * 3. 💡 VÍ DỤ TIÊU BIỂU (Highlighted Japanese sentence + Vietnamese translation)
 */

function isTagToken(tok: string): boolean {
  const t = tok.trim()
  if (!t) return false

  if (t.includes('/')) {
    const subTokens = t.split('/').map(s => s.trim())
    if (subTokens.every(isTagToken)) return true
  }

  const ssotExact = new Set([
    'N', 'Nだ', 'Nで', 'Nの', 'Nである', 'Nではない', 'Nだった', 'Nではなかった',
    'Nする', 'N×する', 'N+助詞', 'N+であり', 'Nであった',
    '普通形', '普通形(名詞修飾型)', '普通形(である型)', 'S',
    '助数詞', '数詞', '助詞', '接頭辞', '接尾辞', '1', 'お', 'ご',
    'ADV', '疑問詞', '指示詞', '代名詞'
  ])
  if (ssotExact.has(t)) return true
  if (t.startsWith('V') || t.startsWith('A')) return true

  return false
}

function formatConnectionLine(line: string): string {
  const l = line.trim()
  if (!l) return ''
  if (l.includes('<span')) return l

  const parts = l.split(/\s*[＋+]\s*/)
  const formattedParts: string[] = []
  for (const p of parts) {
    const pt = p.trim()
    if (!pt) continue
    if (isTagToken(pt)) {
      formattedParts.push(
        `<span style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 13.5px;">${pt}</span>`
      )
    } else {
      formattedParts.push(
        `<span style="color: #4f46e5; font-weight: 800; font-size: 15.5px;">${pt}</span>`
      )
    }
  }

  const plusSep = ' <span style="color: #94a3b8; font-weight: bold;">＋</span> '
  return formattedParts.join(plusSep)
}

export function compileGrammarBackFormula(
  nghia: string = '',
  cachKetHop: string = '',
  viDu1: string = '',
  dichViDu1: string = '',
  tag: string = ''
): string {
  let mainMeaning = (nghia || '').trim()
  let subMeaning = ''
  if (mainMeaning.includes('(') && mainMeaning.endsWith(')')) {
    const idx = mainMeaning.lastIndexOf('(')
    subMeaning = mainMeaning.substring(idx).trim()
    mainMeaning = mainMeaning.substring(0, idx).trim()
  }

  const lines = (cachKetHop || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const formattedPills: string[] = lines.map(formatConnectionLine)
  const connectionHtml = formattedPills.join('<br/>\n')
  const subDiv = subMeaning
    ? `<div style="font-size: 14px; color: #6366f1; font-weight: 600; margin-top: 5px; line-height: 1.4;">${subMeaning}</div>`
    : ''

  const tagHeader = tag
    ? `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <div style="font-size: 11px; font-weight: 900; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em;">
          🎯 Ý NGHĨA
        </div>
        <div>${tag}</div>
      </div>`
    : `<div style="font-size: 11px; font-weight: 900; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
        🎯 Ý NGHĨA
      </div>`

  return `<div style="padding: 6px 2px;">
  <!-- HERO MEANING & TAG -->
  <div style="margin-bottom: 20px;">
    ${tagHeader}
    <div style="font-size: 21px; font-weight: 900; color: #0f172a; line-height: 1.35; letter-spacing: -0.01em;">
      ${mainMeaning}
    </div>
    ${subDiv}
  </div>

  <!-- CONNECTION SECTION -->
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 13px 16px; margin-bottom: 20px;">
    <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
      🧩 CÁCH KẾT HỢP
    </div>
    <div style="line-height: 2.3; font-size: 14px;">
${connectionHtml}
    </div>
  </div>

  <!-- EXAMPLE SECTION -->
  <div style="background: #ffffff; border-left: 4px solid #4f46e5; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; border-radius: 0 14px 14px 0; padding: 14px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
    <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
      💡 VÍ DỤ TIÊU BIỂU
    </div>
    <div style="font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.7;">
      ${viDu1}
    </div>
    <div style="font-size: 14px; color: #64748b; font-style: italic; margin-top: 7px; line-height: 1.55;">
      ${dichViDu1}
    </div>
  </div>
</div>`
}
