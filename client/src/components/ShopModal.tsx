import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, X, ShoppingBag, CheckCircle, AlertCircle, Info, Sparkles, Lock } from 'lucide-react'
import axios from 'axios'
import confetti from 'canvas-confetti'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchaseSuccess?: () => void
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onPurchaseSuccess }) => {
  const [streakPoints, setStreakPoints] = useState<number>(0)
  const [freezeCount, setFreezeCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isBuying, setIsBuying] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchShopStatus = async () => {
    try {
      setIsLoading(true)
      const res = await axios.get('/api/v1/gamification/shop/status')
      if (res.data) {
        setStreakPoints(res.data.streak_points || 0)
        setFreezeCount(res.data.streak_freeze_count || 0)
      }
    } catch (err) {
      console.error("Failed to fetch shop status:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setFeedback(null)
      fetchShopStatus()
    }
  }, [isOpen])

  const handleBuyFreeze = async () => {
    if (streakPoints < 10 || freezeCount >= 2 || isBuying) return

    try {
      setIsBuying(true)
      setFeedback(null)
      const res = await axios.post('/api/v1/gamification/shop/buy-freeze')
      if (res.data && res.data.success) {
        setStreakPoints(res.data.streak_points)
        setFreezeCount(res.data.streak_freeze_count)
        setFeedback({ type: 'success', message: res.data.message })
        
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        })

        if (onPurchaseSuccess) onPurchaseSuccess()
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Unable to purchase Streak Freeze at this time."
      setFeedback({ type: 'error', message: errMsg })
    } finally {
      setIsBuying(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/20 rounded-3xl shadow-2xl overflow-hidden text-white"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  Rewards Shop
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Streak Protection
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Accumulate reward points to redeem Streak Freeze cards</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Balance Overview Card */}
          <div className="px-6 pt-5 pb-2">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/25 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">Available Reward Points</span>
                  <div className="text-2xl font-black text-amber-300 tracking-tight flex items-baseline gap-1">
                    {isLoading ? '...' : streakPoints}
                    <span className="text-xs font-normal text-amber-200/60">⚡ Pts</span>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-800" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
                  <Shield className="w-5 h-5 fill-sky-400/30" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300/80">Streak Freeze Vault</span>
                  <div className="text-2xl font-black text-sky-300 tracking-tight flex items-baseline gap-1">
                    {isLoading ? '...' : `${freezeCount}/2`}
                    <span className="text-xs font-normal text-sky-200/60">Cards</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div className="px-6 py-2">
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                feedback.type === 'success' 
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/50 border-rose-500/30 text-rose-300'
              }`}>
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{feedback.message}</span>
              </div>
            </div>
          )}

          {/* Item Card: Streak Freeze */}
          <div className="px-6 py-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
                  <Shield className="w-6 h-6 fill-white/20" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    Streak Freeze Card
                    {freezeCount >= 2 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                        Vault Full
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Automatically preserves your streak if you miss a study day. Stores up to 2 cards.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" /> 10 Pts
                    </span>
                    <span className="text-slate-600 text-xs">•</span>
                    <span className="text-[11px] text-slate-400">Protects 1 missed day</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBuyFreeze}
                disabled={streakPoints < 10 || freezeCount >= 2 || isBuying}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center gap-2 transition-all ${
                  freezeCount >= 2
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : streakPoints < 10
                    ? 'bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 active:scale-95'
                }`}
              >
                {isBuying ? (
                  <span className="animate-pulse">Redeeming...</span>
                ) : freezeCount >= 2 ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Vault Full
                  </>
                ) : streakPoints < 10 ? (
                  <>Requires 10 ⚡</>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" /> Redeem Freeze (10 ⚡)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Point Earning Guidelines */}
          <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/80 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Reward Rules & Streak Protection</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400 pl-6 list-disc">
              <li>Complete <strong>100% of daily study target</strong> (20 cards): <strong>+1 ⚡ Reward Point</strong>.</li>
              <li>Exceed <strong>200% of daily target</strong> (40 cards): Bonus <strong>+1 ⚡ Reward Point</strong>.</li>
              <li>Automatically preserves your streak when you miss a study day (up to 2 days).</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
