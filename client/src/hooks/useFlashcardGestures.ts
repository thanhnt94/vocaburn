import { useState, useCallback } from 'react';
import { useAnimationControls } from 'framer-motion';

export interface DragGradeInfo {
  direction: 'again' | 'hard' | 'good' | 'easy' | 'next' | 'undo';
  grade: number;
  label: string;
  color: string;
}

interface UseFlashcardGesturesProps {
  isSelectMode: boolean;
  isCardDraggable: boolean;
  isNonRatingMode: boolean;
  hasRated: boolean;
  effectiveAutoAdvance: boolean;
  onRate: (grade: number, autoAdvance?: boolean) => void;
  onNext: () => void;
  onUndo: () => void;
  onFlipBack: () => void;
}

export function useFlashcardGestures({
  isSelectMode,
  isCardDraggable,
  isNonRatingMode,
  hasRated,
  effectiveAutoAdvance,
  onRate,
  onNext,
  onUndo,
  onFlipBack
}: UseFlashcardGesturesProps) {
  const cardDragControls = useAnimationControls();
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDragGrade, setActiveDragGrade] = useState<DragGradeInfo | null>(null);
  const [isFlyingOut, setIsFlyingOut] = useState(false);

  const resetDragState = useCallback(() => {
    setDragOffset({ x: 0, y: 0 });
    setActiveDragGrade(null);
    setIsFlyingOut(false);
    try {
      cardDragControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 });
    } catch (e) {}
  }, [cardDragControls]);

  const handleCardDrag = useCallback((
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    if (isSelectMode || !isCardDraggable) return;
    const dx = info.offset.x;
    const dy = info.offset.y;
    setDragOffset({ x: dx, y: dy });

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const dist = Math.hypot(dx, dy);

    // ════════ SKIM / FLIP MODE GESTURES: Right = NEXT CARD, Left = FLIP BACK ════════
    if (isNonRatingMode) {
      if (absX < 40 || absY > absX * 0.7) {
        setActiveDragGrade(null);
        return;
      }
      if (dx > 0) {
        setActiveDragGrade({ direction: 'next', grade: 0, label: 'NEXT CARD', color: 'emerald' });
      } else {
        setActiveDragGrade({ direction: 'undo', grade: 0, label: 'FLIP BACK', color: 'amber' });
      }
      return;
    }

    // ════════ POST-RATING GESTURES: Right = NEXT CARD, Left = UNDO ════════
    if (hasRated) {
      if (absX < 40 || absY > absX * 0.7) {
        setActiveDragGrade(null);
        return;
      }
      if (dx > 0) {
        setActiveDragGrade({ direction: 'next', grade: 0, label: 'NEXT CARD', color: 'emerald' });
      } else {
        setActiveDragGrade({ direction: 'undo', grade: 0, label: 'UNDO', color: 'amber' });
      }
      return;
    }

    // ════════ UNRATED CARD: 4-Way Compass Swipe ════════
    // Left=Again (1), Down=Hard (2), Right=Good (3), Up=Easy (4)
    if (dist < 35) {
      setActiveDragGrade(null);
    } else if (absX > absY) {
      if (dx < 0) {
        setActiveDragGrade({ direction: 'again', grade: 1, label: 'AGAIN', color: 'rose' });
      } else {
        setActiveDragGrade({ direction: 'good', grade: 3, label: 'GOOD', color: 'indigo' });
      }
    } else {
      if (dy > 0) {
        setActiveDragGrade({ direction: 'hard', grade: 2, label: 'HARD', color: 'amber' });
      } else {
        setActiveDragGrade({ direction: 'easy', grade: 4, label: 'EASY', color: 'emerald' });
      }
    }
  }, [isSelectMode, isCardDraggable, isNonRatingMode, hasRated]);

  const handleCardDragEnd = useCallback((
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    if (!isCardDraggable || !activeDragGrade) {
      cardDragControls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 32 } }).catch(() => {});
      setDragOffset({ x: 0, y: 0 });
      setActiveDragGrade(null);
      return;
    }

    const dx = info.offset.x;
    const dy = info.offset.y;
    const vx = info.velocity.x;
    const vy = info.velocity.y;
    const dir = activeDragGrade.direction;

    // ════════ POST-RATING / SKIM COMMITMENT ════════
    if (hasRated || isNonRatingMode) {
      if (Math.abs(dy) > Math.abs(dx) * 0.7) {
        cardDragControls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 32 } }).catch(() => {});
        setDragOffset({ x: 0, y: 0 });
        setActiveDragGrade(null);
        return;
      }

      if (dir === 'next') {
        const isCommitted = (dx >= 55 && vx >= -60 && Math.abs(dx) > Math.abs(dy) * 1.2) || (dx >= 30 && vx > 200 && Math.abs(dx) > Math.abs(dy) * 1.4);
        if (isCommitted) {
          setIsFlyingOut(true);
          const screenW = typeof window !== 'undefined' ? window.innerWidth : 450;
          const targetX = screenW * 1.35;
          const targetY = (dy || 0) * 1.5;
          const targetRotate = Math.max(18, Math.min(35, (dx * 0.12) || 25));

          setActiveDragGrade(null);
          setDragOffset({ x: 0, y: 0 });

          try {
            cardDragControls.start({
              x: targetX,
              y: targetY,
              opacity: 0,
              rotate: targetRotate,
              transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] }
            }).catch(() => {});
          } catch (e) {}

          setTimeout(() => {
            onNext();
          }, 160);

          setTimeout(() => {
            setIsFlyingOut(false);
            try {
              cardDragControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 });
            } catch (e) {}
          }, 450);

          return;
        }
      } else if (dir === 'undo') {
        const isCommitted = (dx <= -55 && vx <= 60 && Math.abs(dx) > Math.abs(dy) * 1.2) || (dx <= -30 && vx < -200 && Math.abs(dx) > Math.abs(dy) * 1.4);
        if (isCommitted) {
          setActiveDragGrade(null);
          setDragOffset({ x: 0, y: 0 });
          cardDragControls.start({
            x: 0,
            y: 0,
            rotate: 0,
            transition: { type: 'spring', stiffness: 500, damping: 32 }
          }).catch(() => {});
          if (isNonRatingMode) {
            onFlipBack();
          } else {
            onUndo();
          }
          return;
        }
      }

      cardDragControls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 500, damping: 32 }
      }).catch(() => {});
      setDragOffset({ x: 0, y: 0 });
      setActiveDragGrade(null);
      return;
    }

    // ════════ UNRATED CARD COMMITMENT ════════
    let isCommitted = false;
    if (dir === 'good') {
      isCommitted = (dx >= 55 && vx >= -60) || (dx >= 25 && vx > 200);
    } else if (dir === 'again') {
      isCommitted = (dx <= -55 && vx <= 60) || (dx <= -25 && vx < -200);
    } else if (dir === 'hard') {
      isCommitted = (dy >= 55 && vy >= -60) || (dy >= 25 && vy > 200);
    } else if (dir === 'easy') {
      isCommitted = (dy <= -55 && vy <= 60) || (dy <= -25 && vy < -200);
    }

    if (isCommitted) {
      const targetGrade = activeDragGrade.grade;

      if (effectiveAutoAdvance) {
        setIsFlyingOut(true);

        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        const screenW = typeof window !== 'undefined' ? window.innerWidth : 450;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

        if (dir === 'good') {
          targetX = screenW * 1.35;
          targetY = (dy || 0) * 1.6 + (dy >= 0 ? 30 : -30);
          targetRotate = Math.max(18, Math.min(35, (dx * 0.12) || 25));
        } else if (dir === 'again') {
          targetX = -screenW * 1.35;
          targetY = (dy || 0) * 1.6 + (dy >= 0 ? 30 : -30);
          targetRotate = -Math.max(18, Math.min(35, (Math.abs(dx) * 0.12) || 25));
        } else if (dir === 'hard') {
          targetY = screenH * 0.95;
          targetX = (dx || 0) * 1.5 + (dx >= 0 ? 40 : -40);
          targetRotate = dx >= 0 ? 12 : -12;
        } else if (dir === 'easy') {
          targetY = -screenH * 0.95;
          targetX = (dx || 0) * 1.5 + (dx >= 0 ? 40 : -40);
          targetRotate = dx >= 0 ? -12 : 12;
        }

        setActiveDragGrade(null);
        setDragOffset({ x: 0, y: 0 });

        try {
          cardDragControls.start({
            x: targetX,
            y: targetY,
            opacity: 0,
            rotate: targetRotate,
            transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] }
          }).catch(() => {});
        } catch (e) {}

        onRate(targetGrade, true);

        setTimeout(() => {
          setIsFlyingOut(false);
          try {
            cardDragControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 });
          } catch (e) {}
        }, 500);
      } else {
        setIsFlyingOut(false);
        setActiveDragGrade(null);
        setDragOffset({ x: 0, y: 0 });
        cardDragControls.start({
          x: 0,
          y: 0,
          rotate: 0,
          opacity: 1,
          transition: { type: 'spring', stiffness: 500, damping: 32 }
        }).catch(() => {});

        onRate(targetGrade, false);
      }
    } else {
      cardDragControls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 500, damping: 32 }
      }).catch(() => {});
      setDragOffset({ x: 0, y: 0 });
      setActiveDragGrade(null);
    }
  }, [
    isCardDraggable,
    activeDragGrade,
    hasRated,
    isNonRatingMode,
    effectiveAutoAdvance,
    cardDragControls,
    onNext,
    onFlipBack,
    onUndo,
    onRate
  ]);

  return {
    cardDragControls,
    dragOffset,
    setDragOffset,
    activeDragGrade,
    setActiveDragGrade,
    isFlyingOut,
    setIsFlyingOut,
    resetDragState,
    handleCardDrag,
    handleCardDragEnd
  };
}
