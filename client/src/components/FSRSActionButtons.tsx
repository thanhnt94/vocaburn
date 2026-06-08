import React from 'react'
import { cn } from '@/lib/utils'

interface FSRSActionButtonsProps {
  isFlipped: boolean
  hasRated: boolean
  selectedOption: number | null
  intervals: Record<number, string> | undefined
  onRate: (rating: number) => void
}

export const FSRSActionButtons: React.FC<FSRSActionButtonsProps> = ({
  isFlipped,
  hasRated,
  selectedOption,
  intervals,
  onRate
}) => {
  if (!isFlipped || hasRated) return null

  const getButtonClass = (btnIdx: number) => {
    const isSelected = hasRated && selectedOption === btnIdx;
    const isAnySelected = hasRated && selectedOption !== null && selectedOption !== undefined;
    
    // Base classes for all buttons
    let classes = "group px-1.5 py-3 sm:px-2 md:px-4 md:py-4 rounded-2xl sm:rounded-3xl border shadow-sm active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 flex-1 ";
    
    if (isSelected) {
      // Active style
      switch (btnIdx) {
        case 0:
          classes += "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-200 scale-[1.03] z-10";
          break;
        case 1:
          classes += "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-200 scale-[1.03] z-10";
          break;
        case 2:
          classes += "bg-indigo-500 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.03] z-10 ring-2 ring-indigo-500/20";
          break;
        case 3:
          classes += "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-[1.03] z-10";
          break;
      }
    } else {
      // Inactive or default styles
      if (isAnySelected) {
        classes += "opacity-60 ";
      }
      switch (btnIdx) {
        case 0:
          classes += "border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-400 text-rose-500";
          break;
        case 1:
          classes += "border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400 text-amber-500";
          break;
        case 2:
          classes += "border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 text-indigo-500 ring-2 ring-indigo-500/20";
          break;
        case 3:
          classes += "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-500";
          break;
      }
    }
    return classes;
  }

  return (
    <div
      className="grid grid-cols-4 gap-1.5 sm:gap-3 mt-4 relative z-[10]"
      onClick={(e) => {
        console.log("DEBUG CLICK: FSRS Buttons Grid clicked! target:", e.target);
      }}
    >
      {/* AGAIN BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("DEBUG CLICK: AGAIN button clicked!");
          onRate(1);
        }}
        className={getButtonClass(0)}
      >
        <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 0 ? "text-white" : "text-rose-500")}>AGAIN</span>
        <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 0 ? "text-rose-100" : "text-rose-600")}>
          {intervals?.[1] || "1m"}
        </span>
      </button>

      {/* HARD BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("DEBUG CLICK: HARD button clicked!");
          onRate(2);
        }}
        className={getButtonClass(1)}
      >
        <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 1 ? "text-white" : "text-amber-500")}>HARD</span>
        <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 1 ? "text-amber-100" : "text-amber-600")}>
          {intervals?.[2] || "5m"}
        </span>
      </button>

      {/* GOOD BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("DEBUG CLICK: GOOD button clicked!");
          onRate(3);
        }}
        className={getButtonClass(2)}
      >
        <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 2 ? "text-white" : "text-indigo-500")}>GOOD</span>
        <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 2 ? "text-indigo-100" : "text-indigo-600")}>
          {intervals?.[3] || "10m"}
        </span>
      </button>

      {/* EASY BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("DEBUG CLICK: EASY button clicked!");
          onRate(4);
        }}
        className={getButtonClass(3)}
      >
        <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 3 ? "text-white" : "text-emerald-500")}>EASY</span>
        <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 3 ? "text-emerald-100" : "text-emerald-600")}>
          {intervals?.[4] || "4d"}
        </span>
      </button>
    </div>
  )
}
