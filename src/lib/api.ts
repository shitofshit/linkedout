import { prepareImageForUpload } from './image';
import type { UploadedImage } from '../components/ImageDropzone';

export type GroundingSource = { title: string; uri: string };

export type PostBrief = {
  whatHappened: string;
  takeaway: string;
  tone: '' | 'professional' | 'casual' | 'inspirational' | 'technical';
  callToAction: string;
  hashtags: string;
};

export const EMPTY_BRIEF: PostBrief = {
  whatHappened: '',
  takeaway: '',
  tone: '',
  callToAction: '',
  hashtags: '',
};

export type GenerateResponse = {
  draft: string;
  sources: GroundingSource[];
};

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // body wasn't JSON
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function generateDraft(
  brief: PostBrief,
  images: UploadedImage[],
): Promise<GenerateResponse> {
  const prepared = await Promise.all(images.map((img) => prepareImageForUpload(img.file)));

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ brief, images: prepared }),
  });

  return unwrap<GenerateResponse>(res);
}

export type AuthStatus =
  | { authed: false }
  | { authed: true; sub?: string; name?: string; picture?: string; email?: string };

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  return unwrap<AuthStatus>(res);
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
}

export type PublishResponse = { ok: true; postUrn: string };

export async function publishPost(
  text: string,
  images: UploadedImage[],
): Promise<PublishResponse> {
  const prepared = await Promise.all(images.map((img) => prepareImageForUpload(img.file)));
  const res = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ text, images: prepared }),
  });
  return unwrap<PublishResponse>(res);
}
