/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Colaboradores / Pessoas
 */

export default function PeoplePage() {
  // Re-export the component
}

export { PeoplePage };

// Rest of the original file follows below after removing duplicate declaration
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Colaboradores / Pessoas
 * 
 * Funcionalidades simplificadas para alinhamento com schema do banco:
 * - Lista de pessoas cadastradas
 * - Cadastro com foto
 * - Gestão básica
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  RefreshCw,
  ScanFace,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  X,
  Upload,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

// ============================================
// TIPOS - Alinhados com schema do banco
// ============================================

type DbPerson = Tables<'registered_persons'>;
type DbPersonInsert = TablesInsert<'registered_persons'>;
type DbRecognitionLog = Tables<'recognition_logs'>;

type ViewMode = 'grid' | 'list';

interface Filters {
  search: string;
  activeOnly: boolean;
}

// ============================================
// COMPONENTE: Person Card (Grid View)
// ============================================

interface PersonCardProps {
  person: DbPerson;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PersonCard({ person, onView, onEdit, onDelete }: PersonCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all group"
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={person.photo_url || undefined} />
            <AvatarFallback className="text-lg bg-primary/10">
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{person.name}</h3>
              <Badge 
                variant={person.is_active ? 'default' : 'secondary'}
                className="text-xs"
              >
                {person.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {person.role && (
              <p className="text-sm text-muted-foreground truncate">{person.role}</p>
            )}

            {person.department && (
              <p className="text-xs text-muted-foreground mt-1">
                {person.department}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>
                Cadastrado: {formatDistanceToNow(new Date(person.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE: Person Form Dialog
// ============================================

interface PersonFormDialogProps {
  person?: DbPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DbPersonInsert>) => Promise<void>;
}

function PersonFormDialog({ person, isOpen, onClose, onSave }: PersonFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    role: '',
    is_active: true,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        department: person.department || '',
        role: person.role || '',
        is_active: person.is_active,
      });
      setPhotoPreview(person.photo_url || null);
    } else {
      setFormData({
        name: '',
        department: '',
        role: '',
        is_active: true,
      });
      setPhotoPreview(null);
    }
  }, [person, isOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({ 
        ...formData, 
        photo_url: photoPreview || person?.photo_url,
      });
      onClose();
      toast.success(person ? 'Pessoa atualizada' : 'Pessoa cadastrada');
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {person ? 'Editar Pessoa' : 'Cadastrar Pessoa'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para {person ? 'atualizar' : 'cadastrar'} a pessoa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Foto */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={photoPreview || undefined} />
              <AvatarFallback className="text-2xl">
                {formData.name?.charAt(0) || 'P'}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="photo" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Upload className="w-4 h-4" />
                {photoPreview ? 'Alterar foto' : 'Adicionar foto'}
              </div>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </Label>
          </div>

          {/* Dados */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))}
                placeholder="Ex: TI, RH, Operações"
              />
            </div>

            <div>
              <Label htmlFor="role">Cargo</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))}
                placeholder="Ex: Analista, Gerente"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Pessoa ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE: Person Details Dialog
// ============================================

interface PersonDetailsDialogProps {
  person: DbPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PersonDetailsDialog({
  person,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PersonDetailsDialogProps) {
  const [recognitionLogs, setRecognitionLogs] = useState<DbRecognitionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (person && isOpen) {
      loadRecognitionLogs();
    }
  }, [person, isOpen]);

