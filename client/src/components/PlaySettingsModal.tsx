import React, { useState } from 'react'
import { 
  Sliders, 
  Brain, 
  Route, 
  Sparkles, 
  Shuffle, 
  AlertCircle, 
  TrendingUp, 
  Copy, 
  EyeOff, 
  Edit3, 
  LogOut, 
  Volume2, 
  VolumeX,
  Music, 
  Zap, 
  Image, 
  ImageOff,
  Layers,
  Check, 
  X,
  Globe,
  User,
  ShieldCheck,
  RotateCcw,
  Settings,
  BookOpen,
  AlignLeft,
  AlignCenter,
  AlignVerticalSpaceAround,
  MousePointerClick
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type SettingOrigin = 'deck_override' | 'user_global' | 'deck_default'

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
  showFeedback?: boolean;
  copyQuestionToClipboard?: () => void;
  currentQuestion?: any;
  handleIgnoreQuestion?: () => void;
  openEditModal?: () => void;
  setIsQuitModalOpen?: (open: boolean) => void;
  quickLearnEnabled?: boolean;
  setQuickLearnEnabled?: (enabled: boolean) => void;
  showImages: any;
  setShowImages: (mode: any) => void;
  showFsrs?: boolean;
  setShowFsrs?: (enabled: boolean) => void;
  randomEnabled?: boolean;
  setRandomEnabled?: (enabled: boolean) => void;
  isCustomized?: boolean;
  settingOrigin?: SettingOrigin;
  onResetToCreatorDefaults?: () => Promise<void> | void;
  onApplyGlobalSettings?: () => Promise<void> | void;
  onSaveAsGlobalSettings?: () => Promise<void> | void;
  onSaveAsCreatorDefaults?: () => Promise<void> | void;
  frontHalign?: 'center' | 'left';
  setFrontHalign?: (val: 'center' | 'left') => void;
  backHalign?: 'center' | 'left';
  setBackHalign?: (val: 'center' | 'left') => void;
  frontValign?: 'center' | 'top';
  setFrontValign?: (val: 'center' | 'top') => void;
  backValign?: 'center' | 'top';
  setBackValign?: (val: 'center' | 'top') => void;
  cardFlipTrigger?: 'both' | 'tap' | 'button_only';
  setCardFlipTrigger?: (val: 'both' | 'tap' | 'button_only') => void;
  cardRatingMode?: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way';
  setCardRatingMode?: (val: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way') => void;
  isCreator?: boolean;
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
  showFeedback = false,
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
  setRandomEnabled,
  isCustomized = false,
  settingOrigin = 'deck_default',
  onResetToCreatorDefaults,
  onApplyGlobalSettings,
  onSaveAsGlobalSettings,
  onSaveAsCreatorDefaults,
  frontHalign = 'left',
  setFrontHalign,
  backHalign = 'left',
  setBackHalign,
  frontValign = 'center',
  setFrontValign,
  backValign = 'center',
  setBackValign,
  cardFlipTrigger = 'both',
  setCardFlipTrigger,
  cardRatingMode = 'both',
  setCardRatingMode,
  isCreator = false
}) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'modes' | 'audio' | 'display' | 'gestures'>('modes')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Parse audio mode
  const currentAudioMode: 'always' | 'front' | 'back' | 'none' = autoPlayAudio || 'none'
  
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
          {sub && <span className="text-[10px] font-bold text-slate-400 block truncate">{sub}</span>}
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
    label?: string; 
    sub?: string;
    value: string; 
    onChange: (val: any) => void; 
    options: { id: string; label: string; sub?: string; icon?: any }[] 
  }) => (
    <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-2">
      {(label || sub) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs font-black text-slate-800">{label}</span>}
          {sub && <span className="text-[10px] font-bold text-slate-400">{sub}</span>}
        </div>
      )}
      <div className={cn(
        "grid gap-1 p-1 bg-slate-100/80 rounded-xl",
        options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-4"
      )}>
        {options.map(opt => {
          const active = value === opt.id
          const IconComp = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "py-2 px-1 rounded-lg text-[10.5px] font-black tracking-tight transition-all text-center flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer",
                active 
                  ? "bg-white text-indigo-600 shadow-sm font-black" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <div className="flex items-center gap-1">
                {IconComp && <IconComp className={cn("w-3 h-3 shrink-0", active ? "text-indigo-600" : "text-slate-400")} />}
                <span className="truncate">{opt.label}</span>
              </div>
              {opt.sub && <span className="text-[8.5px] font-medium text-slate-400 truncate">{opt.sub}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )

  const handleApplyGlobal = async () => {
    if (!onApplyGlobalSettings) return
    setIsSyncing(true)
    try {
      await onApplyGlobalSettings()
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveAsGlobal = async () => {
    if (!onSaveAsGlobalSettings) return
    setIsSyncing(true)
    try {
      await onSaveAsGlobalSettings()
      alert("Đã lưu cấu hình học hiện tại thành cài đặt toàn cục thành công!")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResetToCreator = async () => {
    if (!onResetToCreatorDefaults) return
    if (window.confirm("Khôi phục toàn bộ cài đặt học của bộ thẻ này về mặc định ban đầu của người tạo?")) {
      setIsSyncing(true)
      try {
        await onResetToCreatorDefaults()
      } finally {
        setIsSyncing(false)
      }
    }
  }

  const handleSaveAsCreator = async () => {
    if (!onSaveAsCreatorDefaults) return
    if (window.confirm("Lưu cấu hình học hiện tại làm MẶC ĐỊNH GỐC của bộ thẻ này cho tất cả người học?")) {
      setIsSyncing(true)
      try {
        await onSaveAsCreatorDefaults()
        alert("Đã lưu làm mặc định của bộ thẻ thành công!")
      } finally {
        setIsSyncing(false)
      }
    }
  }

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
            className="relative w-full max-w-lg bg-[#F8FAFC] rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden text-slate-800 max-h-[88vh] flex flex-col"
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                      Cấu hình học tập
                    </h3>
                    {settingOrigin === 'deck_override' || (isCustomized && settingOrigin !== 'user_global') ? (
                      <span 
                        title="Đang áp dụng cấu hình riêng cho bộ thẻ này (ưu tiên cao nhất)"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/80"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                        Tùy chỉnh riêng
                      </span>
                    ) : settingOrigin === 'user_global' ? (
                      <span 
                        title="Đang đồng bộ theo cấu hình mặc định tài khoản toàn cục của bạn"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80"
                      >
                        <Globe className="w-2.5 h-2.5 text-blue-600" />
                        Cài đặt toàn cục
                      </span>
                    ) : (
                      <span 
                        title="Đang dùng cấu hình mặc định gốc do người tạo bộ thẻ thiết lập"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      >
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                        Mặc định bộ thẻ
                      </span>
                    )}
                  </div>
                  <p className="text-[9.5px] font-bold text-slate-400 leading-none mt-0.5">
                    Bộ thẻ phân cấp: Tùy chỉnh riêng &gt; Toàn cục &gt; Mặc định
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

            {/* Segmented Top Tabs (4 Tabs) */}
            <div className="px-4 pt-2.5 pb-2 bg-white shrink-0 border-b border-slate-100">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('modes')}
                  className={cn(
                    "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 cursor-pointer",
                    activeTab === 'modes' 
                      ? "bg-white text-orange-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Brain className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Chế độ học</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('audio')}
                  className={cn(
                    "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 cursor-pointer",
                    activeTab === 'audio' 
                      ? "bg-white text-indigo-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Âm thanh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('display')}
                  className={cn(
                    "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 cursor-pointer",
                    activeTab === 'display' 
                      ? "bg-white text-blue-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Hiển thị</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('gestures')}
                  className={cn(
                    "py-1.5 px-1 rounded-xl text-[10px] font-black tracking-tight transition-all flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 cursor-pointer",
                    activeTab === 'gestures' 
                      ? "bg-white text-rose-600 shadow-sm shadow-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Thao tác</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: CHẾ ĐỘ HỌC */}
              {activeTab === 'modes' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Chọn thuật toán & tiến trình
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {MODES_LIST.map((mode) => {
                        const Icon = mode.icon
                        const isSelected = activeMode === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => applyLearningMode(mode.id)}
                            className={cn(
                              "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between relative group cursor-pointer active:scale-95 shadow-2xs",
                              isSelected 
                                ? cn("bg-white border-2 shadow-sm ring-1 ring-orange-400/30", mode.border) 
                                : "bg-white/80 border-slate-100 hover:border-slate-200 hover:bg-white"
                            )}
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-slate-100", mode.bg)}>
                                <Icon className={cn("w-3.5 h-3.5", mode.color)} />
                              </div>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-orange-500 ring-4 ring-orange-100 shrink-0" />
                              )}
                            </div>
                            <div>
                              <span className={cn("text-xs font-black block truncate", isSelected ? "text-slate-900" : "text-slate-700")}>
                                {mode.label}
                              </span>
                              <span className="text-[9.5px] font-bold text-slate-400 block truncate">
                                {mode.desc}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Tùy chọn học tập
                    </span>

                    {setRandomEnabled && (
                      <ToggleSwitch 
                        checked={randomEnabled}
                        onChange={() => setRandomEnabled(!randomEnabled)}
                        label="Xáo trộn câu hỏi ngẫu nhiên"
                        sub="Đảo thứ tự các thẻ xuất hiện trong phiên"
                        icon={Shuffle}
                        color="text-amber-600"
                        bg="bg-amber-50"
                      />
                    )}

                    {setShowFsrs && (
                      <ToggleSwitch 
                        checked={showFsrs}
                        onChange={() => setShowFsrs(!showFsrs)}
                        label="Chỉ số ghi nhớ FSRS v6"
                        sub="Hiện độ ổn định (S) và độ khó (D) trên mặt thẻ"
                        icon={Brain}
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                      />
                    )}

                    {setQuickLearnEnabled && (
                      <ToggleSwitch 
                        checked={quickLearnEnabled}
                        onChange={() => setQuickLearnEnabled(!quickLearnEnabled)}
                        label="Chế độ học nhanh"
                        sub="Tự động ghi nhận Good, lướt nhanh nội dung"
                        icon={Zap}
                        color="text-orange-600"
                        bg="bg-orange-50"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ÂM THANH & TTS */}
              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Tự động phát âm thanh (TTS / Audio)
                    </span>
                    <SegmentedGroup 
                      sub="Tự động phát giọng đọc khi chuyển mặt thẻ"
                      value={currentAudioMode}
                      onChange={(val) => setAutoPlayAudio(val)}
                      options={[
                        { id: 'none', label: 'Tắt', icon: VolumeX },
                        { id: 'front', label: 'Mặt trước', icon: Volume2 },
                        { id: 'back', label: 'Mặt sau', icon: Volume2 },
                        { id: 'always', label: 'Cả hai', icon: Volume2 }
                      ]}
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Phản hồi cảm giác & Hiệu ứng
                    </span>

                    <ToggleSwitch 
                      checked={sfxEnabled}
                      onChange={() => setSfxEnabled(!sfxEnabled)}
                      label="Hiệu ứng âm thanh (SFX)"
                      sub="Âm thanh khi lật thẻ, chấm điểm đúng / sai"
                      icon={Music}
                      color="text-indigo-600"
                      bg="bg-indigo-50"
                    />

                    <ToggleSwitch 
                      checked={hapticEnabled}
                      onChange={() => setHapticEnabled(!hapticEnabled)}
                      label="Rung phản hồi cảm ứng (Haptic)"
                      sub="Rung nhẹ trên điện thoại khi bấm nút hoặc lật thẻ"
                      icon={Zap}
                      color="text-emerald-600"
                      bg="bg-emerald-50"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: HIỂN THỊ & CĂN LỀ */}
              {activeTab === 'display' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Căn lề nội dung mặt trước
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {setFrontValign && (
                        <SegmentedGroup 
                          label="Căn dọc"
                          value={frontValign}
                          onChange={(v) => setFrontValign(v)}
                          options={[
                            { id: 'center', label: 'Giữa' },
                            { id: 'top', label: 'Trên cùng' }
                          ]}
                        />
                      )}
                      {setFrontHalign && (
                        <SegmentedGroup 
                          label="Căn ngang"
                          value={frontHalign}
                          onChange={(v) => setFrontHalign(v)}
                          options={[
                            { id: 'left', label: 'Căn trái', icon: AlignLeft },
                            { id: 'center', label: 'Căn giữa', icon: AlignCenter }
                          ]}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Căn lề nội dung mặt sau
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {setBackValign && (
                        <SegmentedGroup 
                          label="Căn dọc"
                          value={backValign}
                          onChange={(v) => setBackValign(v)}
                          options={[
                            { id: 'center', label: 'Giữa' },
                            { id: 'top', label: 'Trên cùng' }
                          ]}
                        />
                      )}
                      {setBackHalign && (
                        <SegmentedGroup 
                          label="Căn ngang"
                          value={backHalign}
                          onChange={(v) => setBackHalign(v)}
                          options={[
                            { id: 'left', label: 'Căn trái', icon: AlignLeft },
                            { id: 'center', label: 'Căn giữa', icon: AlignCenter }
                          ]}
                        />
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Hiển thị hình ảnh minh họa
                    </span>
                    <SegmentedGroup 
                      sub="Tùy chọn mặt thẻ hiển thị hình minh họa"
                      value={currentImageMode}
                      onChange={(val) => setShowImages(val)}
                      options={[
                        { id: 'none', label: 'Tắt', icon: ImageOff },
                        { id: 'front', label: 'Mặt trước', icon: Image },
                        { id: 'back', label: 'Mặt sau', icon: Image },
                        { id: 'always', label: 'Cả hai', icon: Image }
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: THAO TÁC & CỬ CHỈ */}
              {activeTab === 'gestures' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Thao tác lật thẻ
                    </span>
                    {setCardFlipTrigger && (
                      <SegmentedGroup 
                        sub="Cách thức kích hoạt lật mặt thẻ"
                        value={cardFlipTrigger}
                        onChange={(v) => setCardFlipTrigger(v)}
                        options={[
                          { id: 'both', label: 'Cả hai', sub: 'Chạm / Nút' },
                          { id: 'tap', label: 'Chạm thẻ', sub: 'Tap vùng thẻ' },
                          { id: 'button_only', label: 'Chỉ nút', sub: 'Nút Lật' }
                        ]}
                      />
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Phương thức đánh giá kết quả
                    </span>
                    {setCardRatingMode && (
                      <SegmentedGroup 
                        sub="Giao diện chấm điểm độ nhớ"
                        value={cardRatingMode}
                        onChange={(v) => setCardRatingMode(v)}
                        options={[
                          { id: 'both', label: 'Cả hai', sub: 'Nút & Vuốt' },
                          { id: 'buttons', label: '4 Nút', sub: 'Thanh nút' },
                          { id: 'swipe_4way', label: 'Vuốt 4 hướng', sub: '4 chiều' },
                          { id: 'swipe_2way', label: 'Vuốt 2 hướng', sub: 'Trái / Phải' }
                        ]}
                      />
                    )}
                  </div>

                  {/* Study Actions & Management */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Thao tác trên thẻ hiện tại
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {copyQuestionToClipboard && (
                        <button
                          type="button"
                          onClick={copyQuestionToClipboard}
                          className="flex items-center gap-2 p-2.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs font-black truncate">Sao chép câu</span>
                        </button>
                      )}

                      {handleIgnoreQuestion && (
                        <button
                          type="button"
                          onClick={handleIgnoreQuestion}
                          className="flex items-center gap-2 p-2.5 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-xs font-black truncate">Bỏ qua câu này</span>
                        </button>
                      )}

                      {openEditModal && (
                        <button
                          type="button"
                          onClick={openEditModal}
                          className="flex items-center gap-2 p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left col-span-2"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-black truncate">Chỉnh sửa nhanh nội dung thẻ này</span>
                        </button>
                      )}
                    </div>

                    {id && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            navigate(`/decks/${id}?tab=settings`)
                          }}
                          className="flex items-center gap-2 p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                        >
                          <Settings className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-black truncate">Cài đặt bộ thẻ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            navigate(`/decks/${id}?tab=cards`)
                          }}
                          className="flex items-center gap-2 p-2.5 bg-white hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-xl text-slate-700 transition-all shadow-2xs active:scale-95 cursor-pointer text-left"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs font-black truncate">Quản lý thẻ</span>
                        </button>
                      </div>
                    )}

                    {setIsQuitModalOpen && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            setIsQuitModalOpen(true)
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Rời phiên học</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Bar: 3-Tier Synchronization Controls */}
            <div className="px-4 py-3 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Reset to creator defaults */}
                {onResetToCreatorDefaults && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleResetToCreator}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Khôi phục lại toàn bộ cấu hình học về mặc định ban đầu của người tạo bộ thẻ"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Mặc định bộ thẻ</span>
                  </button>
                )}

                {/* Apply global settings */}
                {onApplyGlobalSettings && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleApplyGlobal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Áp dụng cấu hình mặc định tài khoản toàn cục của bạn vào bộ thẻ này"
                  >
                    <Globe className="w-3 h-3 text-blue-600" />
                    <span>Áp dụng toàn cục</span>
                  </button>
                )}

                {/* Save as global settings */}
                {onSaveAsGlobalSettings && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSaveAsGlobal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Lưu cấu hình của bộ thẻ này thành cấu hình toàn cục mặc định của tài khoản"
                  >
                    <User className="w-3 h-3 text-purple-600" />
                    <span>Lưu làm toàn cục</span>
                  </button>
                )}

                {/* Save as creator deck defaults */}
                {onSaveAsCreatorDefaults && isCreator && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSaveAsCreator}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Lưu cấu hình này thành mặc định chung của bộ thẻ cho tất cả người học"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Đặt mặc định bộ thẻ</span>
                  </button>
                )}
              </div>

              <button 
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
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
