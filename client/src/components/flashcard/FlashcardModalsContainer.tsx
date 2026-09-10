import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronDown, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { QuestionMapGrid } from '@/components/QuestionMapGrid'
import { PlayStatsDrawer } from '@/components/PlayStatsDrawer'
import { FeedbackArea } from '@/components/FeedbackArea'
import { PlaySettingsModal } from '@/components/PlaySettingsModal'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'
import {
  ImageZoomOverlay,
  GoalCelebrationModal,
  QuitSessionModal,
  StudyConsoleModal
} from '@/components/flashcard'
import { getMapTitleInfo } from '@/lib/flashcard-utils'

export interface FlashcardModalsContainerProps {
  id: string
  session: any
  user: any
  gamify: any
  currentIndex: number
  mainTab: string
  practiceAnswers: Record<number, any>
  sessionAnswers: Record<number, any>
  navigateToQuestion: (idx: number) => void
  userSettings: any
  updateUserSettings: (settings: any) => void
  setActiveMode: (mode: any) => void
  navigate: (url: string) => void

  // Question Map Modal
  isMapOpen: boolean
  setIsMapOpen: (open: boolean) => void
  mobileMapFilterMode: any
  setMobileMapFilterMode: (mode: any) => void
  getFilteredCount: (mode: any) => number

  // Stats Drawer
  isStatsOpen: boolean
  setIsStatsOpen: (open: boolean) => void
  activeStatsTab: any
  setActiveStatsTab: (tab: any) => void
  dailyComparisonData: any[]
  dailyComparisonAvg: any
  isDailyComparisonLoading: boolean
  activeGoal: any
  activeMode: string
  xpLeaderboard: any
  userRank: number
  leaderboardMsg: string
  currentQuestion: any
  renderSessionStats: () => React.ReactNode
  cardHubSubTab?: 'stats' | 'insight' | 'note' | 'community'
  setCardHubSubTab?: (tab: 'stats' | 'insight' | 'note' | 'community') => void

  // Feedback Modal
  isFeedbackOpen: boolean
  setIsFeedbackOpen: (open: boolean) => void
  showFeedback: boolean
  activeFeedbackTab: any
  setActiveFeedbackTab: (tab: any) => void
  getInsightText: () => string
  isEditingInsight: boolean
  insightInput: string
  setInsightInput: (val: string) => void
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

  // Overdrive / Strike
  isLimitlessStrike: boolean

  // Goal Celebration
  showGoalCelebration: boolean
  setShowGoalCelebration: (val: boolean) => void
  goalToast: any

  // Settings Modal
  isSettingsModalOpen: boolean
  setIsSettingsModalOpen: (val: boolean) => void
  applyLearningMode: (mode: any) => void
  autoPlayAudio: string
  setAutoPlayAudio: (val: any) => void
  sfxEnabled: boolean
  setSfxEnabled: (val: boolean) => void
  hapticEnabled: boolean
  setHapticEnabled: (val: boolean) => void
  copyQuestionToClipboard: () => void
  handleIgnoreQuestion: () => void
  handleStarQuestion: () => void
  openEditModal: () => void
  setIsQuitModalOpen: (val: boolean) => void
  quickLearnEnabled: boolean
  setQuickLearnEnabled: (val: boolean) => void
  showImages: any
  setShowImages: (val: any) => void
  effectiveShowFsrs: boolean
  setShowFsrs: (val: boolean) => void
  randomEnabled: boolean
  setRandomEnabled: (val: boolean) => void
  isCustomized: boolean
  settingOrigin: any
  resetToCreatorDefaults: () => void
  studyProfiles: any[]
  activeProfileId?: string | null
  applyProfile: (id: string) => void
  createCustomProfile: (name: string) => void
  deleteCustomProfile: (id: string) => void
  frontHalign: 'left' | 'center'
  setFrontHalign: (val: 'left' | 'center') => void
  frontFontSize?: string
  setFrontFontSize: (val: string) => void
  backHalign: 'left' | 'center'
  setBackHalign: (val: 'left' | 'center') => void
  frontValign: 'center' | 'top'
  setFrontValign: (val: 'center' | 'top') => void
  backValign: 'center' | 'top'
  setBackValign: (val: 'center' | 'top') => void
  deckCardFlipTrigger?: string
  setCardFlipTrigger: (val: any) => void
  saveGeneralSettings: (settings: any) => void
  deckCardRatingMode?: string
  setCardRatingMode: (val: any) => void
  saveAsCreatorDefaults: () => void

