/* eslint-disable no-console -- Bootstrap autoriza logs de inicialização e SW cleanup. */
// VISÃO - Sistema de Vigilância Inteligente - Main Entry Point
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register push-only SW and start build version watcher
import { startBuildVersionWatcher } from '@/lib/buildVersion';

// ============================================
// SERVICE WORKER — PUSH-ONLY (NO CACHE)
// ============================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    .then((registration) => {
      console.log('[SW] Registered:', registration.scope);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              document.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        }
      });
      // Handle SW_UPDATED messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          const swBuildId = typeof event.data.buildId === 'string' ? event.data.buildId : undefined;
          if (swBuildId && swBuildId !== 'unknown') {
            import('@/lib/buildVersion').then(({ getCurrentBuildId, forceBundleRefresh }) => {
              const current = getCurrentBuildId();
              if (swBuildId !== current) {
                forceBundleRefresh(`sw-updated:${swBuildId}`);
              }
            });
          }
        }
      });
    })
    .catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
}

startBuildVersionWatcher();

// ============================================
// SOLICITAR PERMISSÃO DE NOTIFICAÇÕES
// ============================================

const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (import.meta.env.DEV) console.log('[Notifications] Permission:', permission);
  }
};

// ============================================
// RENDER APP
// ============================================

import { startCLSMonitor } from '@/lib/clsMonitor';
import { installMobileNavGuard } from '@/lib/mobileNavGuard';
import { startPerfMetrics } from '@/lib/perfMetrics';

startCLSMonitor();
installMobileNavGuard();
startPerfMetrics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Solicitar permissão de notificações após 5 segundos
setTimeout(() => {
  requestNotificationPermission();
}, 5000);
