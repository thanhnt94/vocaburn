import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

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

  const heightClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11 md:h-12',
    lg: 'h-12 sm:h-14 md:h-16',
    xl: 'h-16 sm:h-20 md:h-24'
  }[height]

  const textSizes = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl',
  }[height]
  
  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }[height]

  if (!isHorizontal) {
    return (
      <div className={cn("inline-flex items-center justify-center select-none group cursor-pointer", className)}>
        <div 
          className={cn(
            "relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95",
            heightClasses
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
    <div className={cn("inline-flex items-center select-none group cursor-pointer gap-2", className)}>
      <div 
        className={cn(
          "relative flex items-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.03] active:scale-95",
          heightClasses
        )}
        style={size ? { height: size } : undefined}
      >
        <img
          src="/mascot/vocaburn_mascot_transparent.png"
          alt="Vocaburn Mascot"
          className="h-full w-auto max-w-none object-contain drop-shadow-sm transition-transform duration-500 group-hover:rotate-6"
        />
      </div>
      <div 
        className={cn("font-bold tracking-tighter flex items-center pb-1", textSizes)}
        style={{ fontFamily: '"Fredoka", "Baloo 2", sans-serif', fontWeight: 700 }}
      >
        <span className="text-zinc-800 dark:text-zinc-100 tracking-tight">Voca</span>
        
        <span className="relative inline-flex items-center justify-center mx-[1px] group-hover:animate-pulse">
          {/* Outer glowing flame */}
          <Flame 
            className="absolute inset-0 m-auto text-orange-500/20 fill-orange-500/20 scale-[1.8] blur-[4px]"
            size={iconSizes} 
            strokeWidth={0}
          />
          {/* Inner bright flame */}
          <Flame 
            className="absolute inset-0 m-auto text-red-500 fill-orange-400 scale-[1.4] -translate-y-[10%]"
            size={iconSizes} 
            strokeWidth={1.5}
          />
          {/* The letter 'b' on top of the flame */}
          <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-100 to-orange-200 drop-shadow-md">
            b
          </span>
        </span>
        
        <span className="text-zinc-800 dark:text-zinc-100 tracking-tight">urn</span>
      </div>
    </div>
  )
}

export default VocaburnLogo
