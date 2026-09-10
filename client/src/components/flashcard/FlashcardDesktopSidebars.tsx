import React from 'react'
import { cn } from '@/lib/utils'
import { FeedbackArea } from '@/components/FeedbackArea'
import { QuestionMapGrid } from '@/components/QuestionMapGrid'

export interface FlashcardDesktopSidebarsProps {
  // Left aside props
  showFeedback: boolean
  activeFeedbackTab: any
  setActiveFeedbackTab: (tab: any) => void
  getInsightText: () => string
  isEditingInsight: boolean
  insightInput: string
  setInsightInput: (val: string) => void
  currentQuestion: any
  canEdit: boolean
  clearAIExplanation: () => void
  isEditingAI: boolean
  setIsEditingAI: (val: boolean) => void
  isEditingPrompt: boolean
  setIsEditingPrompt: (val: boolean) => void
  askAI: (query?: string) => void
  isAskingAI: boolean
  aiInput: string
  setAiInput: (val: string) => void
  promptInput: string
  setPromptInput: (val: string) => void
  savePrompt: () => void
  saveNote: () => void
  personalNote: string
  setPersonalNote: (val: string) => void
  isEditingNote: boolean
  setIsEditingNote: (val: boolean) => void
  handleEditCurrentTab: () => void
  isCopyMenuOpen: boolean
  setIsCopyMenuOpen: (val: boolean) => void
  copyCurrentTabContent: (type?: any, activeTabId?: string) => void
  isCopied: boolean
  handleNext: () => void
  session: any

  // Left aside non-feedback view
  mainTab: string
  activeGoal: any
  activeMode: string
  roadmapStatus: any
  leaderboardType: 'xp' | 'streak' | 'questions' | 'time'
  setLeaderboardType: (val: any) => void
  leaderboardTimeFilter: 'today' | 'week' | 'month' | 'all_time'
  setLeaderboardTimeFilter: (val: any) => void
  isLeaderboardLoading: boolean
  xpLeaderboard: any
  user: any
  gamify: any
  userRank: number
  getUnitName: (type: string) => string
  leaderboardMsg: string
  practiceAnswers: Record<number, any>
  sessionAnswers: Record<number, any>
  practiceSubMode: string

  // Right aside props
  renderPracticeStats: () => React.ReactNode
  renderSessionStats: () => React.ReactNode
  currentIndex: number
  navigateToQuestion: (idx: number) => void
  setIsMapOpen: (open: boolean) => void
  mobileMapFilterMode: any
  setMobileMapFilterMode: (mode: any) => void
}

