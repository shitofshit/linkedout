import { LI_AUTH_URL, LI_SCOPE, signState } from '../_oauth';

export const config = { runtime: 'edge' };

export default function handler(req: Request): Promise<Response> {
  return handleStart(req, {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI,
    sessionSecret: process.env.SESSION_SECRET,
  });
}

type Env = {
  clientId: string | undefined;
  redirectUri: string | undefined;
  sessionSecret: string | undefined;
};

export async function handleStart(req: Request, env: Env): Promise<Response> {
  void req;
  const { clientId, redirectUri, sessionSecret } = env;
  if (!clientId || !redirectUri || !sessionSecret) {
    return new Response(
      'Missing LINKEDIN_CLIENT_ID, LINKEDIN_REDIRECT_URI, or SESSION_SECRET',
      { status: 500 },
    );
  }

  const state = await signState(sessionSecret);

  const url = new URL(LI_AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', LI_SCOPE);

  return new Response(null, {
    status: 302,
    headers: { location: url.toString() },
  });
}
