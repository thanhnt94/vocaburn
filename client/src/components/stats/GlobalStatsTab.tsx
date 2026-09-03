import { Globe, Users, BookOpen, Layers, CheckCircle2, Zap, Sparkles, TrendingUp, ShieldCheck, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

export interface GlobalStatsData {
  total_questions: number
  total_quizzes: number
  total_users: number
  platform_accuracy: number
  avg_time_per_question: number
}

interface GlobalStatsTabProps {
  globalStats: GlobalStatsData | undefined
  isLoading?: boolean
}

export default function GlobalStatsTab({ globalStats, isLoading }: GlobalStatsTabProps) {
  const stats = globalStats || {
    total_questions: 0,
    total_quizzes: 0,
    total_users: 0,
    platform_accuracy: 0,
    avg_time_per_question: 0
  }

  const milestones = [
    {
      label: 'Cộng Đồng Người Học',
      value: stats.total_users.toLocaleString(),
      sub: 'Thành viên cùng nỗ lực',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      tag: 'Thành viên'
    },
    {
      label: 'Kho Học Liệu Mở',
      value: stats.total_quizzes.toLocaleString(),
      sub: 'Bộ flashcard chia sẻ',
      icon: BookOpen,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      tag: 'Bộ thẻ'
    },
    {
      label: 'Tổng Thẻ & Câu Hỏi',
      value: stats.total_questions.toLocaleString(),
      sub: 'Từ vựng & câu hỏi đã tạo',
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      tag: 'Từ vựng'
    },
    {
      label: 'Chính Xác Toàn Sàn',
      value: `${stats.platform_accuracy}%`,
      sub: 'Tỷ lệ trả lời chuẩn xác',
      icon: CheckCircle2,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      tag: 'Tỷ lệ đúng'
    }
  ]

  return (
    <div className="space-y-6 text-left w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
      {/* 🌍 Inspiring Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 backdrop-blur-md">
              <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-emerald-400" /> Sức Mạnh Tri Thức Cộng Đồng
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wide leading-tight">
                Hành Trình Chinh Phục Ngoại Ngữ Cùng Nhau
              </h2>
              <p className="text-xs text-indigo-200/90 mt-1 max-w-2xl leading-relaxed">
                Mỗi lượt lật thẻ và câu hỏi hoàn thành đều đóng góp vào bức tranh tiến bộ chung của toàn bộ cộng đồng Vocaburn. Chúng ta không học một mình!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="text-center px-2">
              <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Tốc độ TB</span>
              <span className="text-sm sm:text-base font-black text-white">{stats.avg_time_per_question}s / câu</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-[8px] font-black text-emerald-300 uppercase tracking-widest block">Hệ thống</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 uppercase">99.9% Ổn định</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 4 Key Platform Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {milestones.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${item.bg} ${item.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                  {item.tag}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {item.label}
                </h4>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {item.value}
                </div>
                <p className="text-[8.5px] font-semibold text-slate-400">
                  {item.sub}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 🌟 Community Spirit & Platform Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                  Tinh Thần Học Tập Bền Bỉ
                </h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1">Cảm hứng từ hàng ngàn phiên luyện tập mỗi ngày</p>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Toàn bộ người học trên Vocaburn đang cùng nhau duy trì chuỗi học tập liên tục và áp dụng thuật toán ghi nhớ giãn cách <strong>FSRS v6</strong> để biến từ vựng thành phản xạ tự nhiên.
            </p>
          </div>

          <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">Mục tiêu chung:</span>
            <span className="font-black text-indigo-600">100% Ghi nhớ dài hạn 🚀</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                  Chất Lượng Học Liệu
                </h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1">Tiêu chuẩn câu hỏi & âm thanh AI phát âm chuẩn</p>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Tỷ lệ chính xác trung bình toàn hệ thống đạt <strong>{stats.platform_accuracy}%</strong> với tốc độ phản xạ trung bình <strong>{stats.avg_time_per_question}s / câu</strong> chứng minh hiệu quả vượt trội của phương pháp Spaced Repetition.
            </p>
          </div>

          <div className="mt-5 p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-700">Trạng thái vận hành:</span>
            <span className="font-black text-emerald-700">Hoạt động trơn tru ⚡</span>
          </div>
        </div>
      </div>
    </div>
  )
}
