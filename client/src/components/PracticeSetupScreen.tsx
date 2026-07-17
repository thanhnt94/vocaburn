import React from 'react'
import { Sliders, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Pair {
  q: string
  a: string
}

interface PracticeSetupScreenProps {
  practiceSubMode: 'mcq' | 'typing' | 'listening'
  setupPairs: Pair[]
  setSetupPairs: (pairs: Pair[]) => void
  availableColumns: string[]
  setupNumChoices: number
  setSetupNumChoices: (num: number) => void
  canEdit: boolean
  savePracticeSettings: (pairs: Pair[], numChoices: number, makeDefault: boolean) => void
  resetPracticeSettings?: () => void
}

export const PracticeSetupScreen: React.FC<PracticeSetupScreenProps> = ({
  practiceSubMode,
  setupPairs,
  setSetupPairs,
  availableColumns,
  setupNumChoices,
  setSetupNumChoices,
  canEdit,
  savePracticeSettings,
  resetPracticeSettings,
}) => {
  return (
    <div className="flex-1 bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 md:p-8 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full py-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-3 border border-indigo-100">
            <Sliders className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">
            Practice Settings: {practiceSubMode === 'mcq' ? 'Multiple Choice' : practiceSubMode === 'typing' ? 'Typing' : 'Listening'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Select the column pairs you want to use as questions and answers.</p>
        </div>

        <div className="space-y-4 mb-6">
          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">Active Question-Answer Pairs</span>
          {setupPairs.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Question Column</label>
                <select
                  value={pair.q}
                  onChange={(e) => {
                    const newPairs = [...setupPairs];
                    newPairs[idx].q = e.target.value;
                    setSetupPairs(newPairs);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                >
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="text-slate-300 font-bold text-xs mt-4">➔</div>

              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Answer Column</label>
                <select
                  value={pair.a}
                  onChange={(e) => {
                    const newPairs = [...setupPairs];
                    newPairs[idx].a = e.target.value;
                    setSetupPairs(newPairs);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                >
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {setupPairs.length > 1 && (
                <button
                  onClick={() => {
                    const newPairs = setupPairs.filter((_, i) => i !== idx);
                    setSetupPairs(newPairs);
                  }}
                  className="mt-4 p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={() => setSetupPairs([...setupPairs, { q: 'front', a: 'back' }])}
            className="w-full py-3 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <span>+ Add Q&A Pair</span>
          </button>
        </div>

        {(practiceSubMode === 'mcq' || practiceSubMode === 'listening') && (
          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase block mb-2">Number of MCQ Choices</label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  onClick={() => setSetupNumChoices(num)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-black transition-all border",
                    setupNumChoices === num
                      ? "bg-white border-indigo-500 text-indigo-600 shadow-sm shadow-indigo-100"
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  {num} Choices {num === 4 && "(Recommended)"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto w-full flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-50">
        {resetPracticeSettings && (
          <button
            onClick={resetPracticeSettings}
            className="flex-1 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs uppercase hover:bg-slate-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Restore Default</span>
          </button>
        )}

        {canEdit && (
          <button
            onClick={() => savePracticeSettings(setupPairs, setupNumChoices, true)}
            className="flex-1 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs uppercase hover:bg-slate-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Sliders className="w-4 h-4" />
            <span>Set as Deck Default</span>
          </button>
        )}

        <button
          onClick={() => savePracticeSettings(setupPairs, setupNumChoices, false)}
          className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs uppercase hover:shadow-lg hover:shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>Save & Start 🚀</span>
        </button>
      </div>
    </div>
  )
}
