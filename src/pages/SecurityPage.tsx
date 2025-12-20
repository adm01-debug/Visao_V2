/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Segurança
 * 
 * Funcionalidades:
 * - Logs de auditoria
 * - Controle de acesso
 * - Blacklist/Whitelist
 * - Eventos de segurança
 * - Configurações de segurança
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  User,
  UserX,
  UserCheck,
  Users,
  Clock,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Activity,
  LogIn,
  LogOut,
  Settings,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  Ban,
  Check,
  X,
  FileText,
  Camera,
  MapPin,
  Fingerprint,
  ScanFace,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type LogLevel = 'info' | 'warning' | 'error' | 'critical';
type LogCategory = 'auth' | 'access' | 'system' | 'camera' | 'alert' | 'config' | 'user';
type AccessStatus = 'granted' | 'denied' | 'pending';
type ListType = 'whitelist' | 'blacklist' | 'watchlist';

interface AuditLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface AccessEvent {
  id: string;
  timestamp: string;
  personId: string;
  personName: string;
  personPhoto?: string;
  status: AccessStatus;
  location?: string;
  cameraId?: string;
  cameraName?: string;
  confidence?: number;
  reason?: string;
}

interface SecurityPerson {
  id: string;
  name: string;
  photo?: string;
  listType: ListType;
  reason?: string;
  addedAt: string;
  addedBy?: string;
  expiresAt?: string;
}

interface SecurityStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  accessGranted: number;
  accessDenied: number;
  blacklistCount: number;
  whitelistCount: number;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const logLevelConfig: Record<LogLevel, { icon: any; color: string; bgColor: string; label: string }> = {
  info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Aviso' },
  error: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Erro' },
  critical: { icon: ShieldAlert, color: 'text-red-600', bgColor: 'bg-red-600/10', label: 'Crítico' },
};

const categoryConfig: Record<LogCategory, { icon: any; label: string }> = {
  auth: { icon: Key, label: 'Autenticação' },
  access: { icon: Lock, label: 'Acesso' },
  system: { icon: Settings, label: 'Sistema' },
  camera: { icon: Camera, label: 'Câmera' },
  alert: { icon: AlertTriangle, label: 'Alerta' },
  config: { icon: Settings, label: 'Configuração' },
  user: { icon: User, label: 'Usuário' },
};

