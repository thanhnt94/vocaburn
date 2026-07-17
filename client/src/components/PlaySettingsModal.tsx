import React from 'react'
import { Sliders, Brain, Sparkles, ListOrdered, Shuffle, EyeOff, AlertCircle, TrendingUp, Copy, Eye, Edit3, LogOut, Volume2, Music, Zap, Image, Settings, BookOpen, RotateCcw } from 'lucide-react'
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
  const [activeSettingsTab, setActiveSettingsTab] = React.useState<'modes' | 'display'>('modes')

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
            className="relative w-full max-w-md bg-white md:rounded-[2rem] rounded-[1.25rem] p-6 shadow-2xl border border-white/20 overflow-hidden text-slate-800"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                <Sliders className="w-5 h-5" />
                Cấu hình học tập
              </h3>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-1 mb-4">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('modes')}
                className={cn(
                  "flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                  activeSettingsTab === 'modes' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Chế độ & Âm thanh
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('display')}
                className={cn(
                  "flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                  activeSettingsTab === 'display' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Hiển thị & Công cụ
              </button>
            </div>

            <div className="space-y-4">
              {activeSettingsTab === 'modes' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* 1. Learning Mode Selector */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Chế độ học thông minh</label>
                    <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                      {[
                        { id: 'fsrs', label: 'FSRS v6', icon: Brain },
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
                    {/* Switch for Random Shuffle */}
                    <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                          <Shuffle className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-extrabold text-slate-700 block">Xáo trộn câu hỏi</span>
                          <span className="text-[9px] font-bold text-slate-400 block">Học ngẫu nhiên thay vì tuần tự</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setRandomEnabled?.(!randomEnabled)}
                        className={cn(
                          "w-11 h-6 rounded-full transition-all duration-300 relative p-0.5",
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

                  {/* 2. Compact Reading Audio Grid */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Âm thanh đọc</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                      {/* Front Audio */}
                      {(() => {
                        const active = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                        return (
                          <button
                            onClick={() => {
                              const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                              const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                              const nextState = isFrontOn ? (isBackOn ? 'back' : 'none') : (isBackOn ? 'always' : 'front');
                              setAutoPlayAudio(nextState);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                              active 
                                ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                                : "text-slate-500 hover:bg-white/50"
                            )}
                          >
                            <Volume2 className={cn("w-4.5 h-4.5", active ? "text-indigo-600" : "text-slate-400")} />
                            <span className="truncate w-full text-center text-[9px]">Mặt trước</span>
                          </button>
                        );
                      })()}

                      {/* Back Audio */}
                      {(() => {
                        const active = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                        return (
                          <button
                            onClick={() => {
                              const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                              const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                              const nextState = isBackOn ? (isFrontOn ? 'front' : 'none') : (isFrontOn ? 'always' : 'back');
                              setAutoPlayAudio(nextState);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                              active 
                                ? "bg-white text-indigo-650 shadow-sm border border-slate-100" 
                                : "text-slate-500 hover:bg-white/50"
                            )}
                          >
                            <Volume2 className={cn("w-4.5 h-4.5", active ? "text-indigo-655" : "text-slate-400")} />
                            <span className="truncate w-full text-center text-[9px]">Mặt sau</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'display' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* 3. Compact Effects & Interaction Grid */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hiệu ứng & Hiển thị</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                      {/* Effect Sound */}
                      <button
                        onClick={() => setSfxEnabled(!sfxEnabled)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                          sfxEnabled 
                            ? "bg-white text-emerald-600 shadow-sm border border-slate-100" 
                            : "text-slate-500 hover:bg-white/50"
                        )}
                      >
                        <Music className={cn("w-4.5 h-4.5", sfxEnabled ? "text-emerald-500" : "text-slate-400")} />
                        <span className="truncate w-full text-center text-[9px]">Âm hiệu ứng</span>
                      </button>

                      {/* Haptic */}
                      <button
                        onClick={() => setHapticEnabled(!hapticEnabled)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                          hapticEnabled 
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                            : "text-slate-500 hover:bg-white/50"
                        )}
                      >
                        <Zap className={cn("w-4.5 h-4.5", hapticEnabled ? "text-indigo-500" : "text-slate-400")} />
                        <span className="truncate w-full text-center text-[9px]">Rung Haptic</span>
                      </button>

                      {/* Show Images Toggle */}
                      <button
                        onClick={() => setShowImages(!showImages)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                          showImages 
                            ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                            : "text-slate-500 hover:bg-white/50"
                        )}
                      >
                        <Image className={cn("w-4.5 h-4.5", showImages ? "text-indigo-500" : "text-slate-400")} />
                        <span className="truncate w-full text-center text-[9px]">Hiện hình ảnh</span>
                      </button>

                      {/* Quick Learn */}
                      {setQuickLearnEnabled !== undefined && (
                        <button
                          onClick={() => setQuickLearnEnabled(!quickLearnEnabled)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                            quickLearnEnabled 
                              ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                              : "text-slate-500 hover:bg-white/50"
                          )}
                        >
                          <Sparkles className={cn("w-4.5 h-4.5", quickLearnEnabled ? "text-indigo-500" : "text-slate-400")} />
                          <span className="truncate w-full text-center text-[9px]">Chuyển câu</span>
                        </button>
                      )}

                      {/* FSRS Toggle */}
                      {setShowFsrs !== undefined && (
                        <button
                          onClick={() => setShowFsrs(!showFsrs)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 col-span-2 sm:col-span-1",
                            showFsrs 
                              ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                              : "text-slate-500 hover:bg-white/50"
                          )}
                        >
                          <Brain className={cn("w-4.5 h-4.5", showFsrs ? "text-indigo-500" : "text-slate-400")} />
                          <span className="truncate w-full text-center text-[9px]">Hiện chỉ số FSRS</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. Thao tác thẻ học */}
                  <div className="py-2 border-t border-slate-100 space-y-1.5">
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

                  {/* Quản lý bộ thẻ */}
                  {id && (
                    <div className="py-2 border-t border-slate-100 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Quản lý bộ thẻ</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            onClose();
                            navigate(`/manage/edit/${id}`);
                          }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-700 font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95"
                        >
                          <Settings className="w-4 h-4 text-indigo-500 animate-pulse" />
                          <span>Cấu hình bộ</span>
                        </button>
                        <button 
                          onClick={() => {
                            onClose();
                            navigate(`/manage/edit/${id}/flashcards`);
                          }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-700 font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95"
                        >
                          <BookOpen className="w-4 h-4 text-emerald-500 animate-pulse" />
                          <span>Danh sách thẻ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Agree / Close Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={onClose}
                  className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
