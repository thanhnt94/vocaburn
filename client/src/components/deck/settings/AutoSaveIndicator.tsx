import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RefreshCw, AlertCircle } from 'lucide-react'
import { useAutoSaveStore } from './useAutoSaveNotifier'

export function AutoSaveIndicator() {
  const { status, message } = useAutoSaveStore()

  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          key="autosave-indicator"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-3.5 right-4 sm:right-6 z-[120] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md text-xs font-black tracking-wide border pointer-events-none select-none"
          style={{
            backgroundColor:
              status === 'saving'
                ? 'rgba(15, 23, 42, 0.9)'
                : status === 'saved'
                ? 'rgba(16, 185, 129, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
            borderColor:
              status === 'saving'
                ? 'rgba(51, 65, 85, 0.8)'
                : status === 'saved'
                ? 'rgba(52, 211, 153, 0.8)'
                : 'rgba(248, 113, 113, 0.8)',
            color: '#FFFFFF',
          }}
        >
          {status === 'saving' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />}
          {status === 'saved' && <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[3]" />}
          {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AutoSaveIndicator
