import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export interface QuitSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmQuit: () => void
}

export const QuitSessionModal: React.FC<QuitSessionModalProps> = ({
  isOpen,
  onClose,
  onConfirmQuit
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-400"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                <X className="w-8 h-8 text-rose-500" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">End Study Session?</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                Exiting now will clear the current state of this study session. Are you sure you want to exit?
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={onClose}
                  className="py-4 bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  KEEP STUDYING
                </button>
                <button 
                  onClick={onConfirmQuit}
                  className="py-4 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all cursor-pointer"
                >
                  CONFIRM EXIT
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
