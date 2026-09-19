import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAnimation } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { MemriseCardPayload, MemriseSessionResponse } from '@/types/memrise';
import { PracticeMcqCard, PracticeTypingCard, PracticeListeningCard, MemriseBottomBar } from '@/components/practice';
import { Flashcard3DCard } from '@/components/flashcard/Flashcard3DCard';
import { playCorrectSound, playIncorrectSound } from '@/lib/audio';
import { StudyHeaderTracker } from '@/components/StudyHeaderTracker';
import confetti from 'canvas-confetti';

export default function MemrisePlay() {
  const { id, sessionType } = useParams<{ id: string, sessionType: 'plant' | 'water' }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userSettings } = useAppStore();
  
  const [session, setSession] = useState<MemriseSessionResponse | null>(null);
  const [queue, setQueue] = useState<MemriseCardPayload[]>([]);
  const [bloomedCount, setBloomedCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const [typingInput, setTypingInput] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null);

  // Flashcard3DCard specific dummy states
  const [isFlipped, setIsFlipped] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);
  const backScrollRef = useRef<HTMLDivElement | null>(null);
  const cardDragControls = useAnimation();
  
  // Audio configuration
  const sfxEnabled = (userSettings as any)?.sound_effects_enabled ?? true;
  
  // Timeout ref to allow immediate skip
  const autoNextTimeout = useRef<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`/api/v1/memrise/${id}/${sessionType}-session`);
        if (res.data.cards && res.data.cards.length > 0) {
          setSession(res.data);
          setQueue([...res.data.cards]);
          setTotalCards(res.data.cards.length);
          setBloomedCount(0);
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

  const advanceQueue = (isCorrect: boolean, answeredCard: MemriseCardPayload) => {
    const newQueue = [...queue];
    newQueue.shift(); // remove from front

    if (isCorrect) {
      answeredCard.stage = (answeredCard.stage || 1) + 1;
      if (answeredCard.stage <= 6) {
        if (answeredCard.stage === 6) {
          setBloomedCount(prev => prev + 1);
        } else {
          const insertPos = Math.min(3, newQueue.length);
          newQueue.splice(insertPos, 0, answeredCard);
        }
      } else {
        setBloomedCount(prev => prev + 1);
      }
    } else {
      answeredCard.stage = 1; // reset to introduction
      const insertPos = Math.min(1, newQueue.length);
      newQueue.splice(insertPos, 0, answeredCard);
    }
    
    setQueue(newQueue);
    if (newQueue.length === 0) {
      setIsFinished(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    setAnswered(false);
    setSelectedOption(null);
    setTypingInput('');
    setTypingFeedback(null);
    setIsFlipped(false);
    setJustAnswered(false);
  };

  const handleAnswerSubmit = (isCorrect: boolean) => {
    if (queue.length === 0) return;
    const card = queue[0];
    
    if (sfxEnabled) {
      if (isCorrect) playCorrectSound();
      else playIncorrectSound();
    }
    
    // Fire and forget stats update
    axios.post('/api/v1/memrise/submit-answer', {
      card_id: card.card_id,
      is_correct: isCorrect,
      session_type: sessionType
    }).catch(e => console.error("Failed to submit answer", e));
    
    if (autoNextTimeout.current) clearTimeout(autoNextTimeout.current);
    autoNextTimeout.current = setTimeout(() => {
      advanceQueue(isCorrect, card);
    }, 1500);
  };

  const handleManualNext = () => {
    if (autoNextTimeout.current) {
      clearTimeout(autoNextTimeout.current);
      if (queue.length > 0) {
         // Determine if it was correct based on current feedback
         const isCorrect = (selectedOption !== null && selectedOption === queue[0].mcq_data?.correct_index) || (typingFeedback?.isCorrect);
         advanceQueue(!!isCorrect, queue[0]);
      }
    }
  };

  const handleMcqSelect = (idx: number) => {
    if (answered || queue.length === 0) return;
    setAnswered(true);
    setSelectedOption(idx);
    const card = queue[0];
    const isCorrect = idx === card.mcq_data?.correct_index;
    handleAnswerSubmit(isCorrect);
  };

  const handleTypingCheck = () => {
    if (answered || queue.length === 0) return;
    setAnswered(true);
    const card = queue[0];
    const data = card.typing_data || card.mcq_data;
    const cleanInput = typingInput.trim().toLowerCase();
    const correctAnswers = data?.acceptable_answers || [data?.correct_answer || ''];
    const isCorrect = correctAnswers.some((a: string) => a.replace(/<[^>]+>/g, '').trim().toLowerCase() === cleanInput);
    
    setTypingFeedback({ checked: true, isCorrect });
    handleAnswerSubmit(isCorrect);
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

  const currentCard = queue[0];
  if (!currentCard) return null;

  const getStageOrTestType = () => {
    if (sessionType === 'plant') return currentCard.stage || 1;
    // Watering session maps test_type directly
    if (currentCard.test_type === 'mcq') return 2;
    if (currentCard.test_type === 'audio') return 4;
    return 5; // typing
  };

  const stage = getStageOrTestType();
  const mockQuestion = { id: currentCard.card_id, content: currentCard.front, explanation: currentCard.back, front: currentCard.front, back: currentCard.back, others: currentCard.others } as any;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col h-[100dvh] overflow-hidden">
      {/* Native Study Header HUD */}
      <StudyHeaderTracker
        currentStepIndex={0}
        pipeline={[]}
        allDone={isFinished}
        deckId={id!}
        subProgressCurr={bloomedCount}
        subProgressTotal={totalCards}
        activeMode="memrise"
        onExit={() => navigate(`/deck/${id}`)}
      />
      
      {/* Play Area */}
      <div className="flex-1 relative overflow-y-auto w-full max-w-2xl mx-auto p-4 flex flex-col min-h-0">
        {stage === 1 ? (
          <div className="flex-1 min-h-0 flex flex-col relative w-full h-full pb-16">
            <Flashcard3DCard
              currentQuestion={mockQuestion}
              currentIndex={0}
              isFlipped={isFlipped}
              setIsFlipped={setIsFlipped}
              isSelectMode={false}
              effectiveCardFlipTrigger="tap"
              setIsFlyToolbarOpen={() => {}}
              setShowFeedback={() => {}}
              setJustAnswered={setJustAnswered}
              handleStarQuestion={() => {}}
              frontValign="center"
              frontHalign="center"
              backValign="center"
              backHalign="center"
              showImages="always"
              setZoomedImage={() => {}}
              effectiveShowFsrs={false}
              selectedOption={null}
              hasRated={false}
              activeDragGrade={null}
              dragOffset={{ x: 0, y: 0 }}
              canDragRate={false}
              hasBackOverflow={false}
              backScrollRef={backScrollRef}
              handleCardDrag={() => {}}
              handleCardDragEnd={() => {}}
              cardDragControls={cardDragControls}
              activeMasteryUpgrade={null}
              currentTime={new Date()}
              showAbsoluteFirst={false}
              setShowAbsoluteFirst={() => {}}
              showAbsoluteLast={false}
              setShowAbsoluteLast={() => {}}
              renderFlyToolbarNode={() => null}
            />
            {/* Custom Next button for stage 1 (Introduction) */}
            {isFlipped && (
               <div className="absolute bottom-4 left-0 right-0 flex justify-center z-50">
                 <button 
                   onClick={() => handleAnswerSubmit(true)}
                   className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                 >
                   Got it!
                 </button>
               </div>
            )}
          </div>
        ) : stage === 2 || stage === 3 ? (
          <PracticeMcqCard
             currentIndex={0}
             currentQuestion={mockQuestion}
             practiceData={currentCard.mcq_data}
             answered={answered}
             selectedOption={selectedOption}
             starredCards={{}}
             onToggleStar={() => {}}
             onSelectOption={handleMcqSelect}
             onPreviewInsight={() => {}}
          />
        ) : stage === 4 ? (
          <PracticeListeningCard
             currentIndex={0}
             currentQuestion={mockQuestion}
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
        ) : (
          <PracticeTypingCard
             currentIndex={0}
             currentQuestion={mockQuestion}
             practiceData={currentCard.typing_data}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
          />
        )}
      </div>

      {/* Footer for Practice modes */}
      {stage !== 1 && (
        <MemriseBottomBar
          baseMode={stage === 4 ? 'listening' : stage === 5 ? 'typing' : 'mcq'}
          typingInput={typingInput}
          setTypingInput={setTypingInput}
          onCheckTyping={handleTypingCheck}
          currentIndex={0}
          hasAnswered={answered}
          currentQuestion={mockQuestion}
          isFlipped={isFlipped}
          justAnswered={justAnswered}
          onOpenSettings={() => {}}
          onPlayAudio={() => {}}
          onOpenFeedback={() => {}}
          onNext={handleManualNext}
          onFlip={() => {}}
        />
      )}
    </div>
  );
}
