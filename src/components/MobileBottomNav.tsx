/**
 * VISÃO - Navegação Inferior Mobile
 * Navegação fixa para dispositivos móveis com acesso rápido
 */

import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  Bell, 
  Users,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/hooks/useAlerts';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

function MobileBottomNavComponent() {
  const location = useLocation();
  const { unreadCount } = useAlerts();

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Camera, label: 'Câmeras', path: '/cameras' },
    { icon: Bell, label: 'Alertas', path: '/alerts', badge: unreadCount },
    { icon: Users, label: 'Pessoas', path: '/people' },
    { icon: Settings, label: 'Config', path: '/settings' },
  ];

  const isActive = (path: string) => 
    location.pathname === path || 
    (path !== '/dashboard' && location.pathname.startsWith(path));

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-background/95 backdrop-blur-lg border-t',
        'safe-area-inset-bottom'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px] relative',
                'transition-colors duration-200',
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Indicador ativo */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary" />
              )}
              
              <div className="relative">
                <Icon className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  active && 'scale-110'
                )} />
                
                {/* Badge de notificação */}
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className={cn(
                      'absolute -top-1 -right-2 h-4 min-w-[16px] px-1',
                      'text-[10px] font-bold flex items-center justify-center'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                active && 'font-semibold'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavComponent);
