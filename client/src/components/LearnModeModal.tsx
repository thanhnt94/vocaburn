import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Sprout, Droplets, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LearnModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string | number;
}

export function LearnModeModal({ isOpen, onClose, deckId }: LearnModeModalProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ bloomed: 0, planting: 0, wilting: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && deckId) {
      setIsLoading(true);
      axios.get(`/api/v1/memrise/${deckId}/stats`)
        .then(res => setStats(res.data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, deckId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-white rounded-3xl sm:rounded-2xl w-full max-w-md mx-auto overflow-hidden shadow-2xl relative flex flex-col max-h-[90dvh]"
        >
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Select Learn Mode</h2>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            
            {/* Flashcard (FSRS) Mode */}
            <button
              onClick={() => {
                onClose();
                navigate(`/flashcard/${deckId}/play`);
              }}
              className="w-full text-left bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 p-4 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">Flashcard Mode</h3>
                  <p className="text-sm text-slate-500 font-medium leading-snug mt-0.5">Classic spaced repetition (FSRS). Highly efficient memory retention.</p>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-bold uppercase tracking-wider text-slate-400">OR</span>
              </div>
            </div>

            {/* Memrise Mode */}
            <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Sprout className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">Memrise Mode</h3>
                  <p className="text-sm text-slate-500 font-medium leading-snug mt-0.5">Learn by planting and watering seeds step-by-step.</p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/60 p-2 rounded-xl text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase">Bloomed</div>
                      <div className="text-lg font-black text-emerald-600">{stats.bloomed}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded-xl text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase">Planting</div>
                      <div className="text-lg font-black text-amber-500">{stats.planting}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded-xl text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase">Wilting</div>
                      <div className="text-lg font-black text-blue-500">{stats.wilting}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/memrise/${deckId}/plant`);
                      }}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-sm"
                    >
                      <Sprout className="w-5 h-5" />
                      <span>Plant 10 Seeds</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/memrise/${deckId}/water`);
                      }}
                      disabled={stats.wilting === 0}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-sm"
                    >
                      <Droplets className="w-5 h-5" />
                      <span>Water Due</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
