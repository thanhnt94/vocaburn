import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, Trash2, Search, ArrowRightLeft, X, ShieldCheck } from 'lucide-react'
import axios from 'axios'

export interface DeckCollaboratorsModalProps {
  isOpen: boolean
  onClose: () => void
  deckId: string | number
  isOwner?: boolean
}

export function DeckCollaboratorsModal({
  isOpen,
  onClose,
  deckId,
  isOwner = true
}: DeckCollaboratorsModalProps) {
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

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
    if (isOpen) {
      fetchCollaborators()
    }
  }, [isOpen, deckId])

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
      fetchCollaborators()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Không thể thêm cộng tác viên')
    }
  }

  const handleRemoveCollaborator = async (collabUserId: number) => {
    if (!window.confirm('Gỡ quyền cộng tác viên của tài khoản này?')) return
    try {
      await axios.delete(`/api/v1/deck/${deckId}/collaborators/${collabUserId}`)
      fetchCollaborators()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Không thể gỡ cộng tác viên')
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
      onClose()
      window.location.reload()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Chuyển quyền sở hữu thất bại')
    }
  }

  if (!isOpen) return null

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
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative z-10 p-6 border border-slate-100 flex flex-col max-h-[90vh] text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  Quản Lý Cộng Tác Viên
                </h3>
                <p className="text-[11px] text-slate-400 font-bold">
                  Phân quyền chỉnh sửa bộ thẻ cho thành viên khác
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {/* Search and add collaborator */}
            {isOwner && (
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Tìm người dùng để thêm cộng tác
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập tên đăng nhập hoặc email..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>

                {/* Search Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="p-2 border border-slate-200 bg-white rounded-2xl shadow-lg space-y-1">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all text-xs"
                      >
                        <div>
                          <strong className="text-slate-800">@{u.username}</strong>
                          {u.full_name && <span className="text-slate-400 ml-2 font-medium">({u.full_name})</span>}
                        </div>
                        <button
                          onClick={() => handleAddCollaborator(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[10px]"
                        >
                          + Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current collaborators list */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                Danh sách cộng tác viên hiện tại ({collaborators.length})
              </label>

              {collaborators.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-400 font-medium">
                  Chưa có cộng tác viên nào được thêm.
                </div>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <strong className="text-slate-800 block">@{c.username}</strong>
                        <span className="text-[10px] text-slate-400">{c.full_name || 'Cộng tác viên'}</span>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTransferOwnership(c.id, c.username)}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1"
                            title="Chuyển quyền chủ sở hữu cho người này"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Nhượng quyền</span>
                          </button>

                          <button
                            onClick={() => handleRemoveCollaborator(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
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
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckCollaboratorsModal
