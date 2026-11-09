import { mkdir, readFile, writeFile, copyFile, rm, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const FILES = ['index.html', '404.html', 'favicon.svg', 'social-preview.png', 'robots.txt', 'sitemap.xml', '.well-known/security.txt'];
const root = await realpath(new URL('../', import.meta.url));
const output = path.resolve(root, 'dist');
// Refuse unexpected build locations before clearing generated output.
if (output !== path.join(root, 'dist')) throw new Error('Invalid output directory.');
try { if (await realpath(output) !== output) throw new Error('Build directory must not be a symlink.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, '.well-known'), { recursive: true });
const html = (await readFile(path.join(root, 'index.html'), 'utf8')).replaceAll('\r\n', '\n');
const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m => "'sha256-" + createHash('sha256').update(m[1]).digest('base64') + "'");
export const HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self' " + hashes.join(' ') + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src https:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000'
};
for (const file of FILES) await copyFile(path.join(root, file), path.join(output, file));
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, '_headers'), '/*\n' + Object.entries(HEADERS).map(([k,v]) => '  ' + k + ': ' + v).join('\n') + '\n');
console.log('Built seven allowlisted public assets. Private files excluded.');
