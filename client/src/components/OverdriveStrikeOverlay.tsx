import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface OverdriveStrikeOverlayProps {
  isVisible: boolean
}

export const OverdriveStrikeOverlay: React.FC<OverdriveStrikeOverlayProps> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <div className="pointer-events-none fixed inset-0 z-[1999] shadow-[inset_0_0_50px_rgba(245,158,11,0.15)] flex items-start justify-center pt-12 md:pt-14">
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: [0.92, 1.04, 1] }}
            exit={{ y: -16, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 backdrop-blur-md border border-amber-300/50 shadow-[0_4px_20px_rgba(245,158,11,0.35)] flex items-center gap-1.5"
          >
            <span className="text-xs md:text-sm font-extrabold tracking-wider text-white uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex items-center gap-1.5">
              <span className="text-amber-200">⚡</span>
              OVERDRIVE STRIKE!
              <span className="text-amber-200">⚡</span>
            </span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default OverdriveStrikeOverlay
