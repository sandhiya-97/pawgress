import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './api';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const port = Number(process.env.PORT ?? 3000);
const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) return void handleApiRequest(req, res);
  try {
    const requestedPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.replace(/^\/+/, '');
    const candidate = normalize(join(dist, relativePath));
    const filePath = candidate.startsWith(`${dist}${sep}`) ? candidate : join(dist, 'index.html');
    const body = await readFile(filePath).catch(() => readFile(join(dist, 'index.html')));
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable');
    res.end(body);
  } catch {
    res.statusCode = 500;
    res.end('Pawgress server error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Pawgress server listening on 0.0.0.0:${port}`);
});
