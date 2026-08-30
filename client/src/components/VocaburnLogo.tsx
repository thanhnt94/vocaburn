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

  // Extra prominent, max-fill heights so the typography is large and bold on web
  const heightClasses = {
    sm: 'h-10 sm:h-11',
    md: 'h-12 sm:h-13 md:h-14',
    lg: 'h-14 sm:h-16 md:h-18',
    xl: 'h-20 sm:h-24 md:h-28'
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
