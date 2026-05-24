import { LI_TOKEN_URL, buildTokenCookie, verifyState } from '../_oauth';

export const config = { runtime: 'edge' };

export default function handler(req: Request): Promise<Response> {
  return handleCallback(req, {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI,
    sessionSecret: process.env.SESSION_SECRET,
  });
}

type Env = {
  clientId: string | undefined;
  clientSecret: string | undefined;
  redirectUri: string | undefined;
  sessionSecret: string | undefined;
};

export async function handleCallback(req: Request, env: Env): Promise<Response> {
  const { clientId, clientSecret, redirectUri, sessionSecret } = env;
  if (!clientId || !clientSecret || !redirectUri || !sessionSecret) {
    return errorPage('Server misconfigured (missing LINKEDIN_* or SESSION_SECRET).');
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    const desc = url.searchParams.get('error_description') ?? oauthError;
    return errorPage(`LinkedIn rejected sign-in: ${desc}`);
  }
  if (!code || !state) {
    return errorPage('Missing code or state on callback.');
  }

  // Verify HMAC-signed state (stateless — no cookie needed).
  const stateOk = await verifyState(state, sessionSecret);
  if (!stateOk) {
    return errorPage('Invalid or expired state. Try signing in again.');
  }

  // Exchange code for access token
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch(LI_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return errorPage(`Token exchange failed (${tokenRes.status}): ${text}`);
  }

  const data = (await tokenRes.json()) as { access_token?: string };
  if (!data.access_token) {
    return errorPage('Token exchange returned no access_token.');
  }

  const tokenCookie = await buildTokenCookie(data.access_token, sessionSecret);

  return new Response(null, {
    status: 302,
    headers: { location: '/', 'set-cookie': tokenCookie },
  });
}

function errorPage(message: string): Response {
  const safe = message.replace(/[<>&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;',
  );
  const html = `<!doctype html><meta charset="utf-8"><title>Sign-in failed</title>
<body style="font-family:system-ui;padding:2rem;max-width:40rem;margin:auto">
<h1>Sign-in failed</h1>
<p>${safe}</p>
<p><a href="/">Back to app</a></p>
</body>`;
  return new Response(html, {
    status: 400,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
