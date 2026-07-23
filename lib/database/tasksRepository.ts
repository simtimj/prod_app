import { Task } from "@/components/kanbanTypes";
import { getCurrentSession } from "@/lib/database/authRepository";
import { SupabaseTaskRow } from "@/lib/database/types";

type UpsertTaskParams = {
  task: Task;
  userId: string;
  dueDate?: string;
  position: number;
};

type ApiErrorPayload = {
  error?: string;
};

type TaskListResponse = {
  tasks?: SupabaseTaskRow[];
};

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await getCurrentSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Missing auth session. Please sign in again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function toApiError(response: Response, fallback: string): Promise<Error> {
  let message = fallback;

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.error?.trim()) {
      message = payload.error;
    }
  } catch {
    // Keep fallback message if response body is not JSON.
  }

  return new Error(message);
}

function normalizeTaskForApi(task: Task) {
  const recurrenceEnabled = Boolean(task.recurrence?.enabled);
  const recurrenceFrequency = recurrenceEnabled ? task.recurrence?.frequency ?? "daily" : null;
  const recurrenceWeekdays =
    recurrenceEnabled && recurrenceFrequency === "weekly"
      ? task.recurrence?.weekdays?.length
        ? task.recurrence.weekdays
        : [1]
      : null;
  const recurrenceMonthDays =
    recurrenceEnabled && recurrenceFrequency === "monthly"
      ? task.recurrence?.monthDays?.length
        ? task.recurrence.monthDays
        : [1]
      : null;

  return {
    id: task.id,
    title: task.title,
    completed: Boolean(task.completed),
    recurrence_enabled: recurrenceEnabled,
    recurrence_frequency: recurrenceFrequency,
    recurrence_weekdays: recurrenceWeekdays,
    recurrence_month_days: recurrenceMonthDays,
    tag: task.tag ?? null,
    tag_color: task.tagColor ?? null,
    description: task.description ?? null,
    due_date: task.dueDate ?? null,
    due_time: task.dueTime ?? null,
    priority: task.priority ?? null,
    created_at: task.createdAt ?? null,
    updated_at: task.updatedAt ?? null,
  };
}

export async function fetchTasksForUser(userId: string): Promise<SupabaseTaskRow[]> {
  void userId;
  const response = await fetch("/api/tasks?includeArchived=true", {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not load tasks.");
  }

  const payload = (await response.json()) as TaskListResponse;
  return payload.tasks ?? [];
}

export async function upsertTask({ task, dueDate, position }: UpsertTaskParams): Promise<void> {
  if (!task.id) return;

  void dueDate;

  const response = await fetch("/api/tasks/upsert", {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      task: normalizeTaskForApi(task),
      position,
    }),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not save task.");
  }
}

export async function updateTaskArchiveState(taskId: string, _userId: string, archived: boolean): Promise<void> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/archive`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ archived }),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not update archive state.");
  }
}

export async function deleteTaskForUser(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not delete task.");
  }
}
