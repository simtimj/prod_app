import { ArchivedTaskEntry, DayColumn, Task } from "@/components/kanbanTypes";
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

export const buildDayColumnsFromRows = (baseDays: DayColumn[], rows: SupabaseTaskRow[], fallbackDate: Date) => {
  const nextDays = baseDays.map((day) => ({ ...day, tasks: [] as Task[] }));
  const dayIndexByDate = new Map(nextDays.map((day, index) => [getDateKey(day.date), index]));
  const fallbackDateKey = getDateKey(fallbackDate);
  const fallbackIndex = dayIndexByDate.get(fallbackDateKey) ?? Math.floor(nextDays.length / 2);

  rows.forEach((row) => {
    if (row.archived) return;

    const targetIndex = row.due_date ? dayIndexByDate.get(row.due_date) ?? fallbackIndex : fallbackIndex;
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
