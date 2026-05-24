import { prepareImageForUpload } from './image';
import type { UploadedImage } from '../components/ImageDropzone';

export type GroundingSource = { title: string; uri: string };

export type GenerateResponse = {
  draft: string;
  sources: GroundingSource[];
};

export async function generateDraft(
  description: string,
  images: UploadedImage[],
): Promise<GenerateResponse> {
  const prepared = await Promise.all(images.map((img) => prepareImageForUpload(img.file)));

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ description, images: prepared }),
  });

  if (!res.ok) {
    const fallback = `Request failed with status ${res.status}`;
    let message = fallback;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // body wasn't JSON
    }
    throw new Error(message);
  }

  return (await res.json()) as GenerateResponse;
}