export const FlashcardDesktopLeftAside: React.FC<FlashcardDesktopSidebarsProps> = ({
  showFeedback,
  activeFeedbackTab,
  setActiveFeedbackTab,
  getInsightText,
  isEditingInsight,
  insightInput,
  setInsightInput,
  currentQuestion,
  canEdit,
  clearAIExplanation,
  isEditingAI,
  setIsEditingAI,
  isEditingPrompt,
  setIsEditingPrompt,
  askAI,
  isAskingAI,
  aiInput,
  setAiInput,
  promptInput,
  setPromptInput,
  savePrompt,
  saveNote,
  personalNote,
  setPersonalNote,
  isEditingNote,
  setIsEditingNote,
  handleEditCurrentTab,
  isCopyMenuOpen,
  setIsCopyMenuOpen,
  copyCurrentTabContent,
  isCopied,
  handleNext,
  session,
  mainTab,
  activeGoal,
  activeMode,
  roadmapStatus,
  leaderboardType,
  setLeaderboardType,
  leaderboardTimeFilter,
  setLeaderboardTimeFilter,
  isLeaderboardLoading,
  xpLeaderboard,
  user,
  gamify,
  userRank,
  getUnitName,
  leaderboardMsg,
  practiceAnswers,
  sessionAnswers,
  practiceSubMode,
  currentIndex
}) => {
  return (
    <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col min-h-0 overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
      {showFeedback ? (
        <FeedbackArea
          showFeedback={true}
          activeFeedbackTab={activeFeedbackTab}
          setActiveFeedbackTab={setActiveFeedbackTab}
          getInsightText={getInsightText}
          isEditingInsight={isEditingInsight}
          insightInput={insightInput}
          setInsightInput={setInsightInput}
          currentQuestion={currentQuestion}
          canEdit={canEdit}
          clearAIExplanation={clearAIExplanation}
          isEditingAI={isEditingAI}
          setIsEditingAI={setIsEditingAI}
          isEditingPrompt={isEditingPrompt}
          setIsEditingPrompt={setIsEditingPrompt}
          askAI={askAI}
          isAskingAI={isAskingAI}
          aiInput={aiInput}
          setAiInput={setAiInput}
          promptInput={promptInput}
          setPromptInput={setPromptInput}
          savePrompt={savePrompt}
          saveNote={saveNote}
          personalNote={personalNote}
          setPersonalNote={setPersonalNote}
          isEditingNote={isEditingNote}
          setIsEditingNote={setIsEditingNote}
          isMobile={false}
          handleEditCurrentTab={handleEditCurrentTab}
          isCopyMenuOpen={isCopyMenuOpen}
          setIsCopyMenuOpen={setIsCopyMenuOpen}
          copyCurrentTabContent={copyCurrentTabContent}
          isCopied={isCopied}
          handleNext={handleNext}
          deckInfo={session}
          currentIndex={currentIndex}
        />
      ) : (
        <div className="flex flex-col h-full bg-slate-50/40">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
              {mainTab === 'practice' ? "Practice Details" : "Review & Goals"}
            </span>
            {activeGoal && activeMode !== 'review' && (
              <span className={cn(
                "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm",
                activeGoal.is_target_met 
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                  : "bg-amber-100 text-amber-700 border border-amber-200"
              )}>
                {activeGoal.is_target_met ? "Goal Reached" : "In Progress"}
              </span>
            )}
          </div>
          
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
            {/* 1. Roadmap Pipeline Progress Card */}
            {roadmapStatus && roadmapStatus.roadmap_active ? (
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                      🗺️
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Roadmap Pathway</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {roadmapStatus.all_done ? '✅ Completed Today' : `Step ${roadmapStatus.current_step_index + 1}/${roadmapStatus.pipeline?.length || 1}`}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    roadmapStatus.all_done ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                  )}>
                    {roadmapStatus.all_done ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                <div className="space-y-2">
                  {roadmapStatus.pipeline?.map((st: any, sIdx: number) => {
                    const isCurrent = sIdx === roadmapStatus.current_step_index && !roadmapStatus.all_done
                    return (
                      <div
                        key={sIdx}
                        className={cn(
                          "p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all",
                          st.done ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" :
                          isCurrent ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20" :
                          "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-black text-slate-400 w-4">{sIdx + 1}.</span>
                          <span className="truncate">{st.label}</span>
                        </div>
                        <span className="text-[10px] opacity-75 shrink-0">
                          {st.done ? "✓ Done" : `${st.daily_count || 20} cards`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* 2. Mini Leaderboard Widget */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Learners</span>
                <span className="text-[10px] font-bold text-indigo-600">Leaderboard</span>
              </div>

              {/* Type Switcher */}
              <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100">
                {(['xp', 'streak', 'questions', 'time'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLeaderboardType(type)}
                    className={cn(
                      "flex-1 py-1 text-[9px] font-black uppercase rounded-lg transition-all",
                      leaderboardType === type 
                        ? "bg-white text-indigo-600 shadow-xs border border-slate-100/50" 
                        : "text-slate-400 hover:text-indigo-600"
                    )}
                  >
                    {type === 'xp' ? 'XP' : type === 'streak' ? 'Streak' : type === 'questions' ? 'Cards' : 'Time'}
                  </button>
                ))}
              </div>

              {/* Time Filter Switcher */}
              <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 overflow-x-auto gap-0.5">
                {(['today', 'week', 'month', 'all_time'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLeaderboardTimeFilter(filter)}
                    className={cn(
                      "flex-1 py-1 px-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap text-center",
                      leaderboardTimeFilter === filter 
                        ? "bg-slate-900 text-white shadow-xs" 
                        : "text-slate-400 hover:text-slate-700"
                    )}
                  >
                    {filter === 'today' ? 'Today' : filter === 'week' ? 'Week' : filter === 'month' ? 'Month' : 'All'}
                  </button>
                ))}
              </div>

              {/* Mini Leaderboard List */}
              {isLeaderboardLoading ? (
                <p className="text-[10px] text-slate-400 text-center py-4 font-bold animate-pulse">Loading rankings...</p>
              ) : xpLeaderboard.list && xpLeaderboard.list.length > 0 ? (
                <div className="space-y-1.5 py-1">
                  {xpLeaderboard.list.slice(0, 3).map((u: any, idx: number) => {
                    const displayValue = u.user_id === user?.id ? xpLeaderboard.user_value : u.value;
                    const unit = getUnitName(leaderboardType);
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
                          {displayValue.toLocaleString()} {unit}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Show user if they are not in Top 3 */}
                  {userRank > 3 && (() => {
                    const currentUserObj = xpLeaderboard.list.find((u: any) => u.user_id === user?.id) || {
                      full_name: user?.username || "",
                      level: gamify.level,
                      value: xpLeaderboard.user_value
                    };
                    const unit = getUnitName(leaderboardType);
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
                            {xpLeaderboard.user_value.toLocaleString()} {unit}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center py-2">Loading leaderboard...</p>
              )}

              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  {leaderboardMsg}
                </p>
              </div>
            </div>

            {/* 3. Session Quick Stats */}
            <div className="bg-slate-100/50 p-4 rounded-[1.75rem] border border-slate-100 space-y-3">
              <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                <span>Current Session</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                  <span className="block font-black text-slate-700">
                    {mainTab === 'practice' ? Object.keys(practiceAnswers).length : Object.keys(sessionAnswers).length}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Done</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs text-emerald-600">
                  <span className="block font-black">
                    {mainTab === 'practice' ? (
                      Object.entries(practiceAnswers).filter(([idx, ansIdx]) => {
                        const q = session?.questions?.[Number(idx)];
                        if (!q || !q.practice) return false;
                        if (practiceSubMode === 'typing') return ansIdx === 3;
                        return ansIdx === q.practice.correct_index;
                      }).length
                    ) : (
                      Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                        const q = session.questions[Number(idx)];
                        if (!q) return false;
                        const ratingVal = Array.isArray(optIdx) 
                          ? optIdx[optIdx.length - 1] 
                          : (typeof optIdx === 'number' ? optIdx : 0);
                        if (ratingVal === -2) return false;
                        return q.options && q.options.length > 0
                          ? q.options[ratingVal]?.is_correct
                          : ratingVal > 0;
                      }).length
                    )}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-400 uppercase">Correct</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs text-rose-600">
                  <span className="block font-black">
                    {mainTab === 'practice' ? (
                      Object.keys(practiceAnswers).length - Object.entries(practiceAnswers).filter(([idx, ansIdx]) => {
                        const q = session?.questions?.[Number(idx)];
                        if (!q || !q.practice) return false;
                        if (practiceSubMode === 'typing') return ansIdx === 3;
                        return ansIdx === q.practice.correct_index;
                      }).length
                    ) : (
                      Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                        const q = session.questions[Number(idx)];
                        if (!q) return false;
                        const ratingVal = Array.isArray(optIdx) 
                          ? optIdx[optIdx.length - 1] 
                          : (typeof optIdx === 'number' ? optIdx : 0);
                        if (ratingVal === -2) return false;
                        return q.options && q.options.length > 0
                          ? !q.options[ratingVal]?.is_correct
                          : ratingVal === 0;
                      }).length
                    )}
                  </span>
                  <span className="text-[8px] font-bold text-rose-400 uppercase">Wrong</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export const FlashcardDesktopRightAside: React.FC<{
  mainTab: string
  renderPracticeStats: () => React.ReactNode
  renderSessionStats: () => React.ReactNode
  session: any
  practiceAnswers: Record<number, any>
  sessionAnswers: Record<number, any>
  currentIndex: number
  navigateToQuestion: (idx: number) => void
  setIsMapOpen: (open: boolean) => void
  mobileMapFilterMode: any
  setMobileMapFilterMode: (mode: any) => void
}> = ({
  mainTab,
  renderPracticeStats,
  renderSessionStats,
  session,
  practiceAnswers,
  sessionAnswers,
  currentIndex,
  navigateToQuestion,
  setIsMapOpen,
  mobileMapFilterMode,
  setMobileMapFilterMode
}) => {
  return (
    <aside className="hidden lg:flex w-[340px] 2xl:w-[420px] flex-shrink-0 flex-col min-h-0 overflow-hidden">
      <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col overflow-hidden">
        <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex-shrink-0">
          {mainTab === 'practice' ? 'PRACTICE STATS' : 'CARD MAP'}
        </h4>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24">
          {mainTab === 'practice' ? (
            renderPracticeStats()
          ) : (
            <>
              {renderSessionStats()}
              <QuestionMapGrid
                questions={session.questions}
                mainTab={mainTab as 'fsrs' | 'practice'}
                practiceAnswers={practiceAnswers}
                sessionAnswers={sessionAnswers}
                currentIndex={currentIndex}
                navigateToQuestion={navigateToQuestion}
                setIsMapOpen={setIsMapOpen}
                filterMode={mobileMapFilterMode}
                setFilterMode={setMobileMapFilterMode}
              />
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
