'use client';
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useProject } from './project-shell';
import { Avatar, ConfirmModal, ErrorBanner, Field, Modal, Spinner, StatusBadge, useToast } from './ui';
import { formatDateTime } from '@/lib/format';
import type { TaskDto } from './board';
import { ActivityIcon, MessageSquareIcon, TrashIcon } from './icons';

interface CommentDto {
  id: string;
  text: string;
  author?: { id: string; name: string };
  createdAt: string;
}

interface ActivityDto {
  id: string;
  type: string;
  detail: string;
  actor?: { id: string; name: string };
  createdAt: string;
}

export function TaskModal({
  projectId,
  taskId,
  onClose,
  onChanged,
  onDeleted,
  onCreated,
}: {
  projectId: string;
  taskId: string | null; // null = create mode
  onClose: () => void;
  onChanged?: (t: TaskDto) => void;
  onDeleted?: (id: string) => void;
  onCreated?: (t: TaskDto) => void;
}) {
  const { project } = useProject();
  const creating = taskId === null;
  const [task, setTask] = useState<TaskDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<CommentDto[] | null>(null);
  const [activities, setActivities] = useState<ActivityDto[] | null>(null);
  const [commentText, setCommentText] = useState('');
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const { toast } = useToast();

  useEffect(() => {
    if (creating) return;
    let cancelled = false;
    (async () => {
      try {
        const tasks = await api<TaskDto[]>(`/api/projects/${projectId}/tasks`);
        const t = tasks.find((x) => x.id === taskId);
        if (!t || cancelled) return;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description);
        setPriority(t.priority);
        setStatus(t.status);
        setAssigneeId(t.assigneeId ?? '');
        setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : '');
        const [cs, as] = await Promise.all([
          api<CommentDto[]>(`/api/projects/${projectId}/tasks/${taskId}/comments`),
          api<ActivityDto[]>(`/api/projects/${projectId}/activities?taskId=${taskId}`),
        ]);
        if (!cancelled) {
          setComments(cs);
          setActivities(as);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the task.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creating, projectId, taskId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Task title is required.');
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null,
      };
      if (creating) {
        const t = await api<TaskDto>(`/api/projects/${projectId}/tasks`, { method: 'POST', body });
        onCreated?.(t);
      } else {
        const t = await api<TaskDto>(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body });
        setTask(t);
        onChanged?.(t);
        toast('Task updated', 'success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, { method: 'DELETE' });
      toast('Task deleted', 'info');
      setConfirmDelete(false);
      onDeleted?.(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the task.');
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await api<CommentDto>(`/api/projects/${projectId}/tasks/${taskId}/comments`, {
        method: 'POST',
        body: { text: commentText.trim() },
      });
      setComments((cur) => [...(cur ?? []), c]);
      setCommentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the comment.');
    }
  }

  return (
    <>
      <Modal
        title={creating ? 'New task' : 'Task details'}
        subtitle={creating ? 'Add a new task to your board' : task ? `In ${project.name}` : undefined}
        onClose={onClose}
        wide={!creating}
      >
        {!creating && !task ? (
          error ? <ErrorBanner message={error} /> : <Spinner label="Loading task…" />
        ) : (
          <div className={creating ? '' : 'grid grid-cols-1 gap-6 md:grid-cols-5'}>
            {/* Left: fields */}
            <form onSubmit={save} className={`flex flex-col gap-4 ${creating ? '' : 'md:col-span-3'}`}>
              <ErrorBanner message={error} />
              {!creating && task && (
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={status} />
                  <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    Updated {formatDateTime(task.updatedAt)}
                  </span>
                </div>
              )}

              <Field label="Title">
                <input
                  className="pp-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short task name"
                  autoFocus={creating}
                  required
                />
              </Field>

              <Field label="Description" hint="Optional">
                <textarea
                  className="pp-input"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details, links, acceptance criteria…"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!creating && (
                  <Field label="Status">
                    <select className="pp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </Field>
                )}
                <Field label="Priority">
                  <select className="pp-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </Field>
                <Field label="Assignee">
                  <select className="pp-input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {project.members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Due date">
                  <input type="date" className="pp-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
              </div>

              {task && (
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  Created {formatDateTime(task.createdAt)}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                {!creating && (
                  <button
                    type="button"
                    className="pp-btn pp-btn-danger"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy}
                  >
                    <TrashIcon size={14} />
                    <span>Delete</span>
                  </button>
                )}
                <div className="ml-auto flex gap-2.5">
                  <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>
                    {busy ? 'Saving…' : creating ? 'Create task' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>

            {/* Right: comments + activity */}
            {!creating && (
              <div
                className="flex flex-col border-t pt-4 md:col-span-2 md:border-t-0 md:border-l md:pt-0 md:pl-5"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="mb-3.5 flex gap-1 rounded-xl border p-1"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setTab('comments')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                      tab === 'comments' ? 'bg-white/[0.08] text-teal-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquareIcon size={12} />
                    <span>Comments ({comments?.length ?? '…'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('activity')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                      tab === 'activity' ? 'bg-white/[0.08] text-teal-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ActivityIcon size={12} />
                    <span>Activity</span>
                  </button>
                </div>

                {tab === 'comments' ? (
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    {!comments ? (
                      <Spinner />
                    ) : comments.length === 0 ? (
                      <div className="py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                        No comments yet. Start the discussion.
                      </div>
                    ) : (
                      <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            className="flex gap-2.5 rounded-xl border p-2.5"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                          >
                            <Avatar name={c.author?.name ?? '?'} size={24} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                                <span className="font-semibold text-slate-200">{c.author?.name}</span> ·{' '}
                                {formatDateTime(c.createdAt)}
                              </div>
                              <div className="mt-0.5 text-[13px] leading-relaxed text-slate-200" style={{ whiteSpace: 'pre-wrap' }}>
                                {c.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <form onSubmit={addComment} className="flex gap-2">
                      <input
                        className="pp-input"
                        placeholder="Write a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                      <button type="submit" className="pp-btn pp-btn-primary !px-3.5" disabled={!commentText.trim()}>
                        Send
                      </button>
                    </form>
                  </div>
                ) : !activities ? (
                  <Spinner />
                ) : activities.length === 0 ? (
                  <div className="py-8 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                    No activity recorded yet.
                  </div>
                ) : (
                  <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
                    {activities.map((a) => (
                      <div key={a.id} className="border-l-2 pl-3 text-xs" style={{ borderColor: 'var(--border-strong)' }}>
                        <div style={{ color: 'var(--ink-2)' }}>
                          <span className="font-semibold text-slate-100">{a.actor?.name}</span> {a.detail}
                        </div>
                        <div className="mt-0.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                          {formatDateTime(a.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {confirmDelete && task && (
        <ConfirmModal
          title="Delete task"
          description={`Delete "${task.title}"? This action cannot be undone.`}
          confirmLabel="Delete task"
          busy={busy}
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
