'use client';
import React, { useCallback, useState } from 'react';
import { api } from '@/lib/client-api';
import { useProjectSocket } from '@/lib/use-socket';
import { useProject } from './project-shell';
import { Avatar, ConfirmModal, ErrorBanner, Field, useToast } from './ui';
import { CheckCircleIcon, TrashIcon, UserPlusIcon, UsersIcon } from './icons';

export function Members({ projectId }: { projectId: string }) {
  const { project, refresh, leaveIfDeleted } = useProject();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const { toast } = useToast();
  const isOwner = project.role === 'OWNER';

  const onSocketEvent = useCallback(
    (event: string) => {
      if (event === 'project:deleted') return leaveIfDeleted();
      if (event === 'member:added' || event === 'member:removed' || event === 'project:updated') refresh();
    },
    [refresh, leaveIfDeleted],
  );
  useProjectSocket(projectId, onSocketEvent);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const m = await api<{ user: { name: string } }>(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: { email: email.trim() },
      });
      const msg = `${m.user.name} added to the project.`;
      setNotice(msg);
      toast(msg, 'success');
      setEmail('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the member.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    setError(null);
    try {
      await api(`/api/projects/${projectId}/members/${removing.id}`, { method: 'DELETE' });
      toast(`${removing.name} removed from project`, 'info');
      setRemoving(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the member.');
      setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <div className="pp-animate-fade grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Members List */}
      <div className="pp-panel overflow-hidden lg:col-span-3">
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <UsersIcon size={15} className="text-teal-400" />
            <span>Team members</span>
          </div>
          <span
            className="rounded-full border px-2.5 py-0.5 font-mono text-xs"
            style={{ background: 'var(--panel-2)', borderColor: 'var(--border)', color: 'var(--ink-2)' }}
          >
            {project.members.length}
          </span>
        </div>

        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {project.members.map((m) => {
            const owner = m.role === 'OWNER';
            return (
              <li
                key={m.id}
                className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                style={{ borderColor: 'var(--border)' }}
              >
                <Avatar name={m.user.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{m.user.name}</div>
                  <div className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                    {m.user.email}
                  </div>
                </div>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                  style={{
                    background: owner ? 'var(--teal-dim)' : 'var(--panel-2)',
                    borderColor: owner ? 'rgba(45, 212, 191, 0.25)' : 'var(--border)',
                    color: owner ? 'var(--teal)' : 'var(--ink-2)',
                  }}
                >
                  {owner ? 'Owner' : 'Member'}
                </span>
                {isOwner && !owner && (
                  <button
                    type="button"
                    className="pp-btn pp-btn-danger !px-2.5 !py-1.5 text-xs"
                    onClick={() => setRemoving({ id: m.id, name: m.user.name })}
                    title={`Remove ${m.user.name}`}
                  >
                    <TrashIcon size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Invite Panel */}
      <div className="lg:col-span-2">
        {isOwner ? (
          <div className="pp-panel p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <UserPlusIcon size={15} className="text-teal-400" />
              <span>Add a member</span>
            </div>
            <p className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Invite a teammate by their registered Project Pulse email address.
            </p>
            <form onSubmit={add} className="flex flex-col gap-3.5">
              <ErrorBanner message={error} />
              {notice && (
                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium"
                  style={{
                    background: 'var(--teal-dim)',
                    borderColor: 'rgba(45, 212, 191, 0.25)',
                    color: 'var(--teal)',
                  }}
                >
                  <CheckCircleIcon size={14} />
                  <span>{notice}</span>
                </div>
              )}
              <Field label="Registered email">
                <div className="flex gap-2">
                  <input
                    type="email"
                    className="pp-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    required
                  />
                  <button type="submit" className="pp-btn pp-btn-primary shrink-0" disabled={busy}>
                    {busy ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </Field>
            </form>
          </div>
        ) : (
          <div className="pp-panel p-5">
            <div className="text-sm font-semibold text-slate-200">Permissions</div>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              You have Member access on this project. Only the project owner can add or remove members.
            </p>
          </div>
        )}
      </div>

      {removing && (
        <ConfirmModal
          title="Remove member"
          description={`Remove ${removing.name} from the project? Their assigned tasks will become unassigned.`}
          confirmLabel="Remove member"
          busy={removeBusy}
          onConfirm={confirmRemove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
