export type Task = {
  title: string;
  completed?: boolean;
  tag?: string;
  tagColor?: string;
  description?: string;
  dueDate?: string;
  priority?: "Low" | "Medium" | "High";
};

export type DayColumn = {
  date: Date;
  label: string;
  tasks: Task[];
};

export type ArchivedTaskSnapshot = {
  dayIndex: number;
  taskIndex: number;
  task: Task;
  dayLabel: string;
  archivedId: string;
};

export type ArchivedTaskEntry = {
  id: string;
  task: Task;
  dayLabel: string;
  archivedAt: string;
};

export type TaskLocation = {
  dayIndex: number;
  taskIndex: number;
};
