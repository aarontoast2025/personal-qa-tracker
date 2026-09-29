"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { ViewMode, getDateDisplay, navigateDate } from "@/lib/date-utils";

interface DateNavigationProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onToday: () => void;
}

export function DateNavigation({
  mode,
  onModeChange,
  currentDate,
  onDateChange,
  onToday,
}: DateNavigationProps) {
  const displayLabel = getDateDisplay(currentDate, mode);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Mode Filters: Day / Week / Month */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
        {(["day", "week", "month"] as ViewMode[]).map((m) => {
          const isActive = mode === m;
          const label = m.charAt(0).toUpperCase() + m.slice(1);
          return (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Date Navigation: Prev / Label / Next / Today */}
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <button
          type="button"
          onClick={() => onDateChange(navigateDate(currentDate, mode, -1))}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Previous"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-800 dark:text-slate-100 min-w-[140px] text-center font-mono">
          {displayLabel}
        </div>

        <button
          type="button"
          onClick={() => onDateChange(navigateDate(currentDate, mode, 1))}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Next"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="ml-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
          title="Jump to today"
        >
          Today
        </button>
      </div>
    </div>
  );
}
