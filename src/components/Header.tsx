import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { AuthStatus } from '../lib/api';

type Props = {
  auth: AuthStatus | null;
  onLogout: () => void;
};

export function Header({ auth, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-zinc-50/80 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div
        className="mx-auto flex max-w-2xl items-center justify-between px-4 sm:px-6"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-semibold tracking-tight">Linkedout</h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Photos in. Polished post out.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AuthBadge auth={auth} onLogout={onLogout} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function AuthBadge({ auth, onLogout }: Props) {
  if (auth === null) return null; // still loading

  if (!auth.authed) {
    return (
      <a
        href="/api/oauth/start"
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#0a66c2] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#084e96]"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.554V9h3.565v11.452z" />
        </svg>
        Sign in
      </a>
    );
  }

  return <ProfileMenu auth={auth} onLogout={onLogout} />;
}

function ProfileMenu({ auth, onLogout }: { auth: AuthStatus; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = (auth.name ?? '?').slice(0, 1).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {auth.picture ? (
          <img src={auth.picture} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
            {initial}
          </span>
        )}
        <span className="max-w-[8rem] truncate">{auth.name ?? 'Signed in'}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3 w-3 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            {auth.picture ? (
              <img src={auth.picture} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-600 text-sm font-bold text-white">
                {initial}
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{auth.name ?? 'LinkedIn user'}</div>
              {auth.email && (
                <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{auth.email}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-400">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