const listTypeConfig: Record<ListType, { icon: any; color: string; bgColor: string; label: string }> = {
  whitelist: { icon: ShieldCheck, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Liberado' },
  blacklist: { icon: ShieldOff, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Bloqueado' },
  watchlist: { icon: Eye, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Monitorado' },
};

// ============================================
// COMPONENTE: Log Row
// ============================================

interface LogRowProps {
  log: AuditLog;
  onViewDetails: () => void;
}

function LogRow({ log, onViewDetails }: LogRowProps) {
  const levelConfig = logLevelConfig[log.level];
  const catConfig = categoryConfig[log.category];
  const LevelIcon = levelConfig.icon;
  const CatIcon = catConfig.icon;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onViewDetails}>
      <TableCell className="w-[180px]">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs">
            {format(new Date(log.timestamp), "dd/MM HH:mm:ss")}
          </span>
        </div>
      </TableCell>
      <TableCell className="w-[100px]">
        <Badge variant="outline" className={cn('text-xs', levelConfig.color)}>
          <LevelIcon className="w-3 h-3 mr-1" />
          {levelConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="w-[120px]">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CatIcon className="w-3 h-3" />
          {catConfig.label}
        </div>
      </TableCell>
      <TableCell className="font-medium text-sm">{log.action}</TableCell>
      <TableCell className="max-w-[300px]">
        <p className="text-sm text-muted-foreground truncate">{log.description}</p>
      </TableCell>
      <TableCell className="w-[100px]">
        {log.userName && (
          <div className="flex items-center gap-1 text-xs">
            <User className="w-3 h-3" />
            {log.userName}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// ============================================
// COMPONENTE: Access Event Card
// ============================================

interface AccessEventCardProps {
  event: AccessEvent;
}

function AccessEventCard({ event }: AccessEventCardProps) {
  const isGranted = event.status === 'granted';
  const isDenied = event.status === 'denied';

  return (
    <div className={cn(
      'p-3 rounded-lg border-l-4 transition-colors',
      isGranted && 'border-l-green-500 bg-green-500/5',
      isDenied && 'border-l-red-500 bg-red-500/5',
      !isGranted && !isDenied && 'border-l-yellow-500 bg-yellow-500/5'
    )}>
      <div className="flex items-start gap-3">
        {/* Photo */}
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {event.personPhoto ? (
            <img src={event.personPhoto} alt={event.personName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{event.personName}</span>
            <Badge variant={isGranted ? 'default' : 'destructive'} className="text-xs">
              {isGranted ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
              {isGranted ? 'Liberado' : isDenied ? 'Negado' : 'Pendente'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {event.cameraName && (
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {event.cameraName}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {event.confidence && (
              <span className="flex items-center gap-1">
                <ScanFace className="w-3 h-3" />
                {(event.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {event.reason && (
            <p className="text-xs text-muted-foreground mt-1">{event.reason}</p>
          )}
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function SecurityPage() {
  // Estado
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7d');
  
  // Dados
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [securityPersons, setSecurityPersons] = useState<SecurityPerson[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  
  // Dialogs
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [addPersonDialog, setAddPersonDialog] = useState<ListType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SecurityPerson | null>(null);

  // Form state
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonReason, setNewPersonReason] = useState('');

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Simular logs de auditoria (em produção viria do banco)
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          category: 'auth',
          action: 'Login realizado',
          description: 'Usuário admin realizou login no sistema',
          userName: 'admin',
          ipAddress: '192.168.1.100',
        },
        {
          id: '2',
          timestamp: subDays(new Date(), 0.1).toISOString(),
          level: 'warning',
          category: 'access',
          action: 'Acesso negado',
          description: 'Tentativa de acesso não autorizado detectada',
          userName: 'desconhecido',
          ipAddress: '10.0.0.50',
        },
        {
          id: '3',
          timestamp: subDays(new Date(), 0.2).toISOString(),
          level: 'error',
          category: 'camera',
          action: 'Câmera offline',
          description: 'Câmera "Entrada Principal" ficou offline',
        },
        {
          id: '4',
          timestamp: subDays(new Date(), 0.3).toISOString(),
          level: 'critical',
          category: 'alert',
          action: 'Intruso detectado',
          description: 'Pessoa não autorizada detectada na área restrita',
        },
        {
          id: '5',
          timestamp: subDays(new Date(), 0.5).toISOString(),
          level: 'info',
          category: 'config',
          action: 'Configuração alterada',
          description: 'Configurações de notificação foram atualizadas',
          userName: 'admin',
        },
      ];
      setLogs(mockLogs);

      // Simular eventos de acesso
      const mockAccess: AccessEvent[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          personId: 'p1',
          personName: 'João Silva',
          status: 'granted',
          cameraName: 'Entrada Principal',
          location: 'Portaria',
          confidence: 0.95,
        },
        {
          id: '2',
          timestamp: subDays(new Date(), 0.05).toISOString(),
          personId: 'p2',
          personName: 'Desconhecido',
          status: 'denied',
          cameraName: 'Área Restrita',
          location: 'Depósito',
          confidence: 0.72,
          reason: 'Pessoa não cadastrada',
        },
        {
          id: '3',
          timestamp: subDays(new Date(), 0.1).toISOString(),
          personId: 'p3',
          personName: 'Maria Santos',
          status: 'granted',
          cameraName: 'Recepção',
          location: 'Lobby',
          confidence: 0.98,
        },
      ];
      setAccessEvents(mockAccess);

      // Carregar pessoas das listas
      const { data: persons } = await supabase
        .from('registered_persons')
        .select('*')
        .in('list_type', ['whitelist', 'blacklist', 'watchlist']);

      if (persons) {
        setSecurityPersons(persons.map(p => ({
          id: p.id,
          name: p.name,
          photo: p.photo_url,
          listType: p.list_type as ListType,
          reason: p.notes,
          addedAt: p.created_at,
        })));
      }

      // Stats
      setStats({
        totalLogs: mockLogs.length,
        errorCount: mockLogs.filter(l => l.level === 'error' || l.level === 'critical').length,
        warningCount: mockLogs.filter(l => l.level === 'warning').length,
        accessGranted: mockAccess.filter(a => a.status === 'granted').length,
        accessDenied: mockAccess.filter(a => a.status === 'denied').length,
        blacklistCount: persons?.filter(p => p.list_type === 'blacklist').length || 0,
        whitelistCount: persons?.filter(p => p.list_type === 'whitelist').length || 0,
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de segurança');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!log.action.toLowerCase().includes(query) &&
            !log.description.toLowerCase().includes(query) &&
            !log.userName?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
      return true;
    });
  }, [logs, searchQuery, levelFilter, categoryFilter]);

  // Adicionar pessoa à lista
  const addPersonToList = async () => {
    if (!addPersonDialog || !newPersonName) return;

    try {
      const { data, error } = await supabase
        .from('registered_persons')
        .insert({
          name: newPersonName,
          list_type: addPersonDialog,
          notes: newPersonReason,
        })
        .select()
        .single();

      if (error) throw error;

      setSecurityPersons(prev => [...prev, {
        id: data.id,
        name: data.name,
        listType: addPersonDialog,
        reason: newPersonReason,
        addedAt: data.created_at,
      }]);

      toast.success(`Pessoa adicionada à ${listTypeConfig[addPersonDialog].label}`);
      setAddPersonDialog(null);
      setNewPersonName('');
      setNewPersonReason('');
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar pessoa');
    }
  };

  // Remover pessoa da lista
  const removePersonFromList = async () => {
    if (!deleteConfirm) return;

    try {
      await supabase
        .from('registered_persons')
        .delete()
        .eq('id', deleteConfirm.id);

      setSecurityPersons(prev => prev.filter(p => p.id !== deleteConfirm.id));
      toast.success('Pessoa removida da lista');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao remover:', error);
      toast.error('Erro ao remover pessoa');
    }
  };

  // Exportar logs
  const exportLogs = () => {
    const headers = ['Data/Hora', 'Nível', 'Categoria', 'Ação', 'Descrição', 'Usuário', 'IP'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      log.level,
      log.category,
      log.action,
      log.description,
      log.userName || '',
      log.ipAddress || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-seguranca-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success('Logs exportados');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Segurança
          </h1>
          <p className="text-sm text-muted-foreground">
            Logs de auditoria e controle de acesso
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalLogs}</p>
                <p className="text-xs text-muted-foreground">Total Logs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.errorCount}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.accessGranted}</p>
                <p className="text-xs text-muted-foreground">Acessos Liberados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <UserX className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.accessDenied}</p>
                <p className="text-xs text-muted-foreground">Acessos Negados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.whitelistCount}</p>
                <p className="text-xs text-muted-foreground">Whitelist</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ShieldOff className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blacklistCount}</p>
                <p className="text-xs text-muted-foreground">Blacklist</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">
            <FileText className="w-4 h-4 mr-2" />
            Logs de Auditoria
          </TabsTrigger>
          <TabsTrigger value="access">
            <Lock className="w-4 h-4 mr-2" />
            Controle de Acesso
          </TabsTrigger>
          <TabsTrigger value="lists">
            <Users className="w-4 h-4 mr-2" />
            Listas de Segurança
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos níveis</SelectItem>
                {Object.entries(logLevelConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(log => (
                    <LogRow key={log.id} log={log} onViewDetails={() => setSelectedLog(log)} />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Access Tab */}
        <TabsContent value="access" className="mt-4 space-y-4">
          <div className="grid gap-3">
            {accessEvents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Lock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum evento de acesso registrado</p>
                </CardContent>
              </Card>
            ) : (
              accessEvents.map(event => (
                <AccessEventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddPersonDialog('whitelist')} variant="outline">
              <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
              Adicionar à Whitelist
            </Button>
            <Button onClick={() => setAddPersonDialog('blacklist')} variant="outline">
              <ShieldOff className="w-4 h-4 mr-2 text-red-500" />
              Adicionar à Blacklist
            </Button>
            <Button onClick={() => setAddPersonDialog('watchlist')} variant="outline">
              <Eye className="w-4 h-4 mr-2 text-yellow-500" />
              Adicionar à Watchlist
            </Button>
          </div>

          <div className="grid gap-4">
            {(['whitelist', 'blacklist', 'watchlist'] as ListType[]).map(listType => {
              const config = listTypeConfig[listType];
              const persons = securityPersons.filter(p => p.listType === listType);
              const Icon = config.icon;
              
              return (
                <Card key={listType}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={cn('w-5 h-5', config.color)} />
                      {config.label}
                      <Badge variant="secondary" className="ml-2">{persons.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {persons.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma pessoa nesta lista
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {persons.map(person => (
                          <div 
                            key={person.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {person.photo ? (
                                  <img src={person.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{person.name}</p>
                                {person.reason && (
                                  <p className="text-xs text-muted-foreground">{person.reason}</p>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setDeleteConfirm(person)}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p>{format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nível</Label>
                  <Badge className={logLevelConfig[selectedLog.level].color}>
                    {logLevelConfig[selectedLog.level].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Categoria</Label>
                  <p>{categoryConfig[selectedLog.category].label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ação</Label>
                  <p>{selectedLog.action}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm">{selectedLog.description}</p>
              </div>
              {selectedLog.userName && (
                <div>
                  <Label className="text-muted-foreground">Usuário</Label>
                  <p className="text-sm">{selectedLog.userName}</p>
                </div>
              )}
              {selectedLog.ipAddress && (
                <div>
                  <Label className="text-muted-foreground">IP</Label>
                  <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Person Dialog */}
      <Dialog open={!!addPersonDialog} onOpenChange={() => setAddPersonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar à {addPersonDialog && listTypeConfig[addPersonDialog].label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input 
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Nome da pessoa"
              />
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea 
                value={newPersonReason}
                onChange={(e) => setNewPersonReason(e.target.value)}
                placeholder="Motivo para adicionar à lista"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPersonDialog(null)}>Cancelar</Button>
            <Button onClick={addPersonToList} disabled={!newPersonName}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteConfirm?.name}" da lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removePersonFromList}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SecurityPage;
