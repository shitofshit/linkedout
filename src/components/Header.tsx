import { ThemeToggle } from './ThemeToggle';

export function Header() {
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
        <ThemeToggle />
      </div>
    </header>
  );
}
