import confetti from 'canvas-confetti'

export interface CelebrationOptions {
  isBonus?: boolean
  intensity?: 'light' | 'normal' | 'grand'
}

/**
 * Computes flank origins so celebration sparkles frame both sides cleanly.
 * On mobile (<640px), shoots along the screen margins (left & right).
 * On desktop/tablet (>640px), shoots along the flanks of the centered card container.
 */
const getFlankOrigins = () => {
  if (typeof window === 'undefined') {
    return { leftX: 0.02, rightX: 0.98 }
  }
  const screenWidth = window.innerWidth
  if (screenWidth > 640) {
    const cardWidth = Math.min(480, screenWidth * 0.9)
    const margin = (screenWidth - cardWidth) / 2
    const leftX = Math.max(0.02, (margin - 20) / screenWidth)
    const rightX = Math.min(0.98, (screenWidth - margin + 20) / screenWidth)
    return { leftX, rightX }
  }
  return { leftX: 0.02, rightX: 0.98 }
}

/**
 * Fires an elegant twin side-flank celebration.
 * Particles launch upward from the left and right margins, arc gracefully across the flanks,
 * and drift down softly without plunging into the center card content.
 */
export const triggerCelebrationSparkles = (options: CelebrationOptions = {}) => {
  const { isBonus = false, intensity = 'normal' } = options

  const countPerSide = intensity === 'light' ? 12 : intensity === 'grand' ? 24 : isBonus ? 18 : 14

  const colors = isBonus
    ? ['#FFD700', '#FFA500', '#FF3D00', '#00E676', '#FFEA00']
    : ['#FFD700', '#FF9100', '#38BDF8', '#818CF8', '#F472B6']

  const { leftX, rightX } = getFlankOrigins()

  // Left flank cannon: launches upward along the left margin (angle 60°), arcing up and floating down gently
  confetti({
    zIndex: 9999,
    particleCount: countPerSide,
    angle: 60,
    spread: 52,
    startVelocity: 26,
    gravity: 0.68,
    decay: 0.92,
    ticks: 180,
    origin: { x: leftX, y: 0.62 },
    scalar: 0.85,
    shapes: ['circle', 'star'],
    colors,
    drift: -0.04 // gently maintains outward side spread
  })

  // Right flank cannon: launches upward along the right margin (angle 120°), arcing up and floating down gently
  confetti({
    zIndex: 9999,
    particleCount: countPerSide,
    angle: 120,
    spread: 52,
    startVelocity: 26,
    gravity: 0.68,
    decay: 0.92,
    ticks: 180,
    origin: { x: rightX, y: 0.62 },
    scalar: 0.85,
    shapes: ['circle', 'star'],
    colors,
    drift: 0.04 // gently maintains outward side spread
  })
}
