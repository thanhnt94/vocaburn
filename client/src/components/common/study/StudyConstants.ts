// ═══════════════════════════════════════════════════════════════════
// StudyConstants.ts — Single Source of Truth for Study Settings
// ═══════════════════════════════════════════════════════════════════

export interface StudySettings {
  card_flip_trigger: 'both' | 'tap' | 'button_only'
  card_rating_mode: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'
  quiz_learning_mode?: string
  learning_mode?: string
  front_valign: 'center' | 'top'
  front_halign: 'left' | 'center'
  front_font_size?: string
  back_valign: 'center' | 'top'
  back_halign: 'left' | 'center'
  autoplay_audio: 'always' | 'front' | 'back' | 'none'
  show_images: 'both' | 'back_only' | 'front' | 'none' | 'always' | 'back'
  show_fsrs?: boolean
  sfx_enabled: boolean
  haptic_enabled: boolean
  random_enabled: boolean
  quick_learn_enabled?: boolean
}

export interface StudyTemplateItem {
  id: string
  name: string
  badge: string
  desc: string
  icon: string
  isSystem?: boolean
  isDeckDefault?: boolean
  isCustom?: boolean
  settings: Partial<StudySettings>
}

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  card_flip_trigger: 'both',
  card_rating_mode: 'both',
  quiz_learning_mode: 'fsrs',
  front_valign: 'center',
  front_halign: 'left',
  front_font_size: '100%',
  back_valign: 'center',
  back_halign: 'left',
  autoplay_audio: 'back',
  show_images: 'both',
  show_fsrs: true,
  sfx_enabled: true,
  haptic_enabled: true,
  random_enabled: false,
  quick_learn_enabled: false,
}

export const SYSTEM_TEMPLATES: StudyTemplateItem[] = [
  {
    id: 'preset-standard',
    name: 'Standard',
    icon: 'sparkles',
    badge: 'Recommended',
    desc: 'Balanced recall: clean question on the front; audio and illustration appear only on back.',
    isSystem: true,
    settings: {
      autoplay_audio: 'back',
      show_images: 'back_only',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: false,
      show_fsrs: true,
      card_flip_trigger: 'both',
      card_rating_mode: 'both',
    }
  },
  {
    id: 'preset-full',
    name: 'Full Experience',
    icon: 'zap',
    badge: 'All Features',
    desc: 'Everything enabled: dual-sided images, autoplay TTS audio, combined swipe & buttons.',
    isSystem: true,
    settings: {
      autoplay_audio: 'always',
      show_images: 'both',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'left',
      back_valign: 'center',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: false,
      show_fsrs: true,
      card_flip_trigger: 'both',
      card_rating_mode: 'both',
    }
  },
  {
    id: 'preset-minimal',
    name: 'Minimalist',
    icon: 'sparkles',
    badge: 'Zero Distraction',
    desc: 'No images, no audio autoplay, hidden metrics, swipe-only without button clutter.',
    isSystem: true,
    settings: {
      autoplay_audio: 'none',
      show_images: 'none',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'center',
      front_halign: 'center',
      back_valign: 'center',
      back_halign: 'center',
      random_enabled: false,
      sfx_enabled: false,
      haptic_enabled: false,
      quick_learn_enabled: false,
      show_fsrs: false,
      card_flip_trigger: 'tap',
      card_rating_mode: 'swipe_4way',
    }
  },
  {
    id: 'preset-classic',
    name: 'Classic',
    icon: 'book',
    badge: 'Anki Style',
    desc: 'Traditional 4-button workflow: flip via button so you can easily select and copy text.',
    isSystem: true,
    settings: {
      autoplay_audio: 'back',
      show_images: 'both',
      quiz_learning_mode: 'fsrs',
      learning_mode: 'fsrs',
      front_valign: 'top',
      front_halign: 'left',
      back_valign: 'top',
      back_halign: 'left',
      random_enabled: false,
      sfx_enabled: true,
      haptic_enabled: true,
      quick_learn_enabled: false,
      show_fsrs: true,
      card_flip_trigger: 'button_only',
      card_rating_mode: 'buttons',
    }
  }
]

/** Generate human-readable spec pills from settings */
export function getSettingsSpecPills(s: Partial<StudySettings>): { label: string; val: string }[] {
  const flip =
    s.card_flip_trigger === 'button_only' ? 'Button Only'
    : s.card_flip_trigger === 'tap' ? 'Tap Body'
    : 'Tap & Swipe'

  const rating =
    s.card_rating_mode === 'buttons' ? '4 Buttons'
    : s.card_rating_mode === 'swipe_4way' ? '4-Way Swipe'
    : s.card_rating_mode === 'swipe_2way' ? '2-Way Swipe'
    : 'Hybrid'

  const audio =
    s.autoplay_audio === 'always' ? 'Always'
    : s.autoplay_audio === 'back' ? 'Back Only'
    : s.autoplay_audio === 'front' ? 'Front Only'
    : 'Off'

  const img =
    s.show_images === 'none' ? 'Hidden'
    : (s.show_images === 'back_only' || s.show_images === 'back') ? 'Back Only'
    : s.show_images === 'front' ? 'Front Only'
    : 'Both Sides'

  return [
    { label: 'Flip', val: flip },
    { label: 'Rating', val: rating },
    { label: 'Audio', val: audio },
    { label: 'Images', val: img },
  ]
}

/** Calculate responsive clamped font size for card front side */
export function getFrontFontSizeStyle(scale?: string | number): string {
  if (!scale) return 'clamp(1.75rem, 4.5vw, 2.25rem)'
  const str = String(scale).trim().toLowerCase()
  let percent = 100
  if (str === 'compact' || str === 'small') percent = 85
  else if (str === 'normal' || str === 'default') percent = 100
  else if (str === 'large') percent = 125
  else if (str === 'xlarge' || str === 'xl') percent = 150
  else if (str === 'huge') percent = 175
  else if (str === 'massive' || str === 'max') percent = 200
  else {
    const num = parseFloat(str.replace('%', ''))
    if (!isNaN(num) && num > 0) percent = num
  }
  const ratio = Math.max(0.5, Math.min(2.5, percent / 100))
  if (ratio === 1) return 'clamp(1.75rem, 4.5vw, 2.25rem)'
  return `calc(clamp(1.75rem, 4.5vw, 2.25rem) * ${ratio})`
}

/** Merge partial settings onto defaults */
export function resolveStudySettings(partial: Partial<StudySettings>): StudySettings {
  return { ...DEFAULT_STUDY_SETTINGS, ...partial }
}
