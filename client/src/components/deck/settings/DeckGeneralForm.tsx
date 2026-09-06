import React, { useState, useEffect } from 'react'
import {
  Save,
  Globe,
  Lock,
  Tag,
  Check,
  FileText
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { MediaUrlInput } from '../../common/MediaUrlInput'

export interface DeckGeneralFormProps {
  deckId: string | number
  initialData: any
  onSaved?: () => void
}

export function DeckGeneralForm({ deckId, initialData, onSaved }: DeckGeneralFormProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [tagsInput, setTagsInput] = useState('')

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
    }
  }, [initialData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please enter a deck name')
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      await axios.patch(`/api/v1/deck/${deckId}`, {
        title: title.trim(),
        description: description.trim(),
        cover_image: coverImage.trim() || null,
        is_public: isPublic,
        tags: parsedTags,
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save deck metadata')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
              Basic Deck Information
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Title, description, cover image, and access visibility
            </p>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" /> Deck details updated successfully!
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold animate-in fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Deck Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter deck name..."
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            placeholder="JLPT, N2, Vocabulary, Business..."
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
          Detailed Description
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe deck objectives, study recommendations, or source materials..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
        />
      </div>

      <div>
        <MediaUrlInput
          mediaType="image"
          label="Cover Image URL"
          placeholder="Paste URL or press Ctrl+V to upload image to CentralAuth..."
          value={coverImage}
          onChange={(val) => setCoverImage(val)}
        />
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5">
          {isPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
          <div>
            <span className="text-xs font-black text-slate-800 block">
              {isPublic ? 'Public Deck' : 'Private Deck'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isPublic
                ? 'Discoverable and studyable by everyone in the community'
                : 'Accessible only to you and invited collaborators'}
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

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'SAVING...' : 'SAVE CHANGES'}</span>
        </button>
      </div>
    </form>
  )
}

export default DeckGeneralForm
