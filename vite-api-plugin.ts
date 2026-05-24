import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MAX_BODY = 8 * 1024 * 1024;

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function toWebRequest(req: IncomingMessage, body: string): Request {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(', '));
  }
  return new Request(url.toString(), {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  });
}

async function sendWebResponse(res: ServerResponse, webRes: Response): Promise<void> {
  res.statusCode = webRes.status;
  // Headers.getSetCookie() returns each Set-Cookie individually (multiple allowed).
  const setCookies =
    typeof (webRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (webRes.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [];
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return; // handled below
    res.setHeader(key, value);
  });
  if (setCookies.length > 0) res.setHeader('set-cookie', setCookies);
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

type Env = {
  GEMINI_API_KEY?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;
  SESSION_SECRET?: string;
};

export function apiDevPlugin(): Plugin {
  return {
    name: 'linkedout-api-dev',
    configureServer(server) {
      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const env = process.env as Env;

        try {
          const route = req.url.split('?')[0];
          const body = await readBody(req);
          const webReq = toWebRequest(req, body);

          let webRes: Response | null = null;

          if (route === '/api/generate') {
            const mod = await server.ssrLoadModule('/api/_generate.ts');
            webRes = await (mod.handleGenerate as (
              r: Request,
              key: string | undefined,
            ) => Promise<Response>)(webReq, env.GEMINI_API_KEY);
          } else if (route === '/api/oauth/start') {
            const mod = await server.ssrLoadModule('/api/oauth/start.ts');
            webRes = await (mod.handleStart as (
              r: Request,
              env: {
                clientId?: string;
                redirectUri?: string;
                sessionSecret?: string;
              },
            ) => Promise<Response>)(webReq, {
              clientId: env.LINKEDIN_CLIENT_ID,
              redirectUri: env.LINKEDIN_REDIRECT_URI,
              sessionSecret: env.SESSION_SECRET,
            });
          } else if (route === '/api/oauth/callback') {
            const mod = await server.ssrLoadModule('/api/oauth/callback.ts');
            webRes = await (mod.handleCallback as (
              r: Request,
              env: {
                clientId?: string;
                clientSecret?: string;
                redirectUri?: string;
                sessionSecret?: string;
              },
            ) => Promise<Response>)(webReq, {
              clientId: env.LINKEDIN_CLIENT_ID,
              clientSecret: env.LINKEDIN_CLIENT_SECRET,
              redirectUri: env.LINKEDIN_REDIRECT_URI,
              sessionSecret: env.SESSION_SECRET,
            });
          } else if (route === '/api/auth/me') {
            const mod = await server.ssrLoadModule('/api/auth/me.ts');
            webRes = await (mod.handleMe as (
              r: Request,
              s: string | undefined,
            ) => Promise<Response>)(webReq, env.SESSION_SECRET);
          } else if (route === '/api/logout') {
            const mod = await server.ssrLoadModule('/api/logout.ts');
            webRes = (mod.handleLogout as (r: Request) => Response)(webReq);
          } else if (route === '/api/publish') {
            const mod = await server.ssrLoadModule('/api/publish.ts');
            webRes = await (mod.handlePublish as (
              r: Request,
              s: string | undefined,
            ) => Promise<Response>)(webReq, env.SESSION_SECRET);
          }

          if (webRes) {
            await sendWebResponse(res, webRes);
            return;
          }

          res.statusCode = 404;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: `Unknown API route: ${route}` }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }));
        }
      };

      server.middlewares.use(middleware);
    },
  };
}
