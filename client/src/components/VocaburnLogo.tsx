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
  const isHorizontal = mode === 'horizontal' && !iconOnly

  // Compact, balanced & cute heights for modern app UI
  const heightClasses = {
    xs: 'h-6 sm:h-7',             // 24px - 28px (ultra compact)
    sm: 'h-7 sm:h-8',             // 28px - 32px (small)
    md: 'h-[38px] sm:h-[40px]',    // 38px - 40px (fills compact bar with big, readable letters)
    lg: 'h-11 sm:h-12',           // 44px - 48px
    xl: 'h-14 sm:h-16 md:h-20'    // 56px - 80px
  }[height] || 'h-[38px] sm:h-[40px]'

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
    <div className={cn("inline-flex items-center select-none group cursor-pointer", className)}>
      <div 
        className={cn(
          "relative flex items-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.02] active:scale-95",
          heightClasses
        )}
        style={size ? { height: size } : undefined}
      >
        <img
          src="/mascot/vocaburn_logo_transparent.png"
          alt="Vocaburn"
          className="h-full w-auto max-w-none object-contain drop-shadow-xs"
        />
      </div>
    </div>
  )
}

export default VocaburnLogo