  // Quit Modal
  isQuitModalOpen: boolean

  // Edit Modal
  isEditModalOpen: boolean
  setIsEditModalOpen: (val: boolean) => void
  editFormData: any
  handleSaveEdit: (data: any) => void
  isSavingEdit: boolean

  // Local Toast
  localToast: { visible: boolean; type?: string; message?: string }

  // Zoomed Image
  zoomedImage: string | null
  setZoomedImage: (url: string | null) => void

  // Study Console
  isStudyConsoleOpen: boolean
  setIsStudyConsoleOpen: (open: boolean) => void
}

export const FlashcardModalsContainer: React.FC<FlashcardModalsContainerProps> = ({
  id,
  session,
  user,
  gamify,
  currentIndex,
  mainTab,
  practiceAnswers,
  sessionAnswers,
  navigateToQuestion,
  userSettings,
  updateUserSettings,
  setActiveMode,
  navigate,
  isMapOpen,
  setIsMapOpen,
  mobileMapFilterMode,
  setMobileMapFilterMode,
  getFilteredCount,
  isStatsOpen,
  setIsStatsOpen,
  activeStatsTab,
  setActiveStatsTab,
  dailyComparisonData,
  dailyComparisonAvg,
  isDailyComparisonLoading,
  activeGoal,
  activeMode,
  xpLeaderboard,
  userRank,
  leaderboardMsg,
  currentQuestion,
  renderSessionStats,
  cardHubSubTab,
  setCardHubSubTab,
  isFeedbackOpen,
  setIsFeedbackOpen,
  showFeedback,
  activeFeedbackTab,
  setActiveFeedbackTab,
  getInsightText,
  isEditingInsight,
  insightInput,
  setInsightInput,
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
  isLimitlessStrike,
  showGoalCelebration,
  setShowGoalCelebration,
  goalToast,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  applyLearningMode,
  autoPlayAudio,
  setAutoPlayAudio,
  sfxEnabled,
  setSfxEnabled,
  hapticEnabled,
  setHapticEnabled,
  copyQuestionToClipboard,
  handleIgnoreQuestion,
  handleStarQuestion,
  openEditModal,
  setIsQuitModalOpen,
  quickLearnEnabled,
  setQuickLearnEnabled,
  showImages,
  setShowImages,
  effectiveShowFsrs,
  setShowFsrs,
  randomEnabled,
  setRandomEnabled,
  isCustomized,
  settingOrigin,
  resetToCreatorDefaults,
  studyProfiles,
  activeProfileId,
  applyProfile,
  createCustomProfile,
  deleteCustomProfile,
  frontHalign,
  setFrontHalign,
  frontFontSize,
  setFrontFontSize,
  backHalign,
  setBackHalign,
  frontValign,
  setFrontValign,
  backValign,
  setBackValign,
  deckCardFlipTrigger,
  setCardFlipTrigger,
  saveGeneralSettings,
  deckCardRatingMode,
  setCardRatingMode,
  saveAsCreatorDefaults,
  isQuitModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  editFormData,
  handleSaveEdit,
  isSavingEdit,
  localToast,
  zoomedImage,
  setZoomedImage,
  isStudyConsoleOpen,
  setIsStudyConsoleOpen
}) => {
  return (
    <>
      {/* 1. Mobile Question Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 30 }} 
            className="fixed inset-x-0 top-0 bottom-12 z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
          >
            {/* Header */}
            <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-2 flex items-center justify-between shadow-[0_1px_20px_rgba(99,102,241,0.04)]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMapOpen(false)} 
                  className="w-8.5 h-8.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all flex-shrink-0 cursor-pointer"
                  title="Back to Study"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                {(() => {
                  const info = getMapTitleInfo(mobileMapFilterMode);
                  const count = getFilteredCount(mobileMapFilterMode);
                  return (
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight leading-snug">
                        {info.title} ({count})
                      </h2>
                      <p className="text-[9px] text-slate-400 font-bold">
                        {info.subtitle}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => setIsMapOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer text-xs font-bold"
                title="Close"
              >
                ✕
              </button>
            </header>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
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
                showFiltersInline={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Mobile Stats Drawer & Card Hub */}
      <PlayStatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        activeStatsTab={activeStatsTab}
        setActiveStatsTab={setActiveStatsTab}
        dailyComparisonData={dailyComparisonData || []}
        dailyComparisonAvg={dailyComparisonAvg}
        isDailyComparisonLoading={isDailyComparisonLoading}
        activeGoal={activeGoal}
        activeMode={activeMode}
        gamify={gamify}
        xpLeaderboard={xpLeaderboard}
        userRank={userRank}
        leaderboardMsg={leaderboardMsg}
        user={user}
        currentCard={currentQuestion}
        currentIndex={currentIndex}
        session={session}
        sessionStatsNode={renderSessionStats()}
        feedbackProps={{
          showFeedback: true,
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
          deckInfo: session
        }}
        initialCardSubTab={cardHubSubTab || (activeFeedbackTab as any) || 'stats'}
        onCardSubTabChange={(subTab) => {
          setCardHubSubTab?.(subTab);
          if (subTab !== 'stats') {
            setActiveFeedbackTab(subTab as any);
          }
        }}
      />

      {/* 3. Mobile Feedback Modal */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-x-0 top-0 bottom-12 z-[200] bg-[#F8FAFC] xl:hidden flex flex-col"
          >
            <div className="flex-1 overflow-hidden flex flex-col">
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
                isMobile={true}
                setIsFeedbackOpen={setIsFeedbackOpen}
                handleEditCurrentTab={handleEditCurrentTab}
                isCopyMenuOpen={isCopyMenuOpen}
                setIsCopyMenuOpen={setIsCopyMenuOpen}
                copyCurrentTabContent={copyCurrentTabContent}
                isCopied={isCopied}
                handleNext={handleNext}
                deckInfo={session}
                currentIndex={currentIndex}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Limitless Strike Screen Flash */}
      <AnimatePresence>
        {isLimitlessStrike && (
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

      {/* 5. Daily Goal Celebration Modal */}
      <GoalCelebrationModal
        isOpen={showGoalCelebration}
        onClose={() => setShowGoalCelebration(false)}
        goalToast={goalToast}
      />

      {/* 6. Smart Settings Modal */}
      <PlaySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        activeMode={activeMode}
        applyLearningMode={applyLearningMode}
        autoPlayAudio={autoPlayAudio as any}
        setAutoPlayAudio={setAutoPlayAudio}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        hapticEnabled={hapticEnabled}
        setHapticEnabled={setHapticEnabled}
        showFeedback={showFeedback}
        copyQuestionToClipboard={copyQuestionToClipboard}
        currentQuestion={currentQuestion}
        handleIgnoreQuestion={handleIgnoreQuestion}
        handleStarQuestion={handleStarQuestion}
        isStarred={Boolean(currentQuestion?.is_starred)}
        openEditModal={openEditModal}
        setIsQuitModalOpen={setIsQuitModalOpen}
        quickLearnEnabled={quickLearnEnabled}
        setQuickLearnEnabled={setQuickLearnEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        showFsrs={effectiveShowFsrs}
        setShowFsrs={(val: boolean) => {
          setShowFsrs(val);
          updateUserSettings({ show_fsrs: val });
        }}
        randomEnabled={randomEnabled}
        setRandomEnabled={setRandomEnabled}
        isCustomized={isCustomized}
        settingOrigin={settingOrigin}
        onResetToCreatorDefaults={resetToCreatorDefaults}
        studyProfiles={studyProfiles}
        activeProfileId={activeProfileId || undefined}
        onApplyProfile={applyProfile}
        onCreateCustomProfile={createCustomProfile}
        onDeleteCustomProfile={deleteCustomProfile}
        frontHalign={frontHalign}
        setFrontHalign={setFrontHalign}
        frontFontSize={frontFontSize}
        setFrontFontSize={setFrontFontSize}
        backHalign={backHalign}
        setBackHalign={setBackHalign}
        frontValign={frontValign}
        setFrontValign={setFrontValign}
        backValign={backValign}
        setBackValign={setBackValign}
        cardFlipTrigger={deckCardFlipTrigger || userSettings.card_flip_trigger || 'both'}
        setCardFlipTrigger={(val) => {
          setCardFlipTrigger(val);
          saveGeneralSettings({ card_flip_trigger: val });
        }}
        cardRatingMode={deckCardRatingMode || userSettings.card_rating_mode || 'both'}
        setCardRatingMode={(val) => {
          setCardRatingMode(val);
          saveGeneralSettings({ card_rating_mode: val });
        }}
        isCreator={Boolean(session?.is_creator || session?.creator_id === user?.id || user?.role === 'admin')}
        onSaveAsCreatorDefaults={saveAsCreatorDefaults}
      />

      {/* 7. Exit Confirmation Modal */}
      <QuitSessionModal
        isOpen={isQuitModalOpen}
        onClose={() => setIsQuitModalOpen(false)}
        onConfirmQuit={() => navigate(`/decks/${id}`)}
      />

      {/* 8. Edit Flashcard Modal */}
      <FlashcardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        flashcard={editFormData}
        onSave={handleSaveEdit as any}
        isSaving={isSavingEdit}
        availableColumns={session?.column_order || session?.custom_columns || []}
      />

      {/* 9. Local Toast Overlay */}
      <AnimatePresence>
        {localToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[3000] flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 text-white"
            style={{
              backgroundColor: localToast.type === 'error' 
                ? 'rgba(239, 68, 68, 0.95)' 
                : localToast.type === 'warning'
                ? 'rgba(245, 158, 11, 0.95)'
                : 'rgba(16, 185, 129, 0.95)',
              borderColor: localToast.type === 'error'
                ? 'rgba(248, 113, 113, 0.4)'
                : localToast.type === 'warning'
                ? 'rgba(251, 191, 36, 0.4)'
                : 'rgba(52, 211, 153, 0.4)'
            }}
          >
            {localToast.type === 'error' && <XCircle className="w-5 h-5 text-red-100" />}
            {localToast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-100" />}
            {localToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-100" />}
            <span className="font-bold text-sm tracking-wide">{localToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 10. Zoomed Image Modal Overlay */}
      <ImageZoomOverlay
        zoomedImage={zoomedImage}
        onClose={() => setZoomedImage(null)}
      />

      {/* 11. Study Console Modal */}
      <StudyConsoleModal
        isOpen={isStudyConsoleOpen}
        onClose={() => setIsStudyConsoleOpen(false)}
        session={session}
        deckId={id}
        onSelectMode={(selectedMode) => {
          setIsStudyConsoleOpen(false);
          updateUserSettings({ quiz_learning_mode: selectedMode as any });
          navigate(`/flashcard/${id}/play?mode=${selectedMode}`);
          setActiveMode(selectedMode as any);
        }}
      />
    </>
  )
}
