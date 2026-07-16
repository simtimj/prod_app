import { RecurrenceFrequency, Task } from "@/components/kanbanTypes";

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
  priority: Task["priority"] | null;
  created_at: string;
  updated_at: string;
  position: number;
  archived: boolean;
  archived_at: string | null;
};
