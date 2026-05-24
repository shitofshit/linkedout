import { useEffect, useRef, useState } from 'react';
import type { PostBrief } from '../lib/api';

type Props = {
  value: PostBrief;
  onChange: (value: PostBrief) => void;
};

const TONES: Array<{ value: PostBrief['tone']; label: string }> = [
  { value: '', label: 'Default' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'technical', label: 'Technical' },
];

const MAX_WHAT = 500;
const MAX_TAKEAWAY = 240;
const MAX_CTA = 160;
const MAX_HASHTAGS = 160;

export function PostBriefForm({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const whatRef = useRef<HTMLTextAreaElement>(null);
  const takeawayRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    autoSize(whatRef.current);
  }, [value.whatHappened]);

  useEffect(() => {
    autoSize(takeawayRef.current);
  }, [value.takeaway, expanded]);

  const update = <K extends keyof PostBrief>(key: K, v: PostBrief[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <section aria-label="Post details" className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <label htmlFor="what-happened" className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            What happened?
          </label>
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
            {value.whatHappened.length} / {MAX_WHAT}
          </span>
        </div>
        <textarea
          id="what-happened"
          ref={whatRef}
          value={value.whatHappened}
          onChange={(e) => update('whatHappened', e.target.value.slice(0, MAX_WHAT))}
          placeholder="A sentence or two — what stood out, who you met, what you learned…"
          rows={3}
          className="block w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] leading-relaxed placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
        </svg>
        {expanded ? 'Hide details' : 'More details (optional)'}
      </button>

      {expanded && (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <Field
            id="takeaway"
            label="Key takeaway / insight"
            hint="The 'so what' — what should the reader walk away with?"
            counter={`${value.takeaway.length} / ${MAX_TAKEAWAY}`}
          >
            <textarea
              id="takeaway"
              ref={takeawayRef}
              value={value.takeaway}
              onChange={(e) => update('takeaway', e.target.value.slice(0, MAX_TAKEAWAY))}
              rows={2}
              placeholder="e.g. Small async teams can ship faster than I thought when ownership is clear."
              className="block w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
            />
          </Field>

          <Field id="tone" label="Tone">
            <select
              id="tone"
              value={value.tone}
              onChange={(e) => update('tone', e.target.value as PostBrief['tone'])}
              className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="cta"
            label="Call to action"
            hint="What should readers do?"
            counter={`${value.callToAction.length} / ${MAX_CTA}`}
          >
            <input
              id="cta"
              type="text"
              value={value.callToAction}
              onChange={(e) => update('callToAction', e.target.value.slice(0, MAX_CTA))}
              placeholder="e.g. Drop your favorite talk in the comments."
              className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
            />
          </Field>

          <Field
            id="hashtags"
            label="Hashtags"
            hint="Comma or space separated. Skip the # if you want."
            counter={`${value.hashtags.length} / ${MAX_HASHTAGS}`}
          >
            <input
              id="hashtags"
              type="text"
              value={value.hashtags}
              onChange={(e) => update('hashtags', e.target.value.slice(0, MAX_HASHTAGS))}
              placeholder="e.g. AIEngineering, DevTools, Conferences"
              className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between">
        <label htmlFor={id} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        {counter && <span className="text-[11px] tabular-nums text-zinc-500">{counter}</span>}
      </div>
      {children}
      {hint && <p className="text-[11px] text-zinc-500 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}

function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
