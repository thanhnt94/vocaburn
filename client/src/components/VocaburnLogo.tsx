import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VocaburnLogoProps {
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
  textSize?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'dark' | 'light'
  showIcon?: boolean
}

export function VocaburnLogo({
  className,
  iconSize = 'md',
  textSize = 'md',
  variant = 'dark',
  showIcon = true
}: VocaburnLogoProps) {
  const iconContainerSize = {
    sm: 'w-7 h-7 rounded-xl',
    md: 'w-8.5 h-8.5 rounded-2xl',
    lg: 'w-10 h-10 rounded-2xl'
  }[iconSize]

  const flameSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }[iconSize]

  const textClasses = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl'
  }[textSize]

  return (
    <div className={cn("flex items-center gap-2 select-none group cursor-pointer", className)}>
      {showIcon && (
        <div className={cn(
          "relative flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 group-hover:shadow-orange-500/40 transition-all duration-300 ease-out border border-white/30 overflow-hidden shrink-0",
          "bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500",
          iconContainerSize
        )}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/30 pointer-events-none" />
          <Flame className={cn("relative z-10 fill-amber-100 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:scale-110", flameSize)} />
        </div>
      )}

      {/* UNIFIED WORDMARK: VOCAB (CORE ROOT) + URN (BURNING ENERGY) */}
      <span className={cn(
        "font-black tracking-[-0.03em] uppercase not-italic leading-none flex items-center font-sans",
        textClasses
      )}>
        {/* VOCAB ROOT WORD */}
        <span className={cn(
          "font-black transition-colors duration-200",
          variant === 'dark' ? "text-slate-900" : "text-white"
        )}>
          VOCAB
        </span>

        {/* URN BURNING TAIL */}
        <span className="relative inline-flex items-center">
          <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-red-500 bg-clip-text text-transparent font-black italic tracking-tight drop-shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
            URN
          </span>
          <span className="absolute -top-1 -right-2 text-[8px] sm:text-[9px] text-amber-400 opacity-80 group-hover:opacity-100 group-hover:scale-125 transition-all pointer-events-none">
            🔥
          </span>
        </span>
      </span>
    </div>
  )
}
