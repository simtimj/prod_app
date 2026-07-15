import { ArchivedTaskEntry, DayColumn, Task } from "@/components/kanbanTypes";
import { CENTER_INDEX, buildDayColumns } from "@/components/kanbanUtils";
import { SupabaseTaskRow } from "@/lib/database/types";

export const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const mapTaskRowToTask = (row: SupabaseTaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  completed: row.completed,
  tag: row.tag ?? undefined,
  tagColor: row.tag_color ?? undefined,
  description: row.description ?? undefined,
  dueDate: row.due_date ?? undefined,
  priority: row.priority ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const buildDayColumnsFromRows = (today: Date, rows: SupabaseTaskRow[]) => {
  const nextDays = buildDayColumns(today);
  const dayIndexByDate = new Map(nextDays.map((day, index) => [getDateKey(day.date), index]));

  rows.forEach((row) => {
    if (row.archived) return;

    const targetIndex = row.due_date ? dayIndexByDate.get(row.due_date) ?? CENTER_INDEX : CENTER_INDEX;
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
