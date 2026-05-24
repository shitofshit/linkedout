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
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  const text = await webRes.text();
  res.end(text);
}

export function apiDevPlugin(): Plugin {
  return {
    name: 'linkedout-api-dev',
    configureServer(server) {
      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        try {
          const route = req.url.split('?')[0];
          if (route === '/api/generate') {
            const { handleGenerate } = await server.ssrLoadModule('/api/_generate.ts');
            const body = await readBody(req);
            const webReq = toWebRequest(req, body);
            const webRes = await (handleGenerate as typeof import('./api/_generate').handleGenerate)(
              webReq,
              process.env.GEMINI_API_KEY,
            );
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
