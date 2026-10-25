import { resolveMediaUrl } from '@/components/common/MediaUrlInput'

/**
 * Splits a raw image string containing one or multiple URLs into an array of clean URLs.
 * Supports delimiters: commas (,), semicolons (;), and newlines (\n).
 * Handles brackets, quotes, and whitespace safely.
 */
export function splitImageUrls(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    const flat: string[] = []
    for (const item of raw) {
      flat.push(...splitImageUrls(item))
    }
    return flat
  }
  if (typeof raw !== 'string') {
    return []
  }

  const str = raw.trim()
  if (!str || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') {
    return []
  }

  // Split by comma, semicolon, or newline
  const parts = str.split(/[\r\n,;]+/)
  const result: string[] = []

  for (let part of parts) {
    let cleaned = part.trim()
    // Strip surrounding quotes or brackets if present
    cleaned = cleaned.replace(/^['"\[\(]+|['"\]\)]+$/g, '').trim()
    if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('central://') || cleaned.startsWith('central-media://') || cleaned.startsWith('/') || cleaned.startsWith('data:image/'))) {
      result.push(cleaned)
    } else if (cleaned && (cleaned.includes('.jpg') || cleaned.includes('.jpeg') || cleaned.includes('.png') || cleaned.includes('.webp') || cleaned.includes('.gif') || cleaned.includes('.svg'))) {
      result.push(cleaned)
    }
  }

  return Array.from(new Set(result))
}

export interface DeckImageSettings {
  front_cols?: string[]
  back_cols?: string[]
  auto_split?: boolean
  layout?: 'grid' | 'carousel' | 'stacked'
}

/**
 * Extracts and resolves all images for a given card face (front or back).
 * Inspects both designated image columns, standard fields (front_img, back_img, image),
 * and custom columns in card.others matching image naming patterns.
 */
export function extractCardImages(
  card: any,
  face: 'front' | 'back' = 'front',
  imageSettings?: DeckImageSettings,
  flipSides: boolean = false
): string[] {
  if (!card) return []

  const effectiveFace = flipSides ? (face === 'front' ? 'back' : 'front') : face
  const rawUrls: string[] = []

  // Parse card.others safely if it's a JSON string
  let othersObj = card.others
  if (typeof othersObj === 'string') {
    try {
      othersObj = JSON.parse(othersObj)
    } catch {
      othersObj = {}
    }
  }
  if (!othersObj || typeof othersObj !== 'object') {
    othersObj = {}
  }

  // Helper to extract value from card or card.others (case-insensitive)
  const getColValue = (colName: string): string => {
    if (!colName) return ''
    if (card[colName] !== undefined && card[colName] !== null) {
      return String(card[colName])
    }
    const lower = colName.toLowerCase()
    if (card[lower] !== undefined && card[lower] !== null) {
      return String(card[lower])
    }
    for (const [k, v] of Object.entries(othersObj)) {
      if (k.toLowerCase() === lower && v !== undefined && v !== null) {
        return String(v)
      }
    }
    return ''
  }

  // 1. If explicit image columns are configured in imageSettings for this face
  const designatedCols = effectiveFace === 'front' ? imageSettings?.front_cols : imageSettings?.back_cols
  if (designatedCols && Array.isArray(designatedCols) && designatedCols.length > 0) {
    for (const col of designatedCols) {
      const val = getColValue(col)
      if (val) {
        rawUrls.push(...splitImageUrls(val))
      }
    }
  }

  // 2. Standard columns if nothing found yet or default fallbacks
  if (rawUrls.length === 0) {
    if (effectiveFace === 'front') {
      const fVal = card.front_img || othersObj.front_img || card.image || othersObj.image
      if (fVal) rawUrls.push(...splitImageUrls(fVal))

      // Also auto-discover any other front-related image columns in others
      for (const [k, v] of Object.entries(othersObj)) {
        const lowerK = k.toLowerCase()
        if (
          lowerK !== 'front_img' &&
          lowerK !== 'image' &&
          (lowerK.includes('front') || lowerK.includes('image_1') || lowerK.includes('img_1')) &&
          (lowerK.includes('img') || lowerK.includes('image') || lowerK.includes('pic') || lowerK.includes('photo'))
        ) {
          if (v) rawUrls.push(...splitImageUrls(String(v)))
        }
      }
    } else {
      const bVal = card.back_img || othersObj.back_img || card.img_url || othersObj.img_url
      if (bVal) rawUrls.push(...splitImageUrls(bVal))

      // Also auto-discover any other back-related image columns in others
      for (const [k, v] of Object.entries(othersObj)) {
        const lowerK = k.toLowerCase()
        if (
          lowerK !== 'back_img' &&
          (lowerK.includes('back') || lowerK.includes('image_2') || lowerK.includes('img_2') || lowerK.includes('explain') || lowerK.includes('illustration') || lowerK.includes('diagram')) &&
          (lowerK.includes('img') || lowerK.includes('image') || lowerK.includes('pic') || lowerK.includes('photo'))
        ) {
          if (v) rawUrls.push(...splitImageUrls(String(v)))
        }
      }
    }
  }

  // 3. Resolve each URL with media resolver and de-duplicate
  const resolved = rawUrls
    .map(u => resolveMediaUrl(u) || u)
    .filter(u => !!u && typeof u === 'string' && u.trim().length > 0)

  return Array.from(new Set(resolved))
}
