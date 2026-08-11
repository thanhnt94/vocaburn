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
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl'
  }[textSize]

  return (
    <div className={cn("flex items-center gap-2.5 select-none group cursor-pointer", className)}>
      {showIcon && (
        <div className={cn(
          "relative flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:scale-105 group-hover:shadow-orange-500/45 transition-all duration-300 ease-out border border-white/25 overflow-hidden shrink-0",
          "bg-gradient-to-tr from-orange-500 via-red-500 to-amber-500",
          iconContainerSize
        )}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/25 pointer-events-none" />
          <Flame className={cn("relative z-10 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:scale-110", flameSize)} />
        </div>
      )}

      <span className={cn(
        "font-black tracking-tight uppercase not-italic leading-none flex items-center font-sans",
        textClasses
      )}>
        <span className={cn(
          "font-black tracking-tight transition-colors duration-200",
          variant === 'dark' ? "text-slate-900" : "text-white"
        )}>
          VOCA
        </span>
        <span className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 bg-clip-text text-transparent font-black ml-1 tracking-tight drop-shadow-[0_2px_8px_rgba(249,115,22,0.2)]">
          BURN
        </span>
      </span>
    </div>
  )
}
