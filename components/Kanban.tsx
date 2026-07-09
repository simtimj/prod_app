"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = {
  title: string;
  completed?: boolean;
  tag?: string;
  tagColor?: string;
  description?: string;
  dueDate?: string;
  priority?: "Low" | "Medium" | "High";
};

type DayColumn = {
  date: Date;
  label: string;
  tasks: Task[];
};

const lightColors: Record<string, string> = {
  "Sunday": "#f5d000",
  "Monday": "#9ca3af",
  "Tuesday": "#ff8a8a",
  "Wednesday": "#7fa7ff",
  "Thursday": "#72c38f",
  "Friday": "#e0b600",
  "Saturday": "#a56f00",
};

const darkColors: Record<string, string> = {
  "Sunday": "#cca800",
  "Monday": "#6b7280",
  "Tuesday": "#f86767",
  "Wednesday": "#5f8cff",
  "Thursday": "#4fa270",
  "Friday": "#d19c00",
  "Saturday": "#8a5a00",
};

const daysOfWeek: Record<string, string> = {
  "Sunday": "Sun",
  "Monday": "Mon",
  "Tuesday": "Tues",
  "Wednesday": "Weds",
  "Thursday": "Thurs", 
  "Friday": "Fri"
};

function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

const DAY_COUNT = 31;
const CENTER_INDEX = Math.floor(DAY_COUNT / 2);

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatWeekdayShort(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function formatWeekdayLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDateDisplay(dateValue?: string) {
  if (!dateValue?.trim()) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TAG_COLOR_OPTIONS = [
  "#86efac", // light green
  "#22c55e", // green
  "#166534", // dark green
  "#d6b38a", // light brown
  "#8b5e3c", // brown
  "#5c3b28", // dark brown
  "#93c5fd", // light blue
  "#3b82f6", // blue
  "#1e3a8a", // dark blue
  "#fca5a5", // light red
  "#ef4444", // red
  "#991b1b", // dark red
  "#d8b4fe", // light purple
  "#a855f7", // purple
  "#6b21a8", // dark purple
  "#fdba74", // light orange
  "#f97316", // orange
  "#9a3412", // dark orange
  "#d1d5db", // light gray
  "#6b7280", // gray
  "#374151", // dark gray
];

function buildDayColumns(today: Date): DayColumn[] {
  const samples: Task[][] = [
    [
      { title: "Capture ideas for the week", completed: false },
      { title: "Check email summaries", completed: false },
    ],
    [
      { title: "Review today's calendar", completed: true },
      { title: "Draft meeting notes", completed: false },
      { title: "Add priorities to workboard", completed: false },
    ],
    [
      { title: "Plan sprint goals", completed: false },
      { title: "Update task statuses", completed: false },
    ],
    [
      { title: "Focus on current day", completed: false },
      { title: "Complete two quick wins", completed: false },
      { title: "Sync with the team", completed: false },
    ],
    [
      { title: "Prepare tomorrow's agenda", completed: false },
      { title: "Review blockers", completed: false },
    ],
    [
      { title: "Reflect on the week", completed: false },
      { title: "Archive done items", completed: true },
    ],
    [
      { title: "Clear small tasks", completed: false },
      { title: "Organize backlog", completed: false },
    ],
  ];

  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const offset = index - CENTER_INDEX;
    const date = addDays(today, offset);
    return {
      date,
      label: `${formatWeekdayLong(date)} · ${formatMonthDay(date)}`,
      tasks: samples[index % samples.length],
    };
  });
}

