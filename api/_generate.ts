import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './_prompt';

const MAX_IMAGES = 5;
const MAX_DESCRIPTION = 500;
const MAX_INLINE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MODEL = 'gemini-2.5-flash';

type GenerateRequest = {
  description?: unknown;
  images?: unknown;
};

type ImagePayload = {
  mimeType: string;
  data: string;
};

type GroundingSource = {
  title: string;
  uri: string;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function isImagePayload(value: unknown): value is ImagePayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.mimeType === 'string' && typeof v.data === 'string';
}

function extractPost(raw: string): string {
  const match = raw.match(/<post>([\s\S]*?)<\/post>/i);
  if (match) return match[1].trim();
  return raw.trim();
}

export async function handleGenerate(req: Request, apiKey: string | undefined): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }
  if (!apiKey) {
    return jsonResponse(500, { error: 'GEMINI_API_KEY is not configured on the server' });
  }

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description) return jsonResponse(400, { error: 'description is required' });
  if (description.length > MAX_DESCRIPTION) {
    return jsonResponse(400, { error: `description must be <= ${MAX_DESCRIPTION} chars` });
  }

  if (!Array.isArray(body.images) || body.images.length === 0) {
    return jsonResponse(400, { error: 'at least one image is required' });
  }
  if (body.images.length > MAX_IMAGES) {
    return jsonResponse(400, { error: `max ${MAX_IMAGES} images` });
  }

  const images: ImagePayload[] = [];
  for (const raw of body.images) {
    if (!isImagePayload(raw)) {
      return jsonResponse(400, { error: 'each image must have mimeType and base64 data' });
    }
    if (!ALLOWED_MIMES.has(raw.mimeType)) {
      return jsonResponse(400, { error: `unsupported mimeType: ${raw.mimeType}` });
    }
    const approxBytes = (raw.data.length * 3) / 4;
    if (approxBytes > MAX_INLINE_BYTES) {
      return jsonResponse(413, { error: 'image too large; downscale before upload' });
    }
    images.push(raw);
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
            { text: `Description: ${description}` },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        temperature: 0.8,
      },
    });

    const rawText = result.text?.trim() ?? '';
    const text = extractPost(rawText);
    if (!text) {
      return jsonResponse(502, { error: 'Gemini returned an empty response' });
    }

    const sources: GroundingSource[] = [];
    const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    for (const c of chunks) {
      if (c.web?.uri) {
        sources.push({ title: c.web.title ?? c.web.uri, uri: c.web.uri });
      }
    }

    return jsonResponse(200, { draft: text, sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(502, { error: `Gemini request failed: ${message}` });
  }
}
