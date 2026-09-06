import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RotateCcw as ResetIcon,
  Crop,
  Check,
  X,
  Loader2
} from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ImageCropModalProps {
  isOpen: boolean
  imageSrc: string
  originalFileName?: string
  onClose: () => void
  onConfirm: (processedFile: File) => Promise<void> | void
  isUploading?: boolean
}

interface CropArea {
  x: number // percentage 0-100
  y: number // percentage 0-100
  width: number // percentage 0-100
  height: number // percentage 0-100
}

type AspectRatioPreset = 'free' | '1:1' | '4:3' | '16:9' | 'original'

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  originalFileName,
  onClose,
  onConfirm,
  isUploading = false
}) => {
  const [rotation, setRotation] = useState<number>(0)
  const [flipH, setFlipH] = useState<boolean>(false)
  const [flipV, setFlipV] = useState<boolean>(false)
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('free')
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 })
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Dragging state
  const [dragMode, setDragMode] = useState<'move' | string | null>(null)
  const dragStartRef = useRef<{
    clientX: number
    clientY: number
    crop: CropArea
  }>({ clientX: 0, clientY: 0, crop: { x: 0, y: 0, width: 100, height: 100 } })

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageObjRef = useRef<HTMLImageElement | null>(null)

  // Reset all adjustments when a new image is loaded
  useEffect(() => {
    if (!isOpen || !imageSrc) return

    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setAspectPreset('free')
    setCrop({ x: 0, y: 0, width: 100, height: 100 })

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageObjRef.current = img
      renderPreview()
    }
    img.src = imageSrc
  }, [isOpen, imageSrc])

  // Re-render preview canvas when rotation, flip or image changes
  const renderPreview = useCallback(() => {
    const img = imageObjRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const isSwap = rotation === 90 || rotation === 270
    const rotW = isSwap ? img.naturalHeight : img.naturalWidth
    const rotH = isSwap ? img.naturalWidth : img.naturalHeight

    // Compute preview display size inside max dimensions (e.g. 560 x 380)
    const maxW = 560
    const maxH = 380
    const scale = Math.min(maxW / rotW, maxH / rotH, 1)

    const displayW = Math.round(rotW * scale)
    const displayH = Math.round(rotH * scale)

    canvas.width = displayW
    canvas.height = displayH

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, displayW, displayH)
    ctx.save()

    // Translate to center
    ctx.translate(displayW / 2, displayH / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)

    // Draw image centered
    const drawW = isSwap ? displayH : displayW
    const drawH = isSwap ? displayW : displayH
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

    ctx.restore()
  }, [rotation, flipH, flipV])

  useEffect(() => {
    renderPreview()
  }, [renderPreview])

  // Handle aspect ratio preset change
  const handleApplyPreset = (preset: AspectRatioPreset) => {
    setAspectPreset(preset)
    const img = imageObjRef.current
    if (!img) return

    const isSwap = rotation === 90 || rotation === 270
    const rotW = isSwap ? img.naturalHeight : img.naturalWidth
    const rotH = isSwap ? img.naturalWidth : img.naturalHeight

    if (preset === 'free') {
      return
    }

    let targetRatio = 1
    if (preset === '1:1') targetRatio = 1
    else if (preset === '4:3') targetRatio = 4 / 3
    else if (preset === '16:9') targetRatio = 16 / 9
    else if (preset === 'original') targetRatio = rotW / rotH

    const currentImgRatio = rotW / rotH

    let newWidth = 100
    let newHeight = 100

    if (targetRatio > currentImgRatio) {
      newWidth = 100
      newHeight = Math.min(100, (currentImgRatio / targetRatio) * 100)
    } else {
      newHeight = 100
      newWidth = Math.min(100, (targetRatio / currentImgRatio) * 100)
    }

    const newX = Math.max(0, (100 - newWidth) / 2)
    const newY = Math.max(0, (100 - newHeight) / 2)

    setCrop({
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10,
      width: Math.round(newWidth * 10) / 10,
      height: Math.round(newHeight * 10) / 10
    })
  }

  // Rotate handlers
  const handleRotateCW = () => {
    setRotation((prev) => (prev + 90) % 360)
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
    setAspectPreset('free')
  }

  const handleRotateCCW = () => {
    setRotation((prev) => (prev + 270) % 360)
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
    setAspectPreset('free')
  }

  const handleFlipHorizontal = () => setFlipH((prev) => !prev)
  const handleFlipVertical = () => setFlipV((prev) => !prev)

  const handleReset = () => {
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setAspectPreset('free')
    setCrop({ x: 0, y: 0, width: 100, height: 100 })
  }

  // Pointer drag start
  const handlePointerDown = (mode: 'move' | string, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragMode(mode)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      crop: { ...crop }
    }
  }

  // Window pointer move and up listeners
  useEffect(() => {
    if (!dragMode) return

    const handlePointerMove = (e: PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dx = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100
      const dy = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100
      const init = dragStartRef.current.crop

      if (dragMode === 'move') {
        const nextX = Math.min(Math.max(0, init.x + dx), 100 - init.width)
        const nextY = Math.min(Math.max(0, init.y + dy), 100 - init.height)
        setCrop((prev) => ({ ...prev, x: nextX, y: nextY }))
      } else if (dragMode === 'se') {
        const nextW = Math.min(Math.max(10, init.width + dx), 100 - init.x)
        const nextH = Math.min(Math.max(10, init.height + dy), 100 - init.y)
        setCrop((prev) => ({ ...prev, width: nextW, height: nextH }))
      } else if (dragMode === 'sw') {
        const nextX = Math.min(Math.max(0, init.x + dx), init.x + init.width - 10)
        const nextW = init.width + (init.x - nextX)
        const nextH = Math.min(Math.max(10, init.height + dy), 100 - init.y)
        setCrop({ x: nextX, y: init.y, width: nextW, height: nextH })
      } else if (dragMode === 'ne') {
        const nextY = Math.min(Math.max(0, init.y + dy), init.y + init.height - 10)
        const nextH = init.height + (init.y - nextY)
        const nextW = Math.min(Math.max(10, init.width + dx), 100 - init.x)
        setCrop({ x: init.x, y: nextY, width: nextW, height: nextH })
      } else if (dragMode === 'nw') {
        const nextX = Math.min(Math.max(0, init.x + dx), init.x + init.width - 10)
        const nextW = init.width + (init.x - nextX)
        const nextY = Math.min(Math.max(0, init.y + dy), init.y + init.height - 10)
        const nextH = init.height + (init.y - nextY)
        setCrop({ x: nextX, y: nextY, width: nextW, height: nextH })
      } else if (dragMode === 's') {
        const nextH = Math.min(Math.max(10, init.height + dy), 100 - init.y)
        setCrop((prev) => ({ ...prev, height: nextH }))
      } else if (dragMode === 'e') {
        const nextW = Math.min(Math.max(10, init.width + dx), 100 - init.x)
        setCrop((prev) => ({ ...prev, width: nextW }))
      } else if (dragMode === 'n') {
        const nextY = Math.min(Math.max(0, init.y + dy), init.y + init.height - 10)
        const nextH = init.height + (init.y - nextY)
        setCrop((prev) => ({ ...prev, y: nextY, height: nextH }))
      } else if (dragMode === 'w') {
        const nextX = Math.min(Math.max(0, init.x + dx), init.x + init.width - 10)
        const nextW = init.width + (init.x - nextX)
        setCrop((prev) => ({ ...prev, x: nextX, width: nextW }))
      }
    }

    const handlePointerUp = () => {
      setDragMode(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragMode])

  // Final confirmation: Render full-resolution cropped canvas & send Blob
  const handleConfirm = async () => {
    const img = imageObjRef.current
    if (!img) return

    setIsProcessing(true)
    try {
      const isSwap = rotation === 90 || rotation === 270
      const rotW = isSwap ? img.naturalHeight : img.naturalWidth
      const rotH = isSwap ? img.naturalWidth : img.naturalHeight

      // Step 1: Render full rotated image on offscreen canvas
      const rotCanvas = document.createElement('canvas')
      rotCanvas.width = rotW
      rotCanvas.height = rotH
      const rCtx = rotCanvas.getContext('2d')
      if (!rCtx) throw new Error('Could not create 2D canvas context')

      rCtx.translate(rotW / 2, rotH / 2)
      rCtx.rotate((rotation * Math.PI) / 180)
      rCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      rCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

      // Step 2: Slice cropped region to final canvas
      const cropPixelX = Math.round((crop.x / 100) * rotW)
      const cropPixelY = Math.round((crop.y / 100) * rotH)
      const cropPixelW = Math.max(1, Math.round((crop.width / 100) * rotW))
      const cropPixelH = Math.max(1, Math.round((crop.height / 100) * rotH))

      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = cropPixelW
      finalCanvas.height = cropPixelH
      const fCtx = finalCanvas.getContext('2d')
      if (!fCtx) throw new Error('Could not create final canvas context')

      fCtx.drawImage(
        rotCanvas,
        cropPixelX,
        cropPixelY,
        cropPixelW,
        cropPixelH,
        0,
        0,
        cropPixelW,
        cropPixelH
      )

      // Step 3: Convert to Blob & wrap in File
      const isPng = originalFileName?.toLowerCase().endsWith('.png')
      const mime = isPng ? 'image/png' : 'image/webp'
      const ext = isPng ? 'png' : 'webp'

      finalCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsProcessing(false)
            return
          }
          const cleanName = originalFileName
            ? `cropped-${originalFileName.replace(/\.[^/.]+$/, '')}.${ext}`
            : `cropped-image-${Date.now()}.${ext}`

          const file = new File([blob], cleanName, { type: mime })
          try {
            await onConfirm(file)
            onClose()
          } finally {
            setIsProcessing(false)
          }
        },
        mime,
        0.92
      )
    } catch (err) {
      console.error('[ImageCropModal] Render error:', err)
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  const busy = isUploading || isProcessing

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Preview & Edit Image</h3>
              <p className="text-[11px] text-slate-400 font-medium">Crop, rotate, and adjust before uploading</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 min-h-[260px] sm:min-h-[340px] max-h-[50vh] sm:max-h-[55vh] bg-slate-950 flex items-center justify-center p-4 select-none overflow-hidden">
          {/* Transparent Grid Pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
            }}
          />

          {/* Canvas & Overlay Container */}
          <div
            ref={containerRef}
            className="relative inline-block max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl border border-slate-700/50"
          >
            <canvas ref={canvasRef} className="block max-w-full max-h-[46vh] object-contain" />

            {/* Interactive Crop Box Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                onPointerDown={(e) => handlePointerDown('move', e)}
                className="absolute border-2 border-indigo-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.72)] cursor-move pointer-events-auto"
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`
                }}
              >
                {/* 3x3 Rule of Thirds Grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-white/60" />
                  <div className="border-r border-white/60" />
                  <div />
                </div>

                {/* 4 Corner Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown('nw', e)}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-xs cursor-nwse-resize shadow-md"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('ne', e)}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-xs cursor-nesw-resize shadow-md"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('sw', e)}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-xs cursor-nesw-resize shadow-md"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('se', e)}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-xs cursor-nwse-resize shadow-md"
                />

                {/* 4 Edge Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown('n', e)}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white/90 rounded-full cursor-ns-resize border border-indigo-600"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('s', e)}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white/90 rounded-full cursor-ns-resize border border-indigo-600"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('w', e)}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-white/90 rounded-full cursor-ew-resize border border-indigo-600"
                />
                <div
                  onPointerDown={(e) => handlePointerDown('e', e)}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-white/90 rounded-full cursor-ew-resize border border-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Presets */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-900/95 space-y-2.5 shrink-0">
          {/* Aspect Ratio Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aspect Ratio:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'free', label: 'Free' },
                  { id: '1:1', label: '1:1 Square' },
                  { id: '4:3', label: '4:3' },
                  { id: '16:9', label: '16:9' },
                  { id: 'original', label: 'Original' }
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  disabled={busy}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer",
                    aspectPreset === preset.id
                      ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/20"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transformation Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleRotateCCW}
                disabled={busy}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Rotate 90° Left"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate Left</span>
              </button>
              <button
                type="button"
                onClick={handleRotateCW}
                disabled={busy}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Rotate 90° Right"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate Right</span>
              </button>
              <button
                type="button"
                onClick={handleFlipHorizontal}
                disabled={busy}
                className={cn(
                  "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  flipH
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white"
                )}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Flip H</span>
              </button>
              <button
                type="button"
                onClick={handleFlipVertical}
                disabled={busy}
                className={cn(
                  "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  flipV
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white"
                )}
                title="Flip Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Flip V</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
              title="Reset Adjustments"
            >
              <ResetIcon className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg transition-all cursor-pointer",
              busy
                ? "bg-indigo-700 opacity-80 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 active:scale-97 shadow-indigo-600/30"
            )}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Uploading Image...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Upload Image</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
