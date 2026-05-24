import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function DescriptionInput({ value, onChange, maxLength = 500 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <section aria-label="Description" className="space-y-2">
      <div className="flex items-end justify-between">
        <label htmlFor="description" className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          What happened?
        </label>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
          {value.length} / {maxLength}
        </span>
      </div>
      <textarea
        id="description"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder="A sentence or two — what stood out, who you met, what you learned…"
        rows={3}
        className="block w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] leading-relaxed placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
      />
    </section>
  );
}
