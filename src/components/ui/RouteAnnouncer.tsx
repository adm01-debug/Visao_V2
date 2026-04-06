/**
 * Screen reader route announcer
 * Announces page changes to assistive technology via aria-live
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cameras': 'Câmeras',
  '/alerts': 'Alertas',
  '/zones': 'Zonas',
  '/recordings': 'Gravações',
  '/analytics': 'Analytics',
  '/settings': 'Configurações',
  '/security': 'Segurança',
  '/face-recognition': 'Reconhecimento Facial',
  '/license-plate': 'Placas',
  '/heatmap': 'Mapa de Calor',
  '/reports': 'Relatórios',
  '/ppe': 'EPI',
  '/people': 'Pessoas',
  '/profile': 'Perfil',
  '/users': 'Gestão de Usuários',
  '/panic-events': 'Eventos de Pânico',
  '/automation-rules': 'Automação',
  '/notification-settings': 'Notificações',
  '/stream-settings': 'Configurações de Stream',
  '/telegram-settings': 'Configurações Telegram',
  '/behavior-detection': 'Detecção de Comportamento',
  '/recognition-analytics': 'Analytics de Reconhecimento',
  '/recognition-logs': 'Logs de Reconhecimento',
  '/journey-reports': 'Relatórios de Jornada',
  '/goals-alerts': 'Metas e Alertas',
  '/collaborator-flow': 'Fluxo de Colaboradores',
  '/productivity': 'Produtividade',
  '/help': 'Ajuda',
};

export const RouteAnnouncer = React.forwardRef<HTMLDivElement, Record<string, never>>(function RouteAnnouncer(_props, _ref) {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Skip the initial render
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;

    // Try exact match first, then prefix match
    let title = ROUTE_TITLES[location.pathname];
    if (!title) {
      const match = Object.entries(ROUTE_TITLES).find(([path]) =>
        location.pathname.startsWith(path) && path !== '/'
      );
      title = match?.[1];
    }

    if (title) {
      const timer = setTimeout(() => {
        setAnnouncement(`Navegou para ${title}`);
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [location.pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
});

RouteAnnouncer.displayName = 'RouteAnnouncer';
