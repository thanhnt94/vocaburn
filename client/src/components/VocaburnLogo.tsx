import { cn } from '@/lib/utils'

interface VocaburnLogoProps {
  className?: string
  mode?: 'horizontal' | 'icon'
  height?: 'sm' | 'md' | 'lg' | 'xl'
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
  const isHorizontal = mode === 'horizontal' && !iconOnly

  const mascotSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
    xl: 'w-16 h-16 sm:w-20 sm:h-20'
  }[height]

  const textSizes = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-[1.75rem] md:text-[1.95rem]',
    lg: 'text-3xl sm:text-4xl md:text-5xl',
    xl: 'text-5xl sm:text-6xl md:text-7xl'
  }[height]

  if (!isHorizontal) {
    return (
      <div className={cn("inline-flex items-center justify-center select-none group cursor-pointer", className)}>
        <div 
          className={cn(
            "relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95",
            mascotSizes
          )}
          style={size ? { width: size, height: size } : undefined}
        >
          <img
            src="/mascot/vocaburn_mascot_transparent.png"
            alt="Vocaburn Mascot"
            className="w-full h-full object-contain drop-shadow-sm"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5 sm:gap-3 select-none group cursor-pointer", className)}>
      {/* CUTE BABY FLAME MASCOT ON THE LEFT */}
      <div 
        className={cn(
          "relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 active:scale-95",
          mascotSizes
        )}
      >
        <img
          src="/mascot/vocaburn_mascot_transparent.png"
          alt="Vocaburn Mascot"
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>

      {/* CHUNKY, WIDE, EQUAL-HEIGHT WORDMARK */}
      <div 
        className={cn(
          "flex items-center font-black uppercase font-sans leading-none select-none transition-transform duration-300 group-hover:scale-[1.02]",
          textSizes
        )}
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
          fontWeight: 900,
          letterSpacing: '0.035em'
        }}
      >
        {/* VOCA - CANDY CYAN / SAPPHIRE BLUE */}
        <span 
          className="text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #4338ca 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(2,132,199,0.2))'
          }}
        >
          VOCA
        </span>

        {/* THE IGNITION ZONE: STARTING FROM 'B' THROUGH 'URN' */}
        <div className="relative inline-flex items-center">
          {/* B - SMOOTH CONTINUOUS TRANSITION (NO HARSH LINE) */}
          <span 
            className="text-transparent bg-clip-text inline-block"
            style={{
              backgroundImage: 'linear-gradient(125deg, #0284c7 0%, #06b6d4 35%, #f59e0b 65%, #ea580c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.25))'
            }}
          >
            B
          </span>

          {/* URN - SWEET HONEY GOLD, FIERY ORANGE & CORAL RED */}
          <span 
            className="text-transparent bg-clip-text inline-block"
            style={{
              backgroundImage: 'linear-gradient(180deg, #fde047 0%, #f97316 45%, #ef4444 85%, #dc2626 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.3))'
            }}
          >
            URN
          </span>

          {/* CUTE CARTOON FLAME IGNITING FROM 'B' AND SWEEPING ACROSS 'URN' */}
          <svg 
            className="absolute -top-3.5 -left-1 w-10 sm:w-12 h-6 pointer-events-none transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-1 drop-shadow-sm" 
            viewBox="0 0 50 30" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M10 25C7 18 12 10 18 4C19 12 25 10 27 2C32 8 36 14 33 22C38 15 42 16 44 20C46 24 42 27 38 28C28 30 15 30 10 25Z" 
              fill="url(#vb_fire_grad)" 
            />
            <path 
              d="M16 26C14 20 18 15 22 10C23 16 28 14 29 8C33 13 36 18 34 24C30 27 20 28 16 26Z" 
              fill="url(#vb_fire_inner_grad)" 
            />
            <defs>
              <linearGradient id="vb_fire_grad" x1="10" y1="2" x2="44" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FDE047" />
                <stop offset="0.4" stopColor="#F97316" />
                <stop offset="1" stopColor="#EF4444" />
              </linearGradient>
              <linearGradient id="vb_fire_inner_grad" x1="16" y1="8" x2="34" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FEF08A" />
                <stop offset="0.6" stopColor="#FBBF24" />
                <stop offset="1" stopColor="#F97316" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default VocaburnLogo
