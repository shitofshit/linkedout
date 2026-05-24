/**
 * Shared OAuth helpers for LinkedIn.
 * Used by api/oauth/start.ts, api/oauth/callback.ts, and api/_publish.ts.
 */

export const COOKIE_NAME = 'li_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 55; // 55 days (LinkedIn tokens live ~60 days)

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Build a Set-Cookie header value for storing the LinkedIn access token.
 * Signed with a simple HMAC-SHA-256 prefix so we can detect tampering.
 */
export async function buildTokenCookie(
  token: string,
  secret: string,
): Promise<string> {
  const sig = await hmacSign(token, secret);
  const value = `${sig}.${token}`;
  const encoded = encodeURIComponent(value);
  return [
    `${COOKIE_NAME}=${encoded}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // Secure only in production (localhost is http)
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * Read and verify the LinkedIn access token from the Cookie header.
 * Returns the raw token string, or null if missing/invalid.
 */
export async function readTokenFromCookie(
  req: Request,
  secret: string,
): Promise<string | null> {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...rest] = c.trim().split('=');
      return [k, decodeURIComponent(rest.join('='))];
    }),
  );

  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;

  const dotIdx = raw.indexOf('.');
  if (dotIdx === -1) return null;

  const sig = raw.slice(0, dotIdx);
  const token = raw.slice(dotIdx + 1);

  const expected = await hmacSign(token, secret);
  if (sig !== expected) return null;

  return token;
}

/**
 * Build a Set-Cookie header that clears the token cookie.
 */
export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// HMAC-signed OAuth state — stateless CSRF token
// ---------------------------------------------------------------------------

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Build a state string of the form `<nonce>.<expiresAt>.<hmac>`. */
export async function signState(secret: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const exp = Date.now() + STATE_TTL_MS;
  const payload = `${nonce}.${exp}`;
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

/** Verify a state string. Returns true if signature valid and not expired. */
export async function verifyState(state: string, secret: string): Promise<boolean> {
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacSign(`${nonce}.${exp}`, secret);
  return sig === expected;
}

// ---------------------------------------------------------------------------
// HMAC-SHA-256 (Web Crypto, works in Edge runtime)
// ---------------------------------------------------------------------------

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bufToHex(sig);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// LinkedIn API constants
// ---------------------------------------------------------------------------

export const LI_API_BASE = 'https://api.linkedin.com';
export const LI_VERSION = '202605'; // YYYYMM — bump if LinkedIn rejects
export const LI_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
export const LI_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const LI_SCOPE = 'openid profile email w_member_social';

// ---------------------------------------------------------------------------
// JSON response helper
// ---------------------------------------------------------------------------

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
