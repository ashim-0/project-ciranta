'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { ErrorBanner } from './ui';
import { ArrowRightIcon } from './icons';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && !name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (mode === 'register' && password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: mode === 'register' ? { name, email, password } : { email, password },
      });
      // Start a fresh document after changing the session cookie. This avoids
      // stale App Router responses racing an auth-boundary navigation.
      const next = params.get('next');
      window.location.assign(next === '/projects' || next?.startsWith('/projects/') ? next : '/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="pp-panel-glass p-6 sm:p-7">
      <div
        className="mb-6 flex rounded-xl border p-1"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/login"
          className={`flex-1 rounded-lg py-2 text-center text-[13px] font-semibold transition-all ${
            mode === 'login'
              ? 'bg-white/[0.08] text-teal-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Log in
        </Link>
        <Link
          href="/register"
          className={`flex-1 rounded-lg py-2 text-center text-[13px] font-semibold transition-all ${
            mode === 'register'
              ? 'bg-white/[0.08] text-teal-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Register
        </Link>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
        <ErrorBanner message={error} />
        {mode === 'register' && (
          <div>
            <label className="pp-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className="pp-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice"
              autoComplete="name"
              required
            />
          </div>
        )}
        <div>
          <label className="pp-label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            className="pp-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="pp-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="pp-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
          />
        </div>
        <button type="submit" className="pp-btn pp-btn-primary mt-1 w-full py-2.5" disabled={busy}>
          <span>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</span>
          {!busy && <ArrowRightIcon size={15} />}
        </button>
      </form>
    </div>
  );
}
