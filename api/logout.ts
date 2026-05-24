import { clearTokenCookie } from './_oauth';

export const config = { runtime: 'edge' };

export default function handler(_req: Request): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': clearTokenCookie(),
    },
  });
}

export function handleLogout(_req: Request): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': clearTokenCookie(),
    },
  });
}
