// Service Worker for Reverse Alarm Clock
const CACHE_NAME = 'reverse-alarm-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Background sync for alarms
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-alarm') {
        event.waitUntil(handleBackgroundAlarm());
    }
});

// Handle background alarm
async function handleBackgroundAlarm() {
    try {
        // Show notification
        await self.registration.showNotification('🌙 Reverse Alarm Clock', {
            body: 'Time to wake up and remember to go back to sleep!',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%2300d4ff"/><circle cx="50" cy="50" r="35" fill="%231a1a2e"/><circle cx="50" cy="50" r="25" fill="%2300d4ff"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%2300d4ff"/></svg>',
            tag: 'reverse-alarm',
            requireInteraction: true,
            actions: [
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23ff6b6b" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
                }
            ]
        });
        
        // Play a simple beep sound using Web Audio API
        playBackgroundSound();
        
    } catch (error) {
        console.error('Error handling background alarm:', error);
    }
}

// Play background sound
function playBackgroundSound() {
    // Create a simple beep sound
    const audioContext = new (self.AudioContext || self.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'dismiss') {
        // Handle dismiss action
        console.log('Alarm dismissed via notification');
        return;
    }
    
    // Open the app when notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // If app is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // If app is not open, open it
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event.notification.tag);
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-alarms') {
        event.waitUntil(checkAlarms());
    }
});

// Check for pending alarms
async function checkAlarms() {
    try {
        // This would typically check with the main app for pending alarms
        // For now, we'll just log that we're checking
        console.log('Checking for pending alarms...');
    } catch (error) {
        console.error('Error checking alarms:', error);
    }
}

// Handle push notifications (if implemented)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        event.waitUntil(
            self.registration.showNotification('🌙 Reverse Alarm Clock', {
                body: data.message || 'Time to wake up and remember to go back to sleep!',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%2300d4ff"/><circle cx="50" cy="50" r="35" fill="%231a1a2e"/><circle cx="50" cy="50" r="25" fill="%2300d4ff"/></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%2300d4ff"/></svg>',
                tag: 'reverse-alarm',
                requireInteraction: true
            })
        );
    }
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Take control of all clients immediately
    event.waitUntil(self.clients.claim());
});

console.log('Reverse Alarm Clock Service Worker loaded'); 