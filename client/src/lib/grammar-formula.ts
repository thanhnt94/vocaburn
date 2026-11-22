/**
 * Grammar Card Back Formula Standard
 * Single Source of Truth for generating the rich 3-section back face:
 * 1. 🎯 Ý NGHĨA (Hero title + subtle sub-meaning nuance)
 * 2. 🧩 CÁCH KẾT HỢP (Pill-formatted formation syntax)
 * 3. 💡 VÍ DỤ TIÊU BIỂU (Highlighted Japanese sentence + Vietnamese translation)
 */

export function compileGrammarBackFormula(
  nghia: string = '',
  cachKetHop: string = '',
  viDu1: string = '',
  dichViDu1: string = ''
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

  const formattedPills: string[] = []
  for (const line of lines) {
    if (line.includes('<span')) {
      formattedPills.push(line)
    } else {
      const parts = line.split(/\s*[＋+]\s*/)
      if (parts.length >= 2) {
        const leftPart = parts[0]
        const rightPart = parts.slice(1).join(' ＋ ')
        formattedPills.push(
          `<span style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 13.5px;">${leftPart}</span> ` +
          `<span style="color: #94a3b8; font-weight: bold;">＋</span> ` +
          `<span style="color: #4f46e5; font-weight: 800; font-size: 15.5px;">${rightPart}</span>`
        )
      } else {
        formattedPills.push(line)
      }
    }
  }

  const connectionHtml = formattedPills.join('<br/>\n')
  const subDiv = subMeaning
    ? `<div style="font-size: 14px; color: #6366f1; font-weight: 600; margin-top: 5px; line-height: 1.4;">${subMeaning}</div>`
    : ''

  return `<div style="padding: 6px 2px;">
  <!-- HERO MEANING -->
  <div style="margin-bottom: 20px;">
    <div style="font-size: 11px; font-weight: 900; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
      🎯 Ý NGHĨA
    </div>
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
