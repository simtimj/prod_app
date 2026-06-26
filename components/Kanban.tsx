"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = {
  title: string;
  status?: string;
};

type DayColumn = {
  date: Date;
  label: string;
  tasks: Task[];
};

let colors: Record<string, string> = {
  "Sunday": "#ffff6e",
  "Monday": "#D3D3D3",
  "Tuesday": "#FFB3B3",
  "Wednesday": "#B3D9FF",
  "Thursday": "#B3E6CC",
  "Friday": "#FBD702",
  "Saturday": "#BE9000",
};

let daysOfWeek: Record<string, string> = {
  "Sunday": "Sun",
  "Monday": "Mon",
  "Tuesday": "Tues",
  "Wednesday": "Weds",
  "Thursday": "Thurs", 
  "Friday": "Fri"
}

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

function buildDayColumns(today: Date): DayColumn[] {
  const samples: Task[][] = [
    [
      { title: "Capture ideas for the week", status: "Planned" },
      { title: "Check email summaries", status: "In progress" },
    ],
    [
      { title: "Review today's calendar", status: "Done" },
      { title: "Draft meeting notes", status: "Planned" },
      { title: "Add priorities to workboard", status: "In progress" },
    ],
    [
      { title: "Plan sprint goals", status: "Planned" },
      { title: "Update task statuses", status: "In progress" },
    ],
    [
      { title: "Focus on current day", status: "In progress" },
      { title: "Complete two quick wins", status: "Planned" },
      { title: "Sync with the team", status: "Planned" },
    ],
    [
      { title: "Prepare tomorrow's agenda", status: "Planned" },
      { title: "Review blockers", status: "Planned" },
    ],
    [
      { title: "Reflect on the week", status: "Planned" },
      { title: "Archive done items", status: "Done" },
    ],
    [
      { title: "Clear small tasks", status: "Planned" },
      { title: "Organize backlog", status: "Planned" },
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
  const selectedDay = days[selectedIndex];
  const [newTaskInput, setNewTaskInput] = useState<string>("");
  const [activeAddIndex, setActiveAddIndex] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeAddIndex !== null && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [activeAddIndex]);

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

  const addTaskToList = (index: number, title: string) => {
    if (!title.trim()) return;
    setDays((currentDays) =>
      currentDays.map((day, dayIndex) =>
        dayIndex === index
          ? { ...day, tasks: [...day.tasks, { title: title.trim() }] }
          : day
      )
    );
    setNewTaskInput("");
    setActiveAddIndex(null);
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
      (e.target as Element).setPointerCapture?.(e.pointerId as any);
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
      (e.target as Element).releasePointerCapture?.(e.pointerId as any);
    } catch {}
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
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-1 py-2 shadow-sm shadow-slate-200/50">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <label htmlFor="kanban-search" className="sr-only">Search</label>
          <input
            id="kanban-search"
            type="search"
            placeholder="Search..."
            className="w-[20rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </header>

      <section className="overflow-hidden border border-slate-200 bg-slate-50 shadow-sm shadow-slate-200/50">
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
              dayColors?.[weekdayLong] ?? dayColors?.[weekdayShort] ?? colors[weekdayLong] ?? colors[weekdayShort];
            const isLast = index === days.length - 1;
            const applyColor = Boolean(dayColor);
            const taskCardBg = dayColor ? hexToRgba(dayColor, 0.08) : undefined;
            const buttonTextColor = applyColor ? "#000" : undefined;
            const buttonBgColor = dayColor ? hexToRgba(dayColor, 0.9) : undefined;
            const isToday = index === CENTER_INDEX;
            const todayDateClasses = isToday
              ? "inline-flex flex-col rounded-2xl border-2 px-3 py-2 shadow-sm"
              : "";
            const todayDateStyle = isToday && applyColor
              ? {
                  backgroundColor: hexToRgba(dayColor, 0.22),
                  borderColor: hexToRgba(dayColor, 0.85),
                  color: "#111",
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
                className={`min-w-[20rem] shrink-0 rounded-xl border p-3 transition duration-300 cursor-pointer  ${
                  isSelected
                    ? "border-slate-900 bg-white shadow-[0_12px_60px_-18px_rgba(15,23,42,0.35)]"
                    : "border-transparent bg-slate-100/90"
                } ${index === 0 ? "mr-2" : "mx-2"} ${index === days.length - 1 ? "ml-2" : ""}`}
                style={applyColor ? { borderColor: dayColor } : undefined}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className={todayDateClasses} style={todayDateStyle}>
                      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {weekdayShort}
                      </p>
                      <p className="mt-1 text-lg font-semibold leading-tight text-slate-900">
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
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 transition hover:bg-slate-100"
                    >
                      + Add task
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {day.tasks.map((task, taskIndex) => (
                    <div
                      key={`${task.title}-${taskIndex}`}
                      className="rounded-xl border border-slate-200 p-4 shadow-sm"
                      style={applyColor && taskCardBg ? { backgroundColor: taskCardBg, borderColor: dayColor } : undefined}
                    >
                      <p className={`${applyColor ? 'text-slate-900' : 'text-slate-900'} text-sm font-semibold`}>{task.title}</p>
                    </div>
                  ))}
                </div>

                {activeAddIndex === index ? (
                  <div className="mt-2 space-y-2">
                    <input
                      ref={addInputRef}
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
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
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}







