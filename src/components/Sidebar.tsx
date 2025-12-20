/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: Sidebar
 * 
 * Navegação lateral do sistema com toggle de tema
 */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  Bell,
  Users,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogOut,
  Activity,
  Menu,
  X,
  Video,
  ScanFace,
  BarChart3,
  Flame,
  Car,
  Send,
  FileText,
  Moon,
  Sun,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeProvider';
import { RestartTourButton } from '@/components/OnboardingTour';

// ============================================
// TIPOS
// ============================================

interface NavItem {
  label: string;
  icon: any;
  path: string;
  badge?: number | string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface SidebarProps {
  className?: string;
}

// ============================================
// CONFIGURAÇÃO DE NAVEGAÇÃO
// ============================================

const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Câmeras',
    icon: Camera,
    path: '/cameras',
  },
  {
    label: 'Alertas',
    icon: Bell,
    path: '/alerts',
    badge: 0, // Será atualizado dinamicamente
    badgeVariant: 'destructive',
  },
  {
    label: 'Gravações',
    icon: Video,
    path: '/recordings',
  },
  {
    label: 'Colaboradores',
    icon: Users,
    path: '/people',
  },
  {
    label: 'Reconhecimento',
    icon: ScanFace,
    path: '/face-recognition',
  },
  {
    label: 'Logs Facial',
    icon: Eye,
    path: '/recognition-logs',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    path: '/recognition-analytics',
  },
  {
    label: 'Mapa de Calor',
    icon: Flame,
    path: '/heatmap',
  },
  {
    label: 'Placas',
    icon: Car,
    path: '/license-plates',
  },
  {
    label: 'Relatórios',
    icon: FileText,
    path: '/reports',
  },
  {
    label: 'Zonas',
    icon: Target,
    path: '/zones',
  },
];

const bottomNavItems: NavItem[] = [
  {
    label: 'Streams',
    icon: Video,
    path: '/settings/streams',
  },
  {
    label: 'Telegram',
    icon: Send,
    path: '/settings/telegram',
  },
  {
    label: 'Notificações',
    icon: Bell,
    path: '/settings/notifications',
  },
  {
    label: 'Configurações',
    icon: Settings,
    path: '/settings',
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Carregar alertas não lidos
  useEffect(() => {
    // TODO: Integrar com hook de alertas em tempo real
    // Exemplo: const { unreadCount } = useRealtimeAlerts();
    // setUnreadAlerts(unreadCount);
    setUnreadAlerts(3); // Mock
  }, []);

  // Fechar mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Salvar preferência de collapsed
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newValue));
  };

  // Renderizar item de navegação
  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || 
                     (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    const Icon = item.icon;
    const badge = item.path === '/alerts' ? unreadAlerts : item.badge;

    const content = (
      <NavLink
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badge !== undefined && Number(badge) > 0 && (
              <Badge 
                variant={item.badgeVariant || 'secondary'} 
                className="ml-auto text-xs h-5 min-w-[20px] justify-center"
              >
                {typeof badge === 'number' && badge > 99 ? '99+' : badge}
              </Badge>
            )}
          </>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {badge !== undefined && Number(badge) > 0 && (
              <Badge variant={item.badgeVariant || 'secondary'} className="text-xs">
                {badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.path}>{content}</div>;
  };

  // Conteúdo da sidebar
  const sidebarContent = (
    <div className={cn(
      'flex flex-col h-full bg-card border-r',
      collapsed ? 'w-16' : 'w-64',
      'transition-all duration-300'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">VISÃO</span>
          </div>
        )}
        {collapsed && <Eye className="w-6 h-6 text-primary" />}
        
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', collapsed && 'hidden md:flex')}
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <TooltipProvider>
          <nav className="space-y-1">
            {mainNavItems.map(renderNavItem)}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-3 border-t space-y-1">
        <TooltipProvider>
          {bottomNavItems.map(renderNavItem)}
        </TooltipProvider>
        
        <Separator className="my-2" />
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className={cn(
            'w-full',
            !collapsed && 'justify-start gap-3'
          )}
          onClick={toggleTheme}
          title={resolvedTheme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          {!collapsed && (
            <span>{resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </Button>
        
        {/* Status indicator */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50',
          collapsed && 'justify-center px-2'
        )}>
          <div className="relative">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          {!collapsed && (
            <span className="text-xs text-muted-foreground">Sistema Online</span>
          )}
        </div>

        {/* Ver Tour / Ajuda */}
        {!collapsed ? (
          <RestartTourButton className="w-full justify-start" />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={() => {
                  localStorage.removeItem('visao-onboarding-v1');
                  window.location.reload();
                }}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Ver Tour</TooltipContent>
          </Tooltip>
        )}

        {/* User / Logout */}
        {user && (
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3',
              collapsed && 'justify-center px-2'
            )}
            onClick={() => signOut?.()}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden',
          'transform transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - Desktop */}
      <aside className={cn('hidden md:block h-screen sticky top-0', className)}>
        {sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
