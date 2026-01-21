const CACHE_NAME = 'tirva-admin-v1';
const urlsToCache = [
  '/',
  '/admin',
  '/manifest.json',
  '/generated-icon.png'
];

self.addEventListener('install', (event) => {
  console.log('?? Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Skip caching for Vite dev server requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/@') || 
      url.pathname.endsWith('.tsx') || 
      url.pathname.endsWith('.ts') ||
      url.pathname.includes('/@react-refresh') ||
      url.pathname.includes('/@vite/') ||
      url.hostname === 'localhost' && url.port === '5174') {
    return; // Let browser handle these requests normally
  }

  // Skip caching for API requests, external resources, and Supabase
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('github.com') ||
      url.hostname.includes('supabase.co') ||
      url.hostname.includes('fly.dev')) {
    return; // Don't cache dynamic API calls or external resources
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Try to fetch, but handle failures gracefully
        return fetch(event.request).catch((error) => {
          console.warn('?? Service Worker: Fetch failed for', url.pathname, '- returning offline response');
          // Return a basic response for navigation requests when offline
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          throw error;
        });
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  console.log('?? Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Handle background sync for offline orders
self.addEventListener('sync', (event) => {
  console.log('?? Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('?? Service Worker: Push notification received:', event.data?.text());
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      data: data.data,
      requireInteraction: true,
      persistent: true,
      silent: false,
      tag: 'order-notification-' + Date.now(),
      actions: [
        {
          action: 'accept',
          title: '? Accept Order'
        },
        {
          action: 'decline',
          title: '? Decline Order'
        },
        {
          action: 'view',
          title: '??? View Details'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('?? Service Worker: Notification clicked:', event.action);
  
  event.notification.close();

  const orderId = event.notification.data?.orderId;

  if (event.action === 'accept' && orderId) {
    // Send message to main app to accept order
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'ACCEPT_ORDER',
            orderId: orderId
          });
          clients[0].focus();
        } else {
          clients.openWindow('/admin?action=accept&orderId=' + orderId);
        }
      })
    );
  } else if (event.action === 'decline' && orderId) {
    // Send message to main app to decline order
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'DECLINE_ORDER',
            orderId: orderId
          });
          clients[0].focus();
        } else {
          clients.openWindow('/admin?action=decline&orderId=' + orderId);
        }
      })
    );
  } else if (event.action === 'view' || !event.action) {
    // Open the app and navigate to orders
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          clients.openWindow('/admin');
        }
      })
    );
  }
});

// Keep connection alive for realtime updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    console.log('?? Service Worker: Keep alive message received');
    // Send response back to keep connection active
    event.ports[0].postMessage({ type: 'KEEP_ALIVE_RESPONSE' });
  }
});

// Background sync function
async function syncOrders() {
  try {
    console.log('?? Service Worker: Syncing orders in background...');
    
    // Get offline orders from IndexedDB if any
    // This would be implemented based on your offline storage strategy
    
    // For now, just log that sync is happening
    console.log('?? Service Worker: Background sync completed');
    
    return Promise.resolve();
  } catch (error) {
    console.error('?? Service Worker: Background sync failed:', error);
    throw error;
  }
}