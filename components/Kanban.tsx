"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = {
  title: string;
  status: string;
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

const DAY_COUNT = 7;
const CENTER_INDEX = 0;

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
  const days = useMemo(() => buildDayColumns(today), [today]);
  const selectedDay = days[selectedIndex];

  useEffect(() => {
    if (ignoreScrollRef.current) {
      ignoreScrollRef.current = false;
      return;
    }
    if (!dayRefs.current[selectedIndex] || !scrollRef.current) return;
    dayRefs.current[selectedIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
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

  // Ensure the horizontal scroll is at the very left on initial mount (prevents slight right offset)
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => el.scrollTo({ left: 0, behavior: "auto" }));
  }, []);

  const goPrev = () => setSelectedIndex((current) => Math.max(0, current - 1));
  const goNext = () => setSelectedIndex((current) => Math.min(days.length - 1, current + 1));
  const goToday = () => setSelectedIndex(CENTER_INDEX);

  return (
    <div className="space-y-6">

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
            const weekdayShort = formatWeekdayShort(day.date);
            const weekdayLong = formatWeekdayLong(day.date);
            // lookup order: prop (long), prop (short), local colors (long), local colors (short)
            const dayColor =
              dayColors?.[weekdayLong] ?? dayColors?.[weekdayShort] ?? colors[weekdayLong] ?? colors[weekdayShort];
            const isLast = index === days.length - 1;
            const applyColor = Boolean(dayColor);
            const taskCardBg = dayColor ? hexToRgba(dayColor, 0.08) : undefined;
            const buttonTextColor = applyColor ? "#000" : undefined;
            const buttonBgColor = dayColor ? hexToRgba(dayColor, 0.9) : undefined;
            return (
              <div
                key={day.label}
                ref={(el) => (dayRefs.current[index] = el)}
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
                className={`min-w-[20rem] shrink-0 rounded-xl border p-6 transition duration-300 cursor-pointer  ${
                  isSelected
                    ? "border-slate-900 bg-white shadow-[0_12px_60px_-18px_rgba(15,23,42,0.35)]"
                    : "border-transparent bg-slate-100/90"
                } ${index === 0 ? "mr-2" : "mx-2"} ${index === days.length - 1 ? "ml-2" : ""}`}
                style={applyColor ? { borderColor: dayColor } : undefined}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {weekdayShort}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatMonthDay(day.date)}
                    </p>
                  </div>
                  {index === CENTER_INDEX ? (
                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        applyColor ? "" : "bg-white text-slate-600"
                      }`}
                      style={applyColor ? { backgroundColor: dayColor, color: "#000" } : undefined}
                    >
                      Today
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  {day.tasks.map((task) => (
                    <div
                      key={task.title}
                      className="rounded-xl border border-slate-200 p-4 shadow-sm"
                      style={applyColor && taskCardBg ? { backgroundColor: taskCardBg, borderColor: dayColor } : undefined}
                    >
                      <p className={`${applyColor ? 'text-slate-900' : 'text-slate-900'} text-sm font-semibold`}>{task.title}</p>
                      
                    </div>
                  ))}
                </div>

                
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}







