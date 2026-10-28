import React, { useState } from 'react'
import { Maximize2, Image as ImageIcon, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CardImageGalleryProps {
  images: string[]
  onZoom?: (url: string) => void
  className?: string
  maxHeight?: string
  layout?: 'grid' | 'carousel' | 'stacked'
  badgePrefix?: string
}

export const CardImageGallery: React.FC<CardImageGalleryProps> = ({
  images = [],
  onZoom,
  className,
  maxHeight = 'max-h-48 md:max-h-60',
  layout = 'grid',
  badgePrefix
}) => {
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({})

  // Filter out failed images
  const validImages = images.filter((_, idx) => !failedIndices[idx])

  if (validImages.length === 0) {
    return null
  }

  const handleImageError = (index: number) => {
    setFailedIndices(prev => ({ ...prev, [index]: true }))
  }

  // Single Image Display
  if (validImages.length === 1) {
    const url = validImages[0]
    return (
      <div className={cn("relative group flex justify-center w-full my-2", className)}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 p-1 shadow-sm transition-all duration-300 hover:shadow-md">
          <img
            src={url}
            alt="Card visual"
            onError={() => handleImageError(0)}
            onClick={() => onZoom && onZoom(url)}
            className={cn(
              "w-auto object-contain rounded-xl cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]",
              maxHeight
            )}
          />
          {onZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onZoom(url)
              }}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer"
              title="Zoom image"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {badgePrefix && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs text-[9px] font-bold uppercase tracking-wider">
              {badgePrefix}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Two Images Display (Side-by-Side Grid)
  if (validImages.length === 2) {
    return (
      <div className={cn("w-full max-w-xl mx-auto my-2", className)}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {validImages.map((url, idx) => (
            <div
              key={`${url}_${idx}`}
              className="relative group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 p-1 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col justify-center items-center aspect-4/3"
            >
              <img
                src={url}
                alt={`Card visual #${idx + 1}`}
                onError={() => handleImageError(idx)}
                onClick={() => onZoom && onZoom(url)}
                className="w-full h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white backdrop-blur-xs text-[9px] font-black uppercase tracking-wider border border-white/10 shadow-xs">
                #{idx + 1}
              </span>
              {onZoom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onZoom(url)
                  }}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer"
                  title="Zoom image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Three Images Display (1 Hero Image + 2 Secondary Images below, or 3-col grid on wide screens)
  if (validImages.length === 3) {
    return (
      <div className={cn("w-full max-w-xl mx-auto my-2 space-y-2", className)}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Item 1 */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 p-1 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col justify-center items-center aspect-4/3 sm:aspect-auto sm:h-36">
            <img
              src={validImages[0]}
              alt="Card visual #1"
              onError={() => handleImageError(0)}
              onClick={() => onZoom && onZoom(validImages[0])}
              className="w-full h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-indigo-600/90 text-white backdrop-blur-xs text-[9px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
              #1
            </span>
            {onZoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onZoom(validImages[0])
                }}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Item 2 */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 p-1 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col justify-center items-center aspect-4/3 sm:aspect-auto sm:h-36">
            <img
              src={validImages[1]}
              alt="Card visual #2"
              onError={() => handleImageError(1)}
              onClick={() => onZoom && onZoom(validImages[1])}
              className="w-full h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white backdrop-blur-xs text-[9px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
              #2
            </span>
            {onZoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onZoom(validImages[1])
                }}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Item 3 */}
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 p-1 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col justify-center items-center aspect-4/3 sm:aspect-auto sm:h-36">
            <img
              src={validImages[2]}
              alt="Card visual #3"
              onError={() => handleImageError(2)}
              onClick={() => onZoom && onZoom(validImages[2])}
              className="w-full h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-sky-600/90 text-white backdrop-blur-xs text-[9px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
              #3
            </span>
            {onZoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onZoom(validImages[2])
                }}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 4 or more Images Display (2x2 Grid)
  return (
    <div className={cn("w-full max-w-xl mx-auto my-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        {validImages.slice(0, 4).map((url, idx) => (
          <div
            key={`${url}_${idx}`}
            className="relative group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 p-1 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col justify-center items-center aspect-4/3"
          >
            <img
              src={url}
              alt={`Card visual #${idx + 1}`}
              onError={() => handleImageError(idx)}
              onClick={() => onZoom && onZoom(url)}
              className="w-full h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white backdrop-blur-xs text-[9px] font-black uppercase tracking-wider border border-white/10 shadow-xs">
              #{idx + 1}
            </span>
            {idx === 3 && validImages.length > 4 && (
              <div
                onClick={() => onZoom && onZoom(url)}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-white font-black text-sm rounded-xl cursor-pointer hover:bg-slate-950/80 transition-colors"
              >
                +{validImages.length - 4} more
              </div>
            )}
            {onZoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onZoom(url)
                }}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CardImageGallery
