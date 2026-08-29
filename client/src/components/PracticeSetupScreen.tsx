import React from 'react'
import { Sliders, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Pair {
  q: string
  a: string | string[]
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
  const isInputMode = practiceSubMode === 'typing' || practiceSubMode === 'listening';
  const isListening = practiceSubMode === 'listening';

  return (
    <div className="flex-1 bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 md:p-8 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full py-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Sliders className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">
            Cài đặt Luyện tập: {practiceSubMode === 'mcq' ? 'Trắc nghiệm (MCQ)' : practiceSubMode === 'typing' ? 'Luyện gõ (Typing)' : 'Luyện nghe chép từ (Listening)'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isListening
              ? 'Chọn cột phát âm thanh và các cột đáp án được chấp nhận khi người học gõ lại.'
              : isInputMode
              ? 'Chọn cột câu hỏi và các cột đáp án được chấp nhận khi gõ từ vựng.'
              : 'Chọn các cặp cột tương ứng giữa câu hỏi và đáp án.'}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">
              {isListening ? 'Cột Phát âm & Các cột Đáp án chấp nhận' : isInputMode ? 'Cặp Câu hỏi & Các cột Đáp án được chấp nhận' : 'Cặp Câu hỏi - Đáp án (Q&A Pairs)'}
            </span>
            {isInputMode && (
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                Cho phép chọn nhiều cột đáp án
              </span>
            )}
          </div>

          {setupPairs.map((pair, idx) => {
            const currentSelectedAnswerCols = Array.isArray(pair.a)
              ? pair.a
              : (typeof pair.a === 'string' ? pair.a.split(',').map(s => s.trim()).filter(Boolean) : ['front']);

            return (
              <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      {isListening ? 'Cột phát âm thanh (Audio)' : 'Cột Câu hỏi (Đề bài hiển thị)'}
                    </label>
                    <select
                      value={pair.q}
                      onChange={(e) => {
                        const newPairs = [...setupPairs];
                        newPairs[idx] = { ...newPairs[idx], q: e.target.value };
                        setSetupPairs(newPairs);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {!isInputMode && (
                    <>
                      <div className="text-slate-300 font-bold text-xs mt-4">➔</div>

                      <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Cột Đáp án
                        </label>
                        <select
                          value={typeof pair.a === 'string' ? pair.a : (pair.a[0] || 'back')}
                          onChange={(e) => {
                            const newPairs = [...setupPairs];
                            newPairs[idx] = { ...newPairs[idx], a: e.target.value };
                            setSetupPairs(newPairs);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {setupPairs.length > 1 && (
                    <button
                      onClick={() => {
                        const newPairs = setupPairs.filter((_, i) => i !== idx);
                        setSetupPairs(newPairs);
                      }}
                      className="mt-4 p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100 cursor-pointer"
                      title="Xóa cặp này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isInputMode && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                      Cột Đáp án được chấp nhận khi gõ (Nhấn để bật/tắt):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableColumns.map((col) => {
                        const isSelected = currentSelectedAnswerCols.includes(col);
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              let nextCols: string[];
                              if (isSelected) {
                                if (currentSelectedAnswerCols.length === 1) return; // keep at least 1
                                nextCols = currentSelectedAnswerCols.filter(c => c !== col);
                              } else {
                                nextCols = [...currentSelectedAnswerCols, col];
                              }
                              const newPairs = [...setupPairs];
                              newPairs[idx] = {
                                ...newPairs[idx],
                                a: nextCols.length === 1 ? nextCols[0] : nextCols
                              };
                              setSetupPairs(newPairs);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
                              isSelected
                                ? (isListening ? "bg-sky-600 border-sky-600 text-white shadow-xs" : "bg-amber-500 border-amber-500 text-white shadow-xs")
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60 opacity-80"
                            )}
                          >
                            <span>{isSelected ? "✓" : "+"}</span>
                            <span>{col.toUpperCase()}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 italic">
                      * Khi làm bài, học viên gõ đúng nội dung của bất kỳ cột nào được chọn ở trên đều được tính là chính xác.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setSetupPairs([...setupPairs, { q: isListening ? 'front' : (isInputMode ? 'back' : 'front'), a: isInputMode ? ['front'] : 'back' }])}
            className="w-full py-3 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>+ Thêm Cặp Q&A</span>
          </button>
        </div>

        {practiceSubMode === 'mcq' && (
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
