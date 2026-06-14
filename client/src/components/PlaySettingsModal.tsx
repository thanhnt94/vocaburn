import React from 'react'
import { Sliders, X, Brain, Sparkles, ListOrdered, Shuffle, EyeOff, AlertCircle, TrendingUp, Copy, Eye, Edit3, LogOut } from 'lucide-react'
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
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
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
  hapticEnabled,
  setHapticEnabled,
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
                title="Đóng"
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all border border-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
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

              {/* 2. Compact System options & Audio */}
              <div className="py-3 border-t border-slate-100 space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tùy chọn hệ thống</label>
                
                <div className="grid grid-cols-1 gap-3 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100/80">
                  {/* Front Audio */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Tự phát âm mặt trước</span>
                    <button 
                      onClick={() => {
                        const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                        const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                        const nextState = isFrontOn ? (isBackOn ? 'back' : 'none') : (isBackOn ? 'always' : 'front');
                        setAutoPlayAudio(nextState);
                      }}
                      className={cn(
                        "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center shrink-0",
                        (autoPlayAudio === 'always' || autoPlayAudio === 'front') ? "bg-indigo-500" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                        (autoPlayAudio === 'always' || autoPlayAudio === 'front') ? "translate-x-4.5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* Back Audio */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Tự phát âm mặt sau</span>
                    <button 
                      onClick={() => {
                        const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                        const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                        const nextState = isBackOn ? (isFrontOn ? 'front' : 'none') : (isFrontOn ? 'always' : 'back');
                        setAutoPlayAudio(nextState);
                      }}
                      className={cn(
                        "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center shrink-0",
                        (autoPlayAudio === 'always' || autoPlayAudio === 'back') ? "bg-indigo-500" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                        (autoPlayAudio === 'always' || autoPlayAudio === 'back') ? "translate-x-4.5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* Effect Sound */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Âm thanh hiệu ứng (Đúng/Sai)</span>
                    <button 
                      onClick={() => setSfxEnabled(!sfxEnabled)}
                      className={cn(
                        "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center shrink-0",
                        sfxEnabled ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                        sfxEnabled ? "translate-x-4.5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* Haptic Feedback */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Rung phản hồi (Haptic)</span>
                    <button 
                      onClick={() => setHapticEnabled(!hapticEnabled)}
                      className={cn(
                        "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center shrink-0",
                        hapticEnabled ? "bg-indigo-500" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                        hapticEnabled ? "translate-x-4.5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* Quick Learn */}
                  {setQuickLearnEnabled !== undefined && (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Tự động chuyển câu (Quick Learn)</span>
                      <button 
                        onClick={() => setQuickLearnEnabled(!quickLearnEnabled)}
                        className={cn(
                          "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center shrink-0",
                          quickLearnEnabled ? "bg-indigo-500" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                          quickLearnEnabled ? "translate-x-4.5" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Thao tác thẻ học */}
              <div className="py-3 border-t border-slate-100 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Thao tác thẻ học</label>
                <div className="flex items-center justify-center gap-3">
                  {showFeedback && (
                    <button 
                      onClick={() => {
                        copyQuestionToClipboard();
                        onClose();
                      }}
                      title="Copy nội dung"
                      className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm transition-all active:scale-90"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onClose();
                      handleIgnoreQuestion();
                    }}
                    title={currentQuestion?.is_ignored ? "Hủy bỏ qua thẻ" : "Bỏ qua thẻ"}
                    className={cn(
                      "w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm transition-all active:scale-90",
                      currentQuestion?.is_ignored 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                        : "bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {currentQuestion?.is_ignored ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>

                  <button 
                    onClick={() => {
                      onClose();
                      openEditModal();
                    }}
                    title="Sửa thẻ này"
                    className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm transition-all active:scale-90"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => {
                      onClose();
                      setIsQuitModalOpen(true);
                    }}
                    title="Thoát phiên học"
                    className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 flex items-center justify-center shadow-sm transition-all active:scale-90"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 4. Agree / Close Button */}
              <div className="pt-3 border-t border-slate-100">
                <button 
                  onClick={onClose}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  Đồng ý / Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
