import { RecurrenceFrequency, SavedList, Task } from "@/components/kanban/kanbanTypes";

export type SupabaseTaskRow = {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  recurrence_enabled: boolean | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_weekdays: number[] | null;
  recurrence_month_days: number[] | null;
  tag: string | null;
  tag_color: string | null;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: Task["priority"] | null;
  created_at: string;
  updated_at: string;
  position: number;
  archived: boolean;
  archived_at: string | null;
};

export type SupabaseSavedListTaskRow = {
  id: string;
  user_id: string;
  list_id: string;
  title: string;
  completed: boolean;
  recurrence_enabled: boolean | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_weekdays: number[] | null;
  recurrence_month_days: number[] | null;
  tag: string | null;
  tag_color: string | null;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: Task["priority"] | null;
  created_at: string;
  updated_at: string;
  position: number;
};

export type SupabaseSavedListRow = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  tasks: SupabaseSavedListTaskRow[];
};

export type SavedListResponse = {
  lists?: SupabaseSavedListRow[];
};

export type SyncSavedListsRequest = {
  lists: SavedList[];
};

export type UserSettings = {
  listPanelWidthPx?: number;
};

export type SupabaseUserSettingsRow = {
  user_id: string;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
};

export type UserSettingsResponse = {
  settings?: UserSettings;
};

export type SyncUserSettingsRequest = {
  settings: UserSettings;
};
