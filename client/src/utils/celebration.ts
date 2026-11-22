import confetti from 'canvas-confetti'

export interface CelebrationOptions {
  isBonus?: boolean
  intensity?: 'light' | 'normal' | 'grand'
}

/**
 * Fires an elegant twin-cannon celebration from top-left and top-right corners.
 * Particles disperse widely across the two sides instead of plunging down the center.
 */
export const triggerCelebrationSparkles = (options: CelebrationOptions = {}) => {
  const { isBonus = false, intensity = 'normal' } = options

  const countPerSide = intensity === 'light' ? 14 : intensity === 'grand' ? 32 : isBonus ? 24 : 18

  const colors = isBonus
    ? ['#FFD700', '#FFA500', '#FF3D00', '#00E676', '#FFEA00']
    : ['#FFD700', '#FF9100', '#38BDF8', '#818CF8', '#F472B6']

  // Left corner cannon: shoots diagonally across top-left towards center-right
  confetti({
    zIndex: 9999,
    particleCount: countPerSide,
    angle: 315, // shoots down & to the right
    spread: 60,
    startVelocity: 24,
    gravity: 0.82, // gentle, airy float
    ticks: 150,
    origin: { x: 0.03, y: 0.04 },
    scalar: 0.88,
    shapes: ['circle', 'star'],
    colors
  })

  // Right corner cannon: shoots diagonally across top-right towards center-left
  confetti({
    zIndex: 9999,
    particleCount: countPerSide,
    angle: 225, // shoots down & to the left
    spread: 60,
    startVelocity: 24,
    gravity: 0.82, // gentle, airy float
    ticks: 150,
    origin: { x: 0.97, y: 0.04 },
    scalar: 0.88,
    shapes: ['circle', 'star'],
    colors
  })
}
