import { cn } from '@/lib/utils'

interface VocaburnLogoProps {
  className?: string
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  size?: number | string
  textSize?: string
  variant?: 'dark' | 'light'
  showIcon?: boolean
  showText?: boolean
  iconOnly?: boolean
}

export function VocaburnLogo({
  className,
  iconSize = 'md',
  size
}: VocaburnLogoProps) {
  const dimensions = {
    xs: 'w-7 h-7',
    sm: 'w-8.5 h-8.5',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }[iconSize]

  return (
    <div className={cn("inline-flex items-center justify-center select-none group cursor-pointer", className)}>
      <div 
        className={cn(
          "relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 active:scale-95",
          dimensions
        )}
        style={size ? { width: size, height: size } : undefined}
      >
        <img
          src="/mascot/vocaburn_logo.jpg"
          alt="Vocaburn Mascot Logo"
          className="w-full h-full object-contain rounded-full drop-shadow-sm"
        />
      </div>
    </div>
  )
}

export default VocaburnLogo
