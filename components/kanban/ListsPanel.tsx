import type * as React from "react";

import TaskCard from "./TaskCard";
import type { Task } from "./kanbanTypes";

type ListTab = {
  id: string;
  name: string;
  count: number;
};

type EditingListTask = {
  listId: string;
  taskIndex: number;
};

type SavedListContextMenu = {
  listId: string;
  taskIndex: number;
  x: number;
  y: number;
};

type ArchiveTaskContextMenu = {
  entryIndex: number;
  x: number;
  y: number;
};

type ListsPanelProps = {
  darkMode: boolean;
  viewsOpen: boolean;
  showListDetailPane: boolean;
  listPanelWidthPx: number;
  listsPanelRef: React.RefObject<HTMLDivElement | null>;
  startListPanelResize: (event: React.MouseEvent<HTMLDivElement>) => void;
  isCreatingList: boolean;
  allListTabs: ListTab[];
  activeListId: string;
  newListName: string;
  setNewListName: React.Dispatch<React.SetStateAction<string>>;
  addSavedList: () => void;
  setIsCreatingList: React.Dispatch<React.SetStateAction<boolean>>;
  setListDetailMode: React.Dispatch<React.SetStateAction<"hidden" | "list" | "create">>;
  newListInputRef: React.RefObject<HTMLInputElement | null>;
  canCreateTaskInActiveList: boolean;
  newListTaskInput: string;
  setNewListTaskInput: React.Dispatch<React.SetStateAction<string>>;
  addTaskToActiveList: () => void;
  isDayTaskDragActive: boolean;
  handleSavedListViewerDragOver: (listId: string, insertIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  activeListTasks: Task[];
  savedListDropTargetId: string | null;
  savedListDropInsertIndex: number | null;
  setSavedListDropTargetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSavedListDropInsertIndex: React.Dispatch<React.SetStateAction<number | null>>;
  handleDropToSavedList: (listId: string, event: React.DragEvent<HTMLDivElement>, insertIndex?: number) => void;
  recurringListId: string;
  archiveListId: string;
  editingListTask: EditingListTask | null;
  editingListTaskInput: string;
  setEditingListTaskInput: React.Dispatch<React.SetStateAction<string>>;
  saveEditingListTask: () => void;
  cancelEditingListTask: () => void;
  openExpandedSavedListTask: (listId: string, taskIndex: number) => void;
  canManageActiveListTasks: boolean;
  toggleSavedListTaskCompleted: (listId: string, taskIndex: number) => void;
  setContextMenu: React.Dispatch<React.SetStateAction<{ dayIndex: number; taskIndex: number; x: number; y: number } | null>>;
  setContextMenuMoveOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenuTagOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenuSavedTagsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenuDueDateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenuTagInput: React.Dispatch<React.SetStateAction<string>>;
  setContextMenuTagColorInput: React.Dispatch<React.SetStateAction<string>>;
  setContextMenuDueDateInput: React.Dispatch<React.SetStateAction<string>>;
  setContextMenuDueTimeInput: React.Dispatch<React.SetStateAction<string>>;
  setSavedListContextMenu: React.Dispatch<React.SetStateAction<SavedListContextMenu | null>>;
  setArchiveTaskContextMenu: React.Dispatch<React.SetStateAction<ArchiveTaskContextMenu | null>>;
  handleSavedListTaskDragStart: (listId: string, taskIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  customListTabs: ListTab[];
  draggingListTabId: string | null;
  listTabDropTargetId: string | null;
  listTabDropPosition: "before" | "after";
  showListNameTooltipWithDelay: (text: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  updateListNameTooltipPosition: (event: React.MouseEvent<HTMLButtonElement>) => void;
  hideListNameTooltip: () => void;
  setActiveListId: React.Dispatch<React.SetStateAction<string>>;
  setDraggingListTabId: React.Dispatch<React.SetStateAction<string | null>>;
  setListTabDropTargetId: React.Dispatch<React.SetStateAction<string | null>>;
  setListTabDropPosition: React.Dispatch<React.SetStateAction<"before" | "after">>;
  handleListTabDragOver: (listId: string, event: React.DragEvent<HTMLButtonElement>) => void;
  handleListTabDrop: (listId: string, event: React.DragEvent<HTMLButtonElement>) => void;
  systemListTabs: ListTab[];
};

export default function ListsPanel({
  darkMode,
  viewsOpen,
  showListDetailPane,
  listPanelWidthPx,
  listsPanelRef,
  startListPanelResize,
  isCreatingList,
  allListTabs,
  activeListId,
  newListName,
  setNewListName,
  addSavedList,
  setIsCreatingList,
  setListDetailMode,
  newListInputRef,
  canCreateTaskInActiveList,
  newListTaskInput,
  setNewListTaskInput,
  addTaskToActiveList,
  isDayTaskDragActive,
  handleSavedListViewerDragOver,
  activeListTasks,
  savedListDropTargetId,
  savedListDropInsertIndex,
  setSavedListDropTargetId,
  setSavedListDropInsertIndex,
  handleDropToSavedList,
  recurringListId,
  archiveListId,
  editingListTask,
  editingListTaskInput,
  setEditingListTaskInput,
  saveEditingListTask,
  cancelEditingListTask,
  openExpandedSavedListTask,
  canManageActiveListTasks,
  toggleSavedListTaskCompleted,
  setContextMenu,
  setContextMenuMoveOpen,
  setContextMenuTagOpen,
  setContextMenuSavedTagsOpen,
  setContextMenuDueDateOpen,
  setContextMenuTagInput,
  setContextMenuTagColorInput,
  setContextMenuDueDateInput,
  setContextMenuDueTimeInput,
  setSavedListContextMenu,
  setArchiveTaskContextMenu,
  handleSavedListTaskDragStart,
  editInputRef,
  customListTabs,
  draggingListTabId,
  listTabDropTargetId,
  listTabDropPosition,
  showListNameTooltipWithDelay,
  updateListNameTooltipPosition,
  hideListNameTooltip,
  setActiveListId,
  setDraggingListTabId,
  setListTabDropTargetId,
  setListTabDropPosition,
  handleListTabDragOver,
  handleListTabDrop,
  systemListTabs,
}: ListsPanelProps) {
  return (
    <aside
      ref={listsPanelRef}
      className={`absolute right-0 top-[-1px] bottom-4 z-60 ${showListDetailPane ? "rounded-none rounded-bl-xl border-r-0" : "w-[12.5rem] rounded-tl-none rounded-tr-xl rounded-br-xl rounded-bl-xl"} border shadow-xl transition-all duration-300 ${
        viewsOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-12 opacity-0"
      } ${darkMode ? "border-[#5a4a84] bg-[#1f1830] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
      style={
        showListDetailPane
          ? {
              width: `${listPanelWidthPx}px`,
              backgroundImage: darkMode
                ? "linear-gradient(#6a5a94, #6a5a94)"
                : "linear-gradient(#cbd5e1, #cbd5e1)",
              backgroundPosition: "left top",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1px 100%",
            }
          : undefined
      }
    >
      {showListDetailPane ? (
        <div
          role="separator"
          aria-label="Resize lists panel"
          onMouseDown={startListPanelResize}
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize ${darkMode ? "hover:bg-[#7d6ba655]" : "hover:bg-slate-300/70"}`}
        />
      ) : null}
      <div className="flex h-full">
        {showListDetailPane ? (
          <div className="flex min-w-0 flex-1 flex-col p-3 pr-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className={`truncate text-sm font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {isCreatingList
                    ? "Create New List"
                    : allListTabs.find((list) => list.id === activeListId)?.name ?? "Lists"}
                </h3>
                <p className={`mt-1 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {isCreatingList
                    ? "Enter a name for your new list"
                    : `${allListTabs.find((list) => list.id === activeListId)?.count ?? 0} tasks`}
                </p>
              </div>
            </div>

            {isCreatingList ? (
              <div className="mb-2 flex gap-1.5">
                <input
                  ref={newListInputRef}
                  type="text"
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addSavedList();
                    if (event.key === "Escape") {
                      setIsCreatingList(false);
                      setListDetailMode("hidden");
                    }
                  }}
                  placeholder="Create a list"
                  className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm outline-none ${darkMode ? "border-[#4c3e74] bg-[#2a2142] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                />
                <button
                  type="button"
                  onClick={addSavedList}
                  className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${darkMode ? "border-[#4c3e74] bg-[#2a2142] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                >
                  Save
                </button>
              </div>
            ) : null}

            {!isCreatingList ? (
              <>
                {canCreateTaskInActiveList ? (
                  <div className="mb-2 flex gap-1.5">
                    <input
                      type="text"
                      value={newListTaskInput}
                      onChange={(event) => setNewListTaskInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTaskToActiveList();
                        }
                      }}
                      placeholder="Add a task to this list"
                      className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm outline-none ${darkMode ? "border-[#4c3e74] bg-[#2a2142] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                    />
                    <button
                      type="button"
                      onClick={addTaskToActiveList}
                      className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${darkMode ? "border-[#4c3e74] bg-[#2a2142] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                    >
                      Add
                    </button>
                  </div>
                ) : null}

                <div
                  onDragOver={(event) => {
                    if (!isDayTaskDragActive || !canCreateTaskInActiveList) return;
                    handleSavedListViewerDragOver(activeListId, activeListTasks.length, event);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setSavedListDropTargetId((current) => (current === activeListId ? null : current));
                      setSavedListDropInsertIndex((current) => (savedListDropTargetId === activeListId ? null : current));
                    }
                  }}
                  onDrop={(event) => handleDropToSavedList(activeListId, event, savedListDropInsertIndex ?? activeListTasks.length)}
                  className={`flex-1 overflow-auto rounded-lg border p-2 ${darkMode ? "border-[#4c3e74] bg-[#1a1428]" : "border-slate-200 bg-slate-50"}`}
                >
                  {isDayTaskDragActive && savedListDropTargetId === activeListId && savedListDropInsertIndex === 0 && canCreateTaskInActiveList ? (
                    <div className="mb-2 px-1">
                      <div className={`h-1 rounded-full ${darkMode ? "bg-slate-300/45" : "bg-slate-500/35"}`} />
                    </div>
                  ) : null}
                  {activeListTasks.length === 0 ? (
                    <div className={`rounded-lg border border-dashed px-3 py-4 text-xs ${darkMode ? "border-[#4c3e74] text-slate-400" : "border-slate-300 text-slate-500"}`}>
                      {activeListId === recurringListId
                        ? "Recurring tasks will appear here automatically."
                        : activeListId === archiveListId
                          ? "Archived tasks appear here."
                          : "No tasks yet. Drag one in from a day column."}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activeListTasks.map((task, taskIndex) => (
                        <TaskCard
                          key={`${activeListId}-${task.id ?? task.title}-${taskIndex}`}
                          task={task}
                          dayIndex={0}
                          taskIndex={taskIndex}
                          darkMode={darkMode}
                          isEditing={editingListTask?.listId === activeListId && editingListTask?.taskIndex === taskIndex}
                          isHovered={false}
                          isSearching={false}
                          showDropIndicator={Boolean(
                            isDayTaskDragActive &&
                              savedListDropTargetId === activeListId &&
                              savedListDropInsertIndex === taskIndex
                          )}
                          editTaskInput={editingListTaskInput}
                          setEditTaskInput={setEditingListTaskInput}
                          saveEditedTask={saveEditingListTask}
                          cancelEditing={cancelEditingListTask}
                          onOpenExpandedTask={() => {
                            if (activeListId === archiveListId) return;
                            if (!canManageActiveListTasks) return;
                            openExpandedSavedListTask(activeListId, taskIndex);
                          }}
                          onToggleCompleted={() => {
                            if (activeListId === archiveListId) return;
                            if (!canManageActiveListTasks) return;
                            toggleSavedListTaskCompleted(activeListId, taskIndex);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (activeListId === archiveListId) {
                              setContextMenu(null);
                              setContextMenuMoveOpen(false);
                              setContextMenuTagOpen(false);
                              setContextMenuSavedTagsOpen(false);
                              setContextMenuDueDateOpen(false);
                              setSavedListContextMenu(null);
                              setArchiveTaskContextMenu({ entryIndex: taskIndex, x: event.clientX, y: event.clientY });
                              return;
                            }

                            if (!canManageActiveListTasks) return;
                            setContextMenu(null);
                            setContextMenuMoveOpen(false);
                            setContextMenuTagOpen(false);
                            setContextMenuSavedTagsOpen(false);
                            setContextMenuDueDateOpen(false);
                            setContextMenuTagInput(task.tag ?? "");
                            setContextMenuTagColorInput(task.tagColor ?? "#22c55e");
                            setContextMenuDueDateInput(task.dueDate ?? "");
                            setContextMenuDueTimeInput(task.dueTime ?? "");
                            setSavedListContextMenu({ listId: activeListId, taskIndex, x: event.clientX, y: event.clientY });
                          }}
                          onMouseEnter={() => {}}
                          onMouseLeave={() => {}}
                          onDragStart={(event) => handleSavedListTaskDragStart(activeListId, taskIndex, event)}
                          onDragEnd={() => {}}
                          onDragOver={(event) => handleSavedListViewerDragOver(activeListId, taskIndex, event)}
                          onDrop={(event) => handleDropToSavedList(activeListId, event, taskIndex)}
                          editInputRef={editInputRef}
                        />
                      ))}
                      {isDayTaskDragActive && savedListDropTargetId === activeListId && savedListDropInsertIndex === activeListTasks.length ? (
                        <div className="px-1">
                          <div className={`h-1 rounded-full ${darkMode ? "bg-slate-300/45" : "bg-slate-500/35"}`} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={`flex flex-1 items-start justify-center rounded-lg border border-dashed px-3 py-4 text-xs ${darkMode ? "border-[#4c3e74] text-slate-400" : "border-slate-300 text-slate-500"}`}>
                Enter a name above to create the new list.
              </div>
            )}
          </div>
        ) : null}

        <div className={`flex ${showListDetailPane ? "w-40 border-l" : "w-full"} flex-col p-2 ${darkMode ? "border-[#6a5a94] bg-[#181224]" : "border-slate-300 bg-slate-50"}`}>
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className={`text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Lists
            </span>
            <button
              type="button"
              onClick={() => {
                if (isCreatingList) {
                  setIsCreatingList(false);
                  setListDetailMode("hidden");
                  return;
                }

                setIsCreatingList(true);
                setListDetailMode("create");
              }}
              className={`rounded-md border px-2 py-1 text-sm font-semibold transition ${darkMode ? "border-[#4c3e74] bg-[#2a2142] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
              title="Create saved list"
            >
              +
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-1">
              {customListTabs.map((list) => {
                const isActive = list.id === activeListId;
                const showDropBefore = draggingListTabId && listTabDropTargetId === list.id && listTabDropPosition === "before";
                const showDropAfter = draggingListTabId && listTabDropTargetId === list.id && listTabDropPosition === "after";

                return (
                  <div key={list.id} className="space-y-1">
                    {showDropBefore ? <div className={`h-1 rounded-full ${darkMode ? "bg-slate-300/45" : "bg-slate-500/35"}`} /> : null}
                    <button
                      type="button"
                      onMouseEnter={(event) => showListNameTooltipWithDelay(list.name, event)}
                      onMouseMove={updateListNameTooltipPosition}
                      onMouseLeave={hideListNameTooltip}
                      onBlur={hideListNameTooltip}
                      onClick={() => {
                        setActiveListId(list.id);
                        setIsCreatingList(false);
                        setListDetailMode("list");
                      }}
                      draggable
                      onDragStart={() => {
                        setDraggingListTabId(list.id);
                        setListTabDropTargetId(list.id);
                        setListTabDropPosition("before");
                      }}
                      onDragEnd={() => {
                        setDraggingListTabId(null);
                        setListTabDropTargetId(null);
                      }}
                      onDragOver={(event) => handleListTabDragOver(list.id, event)}
                      onDrop={(event) => handleListTabDrop(list.id, event)}
                      className={`relative flex items-center justify-between overflow-hidden rounded-md px-2 py-1.5 text-left text-sm transition ${
                        isActive
                          ? darkMode
                            ? "bg-[#3b315a] text-white shadow-sm"
                            : "bg-slate-200 text-slate-900 shadow-sm"
                          : darkMode
                            ? "text-slate-200 hover:bg-[#2a2142]"
                            : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span className="ml-1 flex min-w-0 items-center gap-2">
                        <span className="truncate text-[0.82rem] font-medium leading-tight">{list.name}</span>
                      </span>
                      <span className={`ml-1 shrink-0 rounded-full px-1 py-0.5 text-[0.68rem] ${darkMode ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                        {list.count}
                      </span>
                    </button>
                    {showDropAfter ? <div className={`h-1 rounded-full ${darkMode ? "bg-slate-300/45" : "bg-slate-500/35"}`} /> : null}
                  </div>
                );
              })}
            </div>

            <div className={`mt-2 pt-2 ${darkMode ? "border-t border-[#4c3e74]" : "border-t border-slate-200"}`}>
              <div className="grid gap-1">
                {systemListTabs.map((list) => {
                  const isActive = list.id === activeListId;

                  return (
                    <button
                      key={list.id}
                      type="button"
                      onMouseEnter={(event) => showListNameTooltipWithDelay(list.name, event)}
                      onMouseMove={updateListNameTooltipPosition}
                      onMouseLeave={hideListNameTooltip}
                      onBlur={hideListNameTooltip}
                      onClick={() => {
                        setActiveListId(list.id);
                        setIsCreatingList(false);
                        setListDetailMode("list");
                      }}
                      onDragOver={(event) => handleListTabDragOver(list.id, event)}
                      onDrop={(event) => handleListTabDrop(list.id, event)}
                      className={`relative flex items-center justify-between overflow-hidden rounded-md px-2 py-1.5 text-left text-sm transition ${
                        isActive
                          ? darkMode
                            ? "bg-[#3b315a] text-white shadow-sm"
                            : "bg-slate-200 text-slate-900 shadow-sm"
                          : darkMode
                            ? "text-slate-200 hover:bg-[#2a2142]"
                            : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span className="ml-1 flex min-w-0 items-center gap-2">
                        <span className="truncate text-[0.82rem] font-medium leading-tight">{list.name}</span>
                      </span>
                      <span className={`ml-1 shrink-0 rounded-full px-1 py-0.5 text-[0.68rem] ${darkMode ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                        {list.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
