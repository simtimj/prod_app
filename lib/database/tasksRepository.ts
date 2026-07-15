import { Task } from "@/components/kanbanTypes";
import { supabase } from "@/lib/database/client";
import { SupabaseTaskRow } from "@/lib/database/types";

type UpsertTaskParams = {
  task: Task;
  userId: string;
  dueDate: string;
  position: number;
};

const TASK_SELECT_COLUMNS =
  "id, user_id, title, completed, tag, tag_color, description, due_date, priority, created_at, updated_at, position, archived, archived_at";

export async function fetchTasksForUser(userId: string): Promise<SupabaseTaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("archived", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SupabaseTaskRow[];
}

export async function upsertTask({ task, userId, dueDate, position }: UpsertTaskParams): Promise<void> {
  if (!task.id) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from("tasks").upsert(
    {
      id: task.id,
      user_id: userId,
      title: task.title,
      completed: Boolean(task.completed),
      tag: task.tag ?? null,
      tag_color: task.tagColor ?? null,
      description: task.description ?? null,
      due_date: task.dueDate ?? dueDate,
      priority: task.priority ?? null,
      position,
      archived: false,
      archived_at: null,
      created_at: task.createdAt ?? now,
      updated_at: task.updatedAt ?? now,
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function updateTaskArchiveState(taskId: string, userId: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      archived,
      archived_at: archived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw error;
}
