/// <reference lib="webworker" />

/**
 * SmartAccess Service Worker
 *
 * Implements a cache-first strategy for static assets and network-first
 * for API calls. Enables offline support and faster subsequent loads.
 */

const CACHE_NAME = 'smartaccess-v2';
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/login',
    '/manifest.json',
];

const API_CACHE_NAME = 'smartaccess-api-v1';
const API_CACHE_MAX_AGE = 60 * 1000; // 1 minute

// Type assertion for service worker scope
const sw = self as unknown as ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Install — pre-cache static assets
// ---------------------------------------------------------------------------
sw.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => sw.skipWaiting())
    );
});

// ---------------------------------------------------------------------------
// Activate — clean old caches
// ---------------------------------------------------------------------------
sw.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => sw.clients.claim())
    );
});

// ---------------------------------------------------------------------------
// Fetch — strategy routing
// ---------------------------------------------------------------------------
sw.addEventListener('fetch', (event: FetchEvent) => {
    const url = new URL(event.request.url);

    // API calls and HTML Navigation → network-first
    if (url.pathname.startsWith('/api/') || url.pathname === '/health' || event.request.mode === 'navigate') {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // WebSocket — pass through
    if (event.request.headers.get('upgrade') === 'websocket') {
        return;
    }

    // Static assets (CSS/JS) → cache-first
    event.respondWith(cacheFirst(event.request));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function cacheFirst(request: Request): Promise<Response> {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Offline fallback — return cached dashboard page
        const fallback = await caches.match('/dashboard');
        return fallback || new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request: Request): Promise<Response> {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Fallback to cached API response
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// ---------------------------------------------------------------------------
// Background Sync for offline event retry
// ---------------------------------------------------------------------------
sw.addEventListener('sync', (event: SyncEvent) => {
    if (event.tag === 'retry-events') {
        event.waitUntil(retryPendingEvents());
    }
});

async function retryPendingEvents(): Promise<void> {
    // In a production setup, this would read from IndexedDB
    // and replay queued retries against the backend API
    console.log('[SW] Background sync: retry-events triggered');
}

// ---------------------------------------------------------------------------
// Push notifications (future use)
// ---------------------------------------------------------------------------
sw.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() ?? { title: 'SmartAccess', body: 'New alert' };

    event.waitUntil(
        sw.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: data.tag ?? 'smartaccess-alert',
            data: data.url ?? '/dashboard',
        })
    );
});

sw.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();
    const url = event.notification.data || '/dashboard';

    event.waitUntil(
        sw.clients.matchAll({ type: 'window' })
            .then((clients) => {
                for (const client of clients) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                return sw.clients.openWindow(url);
            })
    );
});
