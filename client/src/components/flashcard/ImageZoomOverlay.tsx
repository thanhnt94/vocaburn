import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ImageZoomOverlayProps {
  zoomedImage: string | null
  onClose: () => void
}

export const ImageZoomOverlay: React.FC<ImageZoomOverlayProps> = ({
  zoomedImage,
  onClose
}) => {
  return (
    <AnimatePresence>
      {zoomedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md cursor-zoom-out p-4"
        >
          <motion.img
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            src={zoomedImage}
            alt="Zoomed Visual"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
