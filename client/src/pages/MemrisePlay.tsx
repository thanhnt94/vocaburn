import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { MemriseCardPayload, MemriseSessionResponse } from '@/types/memrise';
import { PracticeMcqCard, PracticeTypingCard, PracticeListeningCard } from '@/components/practice';
import { Flashcard3DCard } from '@/components/flashcard/Flashcard3DCard';
import { playCorrectSound, playIncorrectSound } from '@/lib/audio';
import confetti from 'canvas-confetti';

export default function MemrisePlay() {
  const { id, sessionType } = useParams<{ id: string, sessionType: 'plant' | 'water' }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userSettings } = useAppStore();
  
  const [session, setSession] = useState<MemriseSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const [typingInput, setTypingInput] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null);
  
  // Audio configuration
  const sfxEnabled = (userSettings as any)?.sound_effects_enabled ?? true;
  
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`/api/v1/memrise/${id}/${sessionType}-session`);
        if (res.data.cards && res.data.cards.length > 0) {
          setSession(res.data);
          setCurrentIndex(0);
        } else {
          setIsFinished(true);
          setError(res.data.message || 'No cards found for this session.');
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id && sessionType) {
      fetchSession();
    }
  }, [id, sessionType]);

  const handleNext = () => {
    if (session && currentIndex < session.cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleMcqSelect = (idx: number) => {
    if (answered || !session || !session.cards[currentIndex]) return;
    setAnswered(true);
    setSelectedOption(idx);
    const card = session.cards[currentIndex];
    const isCorrect = idx === card.mcq_data?.correct_index;
    handleAnswerSubmit(isCorrect);
  };

  const handleTypingCheck = () => {
    if (answered || !session || !session.cards[currentIndex]) return;
    setAnswered(true);
    const card = session.cards[currentIndex];
    const data = card.typing_data || card.mcq_data; // fallback for listening
    const cleanInput = typingInput.trim().toLowerCase();
    const correctAnswers = data?.acceptable_answers || [data?.correct_answer || ''];
    const isCorrect = correctAnswers.some((a: string) => a.replace(/<[^<]+?>/g, '').trim().toLowerCase() === cleanInput);
    
    setTypingFeedback({ checked: true, isCorrect });
    handleAnswerSubmit(isCorrect);
  };

  const handleAnswerSubmit = async (isCorrect: boolean) => {
    if (!session || !session.cards[currentIndex]) return;
    
    const card = session.cards[currentIndex];
    
    if (sfxEnabled) {
      if (isCorrect) playCorrectSound();
      else playIncorrectSound();
    }
    
    try {
      await axios.post('/api/v1/memrise/submit-answer', {
        card_id: card.card_id,
        is_correct: isCorrect,
        session_type: sessionType
      });
    } catch (e) {
      console.error("Failed to submit answer", e);
    }
    
    // Slight delay before moving to next card
    setTimeout(() => {
      setAnswered(false);
      setSelectedOption(null);
      setTypingInput('');
      setTypingFeedback(null);
      handleNext();
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isFinished || error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          {error || 'Session Complete! 🎉'}
        </h2>
        <button 
          onClick={() => navigate(`/deck/${id}`)}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Return to Deck
        </button>
      </div>
    );
  }

  const currentCard = session?.cards[currentIndex];
  if (!currentCard) return null;
  
  const progressPercent = ((currentIndex) / (session?.cards.length || 1)) * 100;

  // Determine which component to render based on session type and stage/test_type
  const renderCard = () => {
    if (sessionType === 'plant') {
      const stage = currentCard.stage || 1;
      if (stage === 1) {
         // Introduce (Front/Back)
         // Assuming we can use a basic view for introduction.
         // We can use a modified Flashcard or a simple presentation.
         return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-lg w-full mx-auto">
               <h3 className="text-lg font-bold text-indigo-600 mb-2">New Seed 🌱</h3>
               <div className="text-4xl font-black mb-6">{currentCard.front}</div>
               <div className="text-2xl font-medium text-slate-700">{currentCard.back}</div>
               <button 
                 onClick={() => handleAnswerSubmit(true)}
                 className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold w-full"
               >
                 Got it!
               </button>
            </div>
         )
      } else if (stage === 2 || stage === 3) {
         // MCQ
         return (
           <PracticeMcqCard
             currentIndex={0}
             currentQuestion={{ id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back } as any}
             practiceData={currentCard.mcq_data}
             answered={answered}
             selectedOption={selectedOption}
             starredCards={{}}
             onToggleStar={() => {}}
             onSelectOption={handleMcqSelect}
             onPreviewInsight={() => {}}
           />
         );
      } else if (stage === 4) {
         // Listening
         return (
           <PracticeListeningCard
             currentIndex={0}
             currentQuestion={{ id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back } as any}
             practiceData={{ ...currentCard.mcq_data, audio_url: currentCard.audio_data?.audio_url }}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
             onPlayAudio={() => {}}
           />
         );
      } else {
         // Typing
         return (
           <PracticeTypingCard
             currentIndex={0}
             currentQuestion={{ id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back } as any}
             practiceData={currentCard.typing_data}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
           />
         );
      }
    } else {
      // Watering (test_type)
      const testType = currentCard.test_type;
      if (testType === 'mcq') {
        return (
           <PracticeMcqCard
             currentIndex={0}
             currentQuestion={{ id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back } as any}
             practiceData={currentCard.mcq_data}
             answered={answered}
             selectedOption={selectedOption}
             starredCards={{}}
             onToggleStar={() => {}}
             onSelectOption={handleMcqSelect}
             onPreviewInsight={() => {}}
           />
         );
      } else if (testType === 'audio') {
        return (
           <PracticeListeningCard
             currentIndex={0}
             currentQuestion={{ id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back } as any}
             practiceData={{ ...currentCard.mcq_data, audio_url: currentCard.audio_data?.audio_url }}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
             onPlayAudio={() => {}}
           />
         );
      } else {
        return (
           <PracticeTypingCard
             currentIndex={0}
             currentQuestion={{ id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back } as any}
             practiceData={currentCard.typing_data}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
           />
         );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col h-[100dvh] overflow-hidden">
      {/* Header */}
      <div className="flex-none h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm">
        <button
          onClick={() => navigate(`/deck/${id}`)}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 px-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
        <div className="text-sm font-bold text-slate-700 w-12 text-center">
          {currentIndex + 1} / {session?.cards.length}
        </div>
      </div>
      
      {/* Play Area */}
      <div className="flex-1 relative overflow-y-auto w-full max-w-lg mx-auto p-4 flex flex-col">
        {renderCard()}
      </div>
    </div>
  );
}
