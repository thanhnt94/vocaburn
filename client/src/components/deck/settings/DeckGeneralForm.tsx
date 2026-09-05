import React, { useState, useEffect } from 'react'
import {
  Save,
  Globe,
  Lock,
  Image as ImageIcon,
  Sparkles,
  Tag,
  Check,
  Brain,
  Compass,
  RotateCcw,
  Trophy,
  Keyboard,
  Headphones,
  Volume2,
  VolumeX,
  ImageOff,
  Shuffle,
  Music,
  Sliders
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export interface DeckGeneralFormProps {
  deckId: string | number
  initialData: any
  onSaved?: () => void
}

export type DeckStudyMode = 'fsrs' | 'roadmap' | 'flip' | 'mcq' | 'typing' | 'listening'

export function DeckGeneralForm({ deckId, initialData, onSaved }: DeckGeneralFormProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [tagsInput, setTagsInput] = useState('')

  // Deck Creator Study Defaults
  const [defaultMode, setDefaultMode] = useState<DeckStudyMode>('fsrs')
  const [autoplayAudio, setAutoplayAudio] = useState<'none' | 'front' | 'back' | 'always'>('none')
  const [showImages, setShowImages] = useState<'always' | 'front' | 'back' | 'none'>('always')
  const [frontValign, setFrontValign] = useState<'center' | 'top'>('center')
  const [frontHalign, setFrontHalign] = useState<'center' | 'left'>('center')
  const [backValign, setBackValign] = useState<'center' | 'top'>('center')
  const [backHalign, setBackHalign] = useState<'left' | 'center'>('left')
  const [randomEnabled, setRandomEnabled] = useState(false)
  const [sfxEnabled, setSfxEnabled] = useState(true)
  const [quickLearnEnabled, setQuickLearnEnabled] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setDescription(initialData.description || '')
      setCoverImage(initialData.cover_image || '')
      setIsPublic(initialData.is_public !== false)
      setTagsInput(Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '')

      const studyDefs = initialData?.practice_settings?.study_defaults || {}
      if (studyDefs.learning_mode) setDefaultMode(studyDefs.learning_mode)
      if (studyDefs.autoplay_audio) setAutoplayAudio(studyDefs.autoplay_audio)
      if (studyDefs.show_images) setShowImages(studyDefs.show_images)
      if (studyDefs.front_valign) setFrontValign(studyDefs.front_valign)
      if (studyDefs.front_halign) setFrontHalign(studyDefs.front_halign)
      if (studyDefs.back_valign) setBackValign(studyDefs.back_valign)
      if (studyDefs.back_halign) setBackHalign(studyDefs.back_halign)
      if (studyDefs.random_enabled !== undefined) setRandomEnabled(Boolean(studyDefs.random_enabled))
      if (studyDefs.sfx_enabled !== undefined) setSfxEnabled(Boolean(studyDefs.sfx_enabled))
      if (studyDefs.quick_learn_enabled !== undefined) setQuickLearnEnabled(Boolean(studyDefs.quick_learn_enabled))
    }
  }, [initialData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tên bộ thẻ')
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const studyDefaults = {
      learning_mode: defaultMode,
      autoplay_audio: autoplayAudio,
      show_images: showImages,
      front_valign: frontValign,
      front_halign: frontHalign,
      back_valign: backValign,
      back_halign: backHalign,
      random_enabled: randomEnabled,
      sfx_enabled: sfxEnabled,
      quick_learn_enabled: quickLearnEnabled
    }

    try {
      await axios.patch(`/api/v1/deck/${deckId}`, {
        title: title.trim(),
        description: description.trim(),
        cover_image: coverImage.trim() || null,
        is_public: isPublic,
        tags: parsedTags,
        study_defaults: studyDefaults
      })

      // Also sync to practice-settings with is_creator: true for complete consistency
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        settings: {
          study_defaults: studyDefaults
        }
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể lưu thông tin bộ thẻ')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Thông Tin Cơ Bản Bộ Thẻ
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Tiêu đề, mô tả, ảnh bìa và phân quyền truy cập
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
          <Check className="w-4 h-4" /> Đã cập nhật thông tin bộ thẻ thành công!
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Tên Bộ Thẻ <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Nhãn Dán (Tags - phân cách bằng dấu phẩy)
          </label>
          <input
            type="text"
            placeholder="JLPT, N2, Từ Vựng, Giao Tiếp..."
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
          Mô Tả Chi Tiết
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả mục tiêu, nguồn tài liệu hoặc hướng dẫn học..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
        />
      </div>

      <div>
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
          URL Ảnh Bìa (Cover Image)
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="url"
              placeholder="https://example.com/cover.jpg"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
            />
            <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5" />
          </div>
          {coverImage && (
            <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden shrink-0">
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5">
          {isPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
          <div>
            <span className="text-xs font-black text-slate-800 block">
              {isPublic ? 'Bộ thẻ Công khai (Public)' : 'Bộ thẻ Riêng tư (Private)'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isPublic ? 'Mọi người trong cộng đồng có thể tìm thấy và học bộ thẻ này' : 'Chỉ bạn và cộng tác viên mới có quyền xem'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
            isPublic ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
              isPublic ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* ═══════════ CHẾ ĐỘ HỌC MẶC ĐỊNH CỦA BỘ THẺ (DECK DEFAULT STUDY MODE) ═══════════ */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/70 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-500" />
              <span>Chế Độ Học Mặc Định Bộ Thẻ (Default Study Mode)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Chỉ định chế độ học và trải nghiệm khởi đầu khi người học bấm "Study Now" mở bộ thẻ này
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100/80 text-orange-800 border border-orange-200/70">
            Cài đặt tác giả
          </span>
        </div>

        {/* 6 Modes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[
            {
              id: 'fsrs' as const,
              title: 'Flashcard FSRS',
              sublabel: 'Lặp lại ngắt quãng v6',
              desc: 'Ôn luyện ghi nhớ thông minh theo thuật toán FSRS hiện đại',
              icon: Brain,
              color: 'text-purple-600 bg-purple-50',
            },
            {
              id: 'roadmap' as const,
              title: 'Flashcard Lộ Trình',
              sublabel: 'Roadmap hàng ngày',
              desc: 'Học thẻ mới và ôn tập đúng hạn theo chỉ tiêu mỗi ngày',
              icon: Compass,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              id: 'flip' as const,
              title: 'Lật Thẻ Phản Xạ',
              sublabel: 'Flip Cards tự do',
              desc: 'Chế độ lật thẻ 2 mặt truyền thống, thích hợp xem lướt phản xạ',
              icon: RotateCcw,
              color: 'text-emerald-600 bg-emerald-50',
            },
            {
              id: 'mcq' as const,
              title: 'Trắc Nghiệm MCQ',
              sublabel: 'Chọn 1 trong 4 đáp án',
              desc: 'Hỏi mặt trước và chọn nhanh đáp án mặt sau từ các phương án ngẫu nhiên',
              icon: Trophy,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              id: 'typing' as const,
              title: 'Gõ Từ Vựng',
              sublabel: 'Luyện nhớ mặt chữ',
              desc: 'Bắt buộc gõ chuẩn xác từng ký tự của từ vựng để ghi nhớ sâu',
              icon: Keyboard,
              color: 'text-indigo-600 bg-indigo-50',
            },
            {
              id: 'listening' as const,
              title: 'Luyện Nghe',
              sublabel: 'Nghe TTS chọn nghĩa',
              desc: 'Phát âm thanh đọc mẫu và chọn đáp án dịch nghĩa chuẩn',
              icon: Headphones,
              color: 'text-sky-600 bg-sky-50',
            },
          ].map(m => {
            const Icon = m.icon
            const isSelected = defaultMode === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setDefaultMode(m.id)}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer select-none group",
                  isSelected
                    ? "bg-white border-orange-500 shadow-xs ring-1 ring-orange-500/30"
                    : "bg-white/80 border-slate-200/70 hover:bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                      m.color
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={cn("text-xs font-black block truncate", isSelected ? "text-orange-950" : "text-slate-800")}>
                        {m.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold block truncate">
                        {m.sublabel}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 text-[10px] shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {m.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Sensory & Input Defaults Row */}
        <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* TTS Autoplay */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                Âm thanh đọc TTS mặc định
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
              {[
                { id: 'none', label: 'Tắt', icon: VolumeX },
                { id: 'front', label: 'Mặt trước', icon: Volume2 },
                { id: 'back', label: 'Mặt sau', icon: Volume2 },
                { id: 'always', label: 'Cả hai', icon: Volume2 }
              ].map(opt => {
                const active = autoplayAudio === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAutoplayAudio(opt.id as any)}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95",
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white"
                    )}
                  >
                    <opt.icon className="w-3 h-3" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Show Images */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                Hình ảnh minh họa mặc định
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
              {[
                { id: 'always', label: 'Cả hai', icon: ImageIcon },
                { id: 'front', label: 'Mặt trước', icon: ImageIcon },
                { id: 'back', label: 'Mặt sau', icon: ImageIcon },
                { id: 'none', label: 'Tắt', icon: ImageOff }
              ].map(opt => {
                const active = showImages === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShowImages(opt.id as any)}
                    className={cn(
                      "py-1.5 px-1 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95",
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white"
                    )}
                  >
                    <opt.icon className="w-3 h-3" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Card Alignment (2-Axis: Front & Back) */}
        <div className="space-y-2.5 pt-1">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Căn lề nội dung thẻ (Mặt trước & Mặt sau)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Front Card Alignment */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200/70 space-y-2.5">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                🎴 Mặt trước (Front Card)
              </span>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều dọc:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setFrontValign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        frontValign === 'center'
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn giữa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrontValign('top')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        frontValign === 'top'
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn trên
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều ngang:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setFrontHalign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        frontHalign === 'center'
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn giữa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrontHalign('left')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        frontHalign === 'left'
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn trái
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Card Alignment */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200/70 space-y-2.5">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                📖 Mặt sau (Back Card)
              </span>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều dọc:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setBackValign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        backValign === 'center'
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn giữa
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackValign('top')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        backValign === 'top'
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn trên
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Chiều ngang:</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setBackHalign('left')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        backHalign === 'left'
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      )}
                    >
                      Căn trái
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackHalign('center')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center cursor-pointer",
                        backHalign === 'center'
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
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

        {/* Sensory Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Shuffle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Mặc định xáo trộn (Shuffle)</span>
            </div>
            <button
              type="button"
              onClick={() => setRandomEnabled(!randomEnabled)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                randomEnabled ? "bg-orange-500" : "bg-slate-200"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", randomEnabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Music className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Âm thanh SFX</span>
            </div>
            <button
              type="button"
              onClick={() => setSfxEnabled(!sfxEnabled)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer",
                sfxEnabled ? "bg-orange-500" : "bg-slate-200"
              )}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-transform", sfxEnabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 truncate">Tự động chuyển câu</span>
            </div>
            <button
              type="button"
              onClick={() => setQuickLearnEnabled(!quickLearnEnabled)}
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

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}</span>
        </button>
      </div>
    </form>
  )
}

export default DeckGeneralForm
