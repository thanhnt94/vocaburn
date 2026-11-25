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

  const heightClasses = {
    xs: 'h-6 sm:h-7',
    sm: 'h-7 sm:h-8',
    md: 'h-[36px] sm:h-[38px]',
    lg: 'h-11 sm:h-12',
    xl: 'h-14 sm:h-16 md:h-20'
  }[height] || 'h-[36px] sm:h-[38px]'

  if (!isHorizontal) {
    return (
      <div className={cn('inline-flex items-center justify-center select-none group cursor-pointer', className)}>
        <div
          className={cn(
            'relative aspect-square shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95',
            heightClasses
          )}
          style={size ? { width: size, height: size } : undefined}
        >
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_10px_rgba(249,115,22,0.35)]">
            <defs>
              <linearGradient id={`vb-icon-bg-${uid}`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF8A00" />
                <stop offset="55%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#F43F5E" />
              </linearGradient>
              <linearGradient id={`vb-icon-fl-${uid}`} x1="20" y1="8" x2="20" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#FFEDD5" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="11" fill={`url(#vb-icon-bg-${uid})`} />
            <path d="M0 11C0 4.92487 4.92487 0 11 0H29C35.0751 0 40 4.92487 40 11V14C32 18 8 18 0 14V11Z" fill="white" fillOpacity="0.15" />
            <rect x="10" y="8.5" width="20" height="23" rx="4.5" transform="rotate(-7 20 20)" fill="white" fillOpacity="0.22" />
            <path d="M20.6 9.2C20.6 9.2 26.8 14.3 26.8 20.4C26.8 25.1 23.8 28.6 20 29.8C16.2 28.6 13.2 25.1 13.2 20.4C13.2 17.5 14.5 14.8 16.4 12.8C16.5 15.1 17.8 16.4 17.8 16.4C17.8 16.4 18.4 12.2 20.6 9.2Z" fill={`url(#vb-icon-fl-${uid})`} />
            <path d="M20 18.2L22.3 22.8C22.6 23.4 22.2 24.2 21.5 24.4C20.6 24.7 19.4 24.7 18.5 24.4C17.8 24.2 17.4 23.4 17.7 22.8L20 18.2Z" fill={`url(#vb-icon-bg-${uid})`} />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('inline-flex items-center select-none group cursor-pointer', className)}>
      <div
        className={cn(
          'relative flex items-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.02] active:scale-95',
          heightClasses
        )}
        style={size ? { height: size } : undefined}
      >
        <svg viewBox="0 0 186 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
          <defs>
            <linearGradient id={`vb-bg-${uid}`} x1="4" y1="3" x2="38" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF8A00" />
              <stop offset="55%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <linearGradient id={`vb-burn-${uid}`} x1="115" y1="10" x2="180" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF7A00" />
              <stop offset="55%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <linearGradient id={`vb-fl-${uid}`} x1="21" y1="9" x2="21" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#FFEDD5" />
            </linearGradient>
          </defs>

          {/* Left Emblem: Squircle Card + Flame */}
          <rect x="2" y="3" width="38" height="38" rx="11" fill={`url(#vb-bg-${uid})`} />
          <path d="M2 14C2 7.92487 6.92487 3 13 3H29C35.0751 3 40 7.92487 40 14V16.5C32.5 20.2 9.5 20.2 2 16.5V14Z" fill="white" fillOpacity="0.15" />
          <rect x="11.5" y="10.5" width="19" height="22" rx="4.2" transform="rotate(-7 21 21.5)" fill="white" fillOpacity="0.22" />
          <path d="M21.6 11.4C21.6 11.4 27.4 16.2 27.4 22C27.4 26.4 24.6 29.7 21 30.8C17.4 29.7 14.6 26.4 14.6 22C14.6 19.3 15.8 16.7 17.6 14.8C17.7 17 18.9 18.2 18.9 18.2C18.9 18.2 19.5 14.2 21.6 11.4Z" fill={`url(#vb-fl-${uid})`} />
          <path d="M21 19.8L23.1 24.1C23.4 24.7 23 25.4 22.3 25.6C21.5 25.9 20.5 25.9 19.7 25.6C19 25.4 18.6 24.7 18.9 24.1L21 19.8Z" fill={`url(#vb-bg-${uid})`} />

          {/* Custom-Drawn Geometric Logotype: "Voca" */}
          <g className="stroke-slate-900 dark:stroke-white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            {/* V */}
            <path d="M50 13.5L57.5 30.5L65 13.5" />
            {/* o */}
            <circle cx="74.5" cy="24.5" r="6" />
            {/* c */}
            <path d="M95.2 20.3A6 6 0 1 0 95.2 28.7" />
            {/* a */}
            <circle cx="105.5" cy="24.5" r="5.8" />
            <path d="M111.3 18.7V30.5" />
          </g>

          {/* Custom-Drawn Geometric Logotype: "burn" */}
          <g stroke={`url(#vb-burn-${uid})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            {/* b with stylized flame-tip ascender */}
            <path d="M119 12.5V30.5" />
            <circle cx="125" cy="24.5" r="6" />
            {/* u */}
            <path d="M137 18.7V25A5.5 5.5 0 0 0 148 25V18.7" />
            {/* r */}
            <path d="M154.5 18.7V30.5" />
            <path d="M154.5 23.2A5 5 0 0 1 162 19.3" />
            {/* n */}
            <path d="M167.5 18.7V30.5" />
            <path d="M167.5 23.8A5.5 5.5 0 0 1 178.5 23.8V30.5" />
          </g>

          {/* Stylized Flame Spark Accent above 'b' + Dynamic Underline Swoosh under 'burn' */}
          <path d="M119.3 6.2C119.3 6.2 122 8.2 122 10.2C122 11.4 121 12.2 119.5 12.2C118 12.2 117 11.4 117 10.2C117 8.8 118.2 7.4 119.3 6.2Z" fill={`url(#vb-burn-${uid})`} />
          <path d="M119 36.2C136 37.8 160 36.8 179 34.8" stroke={`url(#vb-burn-${uid})`} strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.85" />
        </svg>
      </div>
    </div>
  )
}

export default VocaburnLogo
