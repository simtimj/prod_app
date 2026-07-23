import { SavedList, Task } from "@/components/kanbanTypes";
import { getCurrentSession } from "@/lib/database/authRepository";
import { SavedListResponse, SupabaseSavedListRow, SupabaseSavedListTaskRow } from "@/lib/database/types";

type ApiErrorPayload = {
  error?: string;
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
    // Keep fallback if response is not JSON.
  }

  return new Error(message);
}

function mapSavedListTaskRowToTask(row: SupabaseSavedListTaskRow): Task {
  return {
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
  };
}

function mapSavedListRow(row: SupabaseSavedListRow): SavedList {
  return {
    id: row.id,
    name: row.name,
    tasks: (row.tasks ?? []).map(mapSavedListTaskRowToTask),
  };
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

export async function fetchSavedListsForUser(): Promise<SavedList[]> {
  const response = await fetch("/api/lists", {
    method: "GET",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not load saved lists.");
  }

  const payload = (await response.json()) as SavedListResponse;
  return (payload.lists ?? []).map(mapSavedListRow);
}

export async function syncSavedListsForUser(lists: SavedList[]): Promise<void> {
  const response = await fetch("/api/lists/sync", {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        tasks: list.tasks.map(normalizeTaskForApi),
      })),
    }),
  });

  if (!response.ok) {
    throw await toApiError(response, "Could not save saved lists.");
  }
}