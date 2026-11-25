import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div
      aria-live="polite"
      className="fixed top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const isSuccess = item.type === 'success'
          const isError = item.type === 'error'
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              onClick={() => dismiss(item.id)}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 max-w-sm w-auto px-3.5 py-2.5 rounded-2xl border shadow-xl backdrop-blur-xl cursor-pointer select-none',
                isSuccess && 'bg-emerald-600/95 border-emerald-400/50 text-white shadow-emerald-900/20',
                isError && 'bg-rose-600/95 border-rose-400/50 text-white shadow-rose-900/20',
                !isSuccess && !isError && 'bg-slate-900/92 border-slate-700/60 text-white shadow-slate-900/25'
              )}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-100" />
              ) : isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-100" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-orange-300" />
              )}
              <span className="text-xs font-bold leading-snug">{item.message}</span>
              <X className="w-3.5 h-3.5 shrink-0 opacity-70 ml-0.5" />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
