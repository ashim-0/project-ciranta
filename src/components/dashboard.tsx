'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/client-api';
import { useProjectSocket } from '@/lib/use-socket';
import { formatDateTime } from '@/lib/format';
import { Avatar, DashboardSkeleton, EmptyState, ErrorBanner, useToast } from './ui';
import { TaskModal } from './task-modal';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LayersIcon,
  LayoutBoardIcon,
  PlusIcon,
} from './icons';

interface Stats {
  totalTasks: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  byPriority: { LOW: number; MEDIUM: number; HIGH: number };
  completed: number;
  completionPct: number;
  overdue: number;
  perMember: { userId: string; name: string; assigned: number; done: number }[];
}

interface ActivityDto {
  id: string;
  type: string;
  detail: string;
  actor?: { id: string; name: string };
  createdAt: string;
}

const STATUS_META = [
  { key: 'TODO', name: 'To Do', color: '#64748b' },
  { key: 'IN_PROGRESS', name: 'In Progress', color: '#fbbf24' },
  { key: 'DONE', name: 'Done', color: '#2dd4bf' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  High: '#f87171',
  Medium: '#fbbf24',
  Low: '#818cf8',
};

export function Dashboard({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    Promise.all([
      api<Stats>(`/api/projects/${projectId}/dashboard`),
      api<ActivityDto[]>(`/api/projects/${projectId}/activities`).catch(() => [] as ActivityDto[]),
    ])
      .then(([s, a]) => {
        setStats(s);
        setActivities(a);
      })
      .catch((e) => setError(e.message));
  }, [projectId]);

  useEffect(load, [load]);

  // Live: any task or comment change refreshes the dashboard without a page reload.
  const onSocketEvent = useCallback(
    (event: string) => {
      if (event.startsWith('task:') || event.startsWith('comment:')) load();
    },
    [load],
  );
  useProjectSocket(projectId, onSocketEvent);

  if (error) return <ErrorBanner message={error} />;
  if (!stats) return <DashboardSkeleton />;

  if (stats.totalTasks === 0) {
    return (
      <>
        <EmptyState
          title="Nothing to report yet"
          detail="Create your first task to unlock live analytics, workload tracking, and activity insights."
          action={
            <button type="button" className="pp-btn pp-btn-primary" onClick={() => setCreatingTask(true)}>
              <PlusIcon size={15} />
              <span>Create first task</span>
            </button>
          }
        />
        {creatingTask && (
          <TaskModal
            projectId={projectId}
            taskId={null}
            onClose={() => setCreatingTask(false)}
            onCreated={() => {
              setCreatingTask(false);
              toast('Task created', 'success');
              load();
            }}
          />
        )}
      </>
    );
  }

  const statusData = [
    { name: 'To Do', value: stats.byStatus.TODO, color: '#64748b' },
    { name: 'In Progress', value: stats.byStatus.IN_PROGRESS, color: '#fbbf24' },
    { name: 'Done', value: stats.byStatus.DONE, color: '#2dd4bf' },
  ];
  const priorityData = [
    { name: 'High', value: stats.byPriority.HIGH },
    { name: 'Medium', value: stats.byPriority.MEDIUM },
    { name: 'Low', value: stats.byPriority.LOW },
  ];

  const todoPct = stats.totalTasks ? Math.round((stats.byStatus.TODO / stats.totalTasks) * 100) : 0;
  const inProgPct = stats.totalTasks ? Math.round((stats.byStatus.IN_PROGRESS / stats.totalTasks) * 100) : 0;
  const donePct = stats.totalTasks ? Math.max(0, 100 - todoPct - inProgPct) : 0;

  return (
    <div className="pp-animate-fade flex flex-col gap-5">
      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Project Analytics</h2>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            Real-time overview of task velocity, priority distribution, and team workload.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}`} className="pp-btn pp-btn-secondary text-xs">
            <LayoutBoardIcon size={14} />
            <span>Open board</span>
          </Link>
          <button type="button" className="pp-btn pp-btn-primary text-xs" onClick={() => setCreatingTask(true)}>
            <PlusIcon size={14} />
            <span>+ Add task</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Total tasks"
          value={stats.totalTasks}
          sub={`${stats.byStatus.IN_PROGRESS} in progress`}
          icon={<LayersIcon size={16} />}
          tone="accent"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          sub={`${stats.byStatus.TODO} remaining in To Do`}
          icon={<CheckCircleIcon size={16} />}
          tone="teal"
        />
        <StatCard
          label="Completion rate"
          value={`${stats.completionPct}%`}
          sub={`${stats.completed} of ${stats.totalTasks} done`}
          icon={<ClockIcon size={16} />}
          tone="success"
        />
        <StatCard
          label="Overdue tasks"
          value={stats.overdue}
          sub={stats.overdue > 0 ? 'Past due date' : 'Everything on track'}
          icon={<AlertTriangleIcon size={16} />}
          tone={stats.overdue > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Segmented Overall Progress */}
      <div className="pp-panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-slate-100">Overall progress</span>
            <span className="ml-2 text-xs" style={{ color: 'var(--ink-3)' }}>
              {stats.completed} of {stats.totalTasks} tasks completed
            </span>
          </div>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--teal)' }}>
            {stats.completionPct}%
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--panel-2)' }}>
          {stats.byStatus.DONE > 0 && (
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${donePct}%`, background: '#2dd4bf' }}
              title={`Done: ${stats.byStatus.DONE}`}
            />
          )}
          {stats.byStatus.IN_PROGRESS > 0 && (
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${inProgPct}%`, background: '#fbbf24' }}
              title={`In Progress: ${stats.byStatus.IN_PROGRESS}`}
            />
          )}
          {stats.byStatus.TODO > 0 && (
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${todoPct}%`, background: '#475569' }}
              title={`To Do: ${stats.byStatus.TODO}`}
            />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-5 text-xs" style={{ color: 'var(--ink-2)' }}>
          {STATUS_META.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span>{s.name}:</span>
              <span className="font-mono font-semibold text-slate-200">{stats.byStatus[s.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="pp-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Tasks by status</h3>
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Distribution
            </span>
          </div>
          <div className="relative" style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={4}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#11151f',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#f1f5f9',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold text-slate-100">{stats.totalTasks}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Total tasks
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-5 text-xs" style={{ color: 'var(--ink-2)' }}>
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pp-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Tasks by priority</h3>
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Urgency breakdown
            </span>
          </div>
          <div style={{ width: '100%', height: 255 }}>
            <ResponsiveContainer>
              <BarChart data={priorityData} barSize={36}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    background: '#11151f',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#f1f5f9',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? '#2dd4bf'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Team Workload + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="pp-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Team workload</h3>
            <Link
              href={`/projects/${projectId}/members`}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300"
            >
              <span>Manage team</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>
          {stats.perMember.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
              No members yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {stats.perMember.map((m) => {
                const pct = m.assigned === 0 ? 0 : Math.round((m.done / m.assigned) * 100);
                return (
                  <div key={m.userId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={m.name} size={22} />
                        <span className="truncate font-medium text-slate-200">{m.name}</span>
                      </div>
                      <span className="font-mono text-slate-400">
                        {m.done}/{m.assigned} done ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--panel-2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #14b8a6 0%, #5eead4 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pp-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon size={15} className="text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-100">Recent activity</h3>
            </div>
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Latest updates
            </span>
          </div>
          {!activities || activities.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
              No activity recorded yet.
            </div>
          ) : (
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
              {activities.slice(0, 12).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 text-xs">
                  <Avatar name={a.actor?.name ?? '?'} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                      <span className="font-semibold text-slate-100">{a.actor?.name ?? 'Someone'}</span>{' '}
                      {a.detail}
                    </div>
                    <div className="mt-0.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {creatingTask && (
        <TaskModal
          projectId={projectId}
          taskId={null}
          onClose={() => setCreatingTask(false)}
          onCreated={() => {
            setCreatingTask(false);
            toast('Task created', 'success');
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  tone: 'teal' | 'accent' | 'success' | 'danger' | 'neutral';
}) {
  const colors = {
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
          style={{ background: colors.bg, color: colors.fg }}
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
      <div className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
        {sub}
      </div>
    </div>
  );
}
