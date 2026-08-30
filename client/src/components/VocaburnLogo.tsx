import { cn } from '@/lib/utils'

interface VocaburnLogoProps {
  className?: string
  mode?: 'horizontal' | 'icon'
  height?: 'sm' | 'md' | 'lg' | 'xl'
  size?: number | string
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  textSize?: string
  variant?: 'dark' | 'light'
  showIcon?: boolean
  showText?: boolean
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

  // Prominent, well-proportioned heights for transparent PNG
  const heightClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-9.5 sm:h-10.5 md:h-11.5',
    lg: 'h-11 sm:h-13 md:h-14',
    xl: 'h-14 sm:h-18 md:h-20'
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
    <div className={cn("inline-flex items-center select-none group cursor-pointer", className)}>
      <div 
        className={cn(
          "relative flex items-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.03] active:scale-95",
          heightClasses
        )}
        style={size ? { height: size } : undefined}
      >
        <img
          src="/mascot/vocaburn_logo_transparent.png"
          alt="Vocaburn"
          className="h-full w-auto max-w-[220px] sm:max-w-[280px] md:max-w-[320px] object-contain drop-shadow-xs"
        />
      </div>
    </div>
  )
}

export default VocaburnLogo
