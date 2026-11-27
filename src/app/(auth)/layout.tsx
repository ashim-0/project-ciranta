import { BrandLogo } from '@/components/icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pp-ambient-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Subtle architectural grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />
      <div className="pp-animate-slide relative z-10 w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-lg">
            <BrandLogo size={34} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Project <span style={{ color: 'var(--teal)' }}>Pulse</span>
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
            Organize projects, assign tasks, collaborate in real time.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
