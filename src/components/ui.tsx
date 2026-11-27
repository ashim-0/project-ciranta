'use client';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, LayersIcon, XIcon } from './icons';

/* -------------------------------------------------------------------------- */
/*                               Toast System                                 */
/* -------------------------------------------------------------------------- */

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((cur) => [...cur.slice(-3), { id, message, tone }]);
    setTimeout(() => dismiss(id), 3800);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {items.length > 0 && (
        <div
          className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2 pl-4 sm:right-6 sm:bottom-6"
          aria-live="polite"
        >
          {items.map((item) => {
            const toneStyles =
              item.tone === 'success'
                ? { border: 'rgba(52, 211, 153, 0.35)', iconColor: 'var(--success)' }
                : item.tone === 'error'
                  ? { border: 'rgba(248, 113, 113, 0.35)', iconColor: 'var(--red)' }
                  : { border: 'rgba(45, 212, 191, 0.35)', iconColor: 'var(--teal)' };

            return (
              <div
                key={item.id}
                className="pp-panel-glass pp-animate-slide pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 text-sm shadow-xl"
                style={{ borderColor: toneStyles.border }}
              >
                <span style={{ color: toneStyles.iconColor }}>
                  {item.tone === 'error' ? (
                    <AlertTriangleIcon size={16} />
                  ) : (
                    <CheckCircleIcon size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-100">
                  {item.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                  aria-label="Dismiss notification"
                >
                  <XIcon size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* -------------------------------------------------------------------------- */
/*                            Loading & Skeletons                             */
/* -------------------------------------------------------------------------- */

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-12 text-sm" style={{ color: 'var(--ink-2)' }}>
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-400/80 border-t-transparent"
        aria-hidden="true"
      />
      <span>{label ?? 'Loading…'}</span>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`pp-skeleton ${className}`} aria-hidden="true" />;
}

export function ProjectsSkeleton() {
  return (
    <div className="pp-animate-fade space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="pp-panel p-4 space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pp-panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="pp-animate-fade space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((col) => (
          <div key={col} className="pp-panel p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            {[0, 1].map((card) => (
              <div key={card} className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 space-y-2.5">
                <Skeleton className="h-4 w-4/5" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="pp-animate-fade space-y-4">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="pp-panel p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="pp-panel p-5 space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="pp-panel p-5"><Skeleton className="h-56 w-full" /></div>
        <div className="pp-panel p-5"><Skeleton className="h-56 w-full" /></div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Empty State                                 */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  detail,
  action,
  icon,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="pp-panel pp-animate-fade flex flex-col items-center justify-center px-6 py-14 text-center">
      <div
        className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border"
        style={{
          background: 'var(--teal-dim)',
          borderColor: 'rgba(45, 212, 191, 0.22)',
          color: 'var(--teal)',
        }}
      >
        {icon ?? <LayersIcon size={20} />}
      </div>
      <div className="text-base font-semibold tracking-tight text-slate-100">{title}</div>
      {detail && (
        <div className="mt-1 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          {detail}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Modals                                   */
/* -------------------------------------------------------------------------- */

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="pp-animate-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
      style={{ background: 'rgba(4, 6, 12, 0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`pp-panel-glass pp-animate-scale my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-5 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
          >
            <XIcon size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-2.5">
        <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`pp-btn ${danger ? 'pp-btn-danger' : 'pp-btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Form & Badges                                */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="pp-label !mb-0">{label}</label>
        {hint && (
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  const styles: Record<string, { bg: string; border: string; fg: string; dot: string; label: string }> = {
    HIGH: {
      bg: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.25)',
      fg: '#fca5a5',
      dot: '#f87171',
      label: 'High',
    },
    MEDIUM: {
      bg: 'rgba(251, 191, 36, 0.12)',
      border: 'rgba(251, 191, 36, 0.25)',
      fg: '#fde68a',
      dot: '#fbbf24',
      label: 'Medium',
    },
    LOW: {
      bg: 'rgba(148, 163, 184, 0.12)',
      border: 'rgba(148, 163, 184, 0.22)',
      fg: '#cbd5e1',
      dot: '#94a3b8',
      label: 'Low',
    },
  };
  const s = styles[priority] ?? styles.MEDIUM;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, borderColor: s.border, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
    TODO: { bg: 'rgba(148, 163, 184, 0.12)', fg: '#cbd5e1', dot: '#94a3b8', label: 'To Do' },
    IN_PROGRESS: { bg: 'rgba(251, 191, 36, 0.12)', fg: '#fde68a', dot: '#fbbf24', label: 'In Progress' },
    DONE: { bg: 'rgba(45, 212, 191, 0.12)', fg: '#5eead4', dot: '#2dd4bf', label: 'Done' },
  };
  const s = map[status] ?? map.TODO;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} aria-hidden="true" />
      {s.label}
    </span>
  );
}

const AVATAR_TONES = [
  { bg: 'rgba(45, 212, 191, 0.16)', fg: '#5eead4', border: 'rgba(45, 212, 191, 0.32)' },
  { bg: 'rgba(129, 140, 248, 0.18)', fg: '#a5b4fc', border: 'rgba(129, 140, 248, 0.34)' },
  { bg: 'rgba(251, 191, 36, 0.16)', fg: '#fde68a', border: 'rgba(251, 191, 36, 0.32)' },
  { bg: 'rgba(244, 114, 182, 0.16)', fg: '#f9a8d4', border: 'rgba(244, 114, 182, 0.32)' },
  { bg: 'rgba(56, 189, 248, 0.16)', fg: '#7dd3fc', border: 'rgba(56, 189, 248, 0.32)' },
];

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const ini = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const tone = AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];

  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full border font-semibold tracking-tight"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.4)),
        background: tone.bg,
        color: tone.fg,
        borderColor: tone.border,
      }}
    >
      {ini || '?'}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pp-error flex items-start gap-2.5" role="alert">
      <AlertTriangleIcon size={16} className="mt-0.5 shrink-0 text-red-400" />
      <span>{message}</span>
    </div>
  );
}
