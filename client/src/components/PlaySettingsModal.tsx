import React, { useState } from 'react'
import { 
  Sliders, 
  Brain, 
  Route, 
  Sparkles, 
  Shuffle, 
  EyeOff, 
  AlertCircle, 
  TrendingUp, 
  Copy, 
  Eye, 
  Edit3, 
  LogOut, 
  Volume2, 
  VolumeX,
  Music, 
  Zap, 
  Image, 
  ImageOff,
  Settings, 
  BookOpen, 
  RotateCcw, 
  X,
  Layers,
  Sparkle,
  Check
} from 'lucide-react'
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
  showImages: any;
  setShowImages: (mode: any) => void;
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
  const [activeTab, setActiveTab] = useState<'modes' | 'display' | 'actions'>('modes')

  // Parse audio mode
  const currentAudioMode = autoPlayAudio || 'none'
  
  // Parse image mode
  const currentImageMode: 'always' | 'front' | 'back' | 'none' = (() => {
    if (showImages === 'always' || showImages === true || showImages === 'true') return 'always'
    if (showImages === 'front') return 'front'
    if (showImages === 'back') return 'back'
    return 'none'
  })()

  const MODES_LIST = [
    { id: 'fsrs', label: 'FSRS v6', desc: 'Lặp lại ngắt quãng', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50/80', border: 'border-indigo-200' },
    { id: 'roadmap', label: 'Lộ trình', desc: 'Theo từng chặng', icon: Route, color: 'text-emerald-600', bg: 'bg-emerald-50/80', border: 'border-emerald-200' },
    { id: 'new', label: 'Học mới', desc: 'Thẻ chưa từng học', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50/80', border: 'border-amber-200' },
    { id: 'review', label: 'Ôn tập', desc: 'Thẻ đến hạn ôn', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/80', border: 'border-rose-200' },
    { id: 'hardest', label: 'Khó nhất', desc: 'Thẻ hay quên', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50/80', border: 'border-purple-200' },
    { id: 'flip', label: 'Lật nhanh', desc: 'Lướt thẻ tự do', icon: RotateCcw, color: 'text-sky-600', bg: 'bg-sky-50/80', border: 'border-sky-200' }
  ]

  const ToggleSwitch = ({ checked, onChange, label, sub, icon: Icon, color = 'text-indigo-600', bg = 'bg-indigo-50' }: any) => (
    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        {Icon && (
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-100/60", bg)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-xs font-black text-slate-800 block truncate">{label}</span>
          {sub && <span className="text-[9.5px] font-bold text-slate-400 block truncate">{sub}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "w-11 h-6 rounded-full transition-all duration-300 relative p-0.5 shrink-0 cursor-pointer",
          checked ? "bg-indigo-600 shadow-xs" : "bg-slate-200"
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )

  const SegmentedGroup = ({ 
    label, 
    sub,
    value, 
    onChange, 
    options 
  }: { 
    label: string; 
    sub?: string;
    value: string; 
    onChange: (val: any) => void; 
    options: { id: string; label: string; icon?: any }[] 
  }) => (
    <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-800">{label}</span>
        {sub && <span className="text-[9.5px] font-bold text-slate-400">{sub}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-xl">
        {options.map(opt => {
          const active = value === opt.id
          const IconComp = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "py-2 px-1 rounded-lg text-[10px] font-black tracking-tight transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 cursor-pointer",
                active 
                  ? "bg-white text-indigo-600 shadow-sm font-black" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {IconComp && <IconComp className={cn("w-3 h-3 shrink-0", active ? "text-indigo-600" : "text-slate-400")} />}
              <span className="truncate">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            className="relative w-full max-w-lg bg-[#F8FAFC] rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden text-slate-800 max-h-[90vh] flex flex-col"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-500"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                    Cấu hình học tập
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                    Tùy biến trải nghiệm & công cụ
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-100 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Top Tabs */}
            <div className="px-5 pt-3 pb-1 bg-white shrink-0">
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('modes')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                    activeTab === 'modes' 
                      ? "bg-white text-orange-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Chế độ học</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('display')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                    activeTab === 'display' 
                      ? "bg-white text-indigo-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Hiển thị</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('actions')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                    activeTab === 'actions' 
                      ? "bg-white text-rose-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Thao tác</span>
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content */}
            <div className="overflow-y-auto px-5 py-4 space-y-3.5 flex-1 custom-scrollbar">

              {/* ── TAB 1: CHẾ ĐỘ HỌC (MODES) ── */}
              {activeTab === 'modes' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Chọn thuật toán & phương pháp
                    </span>
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60 uppercase">
                      Đang bật: {MODES_LIST.find(m => m.id === activeMode)?.label || activeMode}
                    </span>
                  </div>

                  {/* 6 Modes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MODES_LIST.map(m => {
                      const IconComp = m.icon
                      const active = activeMode === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => applyLearningMode(m.id)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-2xl text-left transition-all active:scale-95 border cursor-pointer relative overflow-hidden",
                            active 
                              ? "bg-white border-orange-400 shadow-md ring-2 ring-orange-500/20" 
                              : "bg-white/80 border-slate-100 hover:border-slate-200/80 hover:bg-white"
                          )}
                        >
                          {active && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                          <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center mb-2 border border-slate-100/60", m.bg)}>
                            <IconComp className={cn("w-3.5 h-3.5", m.color)} />
                          </div>
                          <span className="text-xs font-black text-slate-800 leading-tight block">{m.label}</span>
                          <span className="text-[9.5px] font-bold text-slate-400 leading-tight block mt-0.5">{m.desc}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Shuffle Toggle */}
                  <div className="pt-1">
                    <ToggleSwitch
                      checked={randomEnabled}
                      onChange={() => setRandomEnabled?.(!randomEnabled)}
                      label="Xáo trộn thẻ (Shuffle)"
                      sub="Học ngẫu nhiên thay vì thứ tự tuần tự"
                      icon={Shuffle}
                      color="text-amber-600"
                      bg="bg-amber-50"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 2: HIỂN THỊ & ÂM THANH (DISPLAY) ── */}
              {activeTab === 'display' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* Auto Audio Segmented */}
                  <SegmentedGroup
                    label="Âm thanh tự động đọc (TTS)"
                    sub="Tự động phát khi đổi thẻ / lật thẻ"
                    value={currentAudioMode}
                    onChange={(val) => setAutoPlayAudio(val)}
                    options={[
                      { id: 'none', label: 'Tắt', icon: VolumeX },
                      { id: 'front', label: 'Mặt trước', icon: Volume2 },
                      { id: 'back', label: 'Mặt sau', icon: Volume2 },
                      { id: 'always', label: 'Cả hai', icon: Volume2 }
                    ]}
                  />

                  {/* Image Display Segmented */}
                  <SegmentedGroup
                    label="Hiển thị hình ảnh minh họa"
                    sub="Bật/tắt ảnh ở từng mặt thẻ"
                    value={currentImageMode}
                    onChange={(val) => setShowImages(val)}
                    options={[
                      { id: 'none', label: 'Tắt', icon: ImageOff },
                      { id: 'front', label: 'Mặt trước', icon: Image },
                      { id: 'back', label: 'Mặt sau', icon: Image },
                      { id: 'always', label: 'Cả hai', icon: Image }
                    ]}
                  />

                  {/* Effects & Sensory Toggles */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Hiệu ứng & Trải nghiệm
                    </span>

                    <ToggleSwitch
                      checked={sfxEnabled}
                      onChange={() => setSfxEnabled(!sfxEnabled)}
                      label="Âm hiệu ứng (SFX)"
                      sub="Âm thanh khi lật thẻ, chấm điểm, thăng cấp"
                      icon={Music}
                      color="text-emerald-600"
                      bg="bg-emerald-50"
                    />

                    <ToggleSwitch
                      checked={hapticEnabled}
                      onChange={() => setHapticEnabled(!hapticEnabled)}
                      label="Rung phản hồi (Haptic)"
                      sub="Rung nhẹ khi thao tác trên thiết bị di động"
                      icon={Zap}
                      color="text-indigo-600"
                      bg="bg-indigo-50"
                    />

                    {setQuickLearnEnabled !== undefined && (
                      <ToggleSwitch
                        checked={quickLearnEnabled}
                        onChange={() => setQuickLearnEnabled(!quickLearnEnabled)}
                        label="Tự động chuyển câu"
                        sub="Tự động sang thẻ kế tiếp ngay sau khi đánh giá"
                        icon={Sparkles}
                        color="text-purple-600"
                        bg="bg-purple-50"
                      />
                    )}

                    {setShowFsrs !== undefined && (
                      <ToggleSwitch
                        checked={showFsrs}
                        onChange={() => setShowFsrs(!showFsrs)}
                        label="Hiển thị chỉ số FSRS"
                        sub="Xem độ nhớ, độ khó và khoảng thời gian ôn tập"
                        icon={Brain}
                        color="text-rose-600"
                        bg="bg-rose-50"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: THAO TÁC NHANH (ACTIONS) ── */}
              {activeTab === 'actions' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Current Card Actions */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Thao tác trên thẻ hiện tại
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          openEditModal()
                        }}
                        className="flex items-center gap-3 p-3 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all shadow-2xs active:scale-95 cursor-pointer text-left group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                          <Edit3 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                            Sửa nhanh thẻ này
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-400 block truncate">
                            Thay đổi từ, nghĩa, audio, ảnh
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          handleIgnoreQuestion()
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 bg-white border rounded-2xl transition-all shadow-2xs active:scale-95 cursor-pointer text-left group",
                          currentQuestion?.is_ignored 
                            ? "hover:bg-indigo-50/50 border-indigo-200" 
                            : "hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform",
                          currentQuestion?.is_ignored ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-slate-50 border-slate-100 text-slate-500"
                        )}>
                          {currentQuestion?.is_ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 block truncate">
                            {currentQuestion?.is_ignored ? "Hủy bỏ qua thẻ" : "Bỏ qua thẻ này"}
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-400 block truncate">
                            {currentQuestion?.is_ignored ? "Khôi phục thẻ vào vòng lặp" : "Tạm ẩn khỏi phiên học"}
                          </span>
                        </div>
                      </button>

                      {showFeedback && (
                        <button
                          type="button"
                          onClick={() => {
                            copyQuestionToClipboard()
                            onClose()
                          }}
                          className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl transition-all shadow-2xs active:scale-95 cursor-pointer text-left group sm:col-span-2"
                        >
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:scale-105 transition-transform">
                            <Copy className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-800 block truncate">
                              Sao chép nội dung thẻ
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-400 block truncate">
                              Lưu mặt trước & mặt sau vào Clipboard
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Deck Management Actions */}
                  {id && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Quản lý bộ thẻ
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            navigate(`/decks/${id}?tab=settings`)
                          }}
                          className="flex items-center gap-2.5 p-3 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-2xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left group"
                        >
                          <Settings className="w-4 h-4 text-indigo-500 shrink-0 group-hover:rotate-45 transition-transform" />
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                              Cài đặt bộ
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block truncate">Cấu hình & AI</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            navigate(`/decks/${id}?tab=cards`)
                          }}
                          className="flex items-center gap-2.5 p-3 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-2xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left group"
                        >
                          <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-800 block truncate group-hover:text-emerald-600 transition-colors">
                              Quản lý thẻ
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block truncate">Thêm / Sửa / Xóa</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Exit Study Session */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        setIsQuitModalOpen(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Rời phiên học (Thoát ra ngoài)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Agree / Close Button */}
            <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-400">
                Tự động lưu cấu hình
              </span>
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Xong / Đóng</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
