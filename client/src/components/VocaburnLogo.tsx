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
    <div className={cn("flex items-center gap-2 select-none group", className)}>
      {showIcon && (
        <div className={cn(
          "flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300",
          "bg-gradient-to-tr from-orange-500 via-red-500 to-amber-500",
          iconContainerSize
        )}>
          <Flame className={cn("fill-white text-white drop-shadow-xs", flameSize)} />
        </div>
      )}

      <span className={cn(
        "font-black tracking-wider uppercase italic leading-none flex items-center",
        textClasses
      )}>
        <span className={variant === 'dark' ? "text-slate-900" : "text-white"}>
          VOCA
        </span>
        <span className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 bg-clip-text text-transparent font-black ml-0.5">
          BURN
        </span>
      </span>
    </div>
  )
}
