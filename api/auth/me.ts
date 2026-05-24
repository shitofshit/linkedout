import { LI_API_BASE, clearTokenCookie, jsonResponse, readTokenFromCookie } from '../_oauth';

export const config = { runtime: 'edge' };

export default function handler(req: Request): Promise<Response> {
  return handleMe(req, process.env.SESSION_SECRET);
}

export async function handleMe(
  req: Request,
  sessionSecret: string | undefined,
): Promise<Response> {
  if (!sessionSecret) {
    return jsonResponse(500, { error: 'Server missing SESSION_SECRET' });
  }

  const token = await readTokenFromCookie(req, sessionSecret);
  if (!token) {
    return jsonResponse(200, { authed: false });
  }

  // Validate the token by hitting LinkedIn's /v2/userinfo (OpenID Connect).
  // If it 401s, clear the cookie so the UI shows the sign-in button again.
  const res = await fetch(`${LI_API_BASE}/v2/userinfo`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ authed: false }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'set-cookie': clearTokenCookie(),
      },
    });
  }

  const info = (await res.json()) as {
    sub?: string;
    name?: string;
    picture?: string;
    email?: string;
  };

  return jsonResponse(200, {
    authed: true,
    sub: info.sub,
    name: info.name,
    picture: info.picture,
    email: info.email,
  });
}