export default function Kanban({ dayColors }: { dayColors?: Record<string, string> } = {}) {
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const deleteTask = (dayIndex: number, taskIndex: number) => {
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
          <div className="relative w-[20rem]">
            <label htmlFor="kanban-search" className="sr-only">Search</label>
            <input
              id="kanban-search"
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 ${darkMode ? "border-[#372a5d] bg-[#241c3c] text-slate-100 focus:border-[#7d6ba6] focus:ring-[#372a5d]" : "border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-900 focus:ring-slate-200"}`}
            />

            {isSearching ? (
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
                Test text
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
            const isSelected = index === selectedIndex;
            const weekdayLong = formatWeekdayLong(day.date);
            const weekdayShort = daysOfWeek[weekdayLong] ?? formatWeekdayShort(day.date);
            // lookup order: prop (long), prop (short), local colors (long), local colors (short)
            const dayColor =
              dayColors?.[weekdayLong] ?? dayColors?.[weekdayShort] ?? themeColors[weekdayLong] ?? themeColors[weekdayShort];
            const applyColor = Boolean(dayColor);
            const visibleTaskEntries = day.tasks
              .map((task, taskIndex) => ({ task, taskIndex }))
              .filter(({ task }) => taskMatchesSearch(task, day));
            const isToday = index === CENTER_INDEX;
            const todayDateClasses = isToday
              ? "inline-flex flex-col rounded-2xl border-2 px-3 py-2 shadow-sm"
              : "";
            const todayDateStyle = isToday && applyColor
              ? {
                  backgroundColor: hexToRgba(dayColor, darkMode ? 0.18 : 0.22),
                  borderColor: hexToRgba(dayColor, darkMode ? 0.9 : 0.85),
                  color: darkMode ? "#f8fafc" : "#111",
                  boxShadow: `0 0 0 1px ${hexToRgba(dayColor, 0.12)}`,
                }
              : undefined;
            return (
              <div
                key={day.label}
                ref={(el) => {
                  dayRefs.current[index] = el;
                }}
                onClick={() => {
                  if (dragRef.current.moved) {
                    // click came after a drag; ignore selection
                    dragRef.current.moved = false;
                    return;
                  }
                  ignoreScrollRef.current = true;
                  setSelectedIndex(index);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedIndex(index);
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
                } ${index === 0 ? "mr-2" : "mx-2"} ${index === days.length - 1 ? "ml-2" : ""}`}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAddIndex(index);
                        setNewTaskInput("");
                      }}
                      className="rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition hover:brightness-90"
                      style={applyColor ? { backgroundColor: hexToRgba(dayColor, 0.18), borderColor: dayColor, color: "#000" } : undefined}
                    >
                      + Add task
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {visibleTaskEntries.map(({ task, taskIndex }) => {
                    const isEditing =
                      editingTask?.dayIndex === index && editingTask?.taskIndex === taskIndex;
                    const isHovered = hoveredTask?.dayIndex === index && hoveredTask?.taskIndex === taskIndex;
                    const taskColor = task.tagColor;
                    return (
                      <div key={`${task.title}-${taskIndex}`}>
                        {!isSearching && dropTarget?.dayIndex === index && dropTarget.insertIndex === taskIndex ? (
                          <div
                            className={`mb-1 h-1 rounded-full ${darkMode ? 'bg-slate-300/45' : 'bg-slate-500/35'}`}
                          />
                        ) : null}
                        <div
                          draggable={!isSearching}
                          onDragStart={(e) => handleDragStart(index, taskIndex, e)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleTaskDragOver(index, taskIndex, e)}
                          onDrop={(e) => handleDrop(index, dropTarget?.dayIndex === index ? dropTarget.insertIndex : taskIndex, e)}
                          onMouseEnter={() => setHoveredTask({ dayIndex: index, taskIndex })}
                          onMouseLeave={() => {
                            setHoveredTask((current) =>
                              current?.dayIndex === index && current?.taskIndex === taskIndex ? null : current
                            );
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isEditing) {
                              openExpandedTask(index, taskIndex);
                            }
                          }}
                          className={`cursor-pointer rounded-xl border px-3 py-3 shadow-sm transition ${darkMode ? "border-slate-600" : "border-slate-300"} ${!taskColor ? (darkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-100") : ""}`}
                          style={
                            taskColor
                              ? {
                                  backgroundColor: hexToRgba(taskColor, isHovered ? (darkMode ? 0.34 : 0.24) : (darkMode ? 0.2 : 0.14)),
                                  borderColor: isHovered ? hexToRgba(taskColor, 1) : hexToRgba(taskColor, darkMode ? 0.75 : 0.55),
                                }
                              : undefined
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenuMoveOpen(false);
                            setContextMenuTagOpen(false);
                            setContextMenuSavedTagsOpen(false);
                            setContextMenuDueDateOpen(false);
                            setContextMenuTagInput(task.tag ?? "");
                            setContextMenuTagColorInput(task.tagColor ?? "#22c55e");
                            setContextMenuDueDateInput(task.dueDate ?? "");
                            setContextMenu({ dayIndex: index, taskIndex, x: e.clientX, y: e.clientY });
                          }}
                        >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTaskInput}
                            onChange={(e) => setEditTaskInput(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEditedTask();
                              }
                              if (e.key === 'Escape') {
                                setEditingTask(null);
                                setEditTaskInput("");
                              }
                            }}
                            onBlur={saveEditedTask}
                            className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 transition ${darkMode ? "border-slate-700 bg-slate-900 text-slate-100 focus:border-slate-500 focus:ring-slate-700" : "border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-slate-200"}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <label
                              className={`relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition ${darkMode ? 'border-slate-500 text-slate-300' : 'border-slate-400 text-slate-700'}`}
                              onClick={(e) => e.stopPropagation()}
                              style={taskColor ? { color: taskColor, borderColor: hexToRgba(taskColor, darkMode ? 0.85 : 0.7) } : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(task.completed)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompleted(index, taskIndex);
                                }}
                                className="peer sr-only"
                              />
                              <span className="absolute inset-0 z-0 rounded-lg bg-white transition peer-checked:bg-current" />
                              <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[0.72rem] w-[0.34rem] -translate-x-1/2 translate-y-[-56%] rotate-45 border-b-[2.6px] border-r-[2.6px] border-white opacity-0 transition peer-checked:opacity-100">
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openExpandedTask(index, taskIndex);
                              }}
                              className="w-full text-left"
                            >
                              <p className={`${darkMode ? 'text-slate-100' : 'text-slate-900'} text-sm font-semibold leading-snug ${task.completed ? 'line-through text-slate-500' : ''}`}>
                                {task.title}
                              </p>
                            </button>
                            {task.tag ? (
                              <span
                                className="ml-2 inline-flex max-w-[24%] shrink-0 items-center truncate rounded-md border px-2 py-0.5 text-xs font-medium"
                                style={{
                                  color: task.tagColor ? hexToRgba(task.tagColor, darkMode ? 0.98 : 0.8) : undefined,
                                  borderColor: task.tagColor ? hexToRgba(task.tagColor, darkMode ? 0.75 : 0.6) : undefined,
                                  backgroundColor: task.tagColor ? hexToRgba(task.tagColor, darkMode ? 0.2 : 0.16) : undefined,
                                }}
                              >
                                {task.tag}
                              </span>
                            ) : null}
                          </div>
                        )}
                        </div>
                      </div>
                    );
                  })}
                  {isSearching && visibleTaskEntries.length === 0 ? (
                    <div className={`rounded-lg border border-dashed px-3 py-2 text-xs ${darkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                      No matching tasks
                    </div>
                  ) : null}
                  {!isSearching ? (
                    <div
                      onDragOver={(e) => handleListDragOver(index, day.tasks.length, e)}
                      onDrop={(e) => handleDrop(index, day.tasks.length, e)}
                      className={`mt-1 rounded-lg transition ${day.tasks.length === 0 ? 'min-h-8' : 'min-h-3'}`}
                    >
                      {dropTarget?.dayIndex === index && dropTarget.insertIndex === day.tasks.length ? (
                        <div className={`h-1 rounded-full ${darkMode ? 'bg-slate-300/45' : 'bg-slate-500/35'}`} />
                      ) : day.tasks.length === 0 ? (
                        <div className={`rounded-lg border border-dashed px-3 py-2 text-xs ${darkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                          Drag a task here
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {contextMenu?.dayIndex === index ? (
                  <div
                    ref={contextMenuRef}
                    className="fixed z-50 overflow-visible"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                  >
                    <div
                      className={`relative rounded-xl border shadow-lg ${darkMode ? 'bg-[#241c3c] border-[#372a5d] text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                      style={applyColor ? {
                        backgroundColor: hexToRgba(dayColor, darkMode ? 0.08 : 0.06),
                        borderColor: dayColor,
                      } : undefined}
                    >
                      <div className="relative flex flex-col items-stretch overflow-hidden rounded-xl">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuMoveOpen((v) => !v);
                          setContextMenuTagOpen(false);
                          setContextMenuDueDateOpen(false);
                        }}
                        className={`w-full border-b px-3 py-2 text-sm font-medium text-left transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                        style={applyColor ? { borderBottomColor: hexToRgba(dayColor, 0.55) } : { borderBottomColor: darkMode ? 'rgba(255,255,255,0.10)' : 'rgb(226 232 240)' }}
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuTagOpen((v) => !v);
                          setContextMenuMoveOpen(false);
                            setContextMenuSavedTagsOpen(false);
                          setContextMenuDueDateOpen(false);
                        }}
                        className={`w-full border-b px-3 py-2 text-sm font-medium text-left transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                        style={applyColor ? { borderBottomColor: hexToRgba(dayColor, 0.55) } : { borderBottomColor: darkMode ? 'rgba(255,255,255,0.10)' : 'rgb(226 232 240)' }}
                      >
                        Tag
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuDueDateOpen((v) => !v);
                          setContextMenuMoveOpen(false);
                          setContextMenuTagOpen(false);
                        }}
                        className={`w-full border-b px-3 py-2 text-sm font-medium text-left transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                        style={applyColor ? { borderBottomColor: hexToRgba(dayColor, 0.55) } : { borderBottomColor: darkMode ? 'rgba(255,255,255,0.10)' : 'rgb(226 232 240)' }}
                      >
                        Due date
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(contextMenu.dayIndex, contextMenu.taskIndex);
                        }}
                        className={`w-full px-3 py-2 text-sm font-medium text-left transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                      >
                        Delete
                      </button>
                      </div>

                      {contextMenuMoveOpen ? (
                        <div
                          className={`absolute left-full top-0 ml-1 max-h-40 w-48 overflow-auto rounded-md border px-1 py-1 shadow-lg ${darkMode ? 'bg-[#241c3c] border-[#372a5d] text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                          style={applyColor && darkMode ? {
                            backgroundColor: hexToRgba(dayColor, 0.08),
                            borderColor: dayColor,
                          } : applyColor ? { borderColor: dayColor } : undefined}
                        >
                          {days.map((d, di) => (
                            <button
                              key={`${d.label}-${di}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTask(contextMenu.dayIndex, contextMenu.taskIndex, di);
                                setContextMenuMoveOpen(false);
                              }}
                              className={`w-full text-left px-2 py-1 text-sm transition ${darkMode ? 'hover:bg-[#2f2640]' : 'hover:bg-slate-100'}`}
                            >
                              {formatMonthDay(d.date)} - {formatWeekdayShort(d.date)}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {contextMenuDueDateOpen ? (
                        <div
                          className={`absolute left-full top-0 ml-1 w-44 rounded-md border px-1 py-1 shadow-lg ${darkMode ? 'bg-[#241c3c] border-[#372a5d] text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                          style={applyColor && darkMode ? {
                            backgroundColor: hexToRgba(dayColor, 0.08),
                            borderColor: dayColor,
                          } : applyColor ? { borderColor: dayColor } : undefined}
                        >
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const todayDate = formatDateInputValue(new Date());
                                setContextMenuDueDateInput(todayDate);
                                setTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, todayDate);
                                setContextMenuDueDateOpen(false);
                              }}
                              className={`min-w-0 flex-1 rounded-md border px-1.5 py-1 text-[0.68rem] font-medium leading-none whitespace-nowrap transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                              style={applyColor ? { borderColor: dayColor } : undefined}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const tomorrowDate = formatDateInputValue(addDays(new Date(), 1));
                                setContextMenuDueDateInput(tomorrowDate);
                                setTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, tomorrowDate);
                                setContextMenuDueDateOpen(false);
                              }}
                              className={`min-w-0 flex-1 rounded-md border px-1.5 py-1 text-[0.68rem] font-medium leading-none whitespace-nowrap transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                              style={applyColor ? { borderColor: dayColor } : undefined}
                            >
                              Tomorrow
                            </button>
                          </div>
                          <input
                            ref={contextMenuDueDateInputRef}
                            type="date"
                            value={contextMenuDueDateInput}
                            onChange={(e) => setContextMenuDueDateInput(e.target.value)}
                            onClick={(e) => {
                              e.stopPropagation();
                              contextMenuDueDateInputRef.current?.showPicker?.();
                            }}
                            className={`mt-1 w-full rounded-md border px-2 py-1 text-sm outline-none transition ${darkMode ? 'bg-[#2f2640] text-slate-100 focus:border-[#7d6ba6]' : 'bg-white text-slate-900 focus:border-slate-500'}`}
                            style={applyColor ? { borderColor: dayColor } : undefined}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, contextMenuDueDateInput);
                                setContextMenuDueDateOpen(false);
                              }}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                              style={applyColor ? { borderColor: dayColor } : undefined}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuDueDateInput("");
                                setTaskDueDate(contextMenu.dayIndex, contextMenu.taskIndex, "");
                                setContextMenuDueDateOpen(false);
                              }}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                              style={applyColor ? { borderColor: dayColor } : undefined}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {contextMenuTagOpen ? (
                        <div
                          className={`absolute left-full top-0 ml-1 w-48 rounded-md border px-1 py-1 shadow-lg bg-white border-slate-200 text-slate-900`}
                          style={applyColor ? { borderColor: dayColor } : undefined}
                        >
                          <input
                            type="text"
                            value={contextMenuTagInput}
                            onChange={(e) => setContextMenuTagInput(e.target.value)}
                            placeholder="Set tag"
                            onFocus={() => setContextMenuSavedTagsOpen(true)}
                            onClick={() => setContextMenuSavedTagsOpen(true)}
                            autoComplete="off"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                            style={applyColor ? { borderColor: dayColor } : undefined}
                          />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Tags
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuSavedTagsOpen((v) => !v);
                              }}
                              className={`rounded-md border px-2 py-1 text-[0.68rem] font-medium transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenuTagColorInput(color);
                                  }}
                                  className={`h-5 w-5 rounded-full border ${active ? 'ring-2 ring-slate-400' : ''}`}
                                  style={{ backgroundColor: color, borderColor: darkMode ? '#1f2937' : '#e2e8f0' }}
                                />
                              );
                            })}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskTag(contextMenu.dayIndex, contextMenu.taskIndex, contextMenuTagInput, contextMenuTagColorInput);
                                setContextMenuTagOpen(false);
                              }}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                              style={applyColor ? { borderColor: dayColor } : undefined}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuTagInput("");
                                setContextMenuTagColorInput("#22c55e");
                                setTaskTag(contextMenu.dayIndex, contextMenu.taskIndex, "", "#22c55e");
                                setContextMenuTagOpen(false);
                              }}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${darkMode ? 'bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
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
                              <div className="mb-1 px-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Saved tags
                              </div>
                              {filteredContextMenuTagSuggestions.length > 0 ? (
                                filteredContextMenuTagSuggestions.map((tag) => (
                                  <button
                                    key={`context-tag-suggestion-${tag}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activeAddIndex === index ? (
                  <div className="mt-2 space-y-2">
                    <input
                      ref={addInputRef}
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTaskToList(index, newTaskInput);
                        }
                        if (e.key === 'Escape') {
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
                  </div>
                ) : null}
              </div>
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
    </div>
  );
}







