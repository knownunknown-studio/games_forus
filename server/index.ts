// HTTP server for the built client plus the game WebSocket at /ws.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer } from 'ws';
import { handle, leave, sweep } from './rooms';

const PORT = Number(process.env.PORT ?? 3001);
const DIST = join(import.meta.dirname, '../dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  for (const file of [join(DIST, path), join(DIST, 'index.html')]) {
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      return res.end(body);
    } catch {}
  }
  res.writeHead(404).end('Client not built yet. Run: npm run build');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      handle(ws, JSON.parse(String(data)));
    } catch (e) {
      console.error('Bad message', e);
    }
  });
  ws.on('close', () => leave(ws));
});

setInterval(sweep, 250);
server.listen(PORT, () => console.log(`Two Halves server on http://localhost:${PORT}`));
