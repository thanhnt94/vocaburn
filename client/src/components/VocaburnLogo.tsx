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

  const heightClasses = {
    xs: 'h-5 sm:h-6',
    sm: 'h-6 sm:h-7',
    md: 'h-[30px] sm:h-[34px]',
    lg: 'h-9 sm:h-11',
    xl: 'h-12 sm:h-14 md:h-16'
  }[height] || 'h-[30px] sm:h-[34px]'

  if (!isHorizontal) {
    return (
      <div className={cn('inline-flex items-center justify-center select-none group cursor-pointer', className)}>
        <div
          className={cn(
            'relative aspect-square shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95',
            heightClasses
          )}
          style={size ? { width: size, height: size } : undefined}
        >
          <img
            src="/mascot/vocaburn_icon_modern.png"
            alt="Vocaburn"
            className="w-full h-full object-contain drop-shadow-xs"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('inline-flex items-center select-none group cursor-pointer', className)}>
      <div
        className={cn(
          'relative flex items-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.02] active:scale-95 dark:bg-white/95 dark:px-2 dark:py-0.5 dark:rounded-xl',
          heightClasses
        )}
        style={size ? { height: size } : undefined}
      >
        <img
          src="/mascot/vocaburn_logo_modern.png"
          alt="Vocaburn"
          className="h-full w-auto max-w-none object-contain"
        />
      </div>
    </div>
  )
}

export default VocaburnLogo
