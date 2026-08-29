import { useState } from 'react'
import { Layers, Flame } from 'lucide-react'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

interface FocusCardRowProps {
  card: {
    id: number
    content: string
    explanation?: string
  }
}

function FocusCardRow({ card }: FocusCardRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const cleanContent = card.content.replace(/<[^>]*>/g, '')

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3 transition-all hover:border-rose-200">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer gap-2"
      >
        <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[220px]">
          {cleanContent}
        </span>
        <span className="text-[8px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md shrink-0 border border-rose-100">
          Box 1 (Khó)
        </span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-slate-100 overflow-hidden text-left"
          >
            <p className="text-[9px] font-medium text-slate-500 leading-relaxed italic">
              <strong>Giải thích:</strong> {card.explanation || "Không có giải thích bổ sung."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface LeitnerDistributionWidgetProps {
  leitnerStats: {
    box_distribution: Array<{ box: number, count: number, label: string }>
    total_tracked: number
    mastery_percentage: number
    hardest_cards: Array<{ id: number, content: string, explanation?: string }>
  } | undefined
}

export default function LeitnerDistributionWidget({ leitnerStats }: LeitnerDistributionWidgetProps) {
  if (!leitnerStats) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left">
      {/* Box Distribution Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Phân Bố 5 Hộp Trí Nhớ Leitner</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1">Mức độ thuộc bài từ Hộp 1 (Mới/Khó) tới Hộp 5 (Thành thạo)</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
                {leitnerStats.mastery_percentage}% Thuần thục
              </span>
            </div>
          </div>

          <div className="h-[200px] w-full mt-2 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leitnerStats.box_distribution}>
                <defs>
                  <linearGradient id="leitnerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#4338ca" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Bar dataKey="count" fill="url(#leitnerGrad)" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-[9px] font-black text-slate-400 uppercase">
          <span>Tổng thẻ trong hệ thống: <strong className="text-slate-800">{leitnerStats.total_tracked}</strong></span>
          <span>Đánh giá ghi nhớ: <strong className="text-indigo-600">{leitnerStats.mastery_percentage > 70 ? 'Xuất sắc' : leitnerStats.mastery_percentage > 40 ? 'Tốt' : 'Khởi đầu'}</strong></span>
        </div>
      </div>

      {/* Cards Needing Focus (Box 1) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-rose-500 to-amber-500" />
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <Flame className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Thẻ Cần Tập Trung</h3>
              <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase tracking-widest">Hộp 1 - Hay trả lời sai</p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
            {leitnerStats.hardest_cards.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-slate-100">
                🎉 Tuyệt vời! Bạn không có thẻ nào bị tồn đọng ở Hộp 1.
              </div>
            ) : (
              leitnerStats.hardest_cards.map((card) => (
                <FocusCardRow key={card.id} card={card} />
              ))
            )}
          </div>
        </div>

        <p className="text-[8.5px] font-bold text-slate-400 border-t border-slate-100 pt-3 mt-3 uppercase tracking-wider">
          💡 Chạm vào thẻ để xem ngay giải thích
        </p>
      </div>
    </div>
  )
}
