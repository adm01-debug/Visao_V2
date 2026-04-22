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
    })
    .catch(() => {
      // Silencioso: não há SW para limpar
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

startCLSMonitor();
installMobileNavGuard();

createRoot(document.getElementById("root")!).render(<StrictMode>
    <App />
  </StrictMode>);

// Solicitar permissão de notificações após 5 segundos
setTimeout(() => {
  requestNotificationPermission();
}, 5000);

// ============================================
// PERFORMANCE MONITORING (Opcional)
// ============================================

// Report Web Vitals
if (import.meta.env.DEV) {
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS(import.meta.env.DEV ? console.log : () => {});
    onFID(import.meta.env.DEV ? console.log : () => {});
    onFCP(import.meta.env.DEV ? console.log : () => {});
    onLCP(import.meta.env.DEV ? console.log : () => {});
    onTTFB(import.meta.env.DEV ? console.log : () => {});
  }).catch(() => {
    // web-vitals não instalado, ignorar
  });
}
