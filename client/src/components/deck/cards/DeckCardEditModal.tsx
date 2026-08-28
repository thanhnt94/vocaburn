import React from 'react'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'

export interface DeckCardEditModalProps {
  isOpen: boolean
  onClose: () => void
  flashcard: any
  onSave: (updatedCard: any, addAnother?: boolean) => Promise<any>
  isSaving: boolean
  availableColumns?: string[]
  practiceSettings?: any
}

export function DeckCardEditModal(props: DeckCardEditModalProps) {
  return <FlashcardEditModal {...props} />
}

export default DeckCardEditModal
