import type React from "react";

import { Task } from "./kanbanTypes";
import { formatDueDateDisplay, formatDueTimeDisplay, hexToRgba } from "./kanbanUtils";

type TaskCardProps = {
  task: Task;
  dayIndex: number;
  taskIndex: number;
  darkMode: boolean;
  isEditing: boolean;
  isHovered: boolean;
  isSearching: boolean;
  showDropIndicator: boolean;
  editTaskInput: string;
  setEditTaskInput: (value: string) => void;
  saveEditedTask: () => void;
  cancelEditing: () => void;
  onOpenExpandedTask: () => void;
  onToggleCompleted: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
};

export default function TaskCard({
  task,
  darkMode,
  isEditing,
  isHovered,
  isSearching,
  showDropIndicator,
  editTaskInput,
  setEditTaskInput,
  saveEditedTask,
  cancelEditing,
  onOpenExpandedTask,
  onToggleCompleted,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  editInputRef,
}: TaskCardProps) {
  const taskColor = task.tagColor;

  const renderDropIndicator = () => {
    if (isSearching || !showDropIndicator) return null;
    return <div className={`mb-1 h-1 rounded-full ${darkMode ? "bg-slate-300/45" : "bg-slate-500/35"}`} />;
  };

  const renderEditingInput = () => (
    <input
      ref={editInputRef}
      type="text"
      value={editTaskInput}
      onChange={(event) => setEditTaskInput(event.target.value)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          saveEditedTask();
        }
        if (event.key === "Escape") {
          cancelEditing();
        }
      }}
      onBlur={saveEditedTask}
      className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 transition ${darkMode ? "border-slate-700 bg-slate-900 text-slate-100 focus:border-slate-500 focus:ring-slate-700" : "border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-slate-200"}`}
    />
  );

  const renderTaskTag = () => {
    if (!task.tag) return null;
    return (
      <span
        className="ml-2 inline-flex max-w-full min-w-0 shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium break-words"
        style={{
          color: task.tagColor ? hexToRgba(task.tagColor, darkMode ? 0.98 : 0.8) : undefined,
          borderColor: task.tagColor ? hexToRgba(task.tagColor, darkMode ? 0.75 : 0.6) : undefined,
          backgroundColor: task.tagColor ? hexToRgba(task.tagColor, darkMode ? 0.2 : 0.16) : undefined,
        }}
      >
        {task.tag}
      </span>
    );
  };

  const renderRecurringBadge = () => {
    if (!task.recurrence?.enabled) return null;

    return (
      <span
        className={`ml-2 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold ${darkMode ? "border-slate-500 text-slate-200" : "border-slate-300 text-slate-700"}`}
      >
        Repeat
      </span>
    );
  };

  const renderDueBadge = () => {
    const dueDateText = formatDueDateDisplay(task.dueDate);
    const dueTimeText = formatDueTimeDisplay(task.dueTime);
    if (!dueDateText && !dueTimeText) return null;

    const dueText = [dueDateText, dueTimeText].filter(Boolean).join(" · ");

    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold ${darkMode ? "border-slate-500 text-slate-200" : "border-slate-300 text-slate-700"}`}
      >
        Due {dueText}
      </span>
    );
  };

  const renderTaskContent = () => (
    <div className="flex min-w-0 items-start gap-1.5">
      <label
        className={`relative mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition ${darkMode ? "border-slate-500 text-slate-300" : "border-slate-400 text-slate-700"}`}
        onClick={(event) => event.stopPropagation()}
        style={taskColor ? { color: taskColor, borderColor: hexToRgba(taskColor, darkMode ? 0.85 : 0.7) } : undefined}
      >
        <input
          type="checkbox"
          checked={Boolean(task.completed)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            onToggleCompleted();
          }}
          className="peer sr-only"
        />
        <span className="absolute inset-0 z-0 rounded-lg bg-white transition peer-checked:bg-current" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[0.72rem] w-[0.34rem] -translate-x-1/2 translate-y-[-56%] rotate-45 border-b-[2.6px] border-r-[2.6px] border-white opacity-0 transition peer-checked:opacity-100" />
      </label>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenExpandedTask();
          }}
          className="min-w-0 w-full text-left"
        >
          <p className={`${darkMode ? "text-slate-100" : "text-slate-900"} break-words text-sm font-semibold leading-snug ${task.completed ? "line-through text-slate-500" : ""}`} style={{ overflowWrap: "anywhere" }}>
            {task.title}
          </p>
        </button>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {renderDueBadge()}
          {renderRecurringBadge()}
          {renderTaskTag()}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {renderDropIndicator()}
      <div
        draggable={!isSearching}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={(event) => {
          event.stopPropagation();
          if (!isEditing) {
            onOpenExpandedTask();
          }
        }}
        className={`cursor-pointer overflow-hidden rounded-xl border px-3 py-3 shadow-sm transition ${darkMode ? "border-slate-600" : "border-slate-300"} ${!taskColor ? (darkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100") : ""}`}
        style={
          taskColor
            ? {
                backgroundColor: hexToRgba(taskColor, isHovered ? (darkMode ? 0.34 : 0.24) : (darkMode ? 0.2 : 0.14)),
                borderColor: isHovered ? hexToRgba(taskColor, 1) : hexToRgba(taskColor, darkMode ? 0.75 : 0.55),
              }
            : undefined
        }
        onContextMenu={onContextMenu}
      >
        {isEditing ? renderEditingInput() : renderTaskContent()}
      </div>
    </div>
  );
}
