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

  const heightClasses = {
    sm: 'h-7 sm:h-8',
    md: 'h-8.5 sm:h-9.5 md:h-10.5',
    lg: 'h-10.5 sm:h-12 md:h-13',
    xl: 'h-14 sm:h-16 md:h-18'
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
            src="/mascot/vocaburn_logo.jpg"
            alt="Vocaburn Mascot"
            className="w-full h-full object-contain drop-shadow-sm rounded-full"
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
          src="/mascot/vocaburn_horizontal_logo.jpg"
          alt="Vocaburn"
          className="h-full w-auto max-w-[200px] sm:max-w-[260px] object-contain drop-shadow-xs mix-blend-multiply"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/mascot/vocaburn_brand_banner.jpg';
          }}
        />
      </div>
    </div>
  )
}

export default VocaburnLogo
