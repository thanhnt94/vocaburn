import { useState, useEffect } from 'react';
import { selectDistractors } from '@/lib/distractor';

export type PracticeSubMode = 'mcq' | 'typing' | 'listening';
export type PracticeRange = 'all' | 'learned';

export function usePracticeMode(
  session: any,
  currentIndex: number,
  mainTab: 'fsrs' | 'practice'
) {
  const [practiceSubMode, setPracticeSubModeState] = useState<PracticeSubMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vocab_practice_submode') as PracticeSubMode) || 'mcq';
    }
    return 'mcq';
  });

  const setPracticeSubMode = (mode: PracticeSubMode) => {
    setPracticeSubModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocab_practice_submode', mode);
    }
  };

  const [practiceRange, setPracticeRangeState] = useState<PracticeRange>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vocab_practice_range') as PracticeRange) || 'all';
    }
    return 'all';
  });

  const setPracticeRange = (range: PracticeRange) => {
    setPracticeRangeState(range);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocab_practice_range', range);
    }
  };

  const [practiceNeedsSetup, setPracticeNeedsSetup] = useState(false);
  const [practiceDisabled, setPracticeDisabled] = useState(false);
  const [setupPairs, setSetupPairs] = useState<{ q: string; a: string }[]>([{ q: 'front', a: 'back' }]);
  const [setupNumChoices, setSetupNumChoices] = useState<number>(4);
  const [typingInput, setTypingInput] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null);
  const [currentPracticeData, setCurrentPracticeData] = useState<any>(null);

  // Per-mode settings state
  const [modeSettings, setModeSettings] = useState<Record<PracticeSubMode, { active_pairs: { q: string; a: string }[]; num_choices?: number }>>({
    mcq: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
    typing: { active_pairs: [{ q: 'front', a: 'back' }] },
    listening: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 }
  });

  // Practice stats tracking
  const [practiceTotalAnswered, setPracticeTotalAnswered] = useState(0);
  const [practiceCorrectCount, setPracticeCorrectCount] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});

  // Sync setup screen fields when practiceSubMode or modeSettings change
  useEffect(() => {
    if (modeSettings && modeSettings[practiceSubMode]) {
      setSetupPairs(modeSettings[practiceSubMode].active_pairs || [{ q: 'front', a: 'back' }]);
      setSetupNumChoices(modeSettings[practiceSubMode].num_choices || 4);
    }
  }, [practiceSubMode, modeSettings]);

  const getVal = (item: any, key: string): string => {
    if (!item) return "";
    if (key === 'front' || key === 'content') {
      const val = item.content || (item.others && item.others.front);
      if (val) return String(val).trim();
    }
    if (key === 'back' || key === 'explanation') {
      let val = "";
      if (item.options && item.options.length > 0) {
        const correctOpt = item.options.find((o: any) => o.is_correct);
        if (correctOpt) val = correctOpt.content;
      }
      if (!val) val = item.explanation || (item.others && item.others.back);
      if (val) return String(val).trim();
    }
    const val = item[key] !== undefined && item[key] !== null
      ? item[key]
      : (item.others && typeof item.others === 'object' ? item.others[key] : "");
    return String(val ?? "").trim();
  };

  const generatePracticeQuestion = (idx: number, customSubMode?: PracticeSubMode) => {
    if (!session || !session.questions || session.questions.length === 0) return;
    const qObj = session.questions[idx];
    if (!qObj) return;

    const subMode = customSubMode || practiceSubMode;

    // Pick a random pair from setupPairs
    const activePair = setupPairs && setupPairs.length > 0
      ? setupPairs[Math.floor(Math.random() * setupPairs.length)]
      : { q: 'front', a: 'back' };

    const question_key = activePair.q;
    const answer_key = activePair.a;
    const num_choices = setupNumChoices || 4;

    const questionText = getVal(qObj, question_key);
    const correctAns = getVal(qObj, answer_key);

    const item_front = getVal(qObj, 'front');
    const item_back = getVal(qObj, 'back');

    if (subMode === 'mcq' || subMode === 'listening') {
      // Build candidate pool
      const all_items_data = session.questions.map((q: any) => ({
        id: q.id,
        front: getVal(q, 'front'),
        back: getVal(q, 'back'),
        others: q.others
      }));

      // Random sample from all items to speed up
      const sampleSize = Math.min(all_items_data.length, 50);
      const shuffled_items: any[] = [];
      const usedIndices = new Set<number>();
      while (shuffled_items.length < sampleSize && usedIndices.size < all_items_data.length) {
        const randIdx = Math.floor(Math.random() * all_items_data.length);
        if (!usedIndices.has(randIdx)) {
          usedIndices.add(randIdx);
          shuffled_items.push(all_items_data[randIdx]);
        }
      }

      const distractor_pool: any[] = [];
      for (const other of shuffled_items) {
        if (distractor_pool.length >= 20) break;
        if (other.id !== qObj.id) {
          const d_val = getVal(other, answer_key);
          const d_front = getVal(other, 'front');
          const d_back = getVal(other, 'back');
          if (d_val && d_val.toLowerCase() !== 'nan') {
            distractor_pool.push({
              text: d_val,
              front: d_front,
              back: d_back,
              id: other.id,
              type: (other.others && typeof other.others === 'object' ? (other.others.type || other.others.pos || '') : '')
            });
          }
        }
      }

      const correct_item_data = {
        text: correctAns,
        q_text: questionText,
        front: item_front,
        back: item_back,
        id: qObj.id,
        type: (qObj.others && typeof qObj.others === 'object' ? (qObj.others.type || qObj.others.pos || '') : '')
      };

      const needed = num_choices - 1;
      const distractors = selectDistractors(correct_item_data, distractor_pool, needed);

      // Assemble choices
      const choices_data = ([correct_item_data] as any[]).concat(distractors);
      // Shuffle choices_data using Fisher-Yates algorithm
      for (let i = choices_data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = choices_data[i];
        choices_data[i] = choices_data[j];
        choices_data[j] = temp;
      }

      const choices = choices_data.map(c => c.text);
      const choice_item_ids = choices_data.map(c => c.id);
      const correct_index = choices.indexOf(correctAns);

      setCurrentPracticeData({
        question: questionText,
        choices,
        choice_item_ids,
        correct_index: correct_index !== -1 ? correct_index : 0,
        correct_answer: correctAns,
        question_key,
        answer_key
      });
    } else if (subMode === 'typing') {
      setCurrentPracticeData({
        question: questionText,
        correct_answer: correctAns,
        question_key,
        answer_key
      });
    }
  };

  useEffect(() => {
    if (mainTab === 'practice' && session?.questions && session.questions.length > 0) {
      generatePracticeQuestion(currentIndex);
    } else {
      setCurrentPracticeData(null);
    }
  }, [currentIndex, mainTab, practiceSubMode, session, setupPairs, setupNumChoices]);

  const resetPractice = () => {
    setPracticeAnswers({});
    setPracticeTotalAnswered(0);
    setPracticeCorrectCount(0);
    setTypingInput('');
    setTypingFeedback(null);
    setCurrentPracticeData(null);
  };

  return {
    practiceSubMode,
    setPracticeSubMode,
    practiceRange,
    setPracticeRange,
    practiceNeedsSetup,
    setPracticeNeedsSetup,
    practiceDisabled,
    setPracticeDisabled,
    setupPairs,
    setSetupPairs,
    setupNumChoices,
    setSetupNumChoices,
    typingInput,
    setTypingInput,
    typingFeedback,
    setTypingFeedback,
    currentPracticeData,
    setCurrentPracticeData,
    modeSettings,
    setModeSettings,
    practiceTotalAnswered,
    setPracticeTotalAnswered,
    practiceCorrectCount,
    setPracticeCorrectCount,
    practiceAnswers,
    setPracticeAnswers,
    generatePracticeQuestion,
    resetPractice
  };
}
