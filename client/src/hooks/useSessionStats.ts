import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useAppStore } from '@/store/useAppStore';

export interface GoalToastInfo {
  visible: boolean;
  message: string;
  isTargetMet: boolean;
  justCompleted: boolean;
  streakCount: number;
  doneToday: number;
  dailyTarget: number;
  bonusXP?: number;
}

export interface ActiveMilestoneInfo {
  type: 'streak_10' | 'halfway' | 'mastery' | 'goal_met';
  title: string;
  message: string;
}

export interface AnswerContextInfo {
  wasCorrect: boolean;
  prevTotal: number;
  prevCorrect: number;
  timeTaken: number;
  avgTime: number;
  newStreak: number;
  xpGained: number;
}

export function useSessionStats() {
  const { addXp } = useAppStore();

  const [streak, setStreak] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [xpFloat, setXpFloat] = useState<{ visible: boolean; amount: number }>({ visible: false, amount: 0 });
  const [milestonesHit, setMilestonesHit] = useState<Set<number>>(new Set());
  const [goalToast, setGoalToast] = useState<GoalToastInfo | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<ActiveMilestoneInfo | null>(null);
  const [answerContext, setAnswerContext] = useState<AnswerContextInfo | null>(null);

  const resetStats = () => {
    setStreak(0);
    setSessionXP(0);
    setXpFloat({ visible: false, amount: 0 });
    setMilestonesHit(new Set());
    setGoalToast(null);
    setActiveMilestone(null);
    setAnswerContext(null);
  };

  const updateXPFlow = (xpGained: number) => {
    if (xpGained > 0) {
      setSessionXP(prev => prev + xpGained);
      addXp(xpGained);
      setXpFloat({ visible: true, amount: xpGained });
      setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
    }
  };

  const triggerStreakConfetti = (currentStreak: number) => {
    const confettiColors = currentStreak >= 5 
      ? ['#f59e0b', '#ef4444', '#f97316'] 
      : ['#6366f1', '#a855f7', '#ec4899'];
    confetti({ 
      zIndex: 9999, 
      particleCount: currentStreak >= 5 ? 250 : 150, 
      spread: currentStreak >= 5 ? 100 : 70, 
      origin: { y: 0.6 }, 
      colors: confettiColors 
    });
  };

  const checkSessionMilestones = (answeredCount: number, totalCount: number, onCompleteAll?: () => void) => {
    const pct = Math.round((answeredCount / totalCount) * 100);
    const milestones = [25, 50, 75, 100];
    
    milestones.forEach(m => {
      if (pct >= m && !milestonesHit.has(m)) {
        setMilestonesHit(prev => {
          const newSet = new Set(prev);
          newSet.add(m);
          return newSet;
        });
        
        if (m === 100 && onCompleteAll) {
          setTimeout(onCompleteAll, 800);
        }
      }
    });
  };

  const showGoalToastUpdate = (goalUpdate: GoalToastInfo) => {
    setGoalToast(goalUpdate);
    setTimeout(() => setGoalToast(null), 4000);
  };

  return {
    streak,
    setStreak,
    sessionXP,
    setSessionXP,
    xpFloat,
    setXpFloat,
    milestonesHit,
    setMilestonesHit,
    goalToast,
    setGoalToast,
    activeMilestone,
    setActiveMilestone,
    answerContext,
    setAnswerContext,
    resetStats,
    updateXPFlow,
    triggerStreakConfetti,
    checkSessionMilestones,
    showGoalToastUpdate
  };
}
