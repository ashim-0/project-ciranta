'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { ConfirmModal, ErrorBanner, Field, Modal, Spinner, useToast } from './ui';
import {
  BarChartIcon,
  ChevronLeftIcon,
  EditIcon,
  LayoutBoardIcon,
  TrashIcon,
  UsersIcon,
} from './icons';

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  role: string;
  members: Member[];
}

export function ProjectShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    api<ProjectInfo>(`/api/projects/${projectId}`)
      .then(setProject)
      .catch((e) => setError(e.message));
  }, [projectId]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--teal)' }}>
          <ChevronLeftIcon size={15} />
          Back to my projects
        </Link>
      </div>
    );
  }
  if (!project) return <Spinner label="Loading project…" />;

  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: 'Board', exact: true, icon: <LayoutBoardIcon size={14} /> },
    { href: `${base}/dashboard`, label: 'Dashboard', exact: false, icon: <BarChartIcon size={14} /> },
    { href: `${base}/members`, label: 'Members', exact: false, icon: <UsersIcon size={14} />, badge: project.members.length },
  ];

  const isOwner = project.role === 'OWNER';

  async function handleDeleteProject() {
    setDeleteBusy(true);
    try {
      await api(`/api/projects/${projectId}`, { method: 'DELETE' });
      toast('Project deleted', 'success');
      router.replace('/projects');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete project', 'error');
      setDeleteBusy(false);
      setDeleting(false);
    }
  }

  return (
    <div className="pp-animate-fade flex h-full flex-col">
      {/* Project Header */}
      <div className="mb-6 border-b pb-5" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
          <Link href="/projects" className="inline-flex items-center gap-1 transition-colors hover:text-slate-200">
            <ChevronLeftIcon size={13} />
            Projects
          </Link>
          <span>/</span>
          <span className="truncate text-slate-300">{project.name}</span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-100">{project.name}</h1>
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  background: isOwner ? 'var(--teal-dim)' : 'var(--panel-2)',
                  borderColor: isOwner ? 'rgba(45, 212, 191, 0.25)' : 'var(--border)',
                  color: isOwner ? 'var(--teal)' : 'var(--ink-2)',
                }}
              >
                {isOwner ? 'Owner' : 'Member'}
              </span>
            </div>
            {project.description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Tab Bar */}
            <nav
              className="flex items-center gap-1 rounded-xl border p-1"
              style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
              aria-label="Project sections"
            >
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-[13px] ${
                      active
                        ? 'bg-white/[0.08] text-teal-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {typeof t.badge === 'number' && (
                      <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-slate-300">
                        {t.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {isOwner && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="pp-btn pp-btn-ghost !px-2.5 !py-2 text-xs"
                  title="Edit project"
                  aria-label="Edit project"
                >
                  <EditIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(true)}
                  className="pp-btn pp-btn-danger !px-2.5 !py-2 text-xs"
                  title="Delete project"
                  aria-label="Delete project"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProjectContext.Provider
        value={{
          project,
          refresh: () => {
            api<ProjectInfo>(`/api/projects/${projectId}`).then(setProject).catch(() => {});
          },
          leaveIfDeleted: () => router.replace('/projects'),
        }}
      >
        {children}
      </ProjectContext.Provider>

      {editing && (
        <EditProjectModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setProject((cur) => (cur ? { ...cur, name: updated.name, description: updated.description } : cur));
            setEditing(false);
            toast('Project updated', 'success');
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Delete project"
          description={`Are you sure you want to delete "${project.name}"? All tasks, comments, and activity history will be permanently removed.`}
          confirmLabel="Delete project"
          busy={deleteBusy}
          onConfirm={handleDeleteProject}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectInfo;
  onClose: () => void;
  onSaved: (p: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Project name is required.');
    setBusy(true);
    try {
      const updated = await api<{ name: string; description: string }>(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: { name: name.trim(), description: description.trim() },
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the project.');
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit project" subtitle="Update project name and description" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Field label="Project name">
          <input className="pp-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export const ProjectContext = React.createContext<{
  project: ProjectInfo;
  refresh: () => void;
  leaveIfDeleted: () => void;
} | null>(null);

export function useProject() {
  const ctx = React.useContext(ProjectContext);
  if (!ctx) throw new Error('useProject outside ProjectShell');
  return ctx;
}
