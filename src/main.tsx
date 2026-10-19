import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically attach unique device identifier to all /api requests for shared Campus Wi-Fi NAT environments
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
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
