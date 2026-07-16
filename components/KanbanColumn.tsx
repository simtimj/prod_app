import type React from "react";

import TaskCard from "./TaskCard";
import { DayColumn, TaskLocation } from "./kanbanTypes";
import {
  TAG_COLOR_OPTIONS,
  addDays,
  formatDateInputValue,
  formatMonthDay,
  formatWeekdayLong,
  formatWeekdayShort,
  daysOfWeek,
  hexToRgba,
} from "./kanbanUtils";

type ContextMenuState = {
  dayIndex: number;
  taskIndex: number;
  x: number;
  y: number;
};

type KanbanColumnProps = {
  day: DayColumn;
  index: number;
  totalDays: number;
  centerIndex: number;
  selectedIndex: number;
  darkMode: boolean;
  dayColors?: Record<string, string>;
  themeColors: Record<string, string>;
  onSelectDay: (index: number) => void;
  setDayRef: (index: number, element: HTMLDivElement | null) => void;
  visibleTaskEntries: Array<{ taskIndex: number; task: DayColumn["tasks"][number] }>;
  isSearching: boolean;
  dropTarget: { dayIndex: number; insertIndex: number } | null;
  editingTask: TaskLocation | null;
  editTaskInput: string;
  setEditTaskInput: (value: string) => void;
  saveEditedTask: () => void;
  cancelEditing: () => void;
  hoveredTask: TaskLocation | null;
  setHoveredTask: React.Dispatch<React.SetStateAction<TaskLocation | null>>;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenExpandedTask: (dayIndex: number, taskIndex: number) => void;
  onToggleTaskCompleted: (dayIndex: number, taskIndex: number) => void;
  onHandleDragStart: (fromDay: number, fromTask: number, event: React.DragEvent<HTMLDivElement>) => void;
  onHandleDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
  onHandleTaskDragOver: (dayIndex: number, taskIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  onHandleDrop: (toDay: number, insertIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  onHandleListDragOver: (dayIndex: number, insertIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  activeAddIndex: number | null;
  newTaskInput: string;
  setNewTaskInput: (value: string) => void;
  setActiveAddIndex: (value: number | null) => void;
  addInputRef: React.RefObject<HTMLInputElement | null>;
  onAddTaskToList: (index: number, title: string) => void;
  onParseTaskInput: (index: number, text: string) => Promise<void>;
  smartTaskLoading: boolean;
  smartTaskError: string | null;
  contextMenu: ContextMenuState | null;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  contextMenuMoveOpen: boolean;
  setContextMenuMoveOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  contextMenuTagOpen: boolean;
  setContextMenuTagOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  contextMenuSavedTagsOpen: boolean;
  setContextMenuSavedTagsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  contextMenuDueDateOpen: boolean;
  setContextMenuDueDateOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  contextMenuTagInput: string;
  setContextMenuTagInput: (value: string) => void;
  contextMenuTagColorInput: string;
  setContextMenuTagColorInput: (value: string) => void;
  contextMenuDueDateInput: string;
  setContextMenuDueDateInput: (value: string) => void;
  contextMenuDueTimeInput: string;
  setContextMenuDueTimeInput: (value: string) => void;
  filteredContextMenuTagSuggestions: string[];
  setContextMenu: (value: ContextMenuState | null) => void;
  contextMenuDueDateInputRef: React.RefObject<HTMLInputElement | null>;
  onMoveTask: (fromDay: number, fromTask: number, toDay: number) => void;
  onSetTaskTag: (dayIndex: number, taskIndex: number, tag: string, color?: string) => void;
  onSetTaskDueDate: (dayIndex: number, taskIndex: number, dueDate: string) => void;
  onSetTaskDueTime: (dayIndex: number, taskIndex: number, dueTime: string) => void;
  onArchiveTask: (dayIndex: number, taskIndex: number) => void;
  days: DayColumn[];
};

export default function KanbanColumn({
  day,
  index,
  totalDays,
  centerIndex,
  selectedIndex,
  darkMode,
  dayColors,
  themeColors,
  onSelectDay,
  setDayRef,
  visibleTaskEntries,
  isSearching,
  dropTarget,
  editingTask,
  editTaskInput,
  setEditTaskInput,
  saveEditedTask,
  cancelEditing,
  hoveredTask,
  setHoveredTask,
  editInputRef,
  onOpenExpandedTask,
  onToggleTaskCompleted,
  onHandleDragStart,
  onHandleDragEnd,
  onHandleTaskDragOver,
  onHandleDrop,
  onHandleListDragOver,
  activeAddIndex,
  newTaskInput,
  setNewTaskInput,
  setActiveAddIndex,
  addInputRef,
  onAddTaskToList,
  onParseTaskInput,
  smartTaskLoading,
  smartTaskError,
  contextMenu,
  contextMenuRef,
  contextMenuMoveOpen,
  setContextMenuMoveOpen,
  contextMenuTagOpen,
  setContextMenuTagOpen,
  contextMenuSavedTagsOpen,
  setContextMenuSavedTagsOpen,
  contextMenuDueDateOpen,
  setContextMenuDueDateOpen,
  contextMenuTagInput,
  setContextMenuTagInput,
  contextMenuTagColorInput,
  setContextMenuTagColorInput,
  contextMenuDueDateInput,
  setContextMenuDueDateInput,
  contextMenuDueTimeInput,
  setContextMenuDueTimeInput,
  filteredContextMenuTagSuggestions,
  setContextMenu,
  contextMenuDueDateInputRef,
  onMoveTask,
  onSetTaskTag,
  onSetTaskDueDate,
  onSetTaskDueTime,
  onArchiveTask,
  days,
}: KanbanColumnProps) {
  const isSelected = index === selectedIndex;
  const weekdayLong = formatWeekdayLong(day.date);
  const weekdayShort = daysOfWeek[weekdayLong] ?? formatWeekdayShort(day.date);
  const dayColor =
    dayColors?.[weekdayLong] ?? dayColors?.[weekdayShort] ?? themeColors[weekdayLong] ?? themeColors[weekdayShort];
  const applyColor = Boolean(dayColor);
  const isToday = index === centerIndex;
  const todayDateClasses = isToday ? "inline-flex flex-col rounded-2xl border-2 px-3 py-2 shadow-sm" : "";
  const todayDateStyle =
    isToday && applyColor
      ? {
          backgroundColor: hexToRgba(dayColor, darkMode ? 0.18 : 0.22),
          borderColor: hexToRgba(dayColor, darkMode ? 0.9 : 0.85),
          color: darkMode ? "#f8fafc" : "#111",
          boxShadow: `0 0 0 1px ${hexToRgba(dayColor, 0.12)}`,
        }
      : undefined;

  const renderTaskCards = () =>
    visibleTaskEntries.map(({ task, taskIndex }) => {
      const isEditing = editingTask?.dayIndex === index && editingTask?.taskIndex === taskIndex;
      const isHovered = hoveredTask?.dayIndex === index && hoveredTask?.taskIndex === taskIndex;

      return (
        <TaskCard
          key={`${task.title}-${taskIndex}`}
          task={task}
          dayIndex={index}
          taskIndex={taskIndex}
          darkMode={darkMode}
          isEditing={isEditing}
          isHovered={isHovered}
          isSearching={isSearching}
          showDropIndicator={Boolean(!isSearching && dropTarget?.dayIndex === index && dropTarget.insertIndex === taskIndex)}
          editTaskInput={editTaskInput}
          setEditTaskInput={setEditTaskInput}
          saveEditedTask={saveEditedTask}
          cancelEditing={cancelEditing}
          onOpenExpandedTask={() => onOpenExpandedTask(index, taskIndex)}
          onToggleCompleted={() => onToggleTaskCompleted(index, taskIndex)}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setContextMenuMoveOpen(false);
            setContextMenuTagOpen(false);
            setContextMenuSavedTagsOpen(false);
            setContextMenuDueDateOpen(false);
            setContextMenuTagInput(task.tag ?? "");
            setContextMenuTagColorInput(task.tagColor ?? "#22c55e");
            setContextMenuDueDateInput(task.dueDate ?? "");
            setContextMenuDueTimeInput(task.dueTime ?? "");
            setContextMenu({ dayIndex: index, taskIndex, x: event.clientX, y: event.clientY });
          }}
          onMouseEnter={() => setHoveredTask({ dayIndex: index, taskIndex })}
          onMouseLeave={() =>
            setHoveredTask((current) =>
              current?.dayIndex === index && current?.taskIndex === taskIndex ? null : current
            )
          }
          onDragStart={(event) => onHandleDragStart(index, taskIndex, event)}
          onDragEnd={onHandleDragEnd}
          onDragOver={(event) => onHandleTaskDragOver(index, taskIndex, event)}
          onDrop={(event) => onHandleDrop(index, dropTarget?.dayIndex === index ? dropTarget.insertIndex : taskIndex, event)}
          editInputRef={editInputRef}
        />
      );
    });

  const renderSearchEmptyState = () => {
    if (!isSearching || visibleTaskEntries.length !== 0) return null;
    return (
      <div className={`rounded-lg border border-dashed px-3 py-2 text-xs ${darkMode ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500"}`}>
        No matching tasks
      </div>
    );
  };

  const renderDropZone = () => {
    if (isSearching) return null;

    return (
      <div
        onDragOver={(event) => onHandleListDragOver(index, day.tasks.length, event)}
        onDrop={(event) => onHandleDrop(index, day.tasks.length, event)}
        className={`mt-1 rounded-lg transition ${day.tasks.length === 0 ? "min-h-8" : "min-h-3"}`}
      >
        {dropTarget?.dayIndex === index && dropTarget.insertIndex === day.tasks.length ? (
          <div className={`h-1 rounded-full ${darkMode ? "bg-slate-300/45" : "bg-slate-500/35"}`} />
        ) : day.tasks.length === 0 ? (
          <div className={`rounded-lg border border-dashed px-3 py-2 text-xs ${darkMode ? "border-slate-600 text-slate-400" : "border-slate-300 text-slate-500"}`}>
            Drag a task here
          </div>
        ) : null}
      </div>
    );
  };

  const renderMoveMenu = () => {
    if (!contextMenuMoveOpen || !contextMenu) return null;

    return (
      <div
        className={`absolute left-full top-0 ml-1 max-h-40 w-48 overflow-auto rounded-md border px-1 py-1 shadow-lg ${darkMode ? "bg-[#241c3c] border-[#372a5d] text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
        style={applyColor && darkMode ? { backgroundColor: hexToRgba(dayColor, 0.08), borderColor: dayColor } : applyColor ? { borderColor: dayColor } : undefined}
      >
        {days.map((nextDay, dayIndex) => (
          <button
            key={`${nextDay.label}-${dayIndex}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveTask(contextMenu.dayIndex, contextMenu.taskIndex, dayIndex);
              setContextMenuMoveOpen(false);
            }}
            className={`w-full text-left px-2 py-1 text-sm transition ${darkMode ? "hover:bg-[#2f2640]" : "hover:bg-slate-100"}`}
          >
            {formatMonthDay(nextDay.date)} - {formatWeekdayShort(nextDay.date)}
          </button>
        ))}
      </div>
    );
  };

  const renderDueDateMenu = () => {
    if (!contextMenuDueDateOpen || !contextMenu) return null;

    return (
      <div
        className={`absolute left-full top-0 ml-1 w-48 rounded-md border px-1 py-1 shadow-lg ${darkMode ? "bg-[#241c3c] border-[#372a5d] text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
        style={applyColor && darkMode ? { backgroundColor: hexToRgba(dayColor, 0.08), borderColor: dayColor } : applyColor ? { borderColor: dayColor } : undefined}
      >
        <div className="flex gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const todayDate = formatDateInputValue(new Date());
              setContextMenuDueDateInput(todayDate);
              onSetTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, todayDate);
              setContextMenuDueDateOpen(false);
            }}
            className={`min-w-0 flex-1 rounded-md border px-1.5 py-1 text-[0.68rem] font-medium leading-none whitespace-nowrap transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Today
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const tomorrowDate = formatDateInputValue(addDays(new Date(), 1));
              setContextMenuDueDateInput(tomorrowDate);
              onSetTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, tomorrowDate);
              setContextMenuDueDateOpen(false);
            }}
            className={`min-w-0 flex-1 rounded-md border px-1.5 py-1 text-[0.68rem] font-medium leading-none whitespace-nowrap transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Tomorrow
          </button>
        </div>
        <input
          ref={contextMenuDueDateInputRef}
          type="date"
          value={contextMenuDueDateInput}
          onChange={(event) => setContextMenuDueDateInput(event.target.value)}
          onClick={(event) => {
            event.stopPropagation();
            contextMenuDueDateInputRef.current?.showPicker?.();
          }}
          className={`mt-1 w-full rounded-md border px-2 py-1 text-sm outline-none transition ${darkMode ? "bg-[#2f2640] text-slate-100 focus:border-[#7d6ba6]" : "bg-white text-slate-900 focus:border-slate-500"}`}
          style={applyColor ? { borderColor: dayColor } : undefined}
        />
        <input
          type="time"
          value={contextMenuDueTimeInput}
          onChange={(event) => setContextMenuDueTimeInput(event.target.value)}
          className={`mt-1 w-full rounded-md border px-2 py-1 text-sm outline-none transition ${darkMode ? "bg-[#2f2640] text-slate-100 focus:border-[#7d6ba6]" : "bg-white text-slate-900 focus:border-slate-500"}`}
          style={applyColor ? { borderColor: dayColor } : undefined}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSetTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, contextMenuDueDateInput);
              onSetTaskDueTime(contextMenu.dayIndex, contextMenu.taskIndex, contextMenuDueTimeInput);
              setContextMenuDueDateOpen(false);
            }}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Save
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setContextMenuDueDateInput("");
              setContextMenuDueTimeInput("");
              onSetTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, "");
              onSetTaskDueTime(contextMenu.dayIndex, contextMenu.taskIndex, "");
              setContextMenuDueDateOpen(false);
            }}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Clear
          </button>
        </div>
      </div>
    );
  };

  const renderTagMenu = () => {
    if (!contextMenuTagOpen || !contextMenu) return null;

    return (
      <div
        className="absolute left-full top-0 ml-1 w-48 rounded-md border px-1 py-1 shadow-lg bg-white border-slate-200 text-slate-900"
        style={applyColor ? { borderColor: dayColor } : undefined}
      >
        <input
          type="text"
          value={contextMenuTagInput}
          onChange={(event) => setContextMenuTagInput(event.target.value)}
          placeholder="Set tag"
          onFocus={() => setContextMenuSavedTagsOpen(true)}
          onClick={() => setContextMenuSavedTagsOpen(true)}
          autoComplete="off"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          style={applyColor ? { borderColor: dayColor } : undefined}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Tags</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setContextMenuSavedTagsOpen((value) => !value);
            }}
            className={`rounded-md border px-2 py-1 text-[0.68rem] font-medium transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Saved tags
          </button>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1">
          {TAG_COLOR_OPTIONS.map((color) => {
            const active = contextMenuTagColorInput === color;
            return (
              <button
                key={`context-tag-color-${color}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setContextMenuTagColorInput(color);
                }}
                className={`h-5 w-5 rounded-full border ${active ? "ring-2 ring-slate-400" : ""}`}
                style={{ backgroundColor: color, borderColor: darkMode ? "#1f2937" : "#e2e8f0" }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSetTaskTag(contextMenu.dayIndex, contextMenu.taskIndex, contextMenuTagInput, contextMenuTagColorInput);
              setContextMenuTagOpen(false);
            }}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Save
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setContextMenuTagInput("");
              setContextMenuTagColorInput("#22c55e");
              onSetTaskTag(contextMenu.dayIndex, contextMenu.taskIndex, "", "#22c55e");
              setContextMenuTagOpen(false);
            }}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            Clear
          </button>
        </div>
        {contextMenuTagOpen && contextMenuSavedTagsOpen ? (
          <div
            className="absolute left-full top-0 ml-1 w-44 rounded-md border bg-white p-1 text-slate-900 shadow-lg border-slate-200 z-10"
            style={applyColor ? { borderColor: dayColor } : undefined}
          >
            <div className="mb-1 px-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Saved tags</div>
            {filteredContextMenuTagSuggestions.length > 0 ? (
              filteredContextMenuTagSuggestions.map((tag) => (
                <button
                  key={`context-tag-suggestion-${tag}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setContextMenuTagInput(tag);
                  }}
                  className="block w-full rounded-md px-2 py-1 text-left text-sm text-slate-900 transition hover:bg-slate-100"
                >
                  {tag}
                </button>
              ))
            ) : (
              <p className="px-2 py-1 text-sm text-slate-500">No saved tags yet.</p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderContextMenu = () => {
    if (contextMenu?.dayIndex !== index) return null;

    return (
      <div ref={contextMenuRef} className="fixed z-50 overflow-visible" style={{ top: contextMenu.y, left: contextMenu.x }}>
        <div
          className={`relative rounded-xl border shadow-lg ${darkMode ? "bg-[#241c3c] border-[#372a5d] text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
          style={applyColor ? { backgroundColor: hexToRgba(dayColor, darkMode ? 0.08 : 0.06), borderColor: dayColor } : undefined}
        >
          <div className="relative flex flex-col items-stretch overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setContextMenuMoveOpen((value) => !value);
                setContextMenuTagOpen(false);
                setContextMenuDueDateOpen(false);
              }}
              className={`w-full border-b px-3 py-2 text-sm font-medium text-left transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
              style={applyColor ? { borderBottomColor: hexToRgba(dayColor, 0.55) } : { borderBottomColor: darkMode ? "rgba(255,255,255,0.10)" : "rgb(226 232 240)" }}
            >
              Move
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setContextMenuTagOpen((value) => !value);
                setContextMenuMoveOpen(false);
                setContextMenuSavedTagsOpen(false);
                setContextMenuDueDateOpen(false);
              }}
              className={`w-full border-b px-3 py-2 text-sm font-medium text-left transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
              style={applyColor ? { borderBottomColor: hexToRgba(dayColor, 0.55) } : { borderBottomColor: darkMode ? "rgba(255,255,255,0.10)" : "rgb(226 232 240)" }}
            >
              Tag
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setContextMenuDueDateOpen((value) => !value);
                setContextMenuMoveOpen(false);
                setContextMenuTagOpen(false);
              }}
              className={`w-full border-b px-3 py-2 text-sm font-medium text-left transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
              style={applyColor ? { borderBottomColor: hexToRgba(dayColor, 0.55) } : { borderBottomColor: darkMode ? "rgba(255,255,255,0.10)" : "rgb(226 232 240)" }}
            >
              Due date
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onArchiveTask(contextMenu.dayIndex, contextMenu.taskIndex);
              }}
              className={`w-full px-3 py-2 text-sm font-medium text-left transition ${darkMode ? "bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            >
              Archive
            </button>
          </div>

          {renderMoveMenu()}
          {renderDueDateMenu()}
          {renderTagMenu()}
        </div>
      </div>
    );
  };

  const renderAddTaskInput = () => {
    if (activeAddIndex !== index) return null;

    return (
      <div className="mt-2 space-y-2">
        <input
          ref={addInputRef}
          type="text"
          value={newTaskInput}
          onChange={(event) => setNewTaskInput(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              onAddTaskToList(index, newTaskInput);
            }
            if (event.key === "Escape") {
              setNewTaskInput("");
              setActiveAddIndex(null);
            }
          }}
          onBlur={() => {
            setNewTaskInput("");
            setActiveAddIndex(null);
          }}
          placeholder="New task..."
          className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 transition ${darkMode ? "border-slate-700 bg-slate-900 text-slate-100 focus:border-slate-500 focus:ring-slate-700" : "border-slate-200 bg-white text-slate-900 focus:border-slate-900 focus:ring-slate-200"}`}
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddTaskToList(index, newTaskInput);
            }}
            className="rounded-full border px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-widest transition hover:brightness-90"
            style={applyColor ? { backgroundColor: hexToRgba(dayColor, 0.18), borderColor: dayColor, color: "#000" } : undefined}
          >
            Save
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onParseTaskInput(index, newTaskInput);
            }}
            disabled={smartTaskLoading}
            className="rounded-full border px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-widest transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-70"
            style={applyColor ? { backgroundColor: hexToRgba(dayColor, 0.12), borderColor: dayColor, color: "#000" } : undefined}
          >
            {smartTaskLoading ? "Parsing..." : "Parse"}
          </button>
        </div>
        {smartTaskError ? (
          <p className={`text-xs ${darkMode ? "text-red-300" : "text-red-600"}`}>{smartTaskError}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div
      key={day.label}
      ref={(element) => {
        setDayRef(index, element);
      }}
      onClick={() => {
        onSelectDay(index);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectDay(index);
        }
      }}
      role="button"
      tabIndex={0}
      className={`min-w-[20rem] shrink-0 rounded-xl border p-3 transition duration-300 cursor-pointer ${
        isSelected
          ? darkMode
            ? "border-[#483d6d] shadow-[0_12px_60px_-18px_rgba(46,36,76,0.25)]"
            : "border-slate-900 shadow-[0_12px_60px_-18px_rgba(15,23,42,0.35)]"
          : darkMode
            ? "border-transparent bg-[#241c3f]/80"
            : "border-transparent bg-slate-100/90"
      } ${index === 0 ? "mr-2" : "mx-2"} ${index === totalDays - 1 ? "ml-2" : ""}`}
      style={applyColor ? { borderColor: dayColor, backgroundColor: isSelected ? hexToRgba(dayColor, 0.08) : undefined } : undefined}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className={todayDateClasses} style={todayDateStyle}>
            <p className={`text-[0.55rem] font-semibold uppercase tracking-[0.22em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              {weekdayShort}
            </p>
            <p className={`mt-1 text-lg font-semibold leading-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
              {formatMonthDay(day.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setActiveAddIndex(index);
              setNewTaskInput("");
            }}
            className="rounded-full border px-2.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition hover:brightness-90"
            style={applyColor ? { backgroundColor: hexToRgba(dayColor, 0.18), borderColor: dayColor, color: "#000" } : undefined}
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {renderTaskCards()}
        {renderSearchEmptyState()}
        {renderDropZone()}
      </div>

      {renderContextMenu()}
      {renderAddTaskInput()}
    </div>
  );
}
