import { memo } from "react";
import { useOnlineStatus, useDocumentTitle } from "@/hooks";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: Header
 * 
 * Header global do sistema com:
 * - Busca global
 * - Notificações
 * - Perfil do usuário
 * - Quick actions
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Camera,
  AlertTriangle,
  Users,
  Target,
  Video,
  BarChart3,
  Shield,
  HelpCircle,
  Command,
  ChevronDown,
  Plus,
  Activity,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type Theme = 'light' | 'dark' | 'system';

interface SearchResult {
  id: string;
  type: 'camera' | 'alert' | 'person' | 'zone' | 'recording';
  title: string;
  subtitle?: string;
  icon: any;
  path: string;
}

interface UserData {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [systemStatus, setSystemStatus] = useState<'online' | 'degraded' | 'offline'>('online');

  // Carregar usuário
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          avatar: authUser.user_metadata?.avatar_url,
          role: 'Administrador',
        });
      }
    };
    getUser();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(open => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Buscar
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results: SearchResult[] = [];
      
      // Buscar câmeras
      const { data: cameras } = await supabase
        .from('cameras')
        .select('id, name, location')
        .ilike('name', `%${query}%`)
        .limit(3);
      
      cameras?.forEach(cam => {
        results.push({
          id: cam.id,
          type: 'camera',
          title: cam.name,
          subtitle: cam.location,
          icon: Camera,
          path: `/cameras?id=${cam.id}`,
        });
      });

      // Buscar alertas
      const { data: alerts } = await supabase
        .from('alerts')
        .select('id, message, type')
        .ilike('message', `%${query}%`)
        .limit(3);
      
      alerts?.forEach(alert => {
        results.push({
          id: alert.id,
          type: 'alert',
          title: alert.message,
          subtitle: alert.type,
          icon: AlertTriangle,
          path: `/alerts?id=${alert.id}`,
        });
      });

      // Buscar pessoas
      const { data: persons } = await supabase
        .from('registered_persons')
        .select('id, name, role')
        .ilike('name', `%${query}%`)
        .limit(3);
      
      persons?.forEach(person => {
        results.push({
          id: person.id,
          type: 'person',
          title: person.name,
          subtitle: person.role,
          icon: Users,
          path: `/people?id=${person.id}`,
        });
      });

      setSearchResults(results);
    } catch (error) {
      
    }
  };

  // Navegar para resultado
  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setCommandOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Quick actions
  const quickActions = [
    { label: 'Dashboard', icon: Monitor, path: '/dashboard', shortcut: 'D' },
    { label: 'Câmeras', icon: Camera, path: '/cameras', shortcut: 'C' },
    { label: 'Alertas', icon: AlertTriangle, path: '/alerts', shortcut: 'A' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', shortcut: 'N' },
    { label: 'Segurança', icon: Shield, path: '/security', shortcut: 'S' },
  ];

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast.success('Logout realizado');
  };

  // Status color
  const statusColor = {
    online: 'bg-green-500',
    degraded: 'bg-yellow-500',
    offline: 'bg-red-500',
  };

  return (
    <TooltipProvider>
      <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: Logo & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg hidden sm:inline">VISÃO</span>
            </div>
            
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            
            <div className="hidden sm:flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full animate-pulse', statusColor[systemStatus])} />
              <span className="text-xs text-muted-foreground">
                Sistema {systemStatus === 'online' ? 'Online' : systemStatus === 'degraded' ? 'Degradado' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-md mx-4">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground font-normal"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Buscar câmeras, alertas, pessoas...</span>
              <span className="sm:hidden">Buscar...</span>
              <kbd className="pointer-events-none ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Add */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Adicionar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/cameras')}>
                  <Camera className="w-4 h-4 mr-2" />
                  Nova Câmera
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/people')}>
                  <Users className="w-4 h-4 mr-2" />
                  Nova Pessoa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/zones')}>
                  <Target className="w-4 h-4 mr-2" />
                  Nova Zona
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              </TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <NotificationsPanel />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium leading-none">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{user?.role || 'Admin'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/security')}>
                    <Shield className="w-4 h-4 mr-2" />
                    Segurança
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Ajuda
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                  <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Command Palette */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput 
            placeholder="Digite para buscar..." 
            value={searchQuery}
            onValueChange={handleSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            
            {searchResults.length > 0 && (
              <CommandGroup heading="Resultados">
                {searchResults.map(result => (
                  <CommandItem 
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    <result.icon className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {result.type}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
            
            <CommandGroup heading="Navegação Rápida">
              {quickActions.map(action => (
                <CommandItem 
                  key={action.path}
                  onSelect={() => {
                    navigate(action.path);
                    setCommandOpen(false);
                  }}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                  <CommandShortcut>⌘{action.shortcut}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Ações">
              <CommandItem onSelect={() => navigate('/cameras')}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Câmera
              </CommandItem>
              <CommandItem onSelect={() => navigate('/people')}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Pessoa
              </CommandItem>
              <CommandItem onSelect={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </header>
    </TooltipProvider>
  );
}

// Helper component for command shortcuts
function CommandShortcut({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-auto text-xs tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

export default Header;
