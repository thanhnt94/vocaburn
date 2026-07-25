import React from 'react'
import { Sliders, Brain, Route, Sparkles, Shuffle, EyeOff, AlertCircle, TrendingUp, Copy, Eye, Edit3, LogOut, Volume2, Music, Zap, Image, Settings, BookOpen, RotateCcw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
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
  showImages: boolean;
  setShowImages: (enabled: boolean) => void;
  showFsrs?: boolean;
  setShowFsrs?: (enabled: boolean) => void;
  randomEnabled?: boolean;
  setRandomEnabled?: (enabled: boolean) => void;
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
  setQuickLearnEnabled,
  showImages,
  setShowImages,
  showFsrs = true,
  setShowFsrs,
  randomEnabled = false,
  setRandomEnabled
}) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

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
            className="relative w-full max-w-lg bg-white md:rounded-[2rem] rounded-[1.25rem] p-5 md:p-6 shadow-2xl border border-white/20 overflow-hidden text-slate-800 max-h-[90vh] flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base md:text-lg font-black uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                <Sliders className="w-5 h-5 text-indigo-500" />
                Cấu hình học tập
              </h3>
              <button 
                type="button" 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Settings Content */}
            <div className="overflow-y-auto space-y-4 my-3 pr-1 custom-scrollbar">

              {/* 1. Chế độ học thông minh */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Chế độ học thông minh</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  {[
                    { id: 'fsrs', label: 'FSRS v6', icon: Brain },
                    { id: 'roadmap', label: 'Lộ trình', icon: Route },
                    { id: 'new', label: 'Học mới', icon: Sparkles },
                    { id: 'review', label: 'Ôn tập', icon: AlertCircle },
                    { id: 'hardest', label: 'Khó nhất', icon: TrendingUp },
                    { id: 'flip', label: 'Lật nhanh', icon: RotateCcw }
                  ].map(m => {
                    const IconComp = m.icon;
                    const active = activeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => applyLearningMode(m.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                          active 
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                            : "text-slate-500 hover:bg-white/60"
                        )}
                      >
                        <IconComp className={cn("w-4 h-4", active ? "text-indigo-600" : "text-slate-400")} />
                        <span className="truncate w-full text-center text-[9px] font-extrabold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Switch for Random Shuffle */}
                <div className="mt-2.5 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                      <Shuffle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-slate-700 block">Xáo trộn thẻ</span>
                      <span className="text-[9px] font-bold text-slate-400 block">Học ngẫu nhiên thay vì tuần tự</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRandomEnabled?.(!randomEnabled)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-all duration-300 relative p-0.5 cursor-pointer",
                      randomEnabled ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 transform",
                        randomEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* 2. Âm thanh đọc */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Âm thanh đọc tự động</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  {/* Front Audio */}
                  {(() => {
                    const active = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                          const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                          const nextState = isFrontOn ? (isBackOn ? 'back' : 'none') : (isBackOn ? 'always' : 'front');
                          setAutoPlayAudio(nextState);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer",
                          active 
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                            : "text-slate-500 hover:bg-white/60"
                        )}
                      >
                        <Volume2 className={cn("w-4 h-4", active ? "text-indigo-600" : "text-slate-400")} />
                        <span>Mặt trước</span>
                      </button>
                    );
                  })()}

                  {/* Back Audio */}
                  {(() => {
                    const active = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                          const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                          const nextState = isBackOn ? (isFrontOn ? 'front' : 'none') : (isFrontOn ? 'always' : 'back');
                          setAutoPlayAudio(nextState);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer",
                          active 
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                            : "text-slate-500 hover:bg-white/60"
                        )}
                      >
                        <Volume2 className={cn("w-4 h-4", active ? "text-indigo-600" : "text-slate-400")} />
                        <span>Mặt sau</span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* 3. Hiển thị & Hiệu ứng */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hiển thị & Hiệu ứng</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  {/* Effect Sound */}
                  <button
                    type="button"
                    onClick={() => setSfxEnabled(!sfxEnabled)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                      sfxEnabled 
                        ? "bg-white text-emerald-600 shadow-sm border border-slate-100 ring-1 ring-emerald-500/20" 
                        : "text-slate-500 hover:bg-white/60"
                    )}
                  >
                    <Music className={cn("w-4 h-4", sfxEnabled ? "text-emerald-500" : "text-slate-400")} />
                    <span className="truncate w-full text-center text-[9px] font-extrabold">Âm hiệu ứng</span>
                  </button>

                  {/* Haptic */}
                  <button
                    type="button"
                    onClick={() => setHapticEnabled(!hapticEnabled)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                      hapticEnabled 
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                        : "text-slate-500 hover:bg-white/60"
                    )}
                  >
                    <Zap className={cn("w-4 h-4", hapticEnabled ? "text-indigo-500" : "text-slate-400")} />
                    <span className="truncate w-full text-center text-[9px] font-extrabold">Rung Haptic</span>
                  </button>

                  {/* Show Images Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowImages(!showImages)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                      showImages 
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                        : "text-slate-500 hover:bg-white/60"
                    )}
                  >
                    <Image className={cn("w-4 h-4", showImages ? "text-indigo-500" : "text-slate-400")} />
                    <span className="truncate w-full text-center text-[9px] font-extrabold">Hiện hình ảnh</span>
                  </button>

                  {/* Quick Learn */}
                  {setQuickLearnEnabled !== undefined && (
                    <button
                      type="button"
                      onClick={() => setQuickLearnEnabled(!quickLearnEnabled)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                        quickLearnEnabled 
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                          : "text-slate-500 hover:bg-white/60"
                      )}
                    >
                      <Sparkles className={cn("w-4 h-4", quickLearnEnabled ? "text-indigo-500" : "text-slate-400")} />
                      <span className="truncate w-full text-center text-[9px] font-extrabold">Chuyển câu</span>
                    </button>
                  )}

                  {/* FSRS Toggle */}
                  {setShowFsrs !== undefined && (
                    <button
                      type="button"
                      onClick={() => setShowFsrs(!showFsrs)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer",
                        showFsrs 
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-indigo-500/20" 
                          : "text-slate-500 hover:bg-white/60"
                      )}
                    >
                      <Brain className={cn("w-4 h-4", showFsrs ? "text-indigo-500" : "text-slate-400")} />
                      <span className="truncate w-full text-center text-[9px] font-extrabold">Chỉ số FSRS</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Thao tác thẻ học */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Thao tác thẻ học</label>
                <div className="flex items-center justify-center gap-3">
                  {showFeedback && (
                    <button 
                      type="button"
                      onClick={() => {
                        copyQuestionToClipboard();
                        onClose();
                      }}
                      title="Copy nội dung"
                      className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm transition-all active:scale-90 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      handleIgnoreQuestion();
                    }}
                    title={currentQuestion?.is_ignored ? "Hủy bỏ qua thẻ" : "Bỏ qua thẻ"}
                    className={cn(
                      "w-10 h-10 rounded-2xl border flex items-center justify-center shadow-sm transition-all active:scale-90 cursor-pointer",
                      currentQuestion?.is_ignored 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                        : "bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {currentQuestion?.is_ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      onClose();
                      openEditModal();
                    }}
                    title="Sửa thẻ này"
                    className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm transition-all active:scale-90 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsQuitModalOpen(true);
                    }}
                    title="Thoát phiên học"
                    className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 flex items-center justify-center shadow-sm transition-all active:scale-90 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 5. Quản lý bộ thẻ */}
              {id && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Quản lý bộ thẻ</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/manage/edit/${id}`);
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-700 font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-indigo-500 animate-pulse" />
                      <span>Cấu hình bộ</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(`/manage/edit/${id}/flashcards`);
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-700 font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-500 animate-pulse" />
                      <span>Danh sách thẻ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Agree / Close Button */}
            <div className="pt-3 border-t border-slate-100 flex justify-center shrink-0">
              <button 
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Đồng ý / Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
