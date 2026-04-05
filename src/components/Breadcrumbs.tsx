/**
 * VISÃO - Dynamic Breadcrumbs
 * Auto-generates breadcrumb trail from current route
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
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
  '/recognition-logs': 'Logs de Reconhecimento',
  '/recognition-analytics': 'Analytics de Reconhecimento',
  '/stream-settings': 'Config. de Stream',
  '/telegram-settings': 'Config. Telegram',
  '/notification-settings': 'Notificações',
  '/automation-rules': 'Automação',
  '/profile': 'Perfil',
  '/help': 'Ajuda',
  '/panic-events': 'Eventos de Pânico',
  '/productivity': 'Produtividade',
  '/behavior-detection': 'Comportamento',
  '/journey-reports': 'Jornada',
  '/collaborator-flow': 'Fluxo de Colaboradores',
  '/goals-alerts': 'Metas e Alertas',
  '/users': 'Gestão de Usuários',
};

const ROUTE_CATEGORIES: Record<string, string> = {
  '/cameras': 'Monitoramento',
  '/zones': 'Monitoramento',
  '/recordings': 'Monitoramento',
  '/alerts': 'Segurança',
  '/panic-events': 'Segurança',
  '/ppe': 'Segurança',
  '/face-recognition': 'Inteligência',
  '/license-plate': 'Inteligência',
  '/heatmap': 'Inteligência',
  '/behavior-detection': 'Inteligência',
  '/people': 'Gestão',
  '/users': 'Administração',
  '/settings': 'Sistema',
  '/security': 'Sistema',
  '/stream-settings': 'Sistema',
  '/telegram-settings': 'Sistema',
  '/notification-settings': 'Sistema',
  '/automation-rules': 'Sistema',
  '/reports': 'Análise',
  '/analytics': 'Análise',
  '/recognition-analytics': 'Análise',
  '/recognition-logs': 'Análise',
  '/productivity': 'Análise',
  '/journey-reports': 'Análise',
  '/collaborator-flow': 'Análise',
  '/goals-alerts': 'Análise',
};

// Legacy interface for backward compatibility
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // If explicit items are passed, use legacy mode
  if (items && items.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
        <Link to="/dashboard" className="hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" />
        </Link>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" aria-hidden="true" />
            {item.href ? (
              <Link to={item.href} className="hover:text-foreground transition-colors truncate max-w-[180px]">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[180px]" aria-current="page">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    );
  }

  // Auto-generate mode from current route
  if (currentPath === '/dashboard' || currentPath === '/') return null;

  const category = ROUTE_CATEGORIES[currentPath];
  const currentLabel = ROUTE_LABELS[currentPath];

  if (!currentLabel) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      <Link
        to="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted/50"
        aria-label="Ir para Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {category && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
          <span className="text-muted-foreground text-xs uppercase tracking-wider">{category}</span>
        </>
      )}
      <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
      <span className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
        {currentLabel}
      </span>
    </nav>
  );
};

export function PageTitle({ className }: { className?: string }) {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname];

  if (!label || location.pathname === '/dashboard') return null;

  return (
    <h1 className={cn('text-lg font-semibold text-foreground hidden lg:block', className)}>
      {label}
    </h1>
  );
}

export default Breadcrumbs;
