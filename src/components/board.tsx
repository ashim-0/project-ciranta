'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/client-api';
import { useProjectSocket } from '@/lib/use-socket';
import { useProject } from './project-shell';
import { Avatar, BoardSkeleton, EmptyState, ErrorBanner, PriorityPill, useToast } from './ui';
import { TaskModal } from './task-modal';
import { formatDate, isOverdue } from '@/lib/format';
import { CalendarIcon, GripVerticalIcon, PlusIcon, SearchIcon, XIcon } from './icons';

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  position: number;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  dueDate: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS = [
  { status: 'TODO', label: 'To Do', dot: '#94a3b8' },
  { status: 'IN_PROGRESS', label: 'In Progress', dot: '#fbbf24' },
  { status: 'DONE', label: 'Done', dot: '#2dd4bf' },
] as const;

export function Board({ projectId }: { projectId: string }) {
  const { project, leaveIfDeleted } = useProject();
  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [mobileCol, setMobileCol] = useState<string>('TODO');
  const { toast } = useToast();

  useEffect(() => {
    api<TaskDto[]>(`/api/projects/${projectId}/tasks`)
      .then(setTasks)
      .catch((e) => setError(e.message));
  }, [projectId]);

  const onSocketEvent = useCallback(
    (event: string, payload: unknown) => {
      if (event === 'project:deleted') return leaveIfDeleted();
      setTasks((prev) => {
        if (!prev) return prev;
        if (event === 'task:created') {
          const t = payload as TaskDto;
          return prev.some((x) => x.id === t.id) ? prev : [...prev, t];
        }
        if (event === 'task:updated') {
          const t = payload as TaskDto;
          return prev.map((x) => (x.id === t.id ? t : x));
        }
        if (event === 'task:deleted') {
          const { id } = payload as { id: string };
          return prev.filter((x) => x.id !== id);
        }
        return prev;
      });
    },
    [leaveIfDeleted],
  );

  const socketRef = useProjectSocket(projectId, onSocketEvent);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const on = () => setLive(true);
    const off = () => setLive(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    if (socket.connected) setLive(true);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, [socketRef, projectId]);

  // PointerSensor covers mouse; TouchSensor (press-and-hold, then drag) covers touch
  // screens without blocking normal page scroll.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const filtered = useMemo(() => {
    if (!tasks) return [];
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter]);

  const byStatus = useMemo(() => {
    const map: Record<string, TaskDto[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const t of filtered) (map[t.status] ??= []).push(t);
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.position - b.position);
    return map;
  }, [filtered]);

  function onDragStart(e: DragStartEvent) {
    setActiveTaskId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = e;
    if (!over || !tasks) return;
    const taskId = String(active.id);
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving) return;

    // Over may be a task card or a column body.
    const overId = String(over.id);
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus = overTask
      ? overTask.status
      : COLUMNS.some((c) => c.status === overId)
        ? overId
        : moving.status;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    let index = columnTasks.length;
    if (overTask && overTask.id !== taskId) {
      const overIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      if (overIndex >= 0) {
        const rect = over.rect;
        const activeTop = e.active.rect.current.translated?.top ?? 0;
        const below = activeTop > rect.top + rect.height / 2;
        index = below ? overIndex + 1 : overIndex;
      }
    }

    const prev = columnTasks[index - 1];
    const next = columnTasks[index];
    const position =
      prev && next
        ? (prev.position + next.position) / 2
        : prev
          ? prev.position + 1024
          : next
            ? next.position - 1024
            : 1024;

    // Optimistic update, rollback on failure.
    const snapshot = tasks;
    const optimistic = tasks.map((t) =>
      t.id === taskId ? { ...t, status: targetStatus, position } : t,
    );
    setTasks(optimistic);
    try {
      const saved = await api<TaskDto>(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: targetStatus, position },
      });
      setTasks((cur) => (cur ?? []).map((t) => (t.id === taskId ? saved : t)));
    } catch (err) {
      setTasks(snapshot);
      const msg = err instanceof Error ? err.message : 'Could not move the task.';
      setError(msg);
      toast(msg, 'error');
    }
  }

  if (error && !tasks) return <ErrorBanner message={error} />;
  if (!tasks) return <BoardSkeleton />;

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const filtering = Boolean(search.trim() || statusFilter || priorityFilter || assigneeFilter);

  return (
    <div className="pp-animate-fade">
      {/* Toolbar */}
      <div className="pp-panel mb-5 flex flex-wrap items-center gap-2.5 p-3">
        <div className="relative min-w-44 flex-1 sm:max-w-xs">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500"
          />
          <input
            className="pp-input !pl-8"
            placeholder="Search tasks by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
        </div>

        <select
          className="pp-input !w-auto text-xs sm:text-[13px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>

        <select
          className="pp-input !w-auto text-xs sm:text-[13px]"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          className="pp-input !w-auto text-xs sm:text-[13px]"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="">All members</option>
          {project.members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>

        {filtering && (
          <button
            type="button"
            className="pp-btn pp-btn-ghost !px-2.5 !py-1.5 text-xs"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPriorityFilter('');
              setAssigneeFilter('');
            }}
          >
            <XIcon size={13} />
            <span>Clear</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: live ? 'var(--teal-dim)' : 'var(--panel-2)',
              borderColor: live ? 'rgba(45, 212, 191, 0.25)' : 'var(--border)',
              color: live ? 'var(--teal)' : 'var(--ink-3)',
            }}
            title={live ? 'Live: changes from teammates appear instantly' : 'Connecting…'}
          >
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
              )}
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: live ? 'var(--teal)' : 'var(--ink-3)' }}
              />
            </span>
            {live ? 'Live' : 'Connecting'}
          </span>

          <AddTaskButton
            projectId={projectId}
            onCreated={(t) => {
              setTasks((cur) => (cur && !cur.some((x) => x.id === t.id) ? [...cur, t] : cur));
              toast('Task created', 'success');
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          detail="Create the first task to get this project moving."
          action={
            <AddTaskButton
              projectId={projectId}
              onCreated={(t) => {
                setTasks((cur) => (cur && !cur.some((x) => x.id === t.id) ? [...cur, t] : cur));
                toast('Task created', 'success');
              }}
            />
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No tasks match your filters"
          detail="Try a different search or clear the active filters."
          action={
            <button
              type="button"
              className="pp-btn pp-btn-ghost"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPriorityFilter('');
                setAssigneeFilter('');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          {/* Mobile column switcher */}
          <div
            className="mb-3 flex gap-1 rounded-xl border p-1 sm:hidden"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
          >
            {COLUMNS.map((c) => (
              <button
                key={c.status}
                type="button"
                onClick={() => setMobileCol(c.status)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                  mobileCol === c.status
                    ? 'bg-white/[0.08] text-teal-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
                <span>{c.label}</span>
                <span className="opacity-70">({byStatus[c.status]?.length ?? 0})</span>
              </button>
            ))}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {COLUMNS.map((c) => (
                <div key={c.status} className={mobileCol === c.status ? '' : 'hidden sm:block'}>
                  <Column
                    status={c.status}
                    label={c.label}
                    dot={c.dot}
                    tasks={byStatus[c.status] ?? []}
                    onOpen={(id) => setOpenTaskId(id)}
                  />
                </div>
              ))}
            </div>
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay /> : null}</DragOverlay>
          </DndContext>
        </>
      )}

      {openTaskId && (
        <TaskModal
          projectId={projectId}
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onChanged={(t) => setTasks((cur) => (cur ?? []).map((x) => (x.id === t.id ? t : x)))}
          onDeleted={(id) => {
            setTasks((cur) => (cur ?? []).filter((x) => x.id !== id));
            setOpenTaskId(null);
          }}
        />
      )}
    </div>
  );
}

