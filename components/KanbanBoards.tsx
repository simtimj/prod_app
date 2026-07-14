"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import KanbanColumn from "./KanbanColumn";
import { ArchivedTaskEntry, ArchivedTaskSnapshot, DayColumn, Task } from "./kanbanTypes";
import {
  CENTER_INDEX,
  TAG_COLOR_OPTIONS,
  buildDayColumns,
  darkColors,
  formatDueDateDisplay,
  formatMonthDay,
  formatWeekdayLong,
  formatWeekdayShort,
  lightColors,
} from "./kanbanUtils";

export default function KanbanBoards({ dayColors }: { dayColors?: Record<string, string> } = {}) {
  const [selectedIndex, setSelectedIndex] = useState(CENTER_INDEX);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);
  const ignoreScrollRef = useRef(false);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const [dragging, setDragging] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [days, setDays] = useState<DayColumn[]>(() => buildDayColumns(today));
  const [darkMode, setDarkMode] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [archivePanelOpen, setArchivePanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [recentlyArchivedTask, setRecentlyArchivedTask] = useState<ArchivedTaskSnapshot | null>(null);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTaskEntry[]>([]);
  const themeColors = darkMode ? darkColors : lightColors;
  const [newTaskInput, setNewTaskInput] = useState<string>("");
  const [activeAddIndex, setActiveAddIndex] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<{ dayIndex: number; taskIndex: number } | null>(null);
  const [editTaskInput, setEditTaskInput] = useState<string>("");
  const [expandedTask, setExpandedTask] = useState<{ dayIndex: number; taskIndex: number } | null>(null);
  const [expandedTagInput, setExpandedTagInput] = useState("");
  const [expandedTagColorInput, setExpandedTagColorInput] = useState("#22c55e");
  const [hoveredTask, setHoveredTask] = useState<{ dayIndex: number; taskIndex: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ dayIndex: number; taskIndex: number; x: number; y: number } | null>(null);
  const [contextMenuMoveOpen, setContextMenuMoveOpen] = useState(false);
  const [contextMenuTagOpen, setContextMenuTagOpen] = useState(false);
  const [contextMenuSavedTagsOpen, setContextMenuSavedTagsOpen] = useState(false);
  const [contextMenuDueDateOpen, setContextMenuDueDateOpen] = useState(false);
  const [contextMenuTagInput, setContextMenuTagInput] = useState("");
  const [contextMenuTagColorInput, setContextMenuTagColorInput] = useState("#22c55e");
  const [contextMenuDueDateInput, setContextMenuDueDateInput] = useState("");
  const [dropTarget, setDropTarget] = useState<{ dayIndex: number; insertIndex: number } | null>(null);
  const tagSuggestionsListId = "kanban-tag-suggestions";
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const archiveUndoRef = useRef<HTMLDivElement | null>(null);
  const contextMenuDueDateInputRef = useRef<HTMLInputElement | null>(null);
  const dragImageRef = useRef<HTMLElement | null>(null);

  const savedTagSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const suggestions: string[] = [];

    days.forEach((day) => {
      day.tasks.forEach((task) => {
        const tag = task.tag?.trim();
        if (!tag || seen.has(tag)) return;
        seen.add(tag);
        suggestions.push(tag);
      });
    });

    return suggestions;
  }, [days]);

  const filteredContextMenuTagSuggestions = useMemo(() => {
    const query = contextMenuTagInput.trim().toLowerCase();
    if (!query) return savedTagSuggestions.slice(0, 8);
    return savedTagSuggestions.filter((tag) => tag.toLowerCase().includes(query)).slice(0, 8);
  }, [contextMenuTagInput, savedTagSuggestions]);

  useEffect(() => {
    if (activeAddIndex !== null && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [activeAddIndex]);

  useEffect(() => {
    if (editingTask !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTask]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handleClickOutsideSearch = (event: MouseEvent) => {
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(event.target as Node)
      ) {
        setSearchPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideSearch);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSearch);
    };
  }, []);

  useEffect(() => {
    if (!recentlyArchivedTask) return;

    const closeArchiveUndoOnAction = (event: MouseEvent | KeyboardEvent | WheelEvent | TouchEvent) => {
      if (
        "key" in event &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "c"
      ) {
        return;
      }

      if (
        archiveUndoRef.current &&
        archiveUndoRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setRecentlyArchivedTask(null);
    };

    document.addEventListener("mousedown", closeArchiveUndoOnAction);
    document.addEventListener("keydown", closeArchiveUndoOnAction);
    document.addEventListener("wheel", closeArchiveUndoOnAction);
    document.addEventListener("touchstart", closeArchiveUndoOnAction);

    return () => {
      document.removeEventListener("mousedown", closeArchiveUndoOnAction);
      document.removeEventListener("keydown", closeArchiveUndoOnAction);
      document.removeEventListener("wheel", closeArchiveUndoOnAction);
      document.removeEventListener("touchstart", closeArchiveUndoOnAction);
    };
  }, [recentlyArchivedTask]);

  const scrollDayToStart = (index: number, smooth = true) => {
    if (!scrollRef.current || !dayRefs.current[index]) return;
    const target = dayRefs.current[index];
    const leftMargin = 24;
    const targetLeft = Math.max(0, target.offsetLeft - leftMargin);
    scrollRef.current.scrollTo({
      left: targetLeft,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const goToday = () => {
    setSelectedIndex(CENTER_INDEX);
  };

  const addTaskToList = (index: number, title: string) => {
    if (!title.trim()) return;
    setDays((currentDays) =>
      currentDays.map((day, dayIndex) =>
        dayIndex === index
          ? { ...day, tasks: [...day.tasks, { title: title.trim(), completed: false }] }
          : day
      )
    );
    setNewTaskInput("");
    setActiveAddIndex(null);
  };

  const openExpandedTask = (dayIndex: number, taskIndex: number) => {
    const task = days[dayIndex]?.tasks?.[taskIndex];
    setSelectedIndex(dayIndex);
    setExpandedTask({ dayIndex, taskIndex });
    setExpandedTagInput(task?.tag ?? "");
    setExpandedTagColorInput(task?.tagColor ?? "#22c55e");
    setContextMenu(null);
    setContextMenuMoveOpen(false);
  };

  const setTaskTag = (dayIndex: number, taskIndex: number, tag: string, color?: string) => {
    const trimmedTag = tag.trim();
    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              tasks: day.tasks.map((task, currentTaskIndex) =>
                currentTaskIndex === taskIndex
                  ? {
                      ...task,
                      tag: trimmedTag || undefined,
                      tagColor: trimmedTag ? (color ?? task.tagColor ?? "#22c55e") : undefined,
                    }
                  : task
              ),
            }
          : day
      )
    );
  };

  const setTaskDueDate = (dayIndex: number, taskIndex: number, dueDate: string) => {
    const trimmedDueDate = dueDate.trim();
    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              tasks: day.tasks.map((task, currentTaskIndex) =>
                currentTaskIndex === taskIndex
                  ? {
                      ...task,
                      dueDate: trimmedDueDate || undefined,
                    }
                  : task
              ),
            }
          : day
      )
    );
  };

  const setTaskDescription = (dayIndex: number, taskIndex: number, description: string) => {
    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              tasks: day.tasks.map((task, currentTaskIndex) =>
                currentTaskIndex === taskIndex
                  ? {
                      ...task,
                      description,
                    }
                  : task
              ),
            }
          : day
      )
    );
  };

  const saveEditedTask = () => {
    if (!editingTask || !editTaskInput.trim()) {
      setEditingTask(null);
      setEditTaskInput("");
      return;
    }
    setDays((currentDays) =>
      currentDays.map((day, dayIndex) =>
        dayIndex === editingTask.dayIndex
          ? {
              ...day,
              tasks: day.tasks.map((task, taskIndex) =>
                taskIndex === editingTask.taskIndex
                  ? { ...task, title: editTaskInput.trim() }
                  : task
              ),
            }
          : day
      )
    );
    setEditingTask(null);
    setEditTaskInput("");
  };

  const archiveTask = (dayIndex: number, taskIndex: number) => {
    const removedTask = days[dayIndex]?.tasks?.[taskIndex];
    const dayLabel = days[dayIndex]?.label;
    if (!removedTask) return;

    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              tasks: day.tasks.filter((_, currentTaskIndex) => currentTaskIndex !== taskIndex),
            }
          : day
      )
    );

    const archivedAt = new Date().toISOString();
    const archivedId = `${archivedAt}-${dayIndex}-${taskIndex}`;
    setArchivedTasks((currentArchived) => [
      {
        id: archivedId,
        task: removedTask,
        dayLabel: dayLabel ?? "Unknown day",
        archivedAt,
      },
      ...currentArchived,
    ]);

    setRecentlyArchivedTask({
      dayIndex,
      taskIndex,
      task: removedTask,
      dayLabel: dayLabel ?? "Unknown day",
      archivedId,
    });

    setContextMenu(null);
    if (editingTask?.dayIndex === dayIndex && editingTask?.taskIndex === taskIndex) {
      setEditingTask(null);
      setEditTaskInput("");
    }
    if (expandedTask?.dayIndex === dayIndex && expandedTask?.taskIndex === taskIndex) {
      setExpandedTask(null);
    }
  };

  const moveTask = (fromDay: number, fromTask: number, toDay: number) => {
    if (fromDay === toDay) {
      setContextMenu(null);
      return;
    }
    setDays((currentDays) => {
      const daysCopy = currentDays.map((d) => ({ ...d, tasks: [...d.tasks] }));
      const task = daysCopy[fromDay]?.tasks?.[fromTask];
      if (!task) return currentDays;
      daysCopy[fromDay].tasks.splice(fromTask, 1);
      daysCopy[toDay].tasks = [...daysCopy[toDay].tasks, task];
      return daysCopy;
    });
    setContextMenu(null);
    if (expandedTask?.dayIndex === fromDay && expandedTask?.taskIndex === fromTask) {
      setExpandedTask(null);
    }
  };

  const moveTaskToIndex = (fromDay: number, fromTask: number, toDay: number, insertIndex: number) => {
    setDays((currentDays) => {
      const daysCopy = currentDays.map((d) => ({ ...d, tasks: [...d.tasks] }));
      const sourceTasks = daysCopy[fromDay]?.tasks;
      const targetTasks = daysCopy[toDay]?.tasks;
      const task = sourceTasks?.[fromTask];
      if (!sourceTasks || !targetTasks || !task) return currentDays;

      sourceTasks.splice(fromTask, 1);
      let nextInsertIndex = insertIndex;
      if (fromDay === toDay && fromTask < insertIndex) {
        nextInsertIndex -= 1;
      }
      nextInsertIndex = Math.max(0, Math.min(nextInsertIndex, targetTasks.length));

      if (fromDay === toDay && nextInsertIndex === fromTask) {
        sourceTasks.splice(fromTask, 0, task);
        return currentDays;
      }

      targetTasks.splice(nextInsertIndex, 0, task);
      return daysCopy;
    });

    setDropTarget(null);
    setContextMenu(null);

    if (expandedTask?.dayIndex === fromDay && expandedTask?.taskIndex === fromTask) {
      setExpandedTask({ dayIndex: toDay, taskIndex: insertIndex });
    }
  };

  const toggleTaskCompleted = (dayIndex: number, taskIndex: number) => {
    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              tasks: day.tasks.map((task, currentTaskIndex) =>
                currentTaskIndex === taskIndex
                  ? { ...task, completed: !task.completed }
                  : task
              ),
            }
          : day
      )
    );
  };

  const handleDragStart = (fromDay: number, fromTask: number, e: React.DragEvent) => {
    try {
      e.dataTransfer.setData('application/json', JSON.stringify({ fromDay, fromTask }));
      e.dataTransfer.effectAllowed = 'move';
      // create a cloned node to use as the drag image so the item appears to move with the cursor
      try {
        const el = e.currentTarget as HTMLElement;
        const clone = el.cloneNode(true) as HTMLElement;
        // style clone for drag preview
        clone.style.position = 'absolute';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.width = `${el.offsetWidth}px`;
        clone.style.boxShadow = '0 10px 30px rgba(2,6,23,0.2)';
        clone.style.transform = 'scale(0.98)';
        clone.style.borderRadius = getComputedStyle(el).borderRadius || '8px';
        document.body.appendChild(clone);
        try {
          e.dataTransfer.setDragImage(clone, clone.offsetWidth / 2, clone.offsetHeight / 2);
        } catch {}
        dragImageRef.current = clone;
      } catch {}
      // mark the dragged element so we can style it if needed
      try {
        (e.currentTarget as HTMLElement)?.classList.add('kanban-dragging');
      } catch {}
    } catch {}
  };

  const handleDragEnd = (e: React.DragEvent) => {
    try {
      e.dataTransfer.clearData();
      try {
        (e.currentTarget as HTMLElement)?.classList.remove('kanban-dragging');
      } catch {}
      try {
        if (dragImageRef.current && dragImageRef.current.parentNode) {
          dragImageRef.current.parentNode.removeChild(dragImageRef.current);
        }
        dragImageRef.current = null;
      } catch {}
      setDropTarget(null);
    } catch {}
  };

  const handleDrop = (toDay: number, insertIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData('application/json');
    if (!payload) return;
    let parsed: { fromDay: number; fromTask: number } | null = null;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }
    if (!parsed) return;
    const { fromDay, fromTask } = parsed;
    moveTaskToIndex(fromDay, fromTask, toDay, insertIndex);
  };

  const handleTaskDragOver = (dayIndex: number, taskIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const bounds = e.currentTarget.getBoundingClientRect();
    const insertIndex = e.clientY < bounds.top + bounds.height / 2 ? taskIndex : taskIndex + 1;
    setDropTarget((current) =>
      current?.dayIndex === dayIndex && current.insertIndex === insertIndex
        ? current
        : { dayIndex, insertIndex }
    );
  };

  const handleListDragOver = (dayIndex: number, insertIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropTarget((current) =>
      current?.dayIndex === dayIndex && current.insertIndex === insertIndex
        ? current
        : { dayIndex, insertIndex }
    );
  };

  useEffect(() => {
    if (ignoreScrollRef.current) {
      ignoreScrollRef.current = false;
      return;
    }
    scrollDayToStart(selectedIndex);
  }, [selectedIndex]);

  // Drag-to-scroll handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    dragRef.current.isDown = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.scrollLeft = el.scrollLeft;
    dragRef.current.moved = false;
    setDragging(true);
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDown || !scrollRef.current) return;
    const x = e.clientX;
    const walk = x - dragRef.current.startX;
    if (Math.abs(walk) > 5) dragRef.current.moved = true;
    scrollRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDown) return;
    dragRef.current.isDown = false;
    setDragging(false);
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const activeTask = expandedTask
    ? days[expandedTask.dayIndex]?.tasks?.[expandedTask.taskIndex] ?? null
    : null;

  const undoArchiveTask = useCallback(() => {
    if (!recentlyArchivedTask) return;

    const snapshot = recentlyArchivedTask;
    setDays((currentDays) =>
      currentDays.map((day, currentDayIndex) => {
        if (currentDayIndex !== snapshot.dayIndex) return day;

        const nextTasks = [...day.tasks];
        const insertIndex = Math.max(0, Math.min(snapshot.taskIndex, nextTasks.length));
        nextTasks.splice(insertIndex, 0, snapshot.task);

        return {
          ...day,
          tasks: nextTasks,
        };
      })
    );

    setArchivedTasks((currentArchived) =>
      currentArchived.filter((entry) => entry.id !== snapshot.archivedId)
    );

    setRecentlyArchivedTask(null);
  }, [recentlyArchivedTask]);

  useEffect(() => {
    if (!recentlyArchivedTask) return;

    const handleUndoShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        undoArchiveTask();
      }
    };

    document.addEventListener("keydown", handleUndoShortcut);
    return () => {
      document.removeEventListener("keydown", handleUndoShortcut);
    };
  }, [recentlyArchivedTask, undoArchiveTask]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedSearchQuery.length > 0;

  const taskMatchesSearch = (task: Task, day: DayColumn) => {
    if (!normalizedSearchQuery) return true;

    const searchableParts = [
      task.title,
      task.description,
      task.tag,
      task.dueDate,
      formatDueDateDisplay(task.dueDate),
      task.priority,
      task.completed ? "completed" : "not completed",
      day.label,
      formatWeekdayLong(day.date),
      formatWeekdayShort(day.date),
      formatMonthDay(day.date),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableParts.includes(normalizedSearchQuery);
  };

  const searchResults = isSearching
    ? days.flatMap((day, dayIndex) =>
        day.tasks
          .map((task, taskIndex) => ({ day, dayIndex, task, taskIndex }))
          .filter(({ task }) => taskMatchesSearch(task, day))
      )
    : [];

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const renderHighlightedText = (value?: string, fallback = "-") => {
    const trimmedValue = value?.trim();
    const text = trimmedValue && trimmedValue.length > 0 ? trimmedValue : fallback;

    if (!normalizedSearchQuery || text === fallback) {
      return text;
    }

    const pattern = new RegExp(`(${escapeRegExp(normalizedSearchQuery)})`, "ig");
    const parts = text.split(pattern);

    return parts.map((part, index) =>
      part.toLowerCase() === normalizedSearchQuery ? (
        <mark
          key={`search-highlight-${index}-${part}`}
          className={`rounded px-0.5 ${darkMode ? "bg-amber-300/60 text-slate-900" : "bg-amber-200 text-slate-900"}`}
        >
          {part}
        </mark>
      ) : (
        <span key={`search-text-${index}-${part}`}>{part}</span>
      )
    );
  };

  // Ensure today is positioned at the left edge on initial mount
  useEffect(() => {
    if (!dayRefs.current[CENTER_INDEX] || !scrollRef.current) return;
    requestAnimationFrame(() => {
      scrollDayToStart(CENTER_INDEX, false);
    });
  }, []);


  return (
    <div className="space-y-6">
      <header className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-3 py-2 shadow-sm transition ${darkMode ? "border-[#372a5d] bg-[#171021] shadow-[#241b35]/30" : "border-slate-200 bg-white shadow-slate-200/50"}`}>
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <div ref={searchPanelRef} className="relative w-[20rem]">
            <label htmlFor="kanban-search" className="sr-only">Search</label>
            <input
              id="kanban-search"
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onFocus={() => setSearchPanelOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchPanelOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchPanelOpen(false);
                }
              }}
              className={`w-full rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 ${darkMode ? "border-[#372a5d] bg-[#241c3c] text-slate-100 focus:border-[#7d6ba6] focus:ring-[#372a5d]" : "border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-900 focus:ring-slate-200"}`}
            />

            {isSearching && searchPanelOpen ? (
              <div className={`absolute left-0 top-[calc(100%+0.45rem)] z-[80] w-[min(72rem,95vw)] rounded-xl border p-3 shadow-xl ${darkMode ? "border-[#372a5d] bg-[#1f1830] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Results
                  </p>
                  <p className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
                  </p>
                </div>

                {searchResults.length === 0 ? (
                  <div className={`rounded-lg border border-dashed px-3 py-4 text-sm ${darkMode ? "border-slate-600 text-slate-300" : "border-slate-300 text-slate-600"}`}>
                    No tasks matched this query.
                  </div>
                ) : (
                  <div className={`max-h-[24rem] overflow-auto rounded-lg border ${darkMode ? "border-[#372a5d]" : "border-slate-200"}`}>
                    <table className="min-w-full text-left text-sm">
                      <thead className={darkMode ? "bg-[#2f2640] text-slate-200" : "bg-slate-100 text-slate-700"}>
                        <tr>
                          <th className="px-3 py-2 font-semibold">Title</th>
                          <th className="px-3 py-2 font-semibold">Label</th>
                          <th className="px-3 py-2 font-semibold">Priority</th>
                          <th className="px-3 py-2 font-semibold">Due date</th>
                          <th className="px-3 py-2 font-semibold">Day</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((result) => {
                          const dueDateDisplay = result.task.dueDate?.trim()
                            ? formatDueDateDisplay(result.task.dueDate)
                            : "Not set";

                          return (
                            <tr
                              key={`search-result-${result.dayIndex}-${result.taskIndex}`}
                              onClick={() => {
                                setSearchPanelOpen(false);
                                openExpandedTask(result.dayIndex, result.taskIndex);
                              }}
                              className={`cursor-pointer border-t transition ${darkMode ? "border-[#372a5d] hover:bg-[#2a2142]" : "border-slate-200 hover:bg-slate-50"}`}
                            >
                              <td className="px-3 py-2 font-medium">{renderHighlightedText(result.task.title)}</td>
                              <td className="px-3 py-2">{renderHighlightedText(result.task.tag)}</td>
                              <td className="px-3 py-2">{renderHighlightedText(result.task.priority ?? "Not set")}</td>
                              <td className="px-3 py-2">{renderHighlightedText(dueDateDisplay)}</td>
                              <td className="px-3 py-2">{renderHighlightedText(result.day.label)}</td>
                              <td className="px-3 py-2">{renderHighlightedText(result.task.completed ? "Completed" : "Open")}</td>
                              <td className="px-3 py-2">{renderHighlightedText(result.task.description)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={goToday}
            className={`rounded-2xl border px-3 py-2 text-sm font-medium transition hover:brightness-90 ${darkMode ? "border-[#372a5d] bg-[#241c3c] text-slate-100 hover:bg-[#332c5a]" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Go to Today
          </button>
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className={`rounded-2xl border px-3 py-2 text-sm font-medium transition hover:brightness-90 ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {darkMode ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOptionsOpen(false);
                setViewsOpen((v) => !v);
              }}
              aria-expanded={viewsOpen}
              aria-label="Views"
              className={`rounded-md border px-3 py-2 text-sm font-medium transition hover:brightness-90 ${darkMode ? 'border-[#423865] text-slate-100 bg-[#2f2640] hover:bg-[#3b315a]' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-100'}`}
            >
              Views
            </button>
            {viewsOpen ? (
              <div
                className={`absolute right-0 mt-2 w-44 rounded-md border p-2 text-sm ${darkMode ? 'bg-[#241c3c] border-[#372a5d] text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                View options placeholder
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewsOpen(false);
                setOptionsOpen((v) => !v);
              }}
              aria-expanded={optionsOpen}
              aria-label="Options"
              className={`p-2 rounded-md transition flex items-center justify-center hover:brightness-90 ${darkMode ? 'border-[#423865] text-slate-100 bg-[#2f2640] hover:bg-[#3b315a]' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-100'}`}
            >
              <span className="text-lg">☰</span>
            </button>
            {optionsOpen ? (
              <div
                className={`absolute right-0 mt-2 w-40 rounded-md border p-2 text-sm ${darkMode ? 'bg-[#241c3c] border-[#372a5d] text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                style={{ borderTopRightRadius: 0 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setArchivePanelOpen(true);
                    setOptionsOpen(false);
                  }}
                  className={`w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? 'border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'}`}
                >
                  Archive
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className={`overflow-hidden border shadow-sm ${darkMode ? "border-[#372a5d] bg-[#181224] shadow-[#241b35]/30" : "border-slate-200 bg-slate-50 shadow-slate-200/50"}`}>
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`kanban-scroll flex overflow-x-auto px-5 py-4 sm:px-4 lg:px-4 scrollbar-hide h-screen ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {days.map((day, index) => {
            const visibleTaskEntries = day.tasks
              .map((task, taskIndex) => ({ task, taskIndex }))
              .filter(({ task }) => taskMatchesSearch(task, day));

            return (
              <KanbanColumn
                key={day.label}
                day={day}
                index={index}
                totalDays={days.length}
                centerIndex={CENTER_INDEX}
                selectedIndex={selectedIndex}
                darkMode={darkMode}
                dayColors={dayColors}
                themeColors={themeColors}
                onSelectDay={(dayIndex) => {
                  if (dragRef.current.moved) {
                    dragRef.current.moved = false;
                    return;
                  }
                  ignoreScrollRef.current = true;
                  setSelectedIndex(dayIndex);
                }}
                setDayRef={(dayIndex, element) => {
                  dayRefs.current[dayIndex] = element;
                }}
                visibleTaskEntries={visibleTaskEntries}
                isSearching={isSearching}
                dropTarget={dropTarget}
                editingTask={editingTask}
                editTaskInput={editTaskInput}
                setEditTaskInput={setEditTaskInput}
                saveEditedTask={saveEditedTask}
                cancelEditing={() => {
                  setEditingTask(null);
                  setEditTaskInput("");
                }}
                hoveredTask={hoveredTask}
                setHoveredTask={setHoveredTask}
                editInputRef={editInputRef}
                onOpenExpandedTask={openExpandedTask}
                onToggleTaskCompleted={toggleTaskCompleted}
                onHandleDragStart={handleDragStart}
                onHandleDragEnd={handleDragEnd}
                onHandleTaskDragOver={handleTaskDragOver}
                onHandleDrop={handleDrop}
                onHandleListDragOver={handleListDragOver}
                activeAddIndex={activeAddIndex}
                newTaskInput={newTaskInput}
                setNewTaskInput={setNewTaskInput}
                setActiveAddIndex={setActiveAddIndex}
                addInputRef={addInputRef}
                onAddTaskToList={addTaskToList}
                contextMenu={contextMenu}
                contextMenuRef={contextMenuRef}
                contextMenuMoveOpen={contextMenuMoveOpen}
                setContextMenuMoveOpen={setContextMenuMoveOpen}
                contextMenuTagOpen={contextMenuTagOpen}
                setContextMenuTagOpen={setContextMenuTagOpen}
                contextMenuSavedTagsOpen={contextMenuSavedTagsOpen}
                setContextMenuSavedTagsOpen={setContextMenuSavedTagsOpen}
                contextMenuDueDateOpen={contextMenuDueDateOpen}
                setContextMenuDueDateOpen={setContextMenuDueDateOpen}
                contextMenuTagInput={contextMenuTagInput}
                setContextMenuTagInput={setContextMenuTagInput}
                contextMenuTagColorInput={contextMenuTagColorInput}
                setContextMenuTagColorInput={setContextMenuTagColorInput}
                contextMenuDueDateInput={contextMenuDueDateInput}
                setContextMenuDueDateInput={setContextMenuDueDateInput}
                filteredContextMenuTagSuggestions={filteredContextMenuTagSuggestions}
                setContextMenu={setContextMenu}
                contextMenuDueDateInputRef={contextMenuDueDateInputRef}
                onMoveTask={moveTask}
                onSetTaskTag={setTaskTag}
                onSetTaskDueDate={setTaskDueDate}
                onArchiveTask={archiveTask}
                days={days}
              />
            );
          })}
        </div>
      </section>

      {expandedTask ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setExpandedTask(null)}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl border p-5 shadow-2xl ${darkMode ? "border-[#372a5d] bg-[#1f1830] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Task Detail
                </p>
                <h2 className="mt-1 text-xl font-semibold leading-tight">
                  {activeTask?.title ?? "Untitled Task"}
                </h2>
                <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {formatWeekdayLong(days[expandedTask.dayIndex]?.date ?? new Date())} · {formatMonthDay(days[expandedTask.dayIndex]?.date ?? new Date())}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedTask(null)}
                className={`rounded-md border px-3 py-1 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className={`rounded-lg border p-3 ${darkMode ? "border-[#372a5d] bg-[#241c3c]" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-sm font-semibold">Task Details</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Title
                    </p>
                    <p className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {activeTask?.title ?? "Untitled Task"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Due date
                    </p>
                    <p className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {activeTask?.dueDate?.trim() ? formatDueDateDisplay(activeTask.dueDate) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Priority
                    </p>
                    <p className={`mt-1 text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                      {activeTask?.priority ?? "Not set"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Description
                    </p>
                    <textarea
                      value={activeTask?.description ?? ""}
                      onChange={(e) => {
                        if (!expandedTask) return;
                        setTaskDescription(expandedTask.dayIndex, expandedTask.taskIndex, e.target.value);
                      }}
                      placeholder="Write a description..."
                      rows={5}
                      className={`mt-2 w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm leading-relaxed outline-none transition resize-none placeholder:text-slate-400 focus:resize-y ${darkMode ? "text-slate-100 focus:border-[#7d6ba6] focus:bg-[#2f2640]" : "text-slate-900 focus:border-slate-500 focus:bg-white"}`}
                    />
                  </div>
                </div>
              </div>
              <div className={`rounded-lg border p-3 ${darkMode ? "border-[#372a5d] bg-[#241c3c]" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-sm font-semibold">Tag</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={expandedTagInput}
                    onChange={(e) => setExpandedTagInput(e.target.value)}
                    placeholder="coding, miscellaneous, etc"
                    list={tagSuggestionsListId}
                    autoComplete="off"
                    className={`min-w-56 flex-1 rounded-md border px-3 py-2 text-sm outline-none transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 focus:border-[#7d6ba6]" : "border-slate-300 bg-white text-slate-900 focus:border-slate-500"}`}
                  />
                  <div className="grid grid-cols-9 gap-1">
                    {TAG_COLOR_OPTIONS.map((color) => {
                      const active = expandedTagColorInput === color;
                      return (
                        <button
                          key={`expanded-tag-color-${color}`}
                          type="button"
                          onClick={() => setExpandedTagColorInput(color)}
                          className={`h-5 w-5 rounded-full border ${active ? 'ring-2 ring-slate-400' : ''}`}
                          style={{ backgroundColor: color, borderColor: darkMode ? '#1f2937' : '#e2e8f0' }}
                        />
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!expandedTask) return;
                      setTaskTag(expandedTask.dayIndex, expandedTask.taskIndex, expandedTagInput, expandedTagColorInput);
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"}`}
                  >
                    Save Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!expandedTask) return;
                      setExpandedTagInput("");
                      setExpandedTagColorInput("#22c55e");
                      setTaskTag(expandedTask.dayIndex, expandedTask.taskIndex, "", "#22c55e");
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"}`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
            <datalist id={tagSuggestionsListId}>
              {savedTagSuggestions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
        </div>
      ) : null}

      {archivePanelOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setArchivePanelOpen(false)}
        >
          <div
            className={`w-full max-w-4xl rounded-2xl border p-5 shadow-2xl ${darkMode ? "border-[#372a5d] bg-[#1f1830] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Archived Tasks
                </p>
                <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {archivedTasks.length} archived task{archivedTasks.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setArchivePanelOpen(false)}
                className={`rounded-md border px-3 py-1 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
              >
                Close
              </button>
            </div>

            {archivedTasks.length === 0 ? (
              <div className={`mt-4 rounded-lg border border-dashed px-4 py-6 text-sm ${darkMode ? "border-slate-600 text-slate-300" : "border-slate-300 text-slate-600"}`}>
                No archived tasks yet.
              </div>
            ) : (
              <div className="mt-4 max-h-[60vh] space-y-3 overflow-auto pr-1">
                {archivedTasks.map((entry) => (
                  <article
                    key={entry.id}
                    className={`rounded-xl border p-3 ${darkMode ? "border-[#3f3361] bg-[#241c3c]" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={`text-sm font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {entry.task.title}
                        </h3>
                        <p className={`mt-1 text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          From {entry.dayLabel}
                        </p>
                      </div>
                      <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {new Date(entry.archivedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                      <p className={darkMode ? "text-slate-300" : "text-slate-600"}>
                        Tag: <span className="font-medium">{entry.task.tag?.trim() || "-"}</span>
                      </p>
                      <p className={darkMode ? "text-slate-300" : "text-slate-600"}>
                        Priority: <span className="font-medium">{entry.task.priority ?? "Not set"}</span>
                      </p>
                      <p className={darkMode ? "text-slate-300" : "text-slate-600"}>
                        Due: <span className="font-medium">{entry.task.dueDate?.trim() ? formatDueDateDisplay(entry.task.dueDate) : "Not set"}</span>
                      </p>
                    </div>

                    {entry.task.description?.trim() ? (
                      <p className={`mt-2 text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                        {entry.task.description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {recentlyArchivedTask ? (
        <div
          ref={archiveUndoRef}
          className={`fixed bottom-4 left-1/2 z-[95] w-[min(92vw,34rem)] -translate-x-1/2 rounded-xl border px-4 py-3 shadow-xl ${darkMode ? "border-[#4c3e74] bg-[#241b38] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
              Task archived: <span className="font-semibold">{recentlyArchivedTask.task.title}</span>
            </p>
            <button
              type="button"
              onClick={undoArchiveTask}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${darkMode ? "border-[#7d6ba6] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"}`}
            >
              Undo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}







