/**
 * Brick Breaker - Service Worker
 * Enables offline functionality and PWA features
 */

const CACHE_NAME = 'brick-breaker-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/app.js',
    '/js/i18n.js',
    '/js/sound-engine.js',
    '/js/locales/ko.json',
    '/js/locales/en.json',
    '/js/locales/zh.json',
    '/js/locales/hi.json',
    '/js/locales/ru.json',
    '/js/locales/ja.json',
    '/js/locales/es.json',
    '/js/locales/pt.json',
    '/js/locales/id.json',
    '/js/locales/tr.json',
    '/js/locales/de.json',
    '/js/locales/fr.json',
    '/icon-192.svg',
    '/icon-512.svg'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('Cache addAll failed:', err);
                // Continue even if some assets fail to cache
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached response if found
            if (response) {
                return response;
            }

            // Fetch from network
            return fetch(event.request)
                .then((response) => {
                    // Don't cache if not successful
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Cache successful responses
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    // Return offline page or cached response
                    return caches.match(event.request);
                });
        })
    );
});

// Background sync (future feature)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-stats') {
        event.waitUntil(
            // Sync stats with server
            Promise.resolve()
        );
    }
});
