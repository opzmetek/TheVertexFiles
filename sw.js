const CACHE_NAME = 'the-vertex-cache-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Install - downloading files...');

      try {
        const response = await fetch('./files.txt');
        const data = (await response.text()).trim().split(/\s+/);

        if (data && Array.isArray(data)) {
          console.log('[SW] Finded ' + data.length + ' game files.');
          await cache.addAll(data);
        } else {
          console.warn('[SW] Error: cannot fetch game files.');
        }
      } catch (err) {
        console.error('[SW] Cannot fetch files.txt:', err);
      }

      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

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
        console.warn('[SW] Offline – cannot fetch:', event.request.url);
        return caches.match('/');
      });
    })
  );
});
