'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client-api';
import { Avatar, ToastProvider } from './ui';
import {
  BarChartIcon,
  BrandLogo,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderKanbanIcon,
  LayoutBoardIcon,
  LogOutIcon,
  MenuIcon,
  UsersIcon,
  XIcon,
} from './icons';

interface UserLite {
  id: string;
  name: string;
  email: string;
}

interface SidebarProject {
  id: string;
  name: string;
  role: string;
  taskCount: number;
}

export function AppShell({ user, children }: { user: UserLite; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projects, setProjects] = useState<SidebarProject[]>([]);

  useEffect(() => {
    api<SidebarProject[]>('/api/projects')
      .then(setProjects)
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    window.location.assign('/login');
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectMatch?.[1] ?? null;

  function renderSidebarContent(isMobile = false) {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div
          className={`flex h-14 items-center border-b px-3.5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          <Link href="/projects" className="flex items-center gap-2.5 overflow-hidden">
            <BrandLogo size={26} />
            {!isCollapsed && (
              <span className="truncate text-[15px] font-bold tracking-tight text-slate-100">
                Project <span style={{ color: 'var(--teal)' }}>Pulse</span>
              </span>
            )}
          </Link>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100"
              aria-label="Close navigation"
            >
              <XIcon size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={`rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 ${isCollapsed ? 'hidden' : ''}`}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon size={15} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          <div>
            {!isCollapsed && (
              <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                Workspace
              </div>
            )}
            <nav className="flex flex-col gap-1">
              <NavItem
                href="/projects"
                active={pathname === '/projects'}
                collapsed={isCollapsed}
                icon={<FolderKanbanIcon size={16} />}
                label="My projects"
              />
            </nav>
          </div>

          {projects.length > 0 && (
            <div>
              {!isCollapsed && (
                <div className="mb-1.5 flex items-center justify-between px-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                  <span>Projects</span>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    {projects.length}
                  </span>
                </div>
              )}
              <nav className="flex flex-col gap-0.5">
                {projects.map((p) => {
                  const isCurrent = activeProjectId === p.id;
                  return (
                    <div key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        title={p.name}
                        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                          isCurrent
                            ? 'bg-teal-400/10 text-teal-300'
                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                            isCurrent ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-slate-600 group-hover:bg-slate-400'
                          }`}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate">{p.name}</span>
                            <span className="text-[11px] text-slate-500">{p.taskCount}</span>
                          </>
                        )}
                      </Link>
                      {isCurrent && !isCollapsed && (
                        <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l pl-2.5" style={{ borderColor: 'var(--border)' }}>
                          <SubNavLink
                            href={`/projects/${p.id}`}
                            active={pathname === `/projects/${p.id}`}
                            icon={<LayoutBoardIcon size={13} />}
                            label="Board"
                          />
                          <SubNavLink
                            href={`/projects/${p.id}/dashboard`}
                            active={pathname === `/projects/${p.id}/dashboard`}
                            icon={<BarChartIcon size={13} />}
                            label="Dashboard"
                          />
                          <SubNavLink
                            href={`/projects/${p.id}/members`}
                            active={pathname === `/projects/${p.id}/members`}
                            icon={<UsersIcon size={13} />}
                            label="Members"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        )}

        {/* User Profile Footer */}
        <div
          className={`border-t p-3 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2.5'}`}
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="relative shrink-0">
            <Avatar name={user.name} size={32} />
            <span
              className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-400"
              style={{ borderColor: 'var(--bg-elevated)' }}
              title="Online"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-slate-100">{user.name}</div>
              <div className="truncate text-[11px]" style={{ color: 'var(--ink-3)' }}>
                {user.email}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-red-400"
            title="Log out"
            aria-label="Log out"
          >
            <LogOutIcon size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="pp-ambient-bg flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden shrink-0 flex-col border-r transition-all duration-200 md:flex ${
            collapsed ? 'w-[68px]' : 'w-64'
          }`}
          style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
        >
          <div className="sticky top-0 h-screen">{renderSidebarContent(false)}</div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="pp-animate-fade fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className="pp-animate-slide relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r shadow-2xl"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              {renderSidebarContent(true)}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Header */}
          <header
            className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md md:hidden"
            style={{ borderColor: 'var(--border)', background: 'rgba(13, 16, 23, 0.85)' }}
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/5"
                aria-label="Open menu"
              >
                <MenuIcon size={19} />
              </button>
              <Link href="/projects" className="flex items-center gap-2">
                <BrandLogo size={22} />
                <span className="text-sm font-bold tracking-tight">
                  Project <span style={{ color: 'var(--teal)' }}>Pulse</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name={user.name} size={28} />
              <button
                type="button"
                onClick={logout}
                className="pp-btn pp-btn-ghost !px-2.5 !py-1 text-xs"
              >
                Log out
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

function NavItem({
  href,
  active,
  collapsed,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
        active
          ? 'bg-white/[0.07] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <span style={active ? { color: 'var(--teal)' } : undefined}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SubNavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-white/[0.06] text-teal-300'
          : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
