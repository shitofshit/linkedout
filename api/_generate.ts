import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './_prompt';

const MAX_IMAGES = 5;
const MAX_WHAT = 500;
const MAX_TAKEAWAY = 240;
const MAX_CTA = 160;
const MAX_HASHTAGS = 160;
const MAX_INLINE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_TONES = new Set(['', 'professional', 'casual', 'inspirational', 'technical']);
const DEFAULT_MODEL = 'gemini-2.5-flash';

type GenerateRequest = {
  brief?: unknown;
  images?: unknown;
};

type Brief = {
  whatHappened: string;
  takeaway: string;
  tone: string;
  callToAction: string;
  hashtags: string;
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

function formatBrief(b: Brief): string {
  const lines: string[] = [];
  lines.push(`What happened: ${b.whatHappened}`);
  if (b.takeaway) lines.push(`Key takeaway: ${b.takeaway}`);
  if (b.tone) lines.push(`Tone: ${b.tone}`);
  if (b.callToAction) lines.push(`Call to action: ${b.callToAction}`);
  if (b.hashtags) lines.push(`Hashtags to use: ${b.hashtags}`);
  return lines.join('\n');
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

  const briefRaw = body.brief;
  if (!briefRaw || typeof briefRaw !== 'object') {
    return jsonResponse(400, { error: 'brief is required' });
  }
  const b = briefRaw as Record<string, unknown>;
  const whatHappened = typeof b.whatHappened === 'string' ? b.whatHappened.trim() : '';
  const takeaway = typeof b.takeaway === 'string' ? b.takeaway.trim() : '';
  const tone = typeof b.tone === 'string' ? b.tone.trim() : '';
  const callToAction = typeof b.callToAction === 'string' ? b.callToAction.trim() : '';
  const hashtags = typeof b.hashtags === 'string' ? b.hashtags.trim() : '';

  if (!whatHappened) return jsonResponse(400, { error: 'whatHappened is required' });
  if (whatHappened.length > MAX_WHAT) return jsonResponse(400, { error: `whatHappened must be <= ${MAX_WHAT} chars` });
  if (takeaway.length > MAX_TAKEAWAY) return jsonResponse(400, { error: `takeaway must be <= ${MAX_TAKEAWAY} chars` });
  if (callToAction.length > MAX_CTA) return jsonResponse(400, { error: `callToAction must be <= ${MAX_CTA} chars` });
  if (hashtags.length > MAX_HASHTAGS) return jsonResponse(400, { error: `hashtags must be <= ${MAX_HASHTAGS} chars` });
  if (!ALLOWED_TONES.has(tone)) return jsonResponse(400, { error: `unsupported tone: ${tone}` });

  const brief: Brief = { whatHappened, takeaway, tone, callToAction, hashtags };

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
            { text: formatBrief(brief) },
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
