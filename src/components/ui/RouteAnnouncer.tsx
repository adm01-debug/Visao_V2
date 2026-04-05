/**
 * Screen reader route announcer
 * Announces page changes to assistive technology
 */

import { useEffect, useState } from 'react';
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
};

export function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const title = ROUTE_TITLES[location.pathname];
    if (title) {
      setAnnouncement(`Navegou para ${title}`);
    }
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
}