function Column({
  status,
  label,
  dot,
  tasks,
  onOpen,
}: {
  status: string;
  label: string;
  dot: string;
  tasks: TaskDto[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className="flex min-h-[260px] flex-col gap-2.5 rounded-2xl border p-3.5 transition-colors duration-150"
      style={{
        background: isOver ? 'rgba(45, 212, 191, 0.05)' : 'var(--bg-elevated)',
        borderColor: isOver ? 'rgba(45, 212, 191, 0.35)' : 'var(--border)',
      }}
      aria-label={`${label} column`}
    >
      <header className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
          <h2 className="text-[13px] font-semibold tracking-tight text-slate-200">{label}</h2>
        </div>
        <span
          className="rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--ink-2)' }}
        >
          {tasks.length}
        </span>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5">
          {tasks.map((t) => (
            <SortableTaskCard key={t.id} task={t} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>

      {tasks.length === 0 && (
        <div
          className="flex flex-1 items-center justify-center rounded-xl border border-dashed py-8 text-center text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-3)' }}
        >
          Drop tasks here
        </div>
      )}
    </section>
  );
}

function SortableTaskCard({ task, onOpen }: { task: TaskDto; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
    >
      <TaskCard task={task} dragHandleProps={{ ...attributes, ...listeners }} onOpen={onOpen} />
    </div>
  );
}

function TaskCard({
  task,
  overlay,
  dragHandleProps,
  onOpen,
}: {
  task: TaskDto;
  overlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onOpen?: (id: string) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div
      className="pp-panel pp-card-hover group cursor-pointer p-3.5"
      style={
        overlay
          ? {
              boxShadow: '0 16px 36px rgba(0,0,0,0.65)',
              borderColor: 'var(--teal)',
              transform: 'rotate(1deg)',
            }
          : {}
      }
      onClick={() => onOpen?.(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen?.(task.id);
      }}
    >
      <div className="flex items-start justify-between gap-2" {...dragHandleProps}>
        <div className="text-[13.5px] font-medium leading-snug text-slate-100 group-hover:text-white">
          {task.title}
        </div>
        <span className="mt-0.5 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVerticalIcon size={14} />
        </span>
      </div>

      {task.description && (
        <p className="mt-1.5 line-clamp-1 text-xs" style={{ color: 'var(--ink-3)' }}>
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <PriorityPill priority={task.priority} />
        {task.dueDate && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: overdue ? 'var(--red)' : 'var(--ink-3)' }}
          >
            <CalendarIcon size={11} />
            {overdue ? 'Overdue · ' : ''}
            {formatDate(task.dueDate)}
          </span>
        )}
        <span className="ml-auto">{task.assignee ? <Avatar name={task.assignee.name} size={22} /> : null}</span>
      </div>
    </div>
  );
}

function AddTaskButton({ projectId, onCreated }: { projectId: string; onCreated: (t: TaskDto) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="pp-btn pp-btn-primary text-xs sm:text-[13px]" onClick={() => setOpen(true)}>
        <PlusIcon size={14} />
        <span>+ Add task</span>
      </button>
      {open && (
        <TaskModal
          projectId={projectId}
          taskId={null}
          onClose={() => setOpen(false)}
          onCreated={(t) => {
            onCreated(t);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
