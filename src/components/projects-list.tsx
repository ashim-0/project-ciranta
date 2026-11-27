'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { EmptyState, ErrorBanner, Field, Modal, ProjectsSkeleton } from './ui';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FolderKanbanIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from './icons';

interface ProjectCard {
  id: string;
  name: string;
  description: string;
  role: string;
  memberCount: number;
  taskCount: number;
  doneCount: number;
  completion: number;
}

interface Overview {
  totalProjects: number;
  totalTasks: number;
  completed: number;
  completionPct: number;
  overdue: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
}

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api<ProjectCard[]>('/api/projects').then(setProjects).catch((e) => setError(e.message));
    api<Overview>('/api/stats').then(setOverview).catch(() => {});
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [projects, query]);

  if (error) return <ErrorBanner message={error} />;
  if (!projects) return <ProjectsSkeleton />;

  return (
    <div className="pp-animate-fade space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">My projects</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            Track progress, collaborate in real time, and ship work faster.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {projects.length > 0 && (
            <div className="relative flex-1 sm:w-60 sm:flex-none">
              <SearchIcon
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500"
              />
              <input
                className="pp-input !pl-8"
                placeholder="Filter projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter projects"
              />
            </div>
          )}
          <button type="button" className="pp-btn pp-btn-primary shrink-0" onClick={() => setShowNew(true)}>
            <PlusIcon size={15} />
            <span>+ New project</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      {overview && projects.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            label="Active projects"
            value={String(overview.totalProjects)}
            detail="Owned & shared"
            icon={<FolderKanbanIcon size={16} />}
            tone="teal"
          />
          <StatCard
            label="Total tasks"
            value={String(overview.totalTasks)}
            detail={`${overview.byStatus.TODO} to do · ${overview.byStatus.IN_PROGRESS} active`}
            icon={<LayersIcon size={16} />}
            tone="accent"
          />
          <StatCard
            label="Completion rate"
            value={`${overview.completionPct}%`}
            detail={`${overview.completed} of ${overview.totalTasks} tasks done`}
            icon={<CheckCircleIcon size={16} />}
            tone="success"
          />
          <StatCard
            label="Overdue"
            value={String(overview.overdue)}
            detail={overview.overdue > 0 ? 'Needs attention' : 'All on schedule'}
            icon={<AlertTriangleIcon size={16} />}
            tone={overview.overdue > 0 ? 'danger' : 'neutral'}
          />
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          detail="Create your first project to start organizing tasks with your team."
          action={
            <button type="button" className="pp-btn pp-btn-primary" onClick={() => setShowNew(true)}>
              <PlusIcon size={15} />
              <span>Create a project</span>
            </button>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No matching projects"
          detail="Try a different search term or clear your filter."
          action={
            <button type="button" className="pp-btn pp-btn-ghost" onClick={() => setQuery('')}>
              Clear search
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((p) => {
            const isOwner = p.role === 'OWNER';
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="pp-panel pp-card-hover group flex flex-col justify-between p-5"
              >
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold"
                        style={{
                          background: 'var(--teal-dim)',
                          borderColor: 'rgba(45, 212, 191, 0.22)',
                          color: 'var(--teal)',
                        }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="truncate text-[15px] font-semibold text-slate-100 transition-colors group-hover:text-teal-300">
                        {p.name}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: isOwner ? 'var(--teal-dim)' : 'var(--panel-2)',
                        borderColor: isOwner ? 'rgba(45, 212, 191, 0.22)' : 'var(--border)',
                        color: isOwner ? 'var(--teal)' : 'var(--ink-2)',
                      }}
                    >
                      {isOwner ? 'Owner' : 'Member'}
                    </span>
                  </div>

                  {p.description ? (
                    <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                      {p.description}
                    </p>
                  ) : (
                    <p className="mb-4 text-[13px] italic" style={{ color: 'var(--ink-3)' }}>
                      No description provided
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span style={{ color: 'var(--ink-3)' }}>Progress</span>
                      <span className="font-mono font-semibold text-slate-300">{p.completion}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--panel-2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${p.completion}%`,
                          background: 'linear-gradient(90deg, #14b8a6 0%, #5eead4 100%)',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between border-t pt-3 text-xs"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink-3)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span>
                        {p.doneCount}/{p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <UsersIcon size={12} />
                        {p.memberCount}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300">
                      Open
                      <ArrowRightIcon size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={(p) => {
            window.location.href = `/projects/${p.id}`;
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  tone: 'teal' | 'accent' | 'success' | 'danger' | 'neutral';
}) {
  const toneColors = {
    teal: { bg: 'var(--teal-dim)', fg: 'var(--teal)' },
    accent: { bg: 'var(--accent-dim)', fg: 'var(--accent)' },
    success: { bg: 'var(--success-dim)', fg: 'var(--success)' },
    danger: { bg: 'var(--red-dim)', fg: 'var(--red)' },
    neutral: { bg: 'var(--panel-2)', fg: 'var(--ink-2)' },
  }[tone];

  return (
    <div className="pp-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
        </span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: toneColors.bg, color: toneColors.fg }}
        >
          {icon}
        </span>
      </div>
      <div
        className="mt-2 font-mono text-2xl font-bold tracking-tight"
        style={tone === 'danger' ? { color: 'var(--red)' } : undefined}
      >
        {value}
      </div>
      {detail && (
        <div className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
          {detail}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: { id: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Project name is required.');
    setBusy(true);
    try {
      const project = await api<{ id: string }>('/api/projects', {
        method: 'POST',
        body: { name: name.trim(), description: description.trim() },
      });
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
      setBusy(false);
    }
  }

  return (
    <Modal title="New project" subtitle="Create a shared workspace for your team" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Field label="Project name">
          <input
            className="pp-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product Launch"
            autoFocus
            required
          />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea
            className="pp-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </Field>
        <div className="flex justify-end gap-2.5 pt-1">
          <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
