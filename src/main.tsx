import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initMobileApp, isNativeMobile } from './utils/mobileApp';

// Initialize Capacitor native mobile capabilities (Android Back button, Dark Status Bar, Haptics)
initMobileApp();

// Automatically attach unique device identifier & resolve API endpoint for Android APK
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  const REMOTE_API_HOST = (import.meta.env.VITE_API_BASE as string) || 'https://nbkristieee.in';

  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    let url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    
    // In native Android APK WebView, route relative /api calls to remote production backend
    if (url && url.startsWith('/api') && isNativeMobile()) {
      url = `${REMOTE_API_HOST.replace(/\/+$/, '')}${url}`;
      input = url;
    }

    if (url && (url.startsWith('/api') || url.includes('/api/'))) {
      let deviceId = '';
      try {
        deviceId = localStorage.getItem('nexusverse_device_id') || '';
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
          localStorage.setItem('nexusverse_device_id', deviceId);
        }
      } catch (e) {}

      if (deviceId) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has('X-Device-Id')) {
          headers.set('X-Device-Id', deviceId);
        }
        init.headers = headers;
      }
    }
    return originalFetch.call(this, input, init);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
