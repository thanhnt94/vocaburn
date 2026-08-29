import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Trash2, Search, ArrowRightLeft, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface DeckCollaboratorsSettingsProps {
  deckId: string | number
  isOwner?: boolean
}

export function DeckCollaboratorsSettings({ deckId, isOwner = true }: DeckCollaboratorsSettingsProps) {
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchCollaborators = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`/api/v1/deck/${deckId}/collaborators`)
      setCollaborators(res.data || [])
    } catch (e) {
      console.error('Failed to fetch collaborators', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (deckId) {
      fetchCollaborators()
    }
  }, [deckId])

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await axios.get('/api/v1/deck/users/search', { params: { q: q.trim() } })
      setSearchResults(res.data || [])
    } catch (e) {
      console.error('Search failed', e)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddCollaborator = async (userId: number) => {
    try {
      await axios.post(`/api/v1/deck/${deckId}/collaborators`, { user_id: userId })
      setSearchQuery('')
      setSearchResults([])
      setMessage({ type: 'success', text: 'Đã thêm cộng tác viên thành công!' })
      setTimeout(() => setMessage(null), 4000)
      fetchCollaborators()
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Không thể thêm cộng tác viên' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleRemoveCollaborator = async (collabUserId: number, username: string) => {
    if (!window.confirm(`Gỡ quyền cộng tác viên của tài khoản @${username}?`)) return
    try {
      await axios.delete(`/api/v1/deck/${deckId}/collaborators/${collabUserId}`)
      setMessage({ type: 'success', text: `Đã gỡ quyền cộng tác viên của @${username}` })
      setTimeout(() => setMessage(null), 4000)
      fetchCollaborators()
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Không thể gỡ cộng tác viên' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleTransferOwnership = async (newOwnerId: number, username: string) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn chuyển nhượng toàn quyền sở hữu bộ thẻ này cho @${username}? Thao tác này không thể hoàn tác!`
      )
    )
      return

    try {
      await axios.post(`/api/v1/deck/${deckId}/transfer-ownership`, { user_id: newOwnerId })
      alert('Đã chuyển nhượng quyền sở hữu thành công!')
      window.location.reload()
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Chuyển quyền sở hữu thất bại' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      {/* ── HEADER CARD ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Quản lý Cộng Tác Viên (Collaborators)
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-black">
                {collaborators.length} thành viên
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Phân quyền chỉnh sửa bộ thẻ cho các thành viên khác cùng đóng góp và xây dựng từ vựng.
            </p>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={cn(
              "mt-4 p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-bold animate-in fade-in",
              message.type === 'success'
                ? "bg-emerald-50 border-emerald-200/80 text-emerald-700"
                : "bg-rose-50 border-rose-200/80 text-rose-700"
            )}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* ── SEARCH & ADD COLLABORATORS ── */}
      {isOwner && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Thêm Cộng Tác Viên Mới
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tìm kiếm tài khoản thành viên trong hệ thống theo username hoặc email.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Nhập tên đăng nhập hoặc email thành viên..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-xs font-medium bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Search Dropdown Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 space-y-1 max-h-52 overflow-y-auto"
              >
                {searchResults.map((u) => {
                  const isAlready = collaborators.some((c) => c.user_id === u.id)
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                          {u.username?.[0] || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">@{u.username}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{u.email}</span>
                        </div>
                      </div>

                      {isAlready ? (
                        <span className="text-[11px] font-bold text-slate-400 px-3 py-1 bg-slate-200/60 rounded-lg">
                          Đã thêm
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddCollaborator(u.id)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── CURRENT COLLABORATORS LIST ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Danh Sách Cộng Tác Viên Hiện Tại ({collaborators.length})
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Những thành viên có quyền thêm, sửa thẻ từ và cập nhật nội dung bộ thẻ.
            </p>
          </div>
        </div>

        {collaborators.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Chưa có cộng tác viên nào</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Bộ thẻ này hiện chỉ do bạn quản lý. Bạn có thể tìm kiếm thành viên ở trên để thêm cộng tác viên cùng chỉnh sửa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {collaborators.map((collab) => (
              <div
                key={collab.user_id}
                className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center justify-between gap-3 group transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm uppercase shadow-xs shrink-0">
                    {collab.username?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 truncate block">
                      @{collab.username}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block mt-0.5">
                      {collab.role || 'Cộng tác viên'}
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTransferOwnership(collab.user_id, collab.username)}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 text-slate-500 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Chuyển nhượng toàn quyền sở hữu"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Nhượng quyền</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveCollaborator(collab.user_id, collab.username)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Gỡ quyền"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
