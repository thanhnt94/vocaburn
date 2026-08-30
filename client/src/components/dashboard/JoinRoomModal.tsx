import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  roomCode: string
  setRoomCode: (code: string) => void
  onJoin: () => void
  isJoining: boolean
}

export function JoinRoomModal({
  isOpen,
  onClose,
  roomCode,
  setRoomCode,
  onJoin,
  isJoining
}: JoinRoomModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Enter Arena Room</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enter Arena Room Code</label>
            <input
              type="text"
              placeholder="e.g. AZ78K"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
            />
          </div>

          <button
            onClick={onJoin}
            disabled={!roomCode || isJoining}
            className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
          >
            {isJoining ? 'CONNECTING...' : 'ENTER ROOM NOW'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
