import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Users } from 'lucide-react'
import axios from 'axios'

export interface DeckJoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DeckJoinRoomModal({ isOpen, onClose }: DeckJoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/deck/room/join', { room_code: roomCode.trim() })
      onClose()
      navigate(`/room/${roomCode.trim().toUpperCase()}`)
    } catch (e) {
      alert('Phòng không tồn tại hoặc đã kết thúc!')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
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
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl relative z-10 p-6 border border-slate-100"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                Tham Gia Phòng Đấu
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">
                Nhập mã phòng Arena
              </label>
              <input
                type="text"
                placeholder="VD: AZ78K"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && roomCode.trim()) handleJoinRoom()
                }}
                className="w-full h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 text-xl font-black tracking-[0.25em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-xs"
                autoFocus
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!roomCode.trim() || isJoining}
              className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none cursor-pointer"
            >
              {isJoining ? 'ĐANG KẾT NỐI...' : 'VÀO PHÒNG NGAY 🚀'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DeckJoinRoomModal
