/**
 * VISÃO - Dynamic Breadcrumbs
 * Auto-generates breadcrumb trail from current route with animations
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  '/coverage': 'Cobertura de Testes',
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
  '/coverage': 'Administração',
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

const CATEGORY_PATHS: Record<string, string> = {
  'Monitoramento': '/cameras',
  'Segurança': '/alerts',
  'Inteligência': '/face-recognition',
  'Gestão': '/people',
  'Administração': '/users',
  'Sistema': '/settings',
  'Análise': '/reports',
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

export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs({ items, className }, _ref) {
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
    <AnimatePresence mode="wait">
      <motion.nav
        key={currentPath}
        aria-label="Breadcrumb"
        className={cn('flex items-center gap-1.5 text-sm', className)}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.2 }}
      >
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
            {CATEGORY_PATHS[category] ? (
              <Link to={CATEGORY_PATHS[category]} className="text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-wider font-medium px-1 rounded-md hover:bg-muted/50">
                {category}
              </Link>
            ) : (
              <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{category}</span>
            )}
          </>
        )}
        <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
        <span className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
          {currentLabel}
        </span>
      </motion.nav>
    </AnimatePresence>
  );
});

Breadcrumbs.displayName = 'Breadcrumbs';

const ROUTE_DESCRIPTIONS: Record<string, string> = {
  '/cameras': 'Gerencie e monitore todas as câmeras do sistema',
  '/alerts': 'Visualize e gerencie alertas de segurança em tempo real',
  '/zones': 'Configure zonas de monitoramento e detecção',
  '/recordings': 'Acesse clips e gravações das câmeras',
  '/analytics': 'Análises e métricas do sistema de vigilância',
  '/settings': 'Configure preferências e parâmetros do sistema',
  '/security': 'Regras de segurança e políticas de acesso',
  '/face-recognition': 'Reconhecimento facial e identificação de pessoas',
  '/license-plate': 'Detecção e gestão de placas veiculares',
  '/heatmap': 'Mapa de calor de movimentação e presença',
  '/reports': 'Gere relatórios detalhados do sistema',
  '/ppe': 'Monitoramento de Equipamentos de Proteção Individual',
  '/people': 'Cadastro e gestão de pessoas registradas',
  '/profile': 'Gerencie suas informações pessoais',
  '/users': 'Administre usuários e permissões',
  '/panic-events': 'Monitore eventos de pânico em tempo real',
  '/automation-rules': 'Configure regras de automação',
  '/notification-settings': 'Gerencie canais e regras de notificação',
  '/coverage': 'Percentual de cobertura de testes por arquivo',
};

export const PageTitle = React.forwardRef<HTMLDivElement, { className?: string }>(function PageTitle({ className }, _ref) {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname];

  if (!label || location.pathname === '/dashboard') return null;

  const description = ROUTE_DESCRIPTIONS[location.pathname];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={cn('hidden lg:block', className)}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
      >
        <h1 className="text-lg font-semibold text-foreground leading-tight">
          {label}
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

PageTitle.displayName = 'PageTitle';

export default Breadcrumbs;
