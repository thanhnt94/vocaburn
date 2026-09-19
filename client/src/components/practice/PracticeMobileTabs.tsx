import React from 'react';
import { LayoutGrid, BookOpen, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PracticeMobileTabsProps {
  activeBottomTab: 'map' | 'flashcard' | 'stats';
  onTabChange: (tab: 'map' | 'flashcard' | 'stats') => void;
}

export const PracticeMobileTabs: React.FC<PracticeMobileTabsProps> = ({
  activeBottomTab,
  onTabChange
}) => {
  return (
    <div className="w-full grid grid-cols-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-0 relative md:hidden">
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
