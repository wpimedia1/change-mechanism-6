import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectTarget } from './routing.mjs';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const files = new Map([['/', 'index.html'], ['/404.html', '404.html'], ['/favicon.svg', 'favicon.svg'], ['/social-preview.png', 'social-preview.png'], ['/robots.txt', 'robots.txt'], ['/sitemap.xml', 'sitemap.xml'], ['/.well-known/security.txt', '.well-known/security.txt']]);
const types = { html: 'text/html; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8' };
export async function createApp() {
  const text = await readFile(resolve(root, '_headers'), 'utf8');
  const headers = Object.fromEntries(text.split('\n').filter(l => l.startsWith('  ')).map(l => { const i = l.indexOf(':'); return [l.slice(2,i), l.slice(i+1).trim()]; }));
  return http.createServer(async (req,res) => {
    try {
      const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
      const redirect = redirectTarget(url, { enforceHttps: false });
      if (redirect) { res.writeHead(308, { ...headers, Location: redirect }); return res.end(); }
      const known = files.has(url.pathname) && ['GET','HEAD'].includes(req.method) && url.pathname !== '/404.html';
      const file = known ? files.get(url.pathname) : '404.html';
      const data = await readFile(resolve(root,file));
      res.writeHead(known ? 200 : 404, { ...headers, 'Content-Type': types[file.split('.').at(-1)], 'Cache-Control': 'no-cache, no-transform', ...(!known ? { 'X-Robots-Tag':'noindex' } : {}) });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(500, { 'Content-Type':'text/plain', 'X-Robots-Tag':'noindex' }); res.end('Unable to serve this request.'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = await createApp(); app.listen(Number(process.env.PORT || 4174), process.env.HOST || '127.0.0.1');
}
