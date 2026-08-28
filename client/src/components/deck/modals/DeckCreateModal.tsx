import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Sparkles, Globe, Lock, Image as ImageIcon } from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newDeckId: number) => void
}

export function DeckCreateModal({ isOpen, onClose, onSuccess }: DeckCreateModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (!isOpen) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tên bộ thẻ')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await axios.post('/api/v1/deck/create', {
        title: title.trim(),
        description: description.trim(),
        cover_image: coverImage.trim() || null,
        is_public: isPublic,
      })

      const newId = res.data.id
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
      if (onSuccess) {
        onSuccess(newId)
      } else {
        navigate(`/decks/${newId}?tab=cards`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Có lỗi xảy ra khi tạo bộ thẻ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative z-10 p-6 border border-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Tạo Bộ Thẻ Mới</h3>
                <p className="text-[11px] text-slate-400 font-bold">Khởi tạo kho từ vựng cá nhân</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 text-left">
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                Tên Bộ Thẻ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: 500 Từ Vựng N2 Hay Gặp..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                Mô tả ngắn
              </label>
              <textarea
                placeholder="Mô tả mục tiêu, nguồn tài liệu hoặc ghi chú..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                URL Ảnh bìa (Tùy chọn)
              </label>
              <div className="flex items-center gap-2">
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
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                {isPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {isPublic ? 'Bộ thẻ Công khai' : 'Bộ thẻ Riêng tư'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isPublic ? 'Mọi người trong cộng đồng có thể xem và học' : 'Chỉ mình bạn có thể truy cập'}
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

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'ĐANG TẠO...' : 'TẠO BỘ THẺ 🚀'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckCreateModal
