import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/tokens.css'
import './styles/tokens-v2.css'
import './styles/quick-polish.css'
import './styles/modern-buttons.css'
import './styles/animations.css'
import './styles/forced-improvements.css'
import './styles/floating-effects.css'
import AppRoutes from './AppRoutes.jsx'
import './lib/set-vh.js'
import { RootBoundary } from './components/RootBoundary.tsx'
import { BusinessProvider } from './contexts/BusinessProfile.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { PreferencesProvider } from './contexts/PreferencesContext.tsx'
import { StaffProvider } from './contexts/StaffContext.tsx'
import { initializeErrorMonitoring } from './utils/errorMonitoring';

// Bypass landing page - go directly to app for development
localStorage.setItem('hasVisited', 'true');

// Register service worker for offline support (Phase 2)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service worker registered:', registration.scope);

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[SW] New service worker found, installing...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('[SW] New version available! Reload to update.');

              // Optionally show a notification to user
              if (confirm('A new version of Storehouse is available. Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[SW] Service worker registration failed:', error);
      });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] New service worker activated');
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] Message from service worker:', event.data);

      if (event.data && event.data.type === 'SYNC_QUEUE') {
        // Service worker is requesting queue sync
        console.log('[SW] Background sync requested');

        // Trigger queue processing in your app
        window.dispatchEvent(new CustomEvent('processPendingQueue'));
      }
    });
  });

  // Register background sync when coming back online
  window.addEventListener('online', () => {
    console.log('[SW] Connection restored, registering background sync');

    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('sync-queue');
      }).then(() => {
        console.log('[SW] Background sync registered');
      }).catch((err) => {
        console.error('[SW] Background sync registration failed:', err);
      });
    }
  });
}

// Initialize error monitoring
initializeErrorMonitoring();
console.log('[Main] Error monitoring initialized');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StaffProvider>
            <BusinessProvider>
              <PreferencesProvider>
                <AppRoutes />
              </PreferencesProvider>
            </BusinessProvider>
          </StaffProvider>
        </AuthProvider>
      </BrowserRouter>
    </RootBoundary>
  </StrictMode>,
)
