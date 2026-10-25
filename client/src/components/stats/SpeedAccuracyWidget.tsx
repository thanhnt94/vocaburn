import { Activity, Timer } from 'lucide-react'
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts'
import { cn } from '@/lib/utils'

interface SpeedAccuracyWidgetProps {
  speedAccuracyStats: {
    bins: Array<{ label: string, accuracy: number }>
    avg_speed_correct: number
    avg_speed_wrong: number
  } | undefined
  embedded?: boolean
}

export default function SpeedAccuracyWidget({ speedAccuracyStats, embedded = false }: SpeedAccuracyWidgetProps) {
  if (!speedAccuracyStats) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
      {/* Accuracy vs Speed Bins */}
      <div className={cn(
        "lg:col-span-2 relative overflow-hidden flex flex-col justify-between",
        !embedded && "bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm",
        embedded && "p-1"
      )}>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Speed vs Accuracy Correlation
              </h4>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Accuracy percentage across response latency buckets
              </p>
            </div>
          </div>

          <div className="h-[210px] w-full -ml-4 pr-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={speedAccuracyStats.bins}>
                <defs>
                  <linearGradient id="speedAccGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} unit="%" />
                <Tooltip 
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '10px', fontWeight: 800 }} 
                />
                <Area type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#speedAccGrad)" name="Accuracy (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Solve Velocity */}
      <div className={cn(
        "flex flex-col justify-between relative overflow-hidden",
        !embedded && "bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm",
        embedded && "p-1 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5"
      )}>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Reaction Velocity
              </h4>
              <p className="text-[9px] font-bold text-amber-600 mt-1 uppercase tracking-wider">
                Average latency per response
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">When Correct</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-600 leading-none">{speedAccuracyStats.avg_speed_correct}s</span>
              </div>
              <p className="text-[7.5px] font-medium text-slate-400 mt-1 uppercase">Swift recall speed</p>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">When Incorrect</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-rose-600 leading-none">{speedAccuracyStats.avg_speed_wrong}s</span>
              </div>
              <p className="text-[7.5px] font-medium text-slate-400 mt-1 uppercase">Hesitation / lapse latency</p>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100/40">
          <p className="text-[9px] font-bold text-indigo-700 leading-relaxed">
            {speedAccuracyStats.avg_speed_correct < speedAccuracyStats.avg_speed_wrong ? (
              "💡 Your rapid recall on mastered cards indicates strong neural pathway reinforcement."
            ) : (
              "💡 Thoughtful deliberation before answering helps prevent premature lapses."
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
