import React, { useState, useEffect } from 'react'
import {
  Brain,
  Compass,
  RotateCcw,
  Trophy,
  Keyboard,
  Headphones,
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Shuffle,
  Music,
  Check,
  RotateCcw as ResetIcon,
  Save,
  User,
  ShieldAlert,
  Sliders
} from 'lucide-react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckPersonalSettingsProps {
  deckId: string | number
  deckTitle?: string
  isOwner?: boolean
  onSaved?: () => void
}

type PreferredMode = 'fsrs' | 'roadmap' | 'flip' | 'mcq' | 'typing' | 'listening'
type AudioChoice = 'none' | 'front' | 'back' | 'always'
type ImageChoice = 'always' | 'front' | 'back' | 'none'

const audioLabelMap: Record<string, string> = {
  none: 'Tắt',
  front: 'Mặt trước',
  back: 'Mặt sau',
  always: 'Cả hai mặt'
}

const imageLabelMap: Record<string, string> = {
  always: 'Cả hai mặt',
  front: 'Mặt trước',
  back: 'Mặt sau',
  none: 'Tắt'
}

export function DeckPersonalSettings({
  deckId,
  deckTitle,
  onSaved
}: DeckPersonalSettingsProps) {
  const queryClient = useQueryClient()

  // 1. Fetch practice & study settings (both creator defaults and user overrides)
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['deck-practice-settings', String(deckId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/deck/${deckId}/practice-settings`)
      return res.data
    },
    enabled: !!deckId,
    staleTime: 30 * 1000,
  })

  const creatorDefs = settingsData?.creator_study_defaults || settingsData?.study_defaults || {}
  const userOverrides = settingsData?.user_study_settings || {}
  const isCustomized = Boolean(settingsData?.is_study_customized)

  // Local state: automatically copies exact original values from deck defaults if not customized
  const [preferredMode, setPreferredMode] = useState<PreferredMode>('fsrs')
  const [autoplayAudio, setAutoplayAudio] = useState<AudioChoice>('none')
  const [showImages, setShowImages] = useState<ImageChoice>('always')
  const [frontValign, setFrontValign] = useState<'center' | 'top'>('center')
  const [frontHalign, setFrontHalign] = useState<'center' | 'left'>('center')
  const [backValign, setBackValign] = useState<'center' | 'top'>('center')
  const [backHalign, setBackHalign] = useState<'left' | 'center'>('left')
  const [randomEnabled, setRandomEnabled] = useState<boolean>(false)
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true)
  const [quickLearnEnabled, setQuickLearnEnabled] = useState<boolean>(false)

  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sync state when data loads: copy user settings if customized, otherwise copy deck's original default settings
  useEffect(() => {
    if (settingsData) {
      const initialMode = (userOverrides.learning_mode || creatorDefs.learning_mode || 'fsrs') as PreferredMode
      const initialAudio = (userOverrides.autoplay_audio || creatorDefs.autoplay_audio || 'none') as AudioChoice
      const initialImages = (userOverrides.show_images || creatorDefs.show_images || 'always') as ImageChoice
      const initialFrontValign = (userOverrides.front_valign || creatorDefs.front_valign || 'center') as 'center' | 'top'
      const initialFrontHalign = (userOverrides.front_halign || creatorDefs.front_halign || 'center') as 'center' | 'left'
      const initialBackValign = (userOverrides.back_valign || creatorDefs.back_valign || 'center') as 'center' | 'top'
      const initialBackHalign = (userOverrides.back_halign || creatorDefs.back_halign || 'left') as 'left' | 'center'
      const initialRandom = userOverrides.random_enabled !== undefined
        ? Boolean(userOverrides.random_enabled)
        : Boolean(creatorDefs.random_enabled ?? false)
      const initialSfx = userOverrides.sfx_enabled !== undefined
        ? Boolean(userOverrides.sfx_enabled)
        : Boolean(creatorDefs.sfx_enabled ?? true)
      const initialQuickLearn = userOverrides.quick_learn_enabled !== undefined
        ? Boolean(userOverrides.quick_learn_enabled)
        : Boolean(creatorDefs.quick_learn_enabled ?? false)

      setPreferredMode(initialMode)
      setAutoplayAudio(initialAudio)
      setShowImages(initialImages)
      setFrontValign(initialFrontValign)
      setFrontHalign(initialFrontHalign)
      setBackValign(initialBackValign)
      setBackHalign(initialBackHalign)
      setRandomEnabled(initialRandom)
      setSfxEnabled(initialSfx)
      setQuickLearnEnabled(initialQuickLearn)
    }
  }, [settingsData])

  const defaultCreatorMode = creatorDefs.learning_mode || 'fsrs'

  const studyModes: {
    id: PreferredMode
    title: string
    sublabel: string
    desc: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    border: string
  }[] = [
    {
      id: 'fsrs',
      title: 'Flashcard FSRS',
      sublabel: 'Lặp lại ngắt quãng v6',
      desc: 'Ôn luyện thông minh theo thuật toán lặp lại ngắt quãng hiện đại nhất',
      icon: Brain,
      color: 'text-purple-600 bg-purple-50',
      border: 'border-purple-500'
    },
    {
      id: 'roadmap',
      title: 'Flashcard Lộ Trình',
      sublabel: 'Roadmap hàng ngày',
      desc: 'Học thẻ mới và ôn tập đúng hạn theo chỉ tiêu mỗi ngày',
      icon: Compass,
      color: 'text-amber-600 bg-amber-50',
      border: 'border-amber-500'
    },
    {
      id: 'flip',
      title: 'Lật Thẻ Phản Xạ',
      sublabel: 'Flip Cards tự do',
      desc: 'Chế độ lật thẻ 2 mặt truyền thống, thích hợp xem lướt phản xạ',
      icon: RotateCcw,
      color: 'text-emerald-600 bg-emerald-50',
      border: 'border-emerald-500'
    },
    {
      id: 'mcq',
      title: 'Trắc Nghiệm MCQ',
      sublabel: 'Chọn 1 trong 4 đáp án',
      desc: 'Hỏi mặt trước và chọn nhanh đáp án mặt sau từ các phương án ngẫu nhiên',
      icon: Trophy,
      color: 'text-amber-600 bg-amber-50',
      border: 'border-amber-500'
    },
    {
      id: 'typing',
      title: 'Gõ Từ Vựng',
      sublabel: 'Luyện nhớ mặt chữ',
      desc: 'Bắt buộc gõ chuẩn xác từng ký tự của từ vựng để ghi nhớ sâu',
      icon: Keyboard,
      color: 'text-indigo-600 bg-indigo-50',
      border: 'border-indigo-500'
    },
    {
      id: 'listening',
      title: 'Luyện Nghe',
      sublabel: 'Nghe TTS chọn nghĩa',
      desc: 'Phát âm thanh đọc mẫu và chọn đáp án dịch nghĩa chuẩn',
      icon: Headphones,
      color: 'text-sky-600 bg-sky-50',
      border: 'border-sky-500'
    }
  ]

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const studyOverrides = {
      learning_mode: preferredMode,
      autoplay_audio: autoplayAudio,
      show_images: showImages,
      front_valign: frontValign,
      front_halign: frontHalign,
      back_valign: backValign,
      back_halign: backHalign,
      random_enabled: randomEnabled,
      sfx_enabled: sfxEnabled,
      quick_learn_enabled: quickLearnEnabled,
    }

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        settings: {
          study_settings: studyOverrides
        }
      })

      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setMessage({ type: 'success', text: 'Đã lưu cài đặt cá nhân cho bộ thẻ thành công!' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Không thể lưu cài đặt cá nhân' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Bạn có chắc muốn khôi phục toàn bộ cài đặt về thiết lập gốc của bộ thẻ?')) return

    setIsResetting(true)
    setMessage(null)

    // Copy original deck settings directly into the form
    const creatorMode = (creatorDefs.learning_mode || 'fsrs') as PreferredMode
    const creatorAudio = (creatorDefs.autoplay_audio || 'none') as AudioChoice
    const creatorImages = (creatorDefs.show_images || 'always') as ImageChoice
    const creatorFrontValign = (creatorDefs.front_valign || 'center') as 'center' | 'top'
    const creatorFrontHalign = (creatorDefs.front_halign || 'center') as 'center' | 'left'
    const creatorBackValign = (creatorDefs.back_valign || 'center') as 'center' | 'top'
    const creatorBackHalign = (creatorDefs.back_halign || 'left') as 'left' | 'center'
    const creatorRandom = Boolean(creatorDefs.random_enabled ?? false)
    const creatorSfx = Boolean(creatorDefs.sfx_enabled ?? true)
    const creatorQuickLearn = Boolean(creatorDefs.quick_learn_enabled ?? false)

    setPreferredMode(creatorMode)
    setAutoplayAudio(creatorAudio)
    setShowImages(creatorImages)
    setFrontValign(creatorFrontValign)
    setFrontHalign(creatorFrontHalign)
    setBackValign(creatorBackValign)
    setBackHalign(creatorBackHalign)
    setRandomEnabled(creatorRandom)
    setSfxEnabled(creatorSfx)
    setQuickLearnEnabled(creatorQuickLearn)

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        reset_study_defaults: true
      })

      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      setMessage({ type: 'success', text: 'Đã khôi phục toàn bộ cài đặt về thiết lập gốc của bộ thẻ!' })
      if (onSaved) onSaved()
      setTimeout(() => setMessage(null), 3500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Không thể khôi phục cài đặt mặc định' })
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 text-left animate-in fade-in duration-200">
      {/* ═══════════ HEADER & STATUS BANNER ═══════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
                <User className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  Cài Đặt Học Cá Nhân (My Study Preferences)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {deckTitle ? `Tùy chỉnh trải nghiệm học cho bộ thẻ "${deckTitle}"` : 'Tùy chỉnh trải nghiệm học cho riêng tài khoản của bạn'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCustomized ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-600" />
                Đang dùng tùy chỉnh riêng
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Đang dùng mặc định bộ thẻ
              </span>
            )}
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in",
            message.type === 'success'
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          )}>
            {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* ═══════════ 1. PREFERRED STUDY MODE ═══════════ */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-orange-500" />
              Chế độ học ưa thích cho bộ thẻ này
            </span>
            <span className="text-[10px] font-bold text-slate-400">Ưu tiên khi bấm "Study Now"</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {studyModes.map((mode) => {
              const Icon = mode.icon
              const isSelected = preferredMode === mode.id
              const isDeckDefault = mode.id === defaultCreatorMode

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPreferredMode(mode.id)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer select-none group",
                    isSelected
                      ? `bg-orange-50/50 border-orange-500 shadow-xs ring-1 ring-orange-500/30`
                      : "bg-slate-50/60 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                        mode.color
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={cn("text-xs font-black block truncate", isSelected ? "text-orange-950" : "text-slate-800")}>
                          {mode.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block truncate">
                          {mode.sublabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isDeckDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                          Mặc định
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 text-[10px] shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {mode.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══════════ 2. SENSORY & DISPLAY CUSTOMIZATIONS ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-orange-600" />
            Tùy Chỉnh Âm Thanh & Hình Ảnh
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Audio Autoplay */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  Tự động phát âm thanh TTS
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Gốc: {audioLabelMap[creatorDefs.autoplay_audio || 'none'] || 'Tắt'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                {[
                  { id: 'none', label: 'Tắt' },
                  { id: 'front', label: 'Trước' },
                  { id: 'back', label: 'Sau' },
                  { id: 'always', label: 'Cả hai' },
                ].map(opt => {
                  const active = autoplayAudio === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAutoplayAudio(opt.id as AudioChoice)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                        active
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Image Visibility */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Hiển thị hình ảnh minh họa
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Gốc: {imageLabelMap[creatorDefs.show_images || 'always'] || 'Cả hai mặt'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                {[
                  { id: 'always', label: 'Cả hai' },
                  { id: 'front', label: 'Trước' },
                  { id: 'back', label: 'Sau' },
                  { id: 'none', label: 'Tắt' },
                ].map(opt => {
                  const active = showImages === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setShowImages(opt.id as ImageChoice)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer active:scale-95",
                        active
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ CARD ALIGNMENT (2-AXIS: FRONT & BACK) ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-600" />
            Căn Lề Nội Dung Thẻ (Mặt trước & Mặt sau)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Front Card Alignment */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  🎴 Mặt trước (Front Card)
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Gốc: {creatorDefs.front_valign === 'top' ? 'Trên' : 'Giữa'} / {creatorDefs.front_halign === 'left' ? 'Trái' : 'Giữa'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều dọc:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setFrontValign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontValign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn giữa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrontValign('top')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontValign === 'top'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn trên
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều ngang:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setFrontHalign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontHalign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn giữa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrontHalign('left')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        frontHalign === 'left'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn trái
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Card Alignment */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  📖 Mặt sau (Back Card)
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Gốc: {creatorDefs.back_valign === 'top' ? 'Trên' : 'Giữa'} / {creatorDefs.back_halign === 'center' ? 'Giữa' : 'Trái'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều dọc:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setBackValign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backValign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn giữa
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackValign('top')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backValign === 'top'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn trên
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều ngang:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setBackHalign('left')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backHalign === 'left'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn trái
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackHalign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer active:scale-95",
                        backHalign === 'center'
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      Căn giữa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ 3. BEHAVIOR & INTERACTION TOGGLES ═══════════ */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Tùy Chọn Thao Tác & Trải Nghiệm
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Shuffle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Shuffle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">Xáo trộn thẻ (Shuffle)</span>
              </div>
              <button
                type="button"
                onClick={() => setRandomEnabled(prev => !prev)}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                  randomEnabled ? "bg-orange-500" : "bg-slate-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", randomEnabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>

            {/* SFX */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">Âm thanh SFX</span>
              </div>
              <button
                type="button"
                onClick={() => setSfxEnabled(prev => !prev)}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                  sfxEnabled ? "bg-orange-500" : "bg-slate-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", sfxEnabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>

            {/* Auto Advance */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">Tự động chuyển câu</span>
              </div>
              <button
                type="button"
                onClick={() => setQuickLearnEnabled(prev => !prev)}
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                  quickLearnEnabled ? "bg-orange-500" : "bg-slate-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", quickLearnEnabled ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════ ACTION BUTTONS ═══════════ */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isResetting || isSaving}
            className="px-4 h-10 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Khôi phục toàn bộ cài đặt về thiết lập mặc định ban đầu của tác giả bộ thẻ"
          >
            <ResetIcon className={cn("w-3.5 h-3.5", isResetting && "animate-spin")} />
            <span>{isResetting ? 'Đang khôi phục...' : 'Khôi phục mặc định bộ thẻ'}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isResetting}
            className="px-5 h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CÀI ĐẶT CÁ NHÂN'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

export default DeckPersonalSettings
