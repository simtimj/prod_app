import { ArchivedTaskEntry, DayColumn, Task } from "@/components/kanban/kanbanTypes";
import { SupabaseTaskRow } from "@/lib/database/types";

export const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const mapTaskRowToTask = (row: SupabaseTaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  completed: row.completed,
  recurrence: row.recurrence_enabled
    ? {
        enabled: true,
        frequency: row.recurrence_frequency ?? "daily",
        weekdays: row.recurrence_frequency === "weekly" ? row.recurrence_weekdays ?? [1] : undefined,
        monthDays: row.recurrence_frequency === "monthly" ? row.recurrence_month_days ?? [1] : undefined,
      }
    : undefined,
  tag: row.tag ?? undefined,
  tagColor: row.tag_color ?? undefined,
  description: row.description ?? undefined,
  dueDate: row.due_date ?? undefined,
  dueTime: row.due_time ?? undefined,
  priority: row.priority ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const isDateKey = (value: string) => DATE_KEY_PATTERN.test(value);

const toDateKeyFromTimestamp = (value: string) => {
  const prefix = value.slice(0, 10);
  if (isDateKey(prefix)) return prefix;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return getDateKey(parsed);
};

const ensureDayRangeIncludes = (baseDays: DayColumn[], requiredDateKeys: string[]) => {
  if (baseDays.length === 0 || requiredDateKeys.length === 0) return baseDays;

  let nextDays = [...baseDays];

  const minRequiredKey = requiredDateKeys.reduce((min, value) => (value < min ? value : min), requiredDateKeys[0]);
  const maxRequiredKey = requiredDateKeys.reduce((max, value) => (value > max ? value : max), requiredDateKeys[0]);

  while (getDateKey(nextDays[0].date) > minRequiredKey) {
    const firstDate = nextDays[0].date;
    const date = addDays(firstDate, -1);
    nextDays = [{ date, label: `${date.toLocaleDateString("en-US", { weekday: "long" })} · ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, tasks: [] }, ...nextDays];
  }

  while (getDateKey(nextDays[nextDays.length - 1].date) < maxRequiredKey) {
    const lastDate = nextDays[nextDays.length - 1].date;
    const date = addDays(lastDate, 1);
    nextDays = [...nextDays, { date, label: `${date.toLocaleDateString("en-US", { weekday: "long" })} · ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, tasks: [] }];
  }

  return nextDays;
};

export const buildDayColumnsFromRows = (baseDays: DayColumn[], rows: SupabaseTaskRow[], fallbackDate: Date) => {
  const targetDateKeys = rows
    .filter((row) => !row.archived)
    .map((row) => row.due_date ?? toDateKeyFromTimestamp(row.created_at))
    .filter((value): value is string => Boolean(value && isDateKey(value)));

  const rangedDays = ensureDayRangeIncludes(baseDays, targetDateKeys);
  const nextDays = rangedDays.map((day) => ({ ...day, tasks: [] as Task[] }));
  const dayIndexByDate = new Map(nextDays.map((day, index) => [getDateKey(day.date), index]));
  const fallbackDateKey = getDateKey(fallbackDate);
  const fallbackIndex = dayIndexByDate.get(fallbackDateKey) ?? Math.floor(nextDays.length / 2);

  rows.forEach((row) => {
    if (row.archived) return;

    const createdDateKey = toDateKeyFromTimestamp(row.created_at);
    const targetKey = row.due_date ?? createdDateKey;
    const targetIndex = dayIndexByDate.get(targetKey) ?? fallbackIndex;
    nextDays[targetIndex].tasks.push(mapTaskRowToTask(row));
  });

  return nextDays;
};

export const mapArchivedRowsToEntries = (rows: SupabaseTaskRow[]): ArchivedTaskEntry[] =>
  rows
    .filter((row) => row.archived)
    .map((row) => ({
      id: row.id,
      taskId: row.id,
      userId: row.user_id,
      task: mapTaskRowToTask(row),
      dayLabel: row.due_date ? row.due_date : "Archived task",
      archivedAt: row.archived_at ?? row.updated_at,
    }));

export const partitionRows = (rows: SupabaseTaskRow[]): { activeRows: SupabaseTaskRow[]; archivedRows: SupabaseTaskRow[] } => ({
  activeRows: rows.filter((row) => !row.archived),
  archivedRows: rows.filter((row) => row.archived),
});

export const getDayDateKey = (days: DayColumn[], fallbackDate: Date, dayIndex: number) =>
  getDateKey(days[dayIndex]?.date ?? fallbackDate);
