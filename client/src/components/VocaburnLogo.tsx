import { cn } from '@/lib/utils'

interface VocaburnLogoProps {
  className?: string
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  textSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'dark' | 'light'
  showIcon?: boolean
  showText?: boolean
  iconOnly?: boolean
}

export function VocaburnLogo({
  className,
  iconSize = 'md',
  textSize = 'md',
  variant = 'dark',
  showIcon = true,
  showText = true,
  iconOnly = false
}: VocaburnLogoProps) {
  const iconDimensions = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-7.5 h-7.5 rounded-xl',
    md: 'w-9 h-9 rounded-2xl',
    lg: 'w-11 h-11 rounded-[1.25rem]',
    xl: 'w-14 h-14 rounded-3xl'
  }[iconSize]

  const textClasses = {
    xs: 'text-xs sm:text-sm tracking-tight',
    sm: 'text-sm sm:text-base tracking-tight',
    md: 'text-lg sm:text-xl tracking-tight',
    lg: 'text-2xl sm:text-3xl tracking-tight',
    xl: 'text-3xl sm:text-4xl tracking-tight'
  }[textSize]

  return (
    <div className={cn("flex items-center gap-2.5 select-none group cursor-pointer", className)}>
      {/* 3D PLAYFUL MASCOT BADGE IMAGE */}
      {showIcon && (
        <div className={cn(
          "relative flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 group-hover:scale-105 group-hover:-rotate-2 transition-all duration-300 ease-out border border-white/60 bg-gradient-to-br from-indigo-500 via-orange-500 to-amber-400 p-0.5",
          iconDimensions
        )}>
          <img
            src="/mascot/vocaburn_icon_badge.jpg"
            alt="Vocaburn Mascot"
            className="w-full h-full object-cover rounded-[inherit] transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              // Fallback to cute flame if image path issue
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* TYPOGRAPHY WORDMARK: VOCA + SPLIT [B] + URN */}
      {!iconOnly && showText && (
        <span className={cn(
          "font-black uppercase not-italic leading-none flex items-center font-sans tracking-tight drop-shadow-xs",
          textClasses
        )}>
          {/* 'VOCA' - KNOWLEDGE & NEW WORDS (CYAN / ELECTRIC INDIGO GRADIENT) */}
          <span className={cn(
            "font-black tracking-tight transition-colors duration-200 bg-gradient-to-r",
            variant === 'dark' 
              ? "from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent" 
              : "from-indigo-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_1px_8px_rgba(99,102,241,0.5)]"
          )}>
            VOCA
          </span>

          {/* 'B' - THE BRIDGE LETTER (HALF VOCAB BLUE / HALF FIRE ORANGE) */}
          <span
            className="font-black italic text-transparent bg-clip-text transition-all duration-200 scale-105 inline-block mx-[0.5px]"
            style={{
              backgroundImage: variant === 'dark'
                ? 'linear-gradient(90deg, #4f46e5 0%, #0284c7 46%, #ea580c 54%, #f97316 100%)'
                : 'linear-gradient(90deg, #38bdf8 0%, #818cf8 46%, #f97316 54%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(249,115,22,0.25))'
            }}
          >
            B
          </span>

          {/* 'URN' - BURNING ENERGY & STREAK (FIERY AMBER-ORANGE-RED GRADIENT) */}
          <span className="relative inline-flex items-center">
            <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500 bg-clip-text text-transparent font-black italic tracking-tight drop-shadow-[0_2px_10px_rgba(249,115,22,0.4)]">
              URN
            </span>
            <span className="absolute -top-1.5 -right-2.5 text-[9px] sm:text-[11px] text-amber-400 opacity-90 group-hover:opacity-100 group-hover:scale-135 group-hover:rotate-12 transition-all duration-300 pointer-events-none drop-shadow-sm">
              🔥
            </span>
          </span>
        </span>
      )}
    </div>
  )
}
export default VocaburnLogo
