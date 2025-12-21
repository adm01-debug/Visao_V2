/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: Sidebar
 * 
 * Navegação lateral do sistema com:
 * - Sheet mobile (drawer)
 * - Toggle de tema
 * - Responsividade completa
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
  Shield,
  HardHat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeProvider';

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
    badge: 0,
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
    label: 'Logs Reconhec.',
    icon: Activity,
    path: '/recognition-logs',
  },
  {
    label: 'Zonas',
    icon: Target,
    path: '/zones',
  },
  {
    label: 'Placas',
    icon: Car,
    path: '/license-plate',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
  },
  {
    label: 'Segurança',
    icon: Shield,
    path: '/security',
  },
  {
    label: 'EPIs',
    icon: HardHat,
    path: '/ppe',
  },
  {
    label: 'Heatmap',
    icon: Flame,
    path: '/heatmap',
  },
];

const bottomNavItems: NavItem[] = [
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
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Persistir estado do collapse
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  // Fechar mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Simular contagem de alertas
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  // Atualizar badge de alertas
  const getItemBadge = (item: NavItem) => {
    if (item.path === '/alerts') {
      return alertCount > 0 ? alertCount : undefined;
    }
    return item.badge;
  };

  // Renderizar item de navegação
  const renderNavItem = (item: NavItem, closeMobile?: boolean) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path || 
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    const badge = getItemBadge(item);

    const handleClick = () => {
      if (closeMobile) {
        setMobileOpen(false);
      }
    };

    const content = (
      <NavLink
        to={item.path}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
          collapsed && !closeMobile && 'justify-center px-2'
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
        {(!collapsed || closeMobile) && (
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

    if (collapsed && !closeMobile) {
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

  // Conteúdo compartilhado da sidebar
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      'flex flex-col h-full bg-card',
      !isMobile && 'border-r',
      !isMobile && (collapsed ? 'w-16' : 'w-64'),
      'transition-all duration-300'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b',
        collapsed && !isMobile ? 'justify-center' : 'justify-between'
      )}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">VISÃO</span>
          </div>
        )}
        {collapsed && !isMobile && <Eye className="w-6 h-6 text-primary" />}
        
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', collapsed && 'hidden md:flex')}
            onClick={toggleCollapsed}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <TooltipProvider>
          <nav className="space-y-1">
            {mainNavItems.map(item => renderNavItem(item, isMobile))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-3 border-t space-y-1">
        <TooltipProvider>
          {bottomNavItems.map(item => renderNavItem(item, isMobile))}
        </TooltipProvider>
        
        <Separator className="my-2" />
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size={(collapsed && !isMobile) ? 'icon' : 'default'}
          className={cn(
            'w-full',
            (!collapsed || isMobile) && 'justify-start gap-3'
          )}
          onClick={toggleTheme}
          title={resolvedTheme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          {(!collapsed || isMobile) && (
            <span>{resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </Button>
        
        {/* Status indicator */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50',
          (collapsed && !isMobile) && 'justify-center px-2'
        )}>
          <div className="relative">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-xs text-muted-foreground">Sistema Online</span>
          )}
        </div>

        {/* Help */}
        {(!collapsed || isMobile) ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => {
              localStorage.removeItem('visao-onboarding-v1');
              window.location.reload();
            }}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ver Tour</span>
          </Button>
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
              (collapsed && !isMobile) && 'justify-center px-2'
            )}
            onClick={() => signOut?.()}
          >
            <LogOut className="w-4 h-4" />
            {(!collapsed || isMobile) && <span>Sair</span>}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile - Sheet Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>

      {/* Desktop - Sidebar fixa */}
      <aside className={cn('hidden md:block h-screen sticky top-0', className)}>
        <SidebarContent />
      </aside>
    </>
  );
}

export default Sidebar;