  const loadRecognitionLogs = async () => {
    if (!person) return;
    setLoadingLogs(true);
    try {
      const { data } = await supabase
        .from('recognition_logs')
        .select('*')
        .eq('person_id', person.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setRecognitionLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!person) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={person.photo_url || undefined} />
              <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span>{person.name}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={person.is_active ? 'default' : 'secondary'} className="text-xs">
                  {person.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico ({recognitionLogs.length})</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="info" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Departamento</Label>
                  <p className="font-medium">{person.department || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cargo</Label>
                  <p className="font-medium">{person.role || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cadastrado em</Label>
                  <p className="font-medium">
                    {format(new Date(person.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Última atualização</Label>
                  <p className="font-medium">
                    {format(new Date(person.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              {loadingLogs ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : recognitionLogs.length > 0 ? (
                <div className="space-y-2">
                  {recognitionLogs.map(log => (
                    <div 
                      key={log.id}
                      className={cn(
                        'p-3 rounded-lg border-l-4',
                        log.recognized 
                          ? 'border-l-green-500 bg-green-500/5' 
                          : 'border-l-red-500 bg-red-500/5'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.recognized ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium">
                            {log.recognized ? 'Reconhecido' : 'Não reconhecido'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      {log.confidence && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Confiança: {Math.round(log.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScanFace className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum reconhecimento registrado</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function PeoplePage() {
  const { user } = useAuth();
  
  // Estado
  const [people, setPeople] = useState<DbPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    activeOnly: false,
  });
  const [selectedPerson, setSelectedPerson] = useState<DbPerson | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<DbPerson | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DbPerson | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  // Carregar dados
  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  // Filtrar pessoas
  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const searchFields = [
          person.name,
          person.department,
          person.role,
        ].filter(Boolean).map(f => f!.toLowerCase());
        
        if (!searchFields.some(f => f.includes(query))) {
          return false;
        }
      }

      // Active only
      if (filters.activeOnly && !person.is_active) {
        return false;
      }

      return true;
    });
  }, [people, filters]);

  // Paginação
  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const paginatedPeople = filteredPeople.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => ({
    total: people.length,
    active: people.filter(p => p.is_active).length,
    inactive: people.filter(p => !p.is_active).length,
  }), [people]);

  // Handlers
  const handleSave = async (data: Partial<DbPersonInsert>) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    try {
      if (editingPerson) {
        // Update
        const { error } = await supabase
          .from('registered_persons')
          .update(data)
          .eq('id', editingPerson.id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('registered_persons')
          .insert({
            ...data,
            name: data.name!,
            user_id: user.id,
          });
        
        if (error) throw error;
      }
      
      loadPeople();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      const { error } = await supabase
        .from('registered_persons')
        .delete()
        .eq('id', deleteConfirm.id);
      
      if (error) throw error;
      
      toast.success('Pessoa excluída');
      setDeleteConfirm(null);
      setSelectedPerson(null);
      loadPeople();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Colaboradores
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} pessoas cadastradas • {stats.active} ativos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPeople}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo ou departamento..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="activeOnly"
            checked={filters.activeOnly}
            onCheckedChange={(checked) => setFilters(f => ({ ...f, activeOnly: checked }))}
          />
          <Label htmlFor="activeOnly" className="text-sm">Apenas ativos</Label>
        </div>

        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">Nenhuma pessoa encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {filters.search ? 'Tente ajustar os filtros de busca' : 'Comece cadastrando colaboradores'}
          </p>
          <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastrar Pessoa
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPeople.map(person => (
            <PersonCard
              key={person.id}
              person={person}
              onView={() => setSelectedPerson(person)}
              onEdit={() => { setEditingPerson(person); setIsFormOpen(true); }}
              onDelete={() => setDeleteConfirm(person)}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPeople.map(person => (
                <TableRow key={person.id} className="cursor-pointer" onClick={() => setSelectedPerson(person)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={person.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {person.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{person.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{person.department || '-'}</TableCell>
                  <TableCell>{person.role || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={person.is_active ? 'default' : 'secondary'}>
                      {person.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPerson(person); setIsFormOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(person); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Próximo
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <PersonFormDialog
        person={editingPerson}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingPerson(null); }}
        onSave={handleSave}
      />

      <PersonDetailsDialog
        person={selectedPerson}
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onEdit={() => { setEditingPerson(selectedPerson); setIsFormOpen(true); setSelectedPerson(null); }}
        onDelete={() => { setDeleteConfirm(selectedPerson); setSelectedPerson(null); }}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
