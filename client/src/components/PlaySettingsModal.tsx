import React from 'react'
import { Sliders, X, Brain, Sparkles, ListOrdered, Shuffle, EyeOff, AlertCircle, TrendingUp, Copy, Eye, Edit3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PlaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: string;
  applyLearningMode: (mode: string) => void;
  autoPlayAudio: 'always' | 'front' | 'back' | 'none';
  setAutoPlayAudio: (mode: 'always' | 'front' | 'back' | 'none') => void;
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => void;
  showFeedback: boolean;
  copyQuestionToClipboard: () => void;
  currentQuestion: any;
  handleIgnoreQuestion: () => void;
  openEditModal: () => void;
  setIsQuitModalOpen: (open: boolean) => void;
  quickLearnEnabled?: boolean;
  setQuickLearnEnabled?: (enabled: boolean) => void;
}

export const PlaySettingsModal: React.FC<PlaySettingsModalProps> = ({
  isOpen,
  onClose,
  activeMode,
  applyLearningMode,
  autoPlayAudio,
  setAutoPlayAudio,
  sfxEnabled,
  setSfxEnabled,
  showFeedback,
  copyQuestionToClipboard,
  currentQuestion,
  handleIgnoreQuestion,
  openEditModal,
  setIsQuitModalOpen,
  quickLearnEnabled = false,
  setQuickLearnEnabled
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl border border-white/20 overflow-hidden text-slate-800"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                <Sliders className="w-5 h-5" />
                Cấu hình học tập
              </h3>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* 1. Learning Mode Selector */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Chế độ học thông minh</label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  {[
                    { id: 'fsrs', label: 'FSRS v6', icon: Brain },
                    { id: 'new', label: 'Học mới', icon: Sparkles },
                    { id: 'sequential', label: 'Mặc định', icon: ListOrdered },
                    { id: 'random', label: 'Ngẫu nhiên', icon: Shuffle },
                    { id: 'unseen', label: 'Chưa học', icon: EyeOff },
                    { id: 'review', label: 'Ôn tập', icon: AlertCircle },
                    { id: 'hardest', label: 'Khó nhất', icon: TrendingUp }
                  ].map(m => {
                    const IconComp = m.icon;
                    const active = activeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => applyLearningMode(m.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all",
                          active 
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                            : "text-slate-500 hover:bg-white/50"
                        )}
                      >
                        <IconComp className={cn("w-4 h-4", active ? "text-indigo-600" : "text-slate-400")} />
                        <span className="truncate w-full text-center text-[9px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Autoplay Audio Toggles */}
              <div className="flex flex-col gap-3 py-2 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tự động phát âm thanh</label>
                
                {/* Front Audio Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700">Mặt trước</span>
                    <span className="text-[9px] text-slate-400">Phát âm thanh từ vựng khi hiện thẻ</span>
                  </div>
                  <button 
                    onClick={() => {
                      const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                      const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                      const nextState = isFrontOn ? (isBackOn ? 'back' : 'none') : (isBackOn ? 'always' : 'front');
                      setAutoPlayAudio(nextState);
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center",
                      (autoPlayAudio === 'always' || autoPlayAudio === 'front') ? "bg-indigo-500" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                      (autoPlayAudio === 'always' || autoPlayAudio === 'front') ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Back Audio Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700">Mặt sau</span>
                    <span className="text-[9px] text-slate-400">Phát âm thanh giải nghĩa khi lật thẻ</span>
                  </div>
                  <button 
                    onClick={() => {
                      const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                      const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                      const nextState = isBackOn ? (isFrontOn ? 'front' : 'none') : (isFrontOn ? 'always' : 'back');
                      setAutoPlayAudio(nextState);
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center",
                      (autoPlayAudio === 'always' || autoPlayAudio === 'back') ? "bg-indigo-500" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                      (autoPlayAudio === 'always' || autoPlayAudio === 'back') ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* 3. Sound Effects Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-700">Âm thanh hiệu ứng</span>
                  <span className="text-[9px] text-slate-400">Phát nhạc chuông khi trả lời Đúng/Sai</span>
                </div>
                <button 
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  className={cn(
                    "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center",
                    sfxEnabled ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out",
                    sfxEnabled ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* 3b. Quick Learn Toggle */}
              {setQuickLearnEnabled !== undefined && (
                <div className="flex items-center justify-between py-2 border-t border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700">Tự động chuyển câu (Quick Learn)</span>
                    <span className="text-[9px] text-slate-400">Tự động chuyển thẻ tiếp theo ngay sau khi đánh giá</span>
                  </div>
                  <button 
                    onClick={() => setQuickLearnEnabled(!quickLearnEnabled)}
                    className={cn(
                      "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center",
                      quickLearnEnabled ? "bg-indigo-500" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out",
                      quickLearnEnabled ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>
              )}

              {/* 4. Actions: Copy, Ignore, Edit, Quit */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {showFeedback && (
                    <button 
                      onClick={() => {
                        copyQuestionToClipboard();
                        onClose();
                      }}
                      className="col-span-2 w-full py-3 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-600 font-bold text-xs hover:bg-amber-100 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy nội dung
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onClose();
                      handleIgnoreQuestion();
                    }}
                    className={cn(
                      "w-full py-3 border rounded-2xl font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2",
                      currentQuestion?.is_ignored 
                        ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        : "bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                    )}
                  >
                    {currentQuestion?.is_ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Bỏ qua thẻ
                  </button>

                  <button 
                    onClick={() => {
                      onClose();
                      openEditModal();
                    }}
                    className="w-full py-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-700 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Sửa thẻ này
                  </button>
                </div>

                <button 
                  onClick={() => {
                    onClose();
                    setIsQuitModalOpen(true);
                  }}
                  className="w-full py-3 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-600 font-bold text-xs hover:bg-rose-100 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Thoát phiên học
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
