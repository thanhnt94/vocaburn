import React from 'react'
import { X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MemrisePetalHUDProps {
  stage: number
  bloomedCount: number
  totalCards: number
  sessionType?: 'plant' | 'water'
  onOpenQuitModal: () => void
}

const STAGE_CONFIGS: Record<number, { label: string; icon: string; petalCount: number; color: string; bg: string }> = {
  1: { label: 'Intro', icon: '🌱', petalCount: 1, color: 'text-amber-500', bg: 'bg-amber-500' },
  2: { label: 'Trắc nghiệm 1', icon: '🌿', petalCount: 2, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  3: { label: 'Trắc nghiệm 2', icon: '🪴', petalCount: 3, color: 'text-teal-500', bg: 'bg-teal-500' },
  4: { label: 'Luyện nghe', icon: '🌳', petalCount: 4, color: 'text-sky-500', bg: 'bg-sky-500' },
  5: { label: 'Gõ từ vựng', icon: '🌸', petalCount: 5, color: 'text-purple-500', bg: 'bg-purple-500' },
  6: { label: 'Nở hoa!', icon: '🌺', petalCount: 5, color: 'text-rose-500', bg: 'bg-rose-500' },
}

export const MemrisePetalHUD: React.FC<MemrisePetalHUDProps> = ({
  stage,
  bloomedCount,
  totalCards,
  sessionType = 'plant',
  onOpenQuitModal
}) => {
  const currentCfg = STAGE_CONFIGS[stage] || STAGE_CONFIGS[1]
  const pct = totalCards > 0 ? Math.round((bloomedCount / totalCards) * 100) : 0
  const isPlant = sessionType === 'plant'

  // Petal angles for 5 petals in a circle
  const petalAngles = [0, 72, 144, 216, 288]

  return (
    <header className="w-full shrink-0 relative z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shadow-xs select-none">
      {/* ── Top Micro Progress Track ── */}
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-rose-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* ── Quit / Pause Button ── */}
        <button
          type="button"
          onClick={onOpenQuitModal}
          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 rounded-2xl transition-all cursor-pointer text-slate-600 dark:text-slate-300"
          title="Tạm dừng phiên học"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Center: Session Progress Overview ── */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
            <span className="text-base">{isPlant ? '🌺' : '💧'}</span>
            <span>{isPlant ? 'Đã nở:' : 'Đã tưới:'}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{bloomedCount}</span>
            <span className="text-slate-400 font-medium">/ {totalCards} từ</span>
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
              {pct}%
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isPlant ? 'Memrise Planting' : 'Memrise Watering'}
          </span>
        </div>

        {/* ── Right: Flower Growth / Petal Indicator ── */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-xs">
          {/* Flower Visual with 5 Petals */}
          <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            {stage === 6 ? (
              <span className="text-xl animate-bounce">🌺</span>
            ) : (
              <svg viewBox="0 0 40 40" className="w-full h-full">
                {/* 5 Petals */}
                {petalAngles.map((angle, idx) => {
                  const isActive = idx < currentCfg.petalCount
                  const rad = (angle - 90) * (Math.PI / 180)
                  const cx = 20 + 9 * Math.cos(rad)
                  const cy = 20 + 9 * Math.sin(rad)
                  return (
                    <circle
                      key={angle}
                      cx={cx}
                      cy={cy}
                      r="4.5"
                      className={cn(
                        "transition-all duration-300",
                        isActive
                          ? "fill-rose-500 stroke-rose-600"
                          : "fill-slate-200 dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-600"
                      )}
                      strokeWidth="1"
                    />
                  )
                })}
                {/* Flower Center Core */}
                <circle
                  cx="20"
                  cy="20"
                  r="5"
                  className={cn(
                    "transition-all duration-300",
                    currentCfg.petalCount > 0 ? "fill-amber-400 stroke-amber-500" : "fill-slate-300 dark:fill-slate-600"
                  )}
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </div>

          {/* Stage Label & Petal Count */}
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">
              {stage === 6 ? 'Đã nở hoa!' : `Cánh ${currentCfg.petalCount}/5`}
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 leading-tight">
              {currentCfg.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
