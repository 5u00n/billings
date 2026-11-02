import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Cache only build assets. API responses and authentication stay network-only.
const files = (await readdir('dist', { recursive: true }))
  .filter((file) => file === 'index.html' || file === 'manifest.webmanifest' || /^(assets|icons)\/.+\.(js|css|png|svg|woff2?)$/.test(file))
  .sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(`dist/${file}`));
const version = hash.digest('hex').slice(0, 16);
const urls = files.map((file) => `/${file}`);
await writeFile('dist/sw.js', `
const CACHE_PREFIX = 'billings-shell-';
const CACHE = CACHE_PREFIX + '${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
// Let a new version wait until existing app windows close, avoiding mixed builds.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key))
  )));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() =>
      caches.open(CACHE).then((cache) => cache.match('/index.html'))
    ));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) =>
      (await cache.match(url.pathname)) || fetch(request)
    ));
  }
});
`);
console.log(`Built service worker: ${files.length} app assets (${version})`);
