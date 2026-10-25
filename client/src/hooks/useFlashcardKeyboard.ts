import { useEffect } from 'react';

interface UseFlashcardKeyboardProps {
  isModalOpen: boolean;
  activeMode: string;
  isFlipped: boolean;
  hasRated: boolean;
  isSpeedSkimMode: boolean;
  activelyRatedCurrentCard: boolean;
  toggleAutoPlayPause: () => void;
  onFlip: () => void;
  onFlipBack: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRate: (rating: number) => void;
  onReplayAudio: () => void;
  onUndo: () => void;
  onToggleStar: () => void;
  onToggleHint: () => void;
}

export function useFlashcardKeyboard({
  isModalOpen,
  activeMode,
  isFlipped,
  hasRated,
  isSpeedSkimMode,
  activelyRatedCurrentCard,
  toggleAutoPlayPause,
  onFlip,
  onFlipBack,
  onNext,
  onPrev,
  onRate,
  onReplayAudio,
  onUndo,
  onToggleStar,
  onToggleHint
}: UseFlashcardKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if repeating or typing in input/textarea/contenteditable
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore when modals or drawers are open
      if (isModalOpen) {
        return;
      }

      // AutoPlay mode pause/resume shortcut (KeyP or Space when in autoplay)
      if (activeMode === 'autoplay' && (e.code === 'KeyP' || e.code === 'Space')) {
        e.preventDefault();
        toggleAutoPlayPause();
        return;
      }

      // Escape or Backspace: Flip back to front face if currently flipped
      if (e.code === 'Escape' || e.code === 'Backspace') {
        if (isFlipped && !hasRated && activeMode !== 'practice') {
          e.preventDefault();
          onFlipBack();
          return;
        }
      }

      // Space or Enter:
      // If card is not flipped -> flip it
      // If card is flipped & has rated -> go to next card
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          onFlip();
        } else if (hasRated || activeMode === 'flip' || isSpeedSkimMode) {
          onNext();
        }
        return;
      }

      // Number keys 1, 2, 3, 4 for FSRS Rating when flipped
      if (isFlipped && !hasRated && activeMode !== 'flip' && !isSpeedSkimMode && activeMode !== 'autoplay') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          onRate(1);
          return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          onRate(2);
          return;
        }
        if (e.code === 'Digit3' || e.code === 'Numpad3') {
          e.preventDefault();
          onRate(3);
          return;
        }
        if (e.code === 'Digit4' || e.code === 'Numpad4') {
          e.preventDefault();
          onRate(4);
          return;
        }
      }

      // Key R: Replay audio
      if (e.code === 'KeyR') {
        e.preventDefault();
        onReplayAudio();
        return;
      }

      // Key Z: Undo last rating
      if ((e.code === 'KeyZ' || (e.ctrlKey && e.code === 'KeyZ')) && activelyRatedCurrentCard) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Key S: Star question
      if (e.code === 'KeyS') {
        e.preventDefault();
        onToggleStar();
        return;
      }

      // Key H: Show Hint
      if (e.code === 'KeyH') {
        e.preventDefault();
        onToggleHint();
        return;
      }

      // ArrowLeft: Prev card (in autoplay)
      if (e.code === 'ArrowLeft' && activeMode === 'autoplay') {
        e.preventDefault();
        onPrev();
        return;
      }

      // ArrowRight: Next card (if rated or flip mode or speed_skim or autoplay)
      if (e.code === 'ArrowRight' && (hasRated || activeMode === 'flip' || isSpeedSkimMode || activeMode === 'autoplay')) {
        e.preventDefault();
        onNext();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isModalOpen,
    activeMode,
    isFlipped,
    hasRated,
    isSpeedSkimMode,
    activelyRatedCurrentCard,
    toggleAutoPlayPause,
    onFlip,
    onFlipBack,
    onNext,
    onPrev,
    onRate,
    onReplayAudio,
    onUndo,
    onToggleStar,
    onToggleHint
  ]);
}
