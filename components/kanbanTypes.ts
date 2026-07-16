export type Task = {
  id?: string;
  userId?: string;
  title: string;
  completed?: boolean;
  recurrence?: TaskRecurrence;
  tag?: string;
  tagColor?: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: "Low" | "Medium" | "High";
  createdAt?: string;
  updatedAt?: string;
};

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type TaskRecurrence = {
  enabled: boolean;
  frequency: RecurrenceFrequency;
  weekdays?: number[];
  monthDays?: number[];
};

export type DayColumn = {
  date: Date;
  label: string;
  tasks: Task[];
};

export type ArchivedTaskSnapshot = {
  taskId?: string;
  userId?: string;
  dayIndex: number;
  taskIndex: number;
  task: Task;
  dayLabel: string;
  archivedId: string;
};

export type ArchivedTaskEntry = {
  id: string;
  taskId?: string;
  userId?: string;
  task: Task;
  dayLabel: string;
  archivedAt: string;
};

export type TaskLocation = {
  dayIndex: number;
  taskIndex: number;
};

export type ParseTaskRequest = {
  text: string;
  timezone?: string;
  currentDate?: string;
};

export type ParsedTaskDraft = {
  title: string;
  dueDate?: string;
  dueTime?: string;
  description?: string;
};

export type ParseTaskResponse = {
  draft: ParsedTaskDraft;
};
