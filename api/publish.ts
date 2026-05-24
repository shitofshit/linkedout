import { LI_API_BASE, LI_VERSION, jsonResponse, readTokenFromCookie } from './_oauth';

export const config = { runtime: 'edge' };

export default function handler(req: Request): Promise<Response> {
  return handlePublish(req, process.env.SESSION_SECRET);
}

type ImagePayload = {
  mimeType: string;
  /** base64-encoded image bytes */
  data: string;
};

type PublishBody = {
  text: string;
  images?: ImagePayload[];
};

const MAX_IMAGES = 5;
const MAX_TEXT_CHARS = 3000;

export async function handlePublish(
  req: Request,
  sessionSecret: string | undefined,
): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }
  if (!sessionSecret) {
    return jsonResponse(500, { error: 'Server missing SESSION_SECRET' });
  }

  const token = await readTokenFromCookie(req, sessionSecret);
  if (!token) {
    return jsonResponse(401, { error: 'Not signed in to LinkedIn' });
  }

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const text = (body.text ?? '').trim();
  const images = body.images ?? [];

  if (!text) return jsonResponse(400, { error: 'Post text is required' });
  if (text.length > MAX_TEXT_CHARS)
    return jsonResponse(400, { error: `Post exceeds ${MAX_TEXT_CHARS} chars` });
  if (images.length > MAX_IMAGES)
    return jsonResponse(400, { error: `Max ${MAX_IMAGES} images` });

  // 1. Get the author URN ("urn:li:person:{sub}") from /v2/userinfo.
  const sub = await fetchAuthorSub(token);
  if (!sub) return jsonResponse(401, { error: 'Failed to resolve LinkedIn identity' });
  const author = `urn:li:person:${sub}`;

  // 2. Upload each image (initialize → PUT bytes) and collect image URNs.
  const imageUrns: string[] = [];
  for (const img of images) {
    try {
      const urn = await uploadImage(token, author, img);
      imageUrns.push(urn);
    } catch (e) {
      return jsonResponse(502, {
        error: `Image upload failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // 3. Create the post.
  try {
    const postUrn = await createPost(token, author, text, imageUrns);
    return jsonResponse(200, { ok: true, postUrn });
  } catch (e) {
    return jsonResponse(502, {
      error: `Create post failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

// ---------------------------------------------------------------------------
// LinkedIn API calls
// ---------------------------------------------------------------------------

async function fetchAuthorSub(token: string): Promise<string | null> {
  const res = await fetch(`${LI_API_BASE}/v2/userinfo`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { sub?: string };
  return data.sub ?? null;
}

async function uploadImage(
  token: string,
  author: string,
  img: ImagePayload,
): Promise<string> {
  // Step A — initializeUpload
  const initRes = await fetch(
    `${LI_API_BASE}/rest/images?action=initializeUpload`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'linkedin-version': LI_VERSION,
        'x-restli-protocol-version': '2.0.0',
      },
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    },
  );
  if (!initRes.ok) {
    throw new Error(`initializeUpload ${initRes.status}: ${await initRes.text()}`);
  }
  const initData = (await initRes.json()) as {
    value: { uploadUrl: string; image: string };
  };
  const { uploadUrl, image: imageUrn } = initData.value;

  // Step B — PUT raw bytes to uploadUrl
  const bytes = base64ToBytes(img.data);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': img.mimeType || 'application/octet-stream',
    },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`PUT image ${putRes.status}: ${await putRes.text()}`);
  }

  return imageUrn;
}

async function createPost(
  token: string,
  author: string,
  text: string,
  imageUrns: string[],
): Promise<string> {
  const post: Record<string, unknown> = {
    author,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (imageUrns.length === 1) {
    post.content = { media: { id: imageUrns[0] } };
  } else if (imageUrns.length > 1) {
    post.content = {
      multiImage: {
        images: imageUrns.map((id) => ({ id })),
      },
    };
  }

  const res = await fetch(`${LI_API_BASE}/rest/posts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'linkedin-version': LI_VERSION,
      'x-restli-protocol-version': '2.0.0',
    },
    body: JSON.stringify(post),
  });

  if (!res.ok && res.status !== 201) {
    throw new Error(`POST /rest/posts ${res.status}: ${await res.text()}`);
  }

  // LinkedIn returns the post URN in the x-restli-id header.
  return res.headers.get('x-restli-id') ?? '';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
