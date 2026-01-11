import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ============================================
// REGISTRO DO SERVICE WORKER (PWA)
// ============================================

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      if (registration.installing) {
        if (import.meta.env.DEV) console.log('[SW] Service Worker installing');
      } else if (registration.waiting) {
        if (import.meta.env.DEV) console.log('[SW] Service Worker installed, waiting to activate');
      } else if (registration.active) {
        if (import.meta.env.DEV) console.log('[SW] Service Worker active');
      }

      // Verificar atualizações periodicamente
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // A cada hora

      // Listener para atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível
              if (import.meta.env.DEV) console.log('[SW] New version available');
              
              // Notificar usuário (opcional)
              if (window.confirm('Nova versão disponível! Deseja atualizar?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

    } catch (error) {
      if (import.meta.env.DEV) console.error('[SW] Registration failed:', error);
    }
  }
};

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

createRoot(document.getElementById("root")!).render(<StrictMode>
    <App />
  </StrictMode>);

// ============================================
// INICIALIZAÇÃO APÓS RENDER
// ============================================

// Registrar Service Worker em produção
if (import.meta.env.PROD) {
  registerServiceWorker();
}

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
