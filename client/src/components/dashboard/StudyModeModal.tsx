import React from 'react'
import { FlashcardModeModal } from '@/components/deck/modals/FlashcardModeModal'

export interface StudyModeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedStudyQuiz?: any
  deck?: any
  studyModalTab?: 'flashcard' | 'practice'
  onSelectFlashcardMode?: (mode: string) => void
  onSelectPracticeMode?: (mode: string) => void
}

export function StudyModeModal({
  isOpen,
  onClose,
  selectedStudyQuiz,
  deck
}: StudyModeModalProps) {
  return (
    <FlashcardModeModal
      isOpen={isOpen}
      onClose={onClose}
      deck={deck || selectedStudyQuiz}
    />
  )
}

export default StudyModeModal
