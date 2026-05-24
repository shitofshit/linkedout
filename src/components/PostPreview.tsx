import { useEffect, useRef, useState } from 'react';
import type { UploadedImage } from './ImageDropzone';
import type { GroundingSource } from '../lib/api';

const MAX_LINKEDIN_CHARS = 3000;

type Props = {
  draft: string;
  images: UploadedImage[];
  sources: GroundingSource[];
  isRegenerating: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onRegenerate: () => void;
  onBack: () => void;
};

export function PostPreview({
  draft,
  images,
  sources,
  isRegenerating,
  error,
  onDraftChange,
  onRegenerate,
  onBack,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [draft]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop — clipboard may be blocked
    }
  }

  const overLimit = draft.length > MAX_LINKEDIN_CHARS;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Edit photos
      </button>

      {images.length > 0 && (
        <div
          aria-label="Photos to attach"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img) => (
            <img
              key={img.id}
              src={img.previewUrl}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
              draggable={false}
            />
          ))}
        </div>
      )}

      <section aria-label="Post draft" className="space-y-2">
        <div className="flex items-end justify-between">
          <label htmlFor="draft" className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Your post
          </label>
          <span
            className={`text-xs tabular-nums ${
              overLimit ? 'font-semibold text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-500'
            }`}
          >
            {draft.length.toLocaleString()} / {MAX_LINKEDIN_CHARS.toLocaleString()}
          </span>
        </div>
        <textarea
          id="draft"
          ref={ref}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={8}
          className="block w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
        />
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {sources.length > 0 && (
        <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            Grounded from {sources.length} source{sources.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {sources.map((s, i) => (
              <li key={i} className="truncate">
                <a
                  href={s.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 hover:underline dark:text-teal-400"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-transform hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {isRegenerating ? (
            <Spinner />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          )}
          Regenerate
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition-transform hover:bg-zinc-100 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-teal-600 dark:text-teal-400">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      <button
        type="button"
        disabled={overLimit || draft.trim().length === 0}
        title="LinkedIn publishing comes in Phase 3"
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-[15px] font-semibold text-white transition-transform hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 motion-reduce:transition-none motion-reduce:active:scale-100 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.554V9h3.565v11.452z" />
        </svg>
        Post to LinkedIn
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin motion-reduce:hidden">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
