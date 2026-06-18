import { useEffect } from 'react'

interface KeyboardShortcutsParams {
  mainTab: string;
  practiceSubMode: string;
  showFeedback: boolean;
  isFlipped: boolean;
  hasRated: boolean;
  isSessionSummaryOpen: boolean;
  isQuitModalOpen: boolean;
  isEditModalOpen: boolean;
  isMapOpen: boolean;
  isFeedbackOpen: boolean;
  currentPracticeChoicesCount: number;
  openEditModal: () => void;
  handleNext: () => void;
  handleTypingAnswer: () => void;
  handleMCQAnswer: (index: number) => void;
  handleReviewRating: (rating: number) => void;
  setIsFlipped: (flipped: boolean) => void;
  setShowFeedback: (show: boolean) => void;
}

export function useKeyboardShortcuts(params: KeyboardShortcutsParams) {
  const {
    mainTab,
    practiceSubMode,
    showFeedback,
    isFlipped,
    hasRated,
    isSessionSummaryOpen,
    isQuitModalOpen,
    isEditModalOpen,
    isMapOpen,
    isFeedbackOpen,
    currentPracticeChoicesCount,
    openEditModal,
    handleNext,
    handleTypingAnswer,
    handleMCQAnswer,
    handleReviewRating,
    setIsFlipped,
    setShowFeedback
  } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'e') {
        e.preventDefault();
        openEditModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openEditModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true') {
          if (e.key === 'Enter' && mainTab === 'practice' && practiceSubMode === 'typing') {
            e.preventDefault();
            if (showFeedback) {
              handleNext();
            } else {
              handleTypingAnswer();
            }
          }
          return;
        }
      }

      if (isSessionSummaryOpen || isQuitModalOpen || isEditModalOpen || isMapOpen || isFeedbackOpen) {
        return;
      }

      const key = e.key.toLowerCase();

      // Practice Mode Hotkeys
      if (mainTab === 'practice') {
        if (['mcq', 'listening'].includes(practiceSubMode)) {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (showFeedback) {
              handleNext();
            }
          } else if (!showFeedback && currentPracticeChoicesCount > 0) {
            const keyNum = parseInt(e.key);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= currentPracticeChoicesCount) {
              e.preventDefault();
              handleMCQAnswer(keyNum - 1);
            }
          }
        } else if (practiceSubMode === 'typing') {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (showFeedback) {
              handleNext();
            }
          }
        }
        return;
      }

      // Handle card flip (Space)
      if (e.key === ' ') {
        if (!isFlipped) {
          e.preventDefault();
          setIsFlipped(true);
          setShowFeedback(true);
        }
      } 
      // Handle next card (Enter)
      else if (e.key === 'Enter') {
        if (hasRated) {
          e.preventDefault();
          handleNext();
        }
      } 
      // Handle ratings (1, 2, 3, 4)
      else if (isFlipped) {
        if (key === '1') { e.preventDefault(); handleReviewRating(1); }
        else if (key === '2') { e.preventDefault(); handleReviewRating(2); }
        else if (key === '3') { e.preventDefault(); handleReviewRating(3); }
        else if (key === '4') { e.preventDefault(); handleReviewRating(4); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showFeedback,
    isSessionSummaryOpen,
    isQuitModalOpen,
    isEditModalOpen,
    isMapOpen,
    isFeedbackOpen,
    isFlipped,
    hasRated,
    mainTab,
    practiceSubMode,
    currentPracticeChoicesCount,
    handleNext,
    handleTypingAnswer,
    handleMCQAnswer,
    handleReviewRating,
    setIsFlipped,
    setShowFeedback
  ]);
}
