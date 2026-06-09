import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, BookOpen, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyComparisonDay {
  date: string;
  new_cards: number;
  unique_cards: number;
  total_reviews: number;
}

interface DailyComparisonChartProps {
  data: DailyComparisonDay[] | undefined;
  isLoading?: boolean;
}

export default function DailyComparisonChart({ data, isLoading }: DailyComparisonChartProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center justify-center text-center h-[320px]">
        <TrendingUp className="w-8 h-8 text-slate-300 animate-pulse mb-3" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Đang tải biểu đồ so sánh...
        </span>
      </div>
    );
  }

  // Today is the last element in the 14-day array
  const todayData = data.length > 0 ? data[data.length - 1] : { date: "", new_cards: 0, unique_cards: 0, total_reviews: 0 };
  const yesterdayData = data.length > 1 ? data[data.length - 2] : { date: "", new_cards: 0, unique_cards: 0, total_reviews: 0 };

  // Calculate Averages
  const validDays = data.filter(d => d !== undefined);
  const totalDays = validDays.length || 1;
  const avgNewCards = Math.round(validDays.reduce((acc, d) => acc + (d.new_cards || 0), 0) / totalDays * 10) / 10;
  const avgUniqueCards = Math.round(validDays.reduce((acc, d) => acc + (d.unique_cards || 0), 0) / totalDays * 10) / 10;
  const avgTotalReviews = Math.round(validDays.reduce((acc, d) => acc + (d.total_reviews || 0), 0) / totalDays * 10) / 10;

  const formatLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;

    // Compare with UTC today / yesterday
    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayUTC = yesterday.toISOString().split('T')[0];

    if (dateStr === todayUTC) return "Hnay";
    if (dateStr === yesterdayUTC) return "Hqua";

    return `${parts[2]}/${parts[1]}`;
  };

  const renderDelta = (todayVal: number, yesterdayVal: number) => {
    const diff = todayVal - yesterdayVal;
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-xl text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
          <ArrowUpRight className="w-2.5 h-2.5 stroke-[3px]" />
          +{diff}
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-xl text-[9px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100">
          <ArrowDownRight className="w-2.5 h-2.5 stroke-[3px]" />
          {diff}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-xl text-[9px] font-extrabold bg-slate-50 text-slate-500 border border-slate-100">
          <Minus className="w-2.5 h-2.5 stroke-[3px]" />
          0
        </span>
      );
    }
  };

  const renderDeltaMini = (todayVal: number, avgVal: number) => {
    const diff = todayVal - avgVal;
    const formattedDiff = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
    if (diff > 0) {
      return <span className="text-emerald-600 font-extrabold">(↑ {formattedDiff})</span>;
    } else if (diff < 0) {
      return <span className="text-rose-600 font-extrabold">(↓ {formattedDiff})</span>;
    } else {
      return <span className="text-slate-500 font-extrabold">(=)</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-5 text-left relative overflow-hidden flex-shrink-0">
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50/20 blur-md pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Hiệu suất hàng ngày</h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">So sánh học tập hôm nay vs hôm qua & trung bình 14 ngày</p>
          </div>
        </div>
      </div>

      {/* Today vs Yesterday Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* New Cards */}
        <div className="flex flex-col bg-amber-50/30 border border-amber-100/50 p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Thẻ mới</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{todayData.new_cards}</span>
            {renderDelta(todayData.new_cards, yesterdayData.new_cards)}
          </div>
          <div className="flex flex-col gap-0.5 mt-1.5 text-[7.5px] font-bold text-slate-400">
            <span>Hôm qua: {yesterdayData.new_cards}</span>
            <span className="flex items-center gap-1">TB: {avgNewCards} {renderDeltaMini(todayData.new_cards, avgNewCards)}</span>
          </div>
        </div>

        {/* Unique Cards */}
        <div className="flex flex-col bg-emerald-50/30 border border-emerald-100/50 p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Đã ôn (Unique)</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{todayData.unique_cards}</span>
            {renderDelta(todayData.unique_cards, yesterdayData.unique_cards)}
          </div>
          <div className="flex flex-col gap-0.5 mt-1.5 text-[7.5px] font-bold text-slate-400">
            <span>Hôm qua: {yesterdayData.unique_cards}</span>
            <span className="flex items-center gap-1">TB: {avgUniqueCards} {renderDeltaMini(todayData.unique_cards, avgUniqueCards)}</span>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="flex flex-col bg-indigo-50/30 border border-indigo-100/50 p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Lượt ôn</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{todayData.total_reviews}</span>
            {renderDelta(todayData.total_reviews, yesterdayData.total_reviews)}
          </div>
          <div className="flex flex-col gap-0.5 mt-1.5 text-[7.5px] font-bold text-slate-400">
            <span>Hôm qua: {yesterdayData.total_reviews}</span>
            <span className="flex items-center gap-1">TB: {avgTotalReviews} {renderDeltaMini(todayData.total_reviews, avgTotalReviews)}</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-[220px] w-full mt-2 -ml-6 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickFormatter={formatLabel}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 text-[10px] font-black uppercase tracking-wider shadow-xl flex flex-col gap-1.5">
                      <p className="text-slate-400 font-bold border-b border-slate-800 pb-1">{d.date}</p>
                      <p className="text-amber-400">Thẻ mới: <span className="text-white font-extrabold">{d.new_cards}</span></p>
                      <p className="text-emerald-400">Đã ôn (Unique): <span className="text-white font-extrabold">{d.unique_cards}</span></p>
                      <p className="text-indigo-400">Lượt ôn: <span className="text-white font-extrabold">{d.total_reviews}</span></p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            {/* Reference lines for daily averages */}
            <ReferenceLine y={avgNewCards} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.6} />
            <ReferenceLine y={avgUniqueCards} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.6} />
            <ReferenceLine y={avgTotalReviews} stroke="#6366f1" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.6} />

            <Bar dataKey="new_cards" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={10} />
            <Bar dataKey="unique_cards" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={10} />
            <Bar dataKey="total_reviews" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 border-t border-slate-50 pt-3">
        <div className="flex justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Thẻ mới</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Đã ôn (Unique)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-indigo-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Lượt ôn</span>
          </div>
        </div>
        <div className="text-center text-[7.5px] font-bold text-slate-400 italic">
          * Đường nét đứt (---) tương ứng trên biểu đồ biểu thị giá trị Trung bình (TB) của từng chỉ số
        </div>
      </div>
    </div>
  );
}
