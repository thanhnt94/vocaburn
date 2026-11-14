import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface OverdriveStrikeOverlayProps {
  isVisible: boolean
}

export const OverdriveStrikeOverlay: React.FC<OverdriveStrikeOverlayProps> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <div className="pointer-events-none fixed inset-0 z-[1999] border-[8px] border-amber-400/50 shadow-[inset_0_0_100px_rgba(245,158,11,0.4)] animate-pulse flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] uppercase text-center"
          >
            ⚡ OVERDRIVE STRIKE! ⚡
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default OverdriveStrikeOverlay
