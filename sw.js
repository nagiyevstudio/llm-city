// Сервис-воркер парка: сайт ставится на телефон как приложение и открывается без сети.
// Свои файлы — сначала из сети (данные парка обновляются), при обрыве — сохранённая копия.
// Three.js с CDN закреплён по версии и не меняется, поэтому его берём из кэша.
const CACHE = 'model-park-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'src/styles.css', 'src/main.js', 'src/anim.js', 'src/shoot.js',
  'data/models.json', 'assets/icons/icon.svg', 'assets/icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => save(req, res))
    .catch(() => caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
