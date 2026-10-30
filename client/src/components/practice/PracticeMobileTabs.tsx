import React, { useRef } from 'react';
import { LayoutGrid, BookOpen, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PracticeMobileTabsProps {
  activeBottomTab: 'map' | 'flashcard' | 'stats';
  onTabChange: (tab: 'map' | 'flashcard' | 'stats') => void;
  onOpenSettings?: () => void;
}

export const PracticeMobileTabs: React.FC<PracticeMobileTabsProps> = ({
  activeBottomTab,
  onTabChange,
  onOpenSettings
}) => {
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const handleBarTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    touchStartYRef.current = clientY;
    touchStartXRef.current = clientX;
  };

  const handleBarTouchEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (touchStartYRef.current === null) return;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.PointerEvent).clientY;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.PointerEvent).clientX;
    const deltaY = touchStartYRef.current - clientY;
    const deltaX = Math.abs(clientX - (touchStartXRef.current || 0));
    touchStartYRef.current = null;
    touchStartXRef.current = null;

    if (deltaY > 35 && deltaY > deltaX * 0.8) {
      onOpenSettings?.();
    }
  };

  return (
    <div 
      onTouchStart={handleBarTouchStart}
      onTouchEnd={handleBarTouchEnd}
      onPointerDown={handleBarTouchStart}
      onPointerUp={handleBarTouchEnd}
      className="w-full h-12 grid grid-cols-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-0 relative md:hidden select-none touch-pan-x"
      title="Swipe up for Quick Settings"
    >
      {/* Subtle Pull-up Indicator Pill */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onOpenSettings?.();
        }}
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-1.5 rounded-full bg-slate-300/90 dark:bg-slate-600 cursor-pointer hover:bg-slate-400 active:scale-95 transition-all z-20"
        title="Swipe up or tap for Quick Settings"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTabChange('map');
        }}
        className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
        title="Card map"
      >
        {activeBottomTab === 'map' && (
          <motion.div
            layoutId="activeBottomTabBgPractice"
            className="absolute inset-0 bg-amber-500/10 dark:bg-amber-500/20"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
          activeBottomTab === 'map' ? "text-amber-600 dark:text-amber-400 font-black" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
        )}>
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          MAP
        </span>
      </button>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onTabChange('flashcard');
        }}
        className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
        title="Current progress"
      >
        {activeBottomTab === 'flashcard' && (
          <motion.div
            layoutId="activeBottomTabBgPractice"
            className="absolute inset-0 bg-amber-500/10 dark:bg-amber-500/20"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
          activeBottomTab === 'flashcard' ? "text-amber-600 dark:text-amber-400 font-black" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
        )}>
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          PLAY
        </span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onTabChange('stats');
        }}
        className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
        title="Session stats"
      >
        {activeBottomTab === 'stats' && (
          <motion.div
            layoutId="activeBottomTabBgPractice"
            className="absolute inset-0 bg-amber-500/10 dark:bg-amber-500/20"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
          activeBottomTab === 'stats' ? "text-amber-600 dark:text-amber-400 font-black" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
        )}>
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          STATS
        </span>
      </button>
    </div>
  );
};
