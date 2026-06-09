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

interface AllTimeAvg {
  new_cards: number;
  unique_cards: number;
  total_reviews: number;
  active_days: number;
}

interface DailyComparisonChartProps {
  data: DailyComparisonDay[] | undefined;
  allTimeAvg?: AllTimeAvg;
  isLoading?: boolean;
}

export default function DailyComparisonChart({ data, allTimeAvg, isLoading }: DailyComparisonChartProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center justify-center text-center h-[400px]">
        <TrendingUp className="w-8 h-8 text-slate-300 animate-pulse mb-3" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Đang tải biểu đồ so sánh...
        </span>
      </div>
    );
  }

  // Today is the last element in the array
  const todayData = data.length > 0 ? data[data.length - 1] : { date: "", new_cards: 0, unique_cards: 0, total_reviews: 0 };
  const yesterdayData = data.length > 1 ? data[data.length - 2] : { date: "", new_cards: 0, unique_cards: 0, total_reviews: 0 };

  const formatLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayUTC = yesterday.toISOString().split('T')[0];

    if (dateStr === todayUTC) return "Hnay";
    if (dateStr === yesterdayUTC) return "Hqua";

    return `${parts[2]}/${parts[1]}`;
  };

  const renderDeltaPill = (todayVal: number, compareVal: number) => {
    const diff = todayVal - compareVal;
    if (diff > 0) {
      return (
        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
          <ArrowUpRight className="w-3 h-3 stroke-[3px]" />
          {diff.toFixed(diff % 1 === 0 ? 0 : 1)}
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-500 border border-rose-100">
          <ArrowDownRight className="w-3 h-3 stroke-[3px]" />
          {diff.toFixed(Math.abs(diff) % 1 === 0 ? 0 : 1)}
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-50 text-slate-400 border border-slate-100">
          <Minus className="w-3 h-3 stroke-[3px]" />
          ±0
        </div>
      );
    }
  };

  const renderAvgDiff = (todayVal: number, avgVal: number) => {
    const diff = todayVal - avgVal;
    if (diff > 0) {
      return <span className="text-emerald-500 font-black">(↑ +{diff.toFixed(1)})</span>;
    } else if (diff < 0) {
      return <span className="text-rose-500 font-black">(↓ {diff.toFixed(1)})</span>;
    } else {
      return <span className="text-slate-400 font-black">(±0)</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] py-5 px-3 sm:p-7 shadow-sm flex flex-col gap-6 text-left relative">
      {/* Header section */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-[1rem] bg-orange-50 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-6 h-6 text-orange-500 stroke-[2.5px]" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-wide italic leading-tight">
            Hiệu suất hàng ngày
          </h3>
          <p className="text-[10px] sm:text-xs font-bold text-slate-400">
            So sánh học tập hôm nay vs hôm qua & trung bình {allTimeAvg?.active_days || 0} ngày
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* New Cards */}
        <div className="bg-amber-50/20 border border-amber-100/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-2 relative overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-widest text-slate-500 truncate">Thẻ mới</span>
          </div>
          <div className="flex flex-row items-center sm:items-end gap-1.5 sm:gap-3 mt-0.5 sm:mt-1">
            <span className="text-xl sm:text-3xl font-black text-slate-800 leading-none">{todayData.new_cards}</span>
            <div className="pb-0 sm:pb-1">{renderDeltaPill(todayData.new_cards, yesterdayData.new_cards)}</div>
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-0.5 mt-1 sm:mt-2">
            {allTimeAvg && allTimeAvg.active_days > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-tight">
                TB: {allTimeAvg.new_cards} <br className="sm:hidden" /> {renderAvgDiff(todayData.new_cards, allTimeAvg.new_cards)}
              </span>
            )}
          </div>
        </div>

        {/* Unique Cards */}
        <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-2 relative overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
            <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-widest text-slate-500 truncate">Đã ôn (U)</span>
          </div>
          <div className="flex flex-row items-center sm:items-end gap-1.5 sm:gap-3 mt-0.5 sm:mt-1">
            <span className="text-xl sm:text-3xl font-black text-slate-800 leading-none">{todayData.unique_cards}</span>
            <div className="pb-0 sm:pb-1">{renderDeltaPill(todayData.unique_cards, yesterdayData.unique_cards)}</div>
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-0.5 mt-1 sm:mt-2">
            {allTimeAvg && allTimeAvg.active_days > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-tight">
                TB: {allTimeAvg.unique_cards} <br className="sm:hidden" /> {renderAvgDiff(todayData.unique_cards, allTimeAvg.unique_cards)}
              </span>
            )}
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-orange-50/20 border border-orange-100/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-2 relative overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
            <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-widest text-slate-500 truncate">Lượt ôn</span>
          </div>
          <div className="flex flex-row items-center sm:items-end gap-1.5 sm:gap-3 mt-0.5 sm:mt-1">
            <span className="text-xl sm:text-3xl font-black text-slate-800 leading-none">{todayData.total_reviews}</span>
            <div className="pb-0 sm:pb-1">{renderDeltaPill(todayData.total_reviews, yesterdayData.total_reviews)}</div>
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-0.5 mt-1 sm:mt-2">
            {allTimeAvg && allTimeAvg.active_days > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-tight">
                TB: {allTimeAvg.total_reviews} <br className="sm:hidden" /> {renderAvgDiff(todayData.total_reviews, allTimeAvg.total_reviews)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-[260px] w-full mt-4 -ml-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickFormatter={formatLabel}
              tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
              dx={-10}
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-xl flex flex-col gap-2 min-w-[140px]">
                      <p className="text-slate-800 font-black border-b border-slate-100 pb-2 text-xs">{d.date}</p>
                      <p className="text-[10px] font-bold text-slate-500 flex justify-between gap-4">
                        <span className="uppercase tracking-wider">Thẻ mới</span> 
                        <span className="text-amber-500 font-black">{d.new_cards}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 flex justify-between gap-4">
                        <span className="uppercase tracking-wider">Đã ôn (Unique)</span> 
                        <span className="text-emerald-500 font-black">{d.unique_cards}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 flex justify-between gap-4">
                        <span className="uppercase tracking-wider">Lượt ôn</span> 
                        <span className="text-orange-500 font-black">{d.total_reviews}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey="new_cards" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={6} />
            <Bar dataKey="unique_cards" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={6} />
            <Bar dataKey="total_reviews" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={6} />

            {/* All-time average reference lines */}
            {allTimeAvg && allTimeAvg.active_days > 0 && (
              <>
                <ReferenceLine
                  y={allTimeAvg.new_cards}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />
                <ReferenceLine
                  y={allTimeAvg.unique_cards}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />
                <ReferenceLine
                  y={allTimeAvg.total_reviews}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer / Legend */}
      <div className="flex flex-col items-center gap-3 border-t border-slate-50 pt-5 mt-2">
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Thẻ mới</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Đã ôn (Unique)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Lượt ôn</span>
          </div>
        </div>
        
        {allTimeAvg && allTimeAvg.active_days > 0 && (
          <p className="text-[9px] italic font-semibold text-slate-400 text-center max-w-[80%]">
            * Đường nét đứt (---) tương ứng trên biểu đồ biểu thị giá trị Trung bình (TB) của từng chỉ số
          </p>
        )}
      </div>
    </div>
  );
}
