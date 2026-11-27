/* L&M Tire service worker: network first, so the site is always fresh online,
   with a saved copy of the page shell so phone numbers and hours still open offline. */
const CACHE = 'lm-tire-v5';
const SHELL = ['./', 'index.html', 'assets/app.css', 'assets/app.js', 'assets/logo.webp', 'assets/hero-poster.webp', 'assets/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin || r.url.endsWith('.mp4') || r.url.endsWith('.mp3')) return;
  e.respondWith(fetch(r).then(res => { if (res.ok && SHELL.some(p => r.url.endsWith(p.replace('./', '')) || r.mode === 'navigate')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
