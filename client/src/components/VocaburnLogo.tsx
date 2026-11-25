import { useId } from 'react'
import { cn } from '@/lib/utils'

interface VocaburnLogoProps {
  className?: string
  mode?: 'horizontal' | 'icon'
  height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  size?: number | string
  iconOnly?: boolean
}

export function VocaburnLogo({
  className,
  mode = 'horizontal',
  height = 'md',
  size,
  iconOnly = false
}: VocaburnLogoProps) {
  const uid = useId().replace(/:/g, '')
  const isHorizontal = mode === 'horizontal' && !iconOnly

  const sizeConfig = {
    xs: { icon: 'w-6 h-6', text: 'text-sm', gap: 'gap-1.5', radius: 'rounded-lg' },
    sm: { icon: 'w-7 h-7', text: 'text-base', gap: 'gap-1.5', radius: 'rounded-[9px]' },
    md: { icon: 'w-8 h-8 sm:w-9 sm:h-9', text: 'text-lg sm:text-[19px]', gap: 'gap-2', radius: 'rounded-[11px]' },
    lg: { icon: 'w-10 h-10 sm:w-11 sm:h-11', text: 'text-xl sm:text-2xl', gap: 'gap-2.5', radius: 'rounded-xl' },
    xl: { icon: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-2xl sm:text-3xl', gap: 'gap-3', radius: 'rounded-2xl' }
  }[height] || { icon: 'w-8 h-8 sm:w-9 sm:h-9', text: 'text-lg sm:text-[19px]', gap: 'gap-2', radius: 'rounded-[11px]' }

  const IconMark = (
    <div
      className={cn(
        'relative flex items-center justify-center shrink-0 overflow-hidden shadow-[0_4px_14px_-2px_rgba(249,115,22,0.42)] transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95',
        sizeConfig.icon,
        sizeConfig.radius
      )}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id={`vb-bg-${uid}`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8A00" />
            <stop offset="55%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
          <linearGradient id={`vb-flame-${uid}`} x1="20" y1="8" x2="20" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFEDD5" />
          </linearGradient>
        </defs>

        {/* Squircle Gradient Base */}
        <rect width="40" height="40" rx="11" fill={`url(#vb-bg-${uid})`} />

        {/* Subtle Top Glass Highlight */}
        <path
          d="M0 11C0 4.92487 4.92487 0 11 0H29C35.0751 0 40 4.92487 40 11V14C32 18 8 18 0 14V11Z"
          fill="white"
          fillOpacity="0.14"
        />

        {/* Back Stacked Flashcard Hint */}
        <rect
          x="10"
          y="8.5"
          width="20"
          height="23"
          rx="4.5"
          transform="rotate(-7 20 20)"
          fill="white"
          fillOpacity="0.22"
        />

        {/* Stylized Flame + V Crest */}
        <path
          d="M20.6 9.2C20.6 9.2 26.8 14.3 26.8 20.4C26.8 25.1 23.8 28.6 20 29.8C16.2 28.6 13.2 25.1 13.2 20.4C13.2 17.5 14.5 14.8 16.4 12.8C16.5 15.1 17.8 16.4 17.8 16.4C17.8 16.4 18.4 12.2 20.6 9.2Z"
          fill={`url(#vb-flame-${uid})`}
        />

        {/* Crisp Inner Spark / V-Notch */}
        <path
          d="M20 18.2L22.3 22.8C22.6 23.4 22.2 24.2 21.5 24.4C20.6 24.7 19.4 24.7 18.5 24.4C17.8 24.2 17.4 23.4 17.7 22.8L20 18.2Z"
          fill={`url(#vb-bg-${uid})`}
        />
      </svg>
    </div>
  )

  if (!isHorizontal) {
    return (
      <div className={cn('inline-flex items-center justify-center select-none group cursor-pointer', className)}>
        {IconMark}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center select-none group cursor-pointer',
        sizeConfig.gap,
        className
      )}
    >
      {IconMark}
      <span
        className={cn(
          'font-black tracking-[-0.035em] leading-none flex items-baseline',
          sizeConfig.text
        )}
      >
        <span className="text-slate-900 dark:text-white">Voca</span>
        <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">
          burn
        </span>
      </span>
    </div>
  )
}

export default VocaburnLogo
