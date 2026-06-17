import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Target, Trophy, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import DailyComparisonChart from './DailyComparisonChart'

interface PlayStatsDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeStatsTab: 'performance' | 'goals' | 'leaderboard'
  setActiveStatsTab: (tab: 'performance' | 'goals' | 'leaderboard') => void
  dailyComparisonData: any[]
  dailyComparisonAvg?: any
  isDailyComparisonLoading: boolean
  activeGoal: any
  activeMode?: string
  gamify: {
    streak: number
    level: number
    xp: number
  }
  xpLeaderboard: {
    list?: any[]
  }
  userRank: number
  leaderboardMsg: string
  user: any
  sessionStatsNode?: React.ReactNode
  practiceStatsNode?: React.ReactNode
}

export const PlayStatsDrawer: React.FC<PlayStatsDrawerProps> = ({
  isOpen,
  onClose,
  activeStatsTab,
  setActiveStatsTab,
  dailyComparisonData,
  dailyComparisonAvg,
  isDailyComparisonLoading,
  activeGoal,
  activeMode = 'fsrs',
  gamify,
  xpLeaderboard,
  userRank,
  leaderboardMsg,
  user,
  sessionStatsNode,
  practiceStatsNode,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 50 }} 
          className="fixed inset-x-0 top-0 bottom-[32px] sm:bottom-[38px] z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 text-left pb-24">
             {activeStatsTab === 'performance' && (
               <>
                 {/* Daily Comparison Chart */}
                 <DailyComparisonChart data={dailyComparisonData || []} allTimeAvg={dailyComparisonAvg} isLoading={isDailyComparisonLoading} />
               </>
             )}

             {activeStatsTab === 'goals' && (
               <>
                 {/* Daily Goal Card */}
                 {activeMode !== 'review' && (
                   <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                     <div className="flex items-center gap-2.5">
                       <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                         <Target className="w-4.5 h-4.5" />
                       </div>
                       <div>
                         <h4 className="text-xs font-black text-slate-700">Deck Goal</h4>
                         <p className="text-[10px] text-slate-400 font-medium">Daily Practice</p>
                       </div>
                     </div>
                     {activeGoal ? (
                       <div className="space-y-3">
                         <div className="flex justify-between items-end">
                           <span className="text-2xl font-black text-slate-800">
                             {activeGoal.done_today} <span className="text-xs text-slate-400 font-bold">/ {activeGoal.daily_target} cards</span>
                           </span>
                           <span className="text-xs font-black text-indigo-600">
                             {Math.round((activeGoal.done_today / activeGoal.daily_target) * 100)}%
                           </span>
                         </div>
                         <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                             style={{ width: `${Math.min(100, Math.round((activeGoal.done_today / activeGoal.daily_target) * 100))}%` }}
                           />
                         </div>
                         <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                           {activeGoal.is_target_met 
                             ? "🎉 Awesome! You've met your daily goal. Keep pushing your limits!"
                             : `🎯 You need to study ${activeGoal.daily_target - activeGoal.done_today} more new cards to complete your daily goal!`
                           }
                         </p>
                       </div>
                     ) : (
                       <div className="py-1">
                         <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                           You haven't set a daily goal for this deck yet. Set a goal on the home page to maintain your daily habit! 💡
                         </p>
                       </div>
                     )}
                   </div>
                 )}

                 {/* Learning Streak & Level */}
                 <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2.5">
                       <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                         <Flame className="w-4.5 h-4.5" />
                       </div>
                       <div>
                         <h4 className="text-xs font-black text-slate-700">Learning Streak</h4>
                         <p className="text-[10px] text-slate-400 font-medium">Consecutive days</p>
                       </div>
                     </div>
                     <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100 shadow-sm">
                       {gamify.streak} days 🔥
                     </span>
                   </div>
                   <div className="pt-3 border-t border-slate-50 space-y-3">
                     <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-slate-600">Level {gamify.level}</span>
                       <span className="font-bold text-slate-400">{gamify.xp % 1000} / 1000 XP</span>
                     </div>
                     <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-orange-400 rounded-full"
                         style={{ width: `${(gamify.xp % 1000) / 10}%` }}
                       />
                     </div>
                     <p className="text-[10px] text-slate-400 font-medium">
                       {1000 - (gamify.xp % 1000)} XP more to reach level {gamify.level + 1}!
                     </p>
                   </div>
                 </div>
               </>
             )}

             {activeStatsTab === 'leaderboard' && (
               <>
                 {/* Leaderboard */}
                 <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                   <div className="flex items-center gap-2.5">
                     <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                       <Trophy className="w-4.5 h-4.5" />
                     </div>
                     <div>
                       <h4 className="text-xs font-black text-slate-700">Bảng xếp hạng tuần</h4>
                       <p className="text-[10px] text-slate-400 font-medium">Đua top XP tuần này</p>
                     </div>
                   </div>
                   {xpLeaderboard.list && xpLeaderboard.list.length > 0 ? (
                     <div className="space-y-1.5 py-1">
                       {xpLeaderboard.list.slice(0, 3).map((u: any, idx: number) => {
                         const displayValue = u.user_id === user?.id ? gamify.xp : u.value;
                         return (
                           <div 
                             key={u.user_id} 
                             className={cn(
                               "flex items-center justify-between p-2 rounded-2xl border transition-all text-xs",
                               u.user_id === user?.id 
                                 ? "bg-indigo-50/50 border-indigo-100 font-black text-indigo-950" 
                                 : "bg-slate-50/30 border-transparent text-slate-700"
                             )}
                           >
                             <div className="flex items-center gap-2 min-w-0">
                               <span className="text-base">
                                 {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                               </span>
                               <span className="font-bold truncate text-[11px] uppercase">
                                 {u.full_name || u.username}
                               </span>
                               <span className="text-[9px] text-slate-400 font-medium">
                                 Lv.{u.user_id === user?.id ? gamify.level : u.level}
                               </span>
                             </div>
                             <span className="font-black text-[11px] text-slate-900 shrink-0">
                               {displayValue.toLocaleString()} XP
                             </span>
                           </div>
                         )
                       })}
                       {userRank > 3 && (() => {
                         const currentUserObj = xpLeaderboard.list.find((u: any) => u.user_id === user?.id) || {
                           full_name: user?.username || "",
                           level: gamify.level,
                           value: gamify.xp
                         };
                         return (
                           <>
                             <div className="text-center text-[10px] font-black text-slate-300 tracking-widest leading-none my-1">•••</div>
                             <div className="flex items-center justify-between p-2 rounded-2xl border bg-indigo-50 border-indigo-100 font-black text-indigo-950 text-xs">
                               <div className="flex items-center gap-2 min-w-0">
                                 <span className="font-black text-indigo-600 w-5 text-center text-[10px]">
                                   #{userRank}
                                 </span>
                                 <span className="font-bold truncate text-[11px] uppercase">
                                   {currentUserObj.full_name || currentUserObj.username}
                                 </span>
                                 <span className="text-[9px] text-indigo-400 font-medium">
                                   Lv.{gamify.level}
                                 </span>
                               </div>
                               <span className="font-black text-[11px] text-indigo-600 shrink-0">
                                 {gamify.xp.toLocaleString()} XP
                               </span>
                             </div>
                           </>
                         );
                       })()}
                     </div>
                   ) : (
                     <p className="text-[10px] text-slate-400 text-center py-2">Đang tải bảng xếp hạng...</p>
                   )}
                   <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                     <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                       {leaderboardMsg}
                     </p>
                   </div>
                 </div>
               </>
             )}
          </div>

          {/* Sticky Bottom Footer */}
          <div className="flex items-center justify-center py-3 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-4">
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl h-12 border border-slate-200/60 shadow-inner gap-1 flex-1 max-w-[310px] justify-center">
              <button
                onClick={() => setActiveStatsTab('performance')}
                className={cn(
                  "flex-1 h-9 flex items-center justify-center rounded-xl transition-all duration-300 gap-1 px-1 text-[10px] font-black uppercase tracking-wider",
                  activeStatsTab === 'performance'
                    ? "text-indigo-600 bg-white shadow-md border border-indigo-100/60 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">STATS</span>
              </button>

              <button
                onClick={() => setActiveStatsTab('goals')}
                className={cn(
                  "flex-1 h-9 flex items-center justify-center rounded-xl transition-all duration-300 gap-1 px-1 text-[10px] font-black uppercase tracking-wider",
                  activeStatsTab === 'goals'
                    ? "text-orange-500 bg-white shadow-md border border-orange-100/60 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">GOALS</span>
              </button>

              <button
                onClick={() => setActiveStatsTab('leaderboard')}
                className={cn(
                  "flex-1 h-9 flex items-center justify-center rounded-xl transition-all duration-300 gap-1 px-1 text-[10px] font-black uppercase tracking-wider",
                  activeStatsTab === 'leaderboard'
                    ? "text-amber-500 bg-white shadow-md border border-amber-100/60 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">RANK</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
