import * as React from "react";
import { createPortal } from "react-dom";

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
  onRenameCustomList: (listId: string, nextName: string) => void;
  onArchiveCustomListContents: (listId: string) => void;
  onDeleteCustomListContents: (listId: string) => void;
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
  onRenameCustomList,
  onArchiveCustomListContents,
  onDeleteCustomListContents,
}: ListsPanelProps) {
  const [customListContextMenu, setCustomListContextMenu] = React.useState<{ listId: string; x: number; y: number } | null>(null);
  const customListContextMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [renameListDialog, setRenameListDialog] = React.useState<{ listId: string; value: string } | null>(null);
  const [archiveListDialog, setArchiveListDialog] = React.useState<{ listId: string; name: string; taskCount: number } | null>(null);
  const [deleteListDialog, setDeleteListDialog] = React.useState<{ listId: string; name: string; taskCount: number } | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!customListContextMenu) return;

    const handleCloseMenu = (event: MouseEvent) => {
      if (customListContextMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setCustomListContextMenu(null);
    };

    document.addEventListener("mousedown", handleCloseMenu);
    return () => {
      document.removeEventListener("mousedown", handleCloseMenu);
    };
  }, [customListContextMenu]);

  React.useEffect(() => {
    if (!renameListDialog) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renameListDialog]);

  const customListContextMenuPortal =
    customListContextMenu && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={customListContextMenuRef}
            className="fixed z-[120]"
            style={{ top: customListContextMenu.y, left: customListContextMenu.x }}
          >
            <div className={`overflow-hidden rounded-xl border shadow-lg ${darkMode ? "border-slate-700 bg-[#241c3c] text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}>
              <button
                type="button"
                onClick={() => {
                  const targetList = customListTabs.find((list) => list.id === customListContextMenu.listId);
                  const currentName = targetList?.name ?? "";
                  setRenameListDialog({ listId: customListContextMenu.listId, value: currentName });
                  setCustomListContextMenu(null);
                }}
                className={`block w-full border-b px-3 py-2 text-left text-sm font-medium transition ${darkMode ? "border-slate-700 hover:bg-[#2f2640]" : "border-slate-300 hover:bg-slate-100"}`}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetList = customListTabs.find((list) => list.id === customListContextMenu.listId);
                  setArchiveListDialog({
                    listId: customListContextMenu.listId,
                    name: targetList?.name ?? "Custom list",
                    taskCount: targetList?.count ?? 0,
                  });
                  setCustomListContextMenu(null);
                }}
                className={`block w-full border-b px-3 py-2 text-left text-sm font-medium transition ${darkMode ? "border-slate-700 hover:bg-[#2f2640]" : "border-slate-300 hover:bg-slate-100"}`}
              >
                Archive Contents
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetList = customListTabs.find((list) => list.id === customListContextMenu.listId);
                  setDeleteListDialog({
                    listId: customListContextMenu.listId,
                    name: targetList?.name ?? "Custom list",
                    taskCount: targetList?.count ?? 0,
                  });
                  setCustomListContextMenu(null);
                }}
                className={`block w-full px-3 py-2 text-left text-sm font-medium transition ${darkMode ? "hover:bg-[#2f2640]" : "hover:bg-slate-100"}`}
              >
                Delete Contents
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <aside
      ref={listsPanelRef}
      className={`absolute right-0 top-[-1px] bottom-4 z-60 ${showListDetailPane ? "rounded-none rounded-bl-xl" : "w-[12.5rem] rounded-tl-none rounded-tr-xl rounded-br-xl rounded-bl-xl"} border shadow-xl transition-[transform,opacity] duration-300 ${
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

        <div className={`flex w-[12.5rem] border-l flex-col p-2 ${showListDetailPane ? (darkMode ? "border-[#6a5a94]" : "border-slate-300") : "border-transparent"} ${darkMode ? "bg-[#181224]" : "bg-slate-50"}`}>
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
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setCustomListContextMenu({ listId: list.id, x: event.clientX, y: event.clientY });
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
                      <span className="ml-1 block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] font-medium leading-tight">{list.name}</span>
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
                      <span className="ml-1 block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] font-medium leading-tight">{list.name}</span>
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

      {customListContextMenuPortal}

      {renameListDialog ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setRenameListDialog(null)}
        >
          <div
            className={`w-full max-w-sm rounded-xl border p-4 shadow-2xl ${darkMode ? "border-[#372a5d] bg-[#1f1830] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold">Rename Custom List</p>
            <input
              ref={renameInputRef}
              type="text"
              value={renameListDialog.value}
              onChange={(event) =>
                setRenameListDialog((current) =>
                  current
                    ? {
                        ...current,
                        value: event.target.value,
                      }
                    : current
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setRenameListDialog(null);
                  return;
                }

                if (event.key === "Enter") {
                  const nextName = renameListDialog.value.trim();
                  if (!nextName) return;
                  onRenameCustomList(renameListDialog.listId, nextName);
                  setRenameListDialog(null);
                }
              }}
              placeholder="List name"
              className={`mt-3 w-full rounded-md border px-3 py-2 text-sm outline-none transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 focus:border-[#7d6ba6]" : "border-slate-300 bg-white text-slate-900 focus:border-slate-500"}`}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameListDialog(null)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextName = renameListDialog.value.trim();
                  if (!nextName) return;
                  onRenameCustomList(renameListDialog.listId, nextName);
                  setRenameListDialog(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${darkMode ? "border-[#7d6ba6] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200"}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {archiveListDialog ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setArchiveListDialog(null)}
        >
          <div
            className={`w-full max-w-sm rounded-xl border p-4 shadow-2xl ${darkMode ? "border-[#372a5d] bg-[#1f1830] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold">Archive List Contents</p>
            <p className={`mt-2 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
              Archive all tasks from &quot;{archiveListDialog.name}&quot;? ({archiveListDialog.taskCount} task{archiveListDialog.taskCount === 1 ? "" : "s"})
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveListDialog(null)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onArchiveCustomListContents(archiveListDialog.listId);
                  setArchiveListDialog(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${darkMode ? "border-amber-500/70 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30" : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteListDialog ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setDeleteListDialog(null)}
        >
          <div
            className={`w-full max-w-sm rounded-xl border p-4 shadow-2xl ${darkMode ? "border-[#372a5d] bg-[#1f1830] text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold">Delete Contents</p>
            <p className={`mt-2 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
              Remove all tasks from &quot;{deleteListDialog.name}&quot;? ({deleteListDialog.taskCount} task{deleteListDialog.taskCount === 1 ? "" : "s"})
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteListDialog(null)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomListContents(deleteListDialog.listId);
                  setDeleteListDialog(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${darkMode ? "border-red-500/70 bg-red-500/20 text-red-100 hover:bg-red-500/30" : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"}`}
              >
                Delete Contents
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
