import { useState } from 'react';
import { Header } from './components/Header';
import { ImageDropzone, type UploadedImage } from './components/ImageDropzone';
import { DescriptionInput } from './components/DescriptionInput';
import { PostPreview } from './components/PostPreview';
import { generateDraft, type GroundingSource } from './lib/api';

export default function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = images.length > 0 && description.trim().length > 0 && !isGenerating;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await generateDraft(description.trim(), images);
      setDraft(res.draft);
      setSources(res.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <Header />
      <main
        className="mx-auto max-w-2xl px-4 sm:px-6"
        style={{
          paddingTop: '1.5rem',
          paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)',
        }}
      >
        {draft === null ? (
          <div className="space-y-6">
            <ImageDropzone images={images} onChange={setImages} />
            <DescriptionInput value={description} onChange={setDescription} />
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-[15px] font-semibold text-white transition-transform hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 motion-reduce:transition-none motion-reduce:active:scale-100 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
            >
              {isGenerating ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin motion-reduce:hidden">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
                  </svg>
                  Generate post
                </>
              )}
            </button>
            {!canGenerate && !isGenerating && !error && (
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
                {images.length === 0
                  ? 'Add at least one photo to begin.'
                  : 'Add a sentence about what happened.'}
              </p>
            )}
          </div>
        ) : (
          <PostPreview
            draft={draft}
            images={images}
            sources={sources}
            isRegenerating={isGenerating}
            error={error}
            onDraftChange={setDraft}
            onRegenerate={handleGenerate}
            onBack={() => {
              setDraft(null);
              setSources([]);
              setError(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
