import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { QuestionMapModal } from '@/components/QuestionMapModal'
import { OverdriveStrikeOverlay } from '@/components/OverdriveStrikeOverlay'
import { PlayStatsDrawer } from '@/components/PlayStatsDrawer'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'
import {
  ImageZoomOverlay,
  GoalCelebrationModal,
  QuitSessionModal,
  StudyConsoleModal
} from '@/components/flashcard'

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
  onOpenCardHub?: () => void

  // Overdrive / Strike
  isLimitlessStrike: boolean

  // Goal Celebration
  showGoalCelebration: boolean
  setShowGoalCelebration: (val: boolean) => void
  goalToast: any

  // Study Console & Navigation
  applyLearningMode: (mode: any, order?: any) => void
  randomEnabled: boolean

  // Quit Modal
  isQuitModalOpen: boolean
  setIsQuitModalOpen: (val: boolean) => void

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
  onOpenCardHub,
  isLimitlessStrike,
  showGoalCelebration,
  setShowGoalCelebration,
  goalToast,
  applyLearningMode,
  randomEnabled,
  isQuitModalOpen,
  setIsQuitModalOpen,
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
      <QuestionMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        questions={session?.questions || []}
        mainTab={mainTab}
        practiceAnswers={practiceAnswers}
        sessionAnswers={sessionAnswers}
        currentIndex={currentIndex}
        navigateToQuestion={navigateToQuestion}
        filterMode={mobileMapFilterMode}
        setFilterMode={setMobileMapFilterMode}
        getFilteredCount={getFilteredCount}
        subLessonGrouping={session?.practice_settings?.sub_lesson_grouping}
      />

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
        onOpenCardHub={onOpenCardHub}
      />

      {/* 4. Limitless Strike Screen Flash */}
      <OverdriveStrikeOverlay isVisible={isLimitlessStrike} />

      {/* 5. Daily Goal Celebration Modal */}
      <GoalCelebrationModal
        isOpen={showGoalCelebration}
        onClose={() => setShowGoalCelebration(false)}
        goalToast={goalToast}
      />

      {/* 6. Exit Confirmation Modal */}
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
        currentMode={activeMode}
        currentOrder={randomEnabled ? 'random' : 'sequential'}
        onSelectMode={(selectedMode, selectedOrder) => {
          setIsStudyConsoleOpen(false);
          applyLearningMode(selectedMode, selectedOrder);
        }}
      />
    </>
  )
}
