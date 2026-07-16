import { DayColumn, Task } from "./kanbanTypes";

export const RECURRENCE_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const lightColors: Record<string, string> = {
  Sunday: "#f5d000",
  Monday: "#9ca3af",
  Tuesday: "#ff8a8a",
  Wednesday: "#7fa7ff",
  Thursday: "#72c38f",
  Friday: "#e0b600",
  Saturday: "#a56f00",
};

export const darkColors: Record<string, string> = {
  Sunday: "#cca800",
  Monday: "#6b7280",
  Tuesday: "#f86767",
  Wednesday: "#5f8cff",
  Thursday: "#4fa270",
  Friday: "#d19c00",
  Saturday: "#8a5a00",
};

export const daysOfWeek: Record<string, string> = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tues",
  Wednesday: "Weds",
  Thursday: "Thurs",
  Friday: "Fri",
};

export const TAG_COLOR_OPTIONS = [
  "#86efac",
  "#22c55e",
  "#166534",
  "#d6b38a",
  "#8b5e3c",
  "#5c3b28",
  "#93c5fd",
  "#3b82f6",
  "#1e3a8a",
  "#fca5a5",
  "#ef4444",
  "#991b1b",
  "#d8b4fe",
  "#a855f7",
  "#6b21a8",
  "#fdba74",
  "#f97316",
  "#9a3412",
  "#d1d5db",
  "#6b7280",
  "#374151",
];

export const DAY_COUNT = 31;
export const CENTER_INDEX = Math.floor(DAY_COUNT / 2);

export function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatWeekdayShort(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export function formatWeekdayLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDueDateDisplay(dateValue?: string) {
  if (!dateValue?.trim()) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRecurrenceDisplay(task: Task) {
  if (!task.recurrence?.enabled) return "Not recurring";

  const toOrdinal = (value: number) => {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    const mod10 = value % 10;
    if (mod10 === 1) return `${value}st`;
    if (mod10 === 2) return `${value}nd`;
    if (mod10 === 3) return `${value}rd`;
    return `${value}th`;
  };

  if (task.recurrence.frequency === "daily") {
    return "Every day";
  }

  if (task.recurrence.frequency === "monthly") {
    const monthDays = (task.recurrence.monthDays ?? [])
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 31)
      .sort((a, b) => a - b);

    if (monthDays.length === 0) {
      return "Every month";
    }

    return `Every month on ${monthDays.map((value) => toOrdinal(value)).join(", ")}`;
  }

  const weekdayIndexes = (task.recurrence.weekdays ?? [])
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    .sort((a, b) => a - b);

  if (weekdayIndexes.length === 0) {
    return "Every week";
  }

  const labels = weekdayIndexes.map((index) => RECURRENCE_WEEKDAY_LABELS[index]);
  return `Every week on ${labels.join(", ")}`;
}

export function buildDayColumns(today: Date): DayColumn[] {
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const offset = index - CENTER_INDEX;
    const date = addDays(today, offset);
    return {
      date,
      label: `${formatWeekdayLong(date)} · ${formatMonthDay(date)}`,
      tasks: [],
    };
  });
}
