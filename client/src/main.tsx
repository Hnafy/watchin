import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './styles/globals.css';

// --- Web Share Target / Install prompt support ---
// Make the site installable as a PWA and surface an install button.
let deferredPrompt: any = null;
const emitInstall = (available: boolean) => {
  window.dispatchEvent(new CustomEvent('pwa-install', { detail: { available } }));
};
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  emitInstall(true);
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  emitInstall(false);
});

// Expose a helper to manually trigger install from anywhere.
(window as any).watchinInstall = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    return true;
  }
  return false;
};

// Register the service worker (offline + PWA support).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);
