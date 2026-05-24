import { useCallback, useRef, useState } from 'react';

export type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type Props = {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
};

export function ImageDropzone({ images, onChange, maxImages = 5 }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = maxImages - images.length;
      if (remaining <= 0) return;
      const next: UploadedImage[] = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, remaining)
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        }));
      if (next.length) onChange([...images, ...next]);
    },
    [images, maxImages, onChange],
  );

  const removeImage = useCallback(
    (id: string) => {
      const target = images.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      onChange(images.filter((img) => img.id !== id));
    },
    [images, onChange],
  );

  const canAddMore = images.length < maxImages;
  const isEmpty = images.length === 0;

  return (
    <section aria-label="Photos" className="space-y-3">
      <div className="flex items-end justify-between">
        <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Photos
        </label>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
          {images.length} / {maxImages}
        </span>
      </div>

      {canAddMore && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!isDragging) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`block cursor-pointer rounded-2xl border-2 border-dashed text-center transition-colors ${
            isEmpty ? 'px-6 py-12' : 'px-4 py-6'
          } ${
            isDragging
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40'
              : 'border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {isEmpty && (
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="11" r="2" />
                <path d="m21 17-4.5-4.5L9 19" />
              </svg>
            </span>
          )}
          <div className="text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {isEmpty ? 'Add your photos' : 'Add more'}
            </span>
            <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">
              {isEmpty ? ' or drop them here' : ''}
            </span>
          </div>
          {isEmpty && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Up to {maxImages}. JPG, PNG, or HEIC.
            </p>
          )}
        </label>
      )}

      {!isEmpty && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            >
              <img
                src={img.previewUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:bg-black/80 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
