const CACHE_NAME = 'adminku-v4'; // Versi dinaikkan untuk memaksa pembaruan cache antarmuka

const ASSETS_TO_CACHE = [
    './', 
    './index.html', 
    './css/style.css', 
    './css/dashboard.css',
    './js/app.js',
    './js/auth.js',
    './js/crypto.js',
    './js/dashboard.js',
    './js/faq.js',
    './js/form.js',
    './js/reminder.js',
    './js/settings.js',
    './js/storage.js',
    './js/sync.js',
    './js/theme.js',
    './js/utils.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    // Membersihkan cache versi lama
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
