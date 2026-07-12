/* eslint-disable no-console -- Bootstrap autoriza logs de inicialização e SW cleanup. */
// VISÃO - Sistema de Vigilância Inteligente - Main Entry Point
import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ============================================
// LIMPEZA DE SERVICE WORKERS LEGADOS
// ============================================
// PWA foi removido. Desregistra qualquer SW previamente instalado
// para evitar cache stale em navegadores de usuários existentes.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      registrations.forEach((r) => r.unregister());
      if (import.meta.env.DEV && registrations.length > 0) {
        console.log('[PWA cleanup] Unregistered', registrations.length, 'service worker(s)');
      }
    })
    .catch(() => {
      // Silencioso: não há SW para limpar
    });
}

// Limpeza de caches legados do Workbox/PWA
if ('caches' in window) {
  caches.keys()
    .then((keys) => {
      const stale = keys.filter((k) =>
        k.startsWith('workbox-') || k.startsWith('visao-') || k.startsWith('precache-')
      );
      return Promise.all(stale.map((k) => caches.delete(k))).then(() => stale);
    })
    .then((stale) => {
      if (import.meta.env.DEV && stale.length > 0) {
        console.log('[PWA cleanup] Deleted stale caches:', stale);
      }
    })
    .catch(() => {
      // Silencioso
    });
}

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

createRoot(document.getElementById("root")!).render(<StrictMode>
    <App />
  </StrictMode>);

// Solicitar permissão de notificações após 5 segundos
setTimeout(() => {
  requestNotificationPermission();
}, 5000);

