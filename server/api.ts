import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
  return json(res, 404, { error: 'not_found' });
}

export function pawgressApiPlugin(): Plugin {
  return {
    name: 'pawgress-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        void handleApiRequest(req, res);
      });
    },
  };
}
