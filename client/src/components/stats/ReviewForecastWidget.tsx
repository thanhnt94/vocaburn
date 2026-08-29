import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts'
import { cn } from '@/lib/utils'

export interface ForecastHour {
  hour: number
  label: string
  count: number
  cumulative: number
}

export interface ForecastDay {
  day_index: number
  date: string
  label: string
  count: number
  cumulative: number
}

export interface ForecastWeek {
  week_index: number
  label: string
  range: string
  count: number
  cumulative: number
}

export interface ForecastResponse {
  hourly: ForecastHour[]
  daily: ForecastDay[]
  weekly: ForecastWeek[]
}

interface ReviewForecastWidgetProps {
  data: ForecastResponse | undefined
  activePeriod?: 'day' | 'week' | 'month' | 'year' | 'all'
}

export default function ReviewForecastWidget({ data, activePeriod }: ReviewForecastWidgetProps) {
  const [viewModeOverride, setViewModeOverride] = useState<'hourly' | 'daily' | 'weekly' | null>(null)
  
  const viewMode = useMemo(() => {
    if (viewModeOverride) return viewModeOverride
    if (activePeriod === 'day') return 'hourly'
    if (activePeriod === 'year' || activePeriod === 'all') return 'weekly'
    return 'daily'
  }, [viewModeOverride, activePeriod])

  const setViewMode = (mode: 'hourly' | 'daily' | 'weekly') => setViewModeOverride(mode)
  const daysRange = activePeriod === 'month' ? 30 : activePeriod === 'week' ? 7 : 14

  const chartData = useMemo<any[]>(() => {
    if (!data) return []
    if (viewMode === 'hourly') return data.hourly || []
    if (viewMode === 'weekly') return data.weekly || []
    return (data.daily || []).slice(0, daysRange)
  }, [data, viewMode, daysRange])

  if (!data || !data.daily || data.daily.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-48">
        <TrendingUp className="w-8 h-8 text-slate-300 animate-pulse mb-3" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tính toán dữ liệu dự báo...</span>
      </div>
    )
  }

  const todayCount = viewMode === 'hourly' 
    ? (data.daily[0]?.count || 0) 
    : viewMode === 'daily' 
      ? (data.daily[0]?.count || 0) 
      : (data.weekly[0]?.count || 0)

  const maxCumulative = chartData.length > 0 
    ? chartData[chartData.length - 1]?.cumulative 
    : 0

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 text-left relative overflow-hidden">
      <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500" />
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-orange-50/20 blur-md pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-sm shadow-orange-100">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Dự báo ôn tập FSRS</h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">Lượng thẻ ôn tập dự kiến theo chu kỳ trí nhớ</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 self-start sm:self-auto">
          {(['hourly', 'daily', 'weekly'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-2.5 sm:px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                viewMode === mode
                  ? "bg-white text-orange-600 shadow-sm border border-slate-100/50"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {mode === 'hourly' ? 'Giờ' : mode === 'daily' ? 'Ngày' : 'Tuần'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-orange-50/50 to-indigo-50/30 p-3 rounded-2xl border border-slate-100">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
            {viewMode === 'hourly' ? "Hôm nay cần ôn" : viewMode === 'daily' ? "Hôm nay cần ôn" : "Tuần này cần ôn"}
          </span>
          <span className="text-sm sm:text-base font-black text-orange-600 mt-0.5">{todayCount} thẻ</span>
        </div>
        <div className="flex flex-col border-l border-slate-100 pl-3">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
            {viewMode === 'hourly' ? "Tích lũy 24h" : viewMode === 'daily' ? `Tích lũy ${daysRange} ngày` : "Tích lũy 4 tuần"}
          </span>
          <span className="text-sm sm:text-base font-black text-indigo-600 mt-0.5">{maxCumulative} thẻ</span>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-[200px] sm:h-[220px] w-full mt-2 -ml-6 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="forecastBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#ea580c" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#f97316' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#6366f1' }}
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  let titleStr = d.date || ""
                  if (viewMode === 'hourly') {
                    titleStr = `Giờ ${d.label} (Hôm nay)`
                  } else if (viewMode === 'weekly') {
                    titleStr = `${d.label} (${d.range})`
                  }
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 text-[10px] font-black uppercase tracking-wider shadow-xl flex flex-col gap-1.5">
                      <p className="text-slate-400 font-bold border-b border-slate-800 pb-1">{titleStr}</p>
                      <p className="text-orange-400">Đến hạn: <span className="text-white font-extrabold">{d.count} thẻ</span></p>
                      <p className="text-indigo-400">Tích lũy: <span className="text-white font-extrabold">{d.cumulative} thẻ</span></p>
                    </div>
                  )
                }
                return null
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              fill="url(#forecastBarGrad)"
              radius={[4, 4, 0, 0]}
              barSize={viewMode === 'hourly' ? 6 : viewMode === 'weekly' ? 32 : 16}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 2, stroke: '#6366f1', strokeWidth: 1, fill: '#fff' }}
              activeDot={{ r: 4, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
