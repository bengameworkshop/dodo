// Service worker de Dodo : ouverture hors ligne et clic sur les rappels.
const CACHE = 'dodo-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const remember = (req, res) => {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const firebaseLib = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!sameOrigin && !firebaseLib) return;

  if (firebaseLib) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => remember(req, res))));
    return;
  }
  e.respondWith(
    fetch(req)
      .then(res => remember(req, res))
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});

// Appui sur une notification : ouvre l'appli ; le bouton « Terminer » termine la sieste ou la nuit.
self.addEventListener('notificationclick', e => {
  const action = e.action;
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (action) c.postMessage({ do: action });
      if ('focus' in c) return c.focus();
    }
    return self.clients.openWindow(action ? './?do=' + action : './');
  }));
});
