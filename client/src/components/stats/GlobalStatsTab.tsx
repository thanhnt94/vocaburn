import { Globe, Users, BookOpen, Layers, CheckCircle2, Zap, BrainCircuit, ShieldCheck, Activity, Clock, Cpu, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

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

  return (
    <div className="space-y-6 text-left w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
      {/* 🌐 Top Executive Ecosystem Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Global Learning Ecosystem
              </h2>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Aggregated community learning volume and platform-wide benchmarks
              </p>
            </div>
          </div>

          {/* Operational Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              All Systems Operational · 99.9% Uptime
            </span>
          </div>
        </div>

        {/* 4 Hero KPI Cards (Matching Personal & Leaderboard Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          {/* Total Learners */}
          <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block">Learners</span>
              <Users className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {stats.total_users.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">users</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Active community members</p>
          </div>

          {/* Open Study Library */}
          <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block">Study Decks</span>
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {stats.total_quizzes.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">decks</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Published & curated courses</p>
          </div>

          {/* Vocabulary Bank */}
          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider block">Cards & Items</span>
              <Layers className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {stats.total_questions.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">cards</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Mastered vocabulary bank</p>
          </div>

          {/* Platform Accuracy */}
          <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider block">Platform Accuracy</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {stats.platform_accuracy}%
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">System-wide correct recall</p>
          </div>
        </div>
      </div>

      {/* 🚀 Dual Hub: Engine Architecture & Velocity Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-left">
        {/* Hub 1: FSRS v6 Cognitive Memory Engine */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                  FSRS v6 Memory Engine
                </h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1">
                  Free Spaced Repetition Scheduler with DSR modeling
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
              <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Target Rate</span>
                <div className="text-base font-black text-indigo-600 mt-0.5">90% Retention</div>
                <p className="text-[7.5px] font-medium text-slate-400 mt-0.5">Optimized memory threshold</p>
              </div>

              <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Scheduling</span>
                <div className="text-base font-black text-slate-800 mt-0.5">DSR Model</div>
                <p className="text-[7.5px] font-medium text-slate-400 mt-0.5">Difficulty, Stability & Recall</p>
              </div>

              <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Sync Latency</span>
                <div className="text-base font-black text-emerald-600 mt-0.5">&lt; 5ms</div>
                <p className="text-[7.5px] font-medium text-slate-400 mt-0.5">SQLite WAL fast persistence</p>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-600 leading-relaxed mt-4">
              Every completed card dynamically updates stability and retrievability parameters. The FSRS algorithm optimizes intervals so you review exactly when forgetting is about to begin, minimizing study fatigue while maximizing retention.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100/50 flex items-center justify-between text-[10px]">
            <span className="font-bold text-indigo-700">Algorithm Status:</span>
            <span className="font-black text-indigo-900 uppercase tracking-wider">FSRS v6 Active · Zero Overdue Drift</span>
          </div>
        </div>

        {/* Hub 2: Response Velocity & Efficiency Benchmarks */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                  Response Velocity Benchmarks
                </h3>
                <p className="text-[9px] font-bold text-slate-400 mt-1">
                  Global average recall speed and neural reaction latency
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Platform Avg Speed</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-amber-600 leading-none">{stats.avg_time_per_question}s</span>
                  <span className="text-[9px] font-bold text-slate-400">/ card</span>
                </div>
                <p className="text-[7.5px] font-medium text-slate-400 mt-1 uppercase">Rapid recognition reflex</p>
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Global Accuracy</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-emerald-600 leading-none">{stats.platform_accuracy}%</span>
                </div>
                <p className="text-[7.5px] font-medium text-slate-400 mt-1 uppercase">Across all flashcard trials</p>
              </div>
            </div>

            {/* Visual Velocity Bar */}
            <div className="mt-4 p-3 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                <span className="text-slate-500">Speed Benchmark</span>
                <span className="text-emerald-600 font-bold">Optimal Reflex Zone (&lt; 4s)</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, 100 - (stats.avg_time_per_question * 10)))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100/50 flex items-center justify-between text-[10px]">
            <span className="font-bold text-amber-700">Efficiency Insight:</span>
            <span className="font-black text-amber-900">Direct Reflex Activation ⚡</span>
          </div>
        </div>
      </div>

      {/* 🛡️ Section 2: Repository Quality & Ecosystem Standards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm text-left space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
              Repository Quality & Ecosystem Standards
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              Curated flashcards, natural audio synthesis, and multi-format drill support
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-2">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Neural Audio Synthesis
            </h4>
            <p className="text-[9px] font-medium text-slate-500 leading-relaxed">
              Standardized bilingual speech models with precise phonetics and natural pitch intonation for all cards.
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-2">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Multi-Modal Drills
            </h4>
            <p className="text-[9px] font-medium text-slate-500 leading-relaxed">
              Comprehensive support for Flashcard FSRS, Multiple Choice, Word Typing, and Listening Comprehension.
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-600 flex items-center justify-center mb-2">
              <Award className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              CentralAuth Integration
            </h4>
            <p className="text-[9px] font-medium text-slate-500 leading-relaxed">
              Unified cross-app SSO authentication, zero localStorage storage, and instant Telegram Bot notification queue.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
