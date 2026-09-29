import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";

export type ViewMode = "day" | "week" | "month";

// Day format: "Mon, Sep 28, 2026"
export function formatDayDisplay(date: Date): string {
  return format(date, "EEE, MMM d, yyyy");
}

// Week Ending format: "WE 10.04.2026" (Monday to Sunday, displaying the Sunday)
export function formatWeekEndingDisplay(date: Date): string {
  const endingSunday = endOfWeek(date, { weekStartsOn: 1 });
  return `WE ${format(endingSunday, "MM.dd.yyyy")}`;
}

// Month format: "September 2026"
export function formatMonthDisplay(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function getDateDisplay(date: Date, mode: ViewMode): string {
  switch (mode) {
    case "day":
      return formatDayDisplay(date);
    case "week":
      return formatWeekEndingDisplay(date);
    case "month":
      return formatMonthDisplay(date);
  }
}

export function navigateDate(date: Date, mode: ViewMode, direction: -1 | 1): Date {
  switch (mode) {
    case "day":
      return direction === 1 ? addDays(date, 1) : subDays(date, 1);
    case "week":
      return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
    case "month":
      return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
  }
}

export function getDateRange(date: Date, mode: ViewMode): { startStr: string; endStr: string } {
  let start: Date;
  let end: Date;

  switch (mode) {
    case "day":
      start = startOfDay(date);
      end = endOfDay(date);
      break;
    case "week":
      start = startOfWeek(date, { weekStartsOn: 1 });
      end = endOfWeek(date, { weekStartsOn: 1 });
      break;
    case "month":
      start = startOfMonth(date);
      end = endOfMonth(date);
      break;
  }

  return {
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd"),
  };
}
