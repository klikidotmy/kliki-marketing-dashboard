// Service worker: app boleh dibuka laju & offline. Data sentiasa cuba ambil yang terbaru dulu.
const VERSION = 'kliki-v1';
const SHELL = ['./', 'index.html', 'assets/style.css', 'assets/app.js', 'manifest.webmanifest',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Data & app code: network dulu (sentiasa terkini), cache bila offline
  const networkFirst = url.pathname.includes('/data/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || e.request.mode === 'navigate';
  if (networkFirst) {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
