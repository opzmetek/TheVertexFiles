const CACHE_NAME = 'the-vertex-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/game-descriptor.json',
  '/dyt-sans.ttf',
  '/three.module.js',
  '/nipplejs.min.js',
  '/io.js',
  '/heightmap.js'
  
];

// Instalace SW + cache základních souborů
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Instalace – ukládám základní soubory...');
      await cache.addAll(FILES_TO_CACHE);

      // Načtení game-descriptor.json
      try {
        const response = await fetch('game-descriptor.json');
        const data = await response.json();

        if (data && Array.isArray(data.all_files)) {
          console.log('[SW] Nalezeno ' + data.all_files.length + ' herních souborů.');
          await cache.addAll(data.all_files);
        } else {
          console.warn('[SW] game-descriptor.json neobsahuje pole all_files.');
        }
      } catch (err) {
        console.error('[SW] Nelze načíst game-descriptor.json:', err);
      }

      return self.skipWaiting();
    })
  );
});

// Aktivace – vyčištění starých verzí cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Mažu starou cache:', key);
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch handler – offline režim
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Pokud je v cache, vrať ho
      if (cachedResponse) return cachedResponse;

      // Jinak zkus síť a uložit nově stažené soubory
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        console.warn('[SW] Offline – nelze načíst:', event.request.url);
        return caches.match('/');
      });
    })
  );
});
