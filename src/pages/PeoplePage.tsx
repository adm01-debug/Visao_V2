/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Colaboradores / Pessoas
 * 
 * Funcionalidades:
 * - Lista de pessoas cadastradas
 * - Cadastro com foto e encoding facial
 * - Gestão de listas (whitelist, blacklist, VIP, etc)
 * - Histórico de reconhecimentos
 * - Controle de acesso (horários, câmeras)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Camera,
  Clock,
  Shield,
  AlertTriangle,
  Eye,
  Ban,
  Star,
  Briefcase,
  UserCheck,
  Upload,
  Trash2,
  Edit,
  RefreshCw,
  ScanFace,
  History,
  CheckCircle,
  XCircle,
  Building2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  LayoutGrid,
  List,
  Download,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  CardDescription,
  CardHeader,
  CardTitle,
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

// ============================================
// TIPOS
// ============================================

type ListType = 'whitelist' | 'blacklist' | 'vip' | 'employee' | 'visitor' | 'contractor' | 'unknown';
type PersonStatus = 'active' | 'inactive' | 'blocked' | 'pending';
type ViewMode = 'grid' | 'list';

interface Person {
  id: string;
  name: string;
  document?: string;
  document_type?: string;
  email?: string;
  phone?: string;
  company?: string;
  department?: string;
  role?: string;
  list_type: ListType;
  status: PersonStatus;
  photo_url?: string;
  training_photos?: string[];
  face_encoding?: number[];
  encoding_quality?: number;
  tags?: string[];
  notes?: string;
  access_schedule?: any;
  allowed_cameras?: string[];
  last_seen_at?: string;
  last_seen_camera_name?: string;
  recognition_count: number;
  created_at: string;
  updated_at: string;
}

interface RecognitionLog {
  id: string;
  camera_id: string;
  camera_name: string;
  person_id?: string;
  person_name?: string;
  list_type?: ListType;
  similarity: number;
  is_known: boolean;
  action?: string;
  face_snapshot?: string;
  created_at: string;
}

interface Filters {
  search: string;
  listType: string;
  status: string;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const listTypeConfig: Record<ListType, { label: string; color: string; bgColor: string; icon: any }> = {
  whitelist: { label: 'Lista Branca', color: 'text-green-500', bgColor: 'bg-green-500', icon: CheckCircle },
  blacklist: { label: 'Lista Negra', color: 'text-red-500', bgColor: 'bg-red-500', icon: Ban },
  vip: { label: 'VIP', color: 'text-yellow-500', bgColor: 'bg-yellow-500', icon: Star },
  employee: { label: 'Funcionário', color: 'text-blue-500', bgColor: 'bg-blue-500', icon: Briefcase },
  visitor: { label: 'Visitante', color: 'text-purple-500', bgColor: 'bg-purple-500', icon: UserCheck },
  contractor: { label: 'Terceirizado', color: 'text-orange-500', bgColor: 'bg-orange-500', icon: Building2 },
  unknown: { label: 'Desconhecido', color: 'text-gray-500', bgColor: 'bg-gray-500', icon: Users },
};

const statusConfig: Record<PersonStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'text-green-500' },
  inactive: { label: 'Inativo', color: 'text-gray-500' },
  blocked: { label: 'Bloqueado', color: 'text-red-500' },
  pending: { label: 'Pendente', color: 'text-yellow-500' },
};

// ============================================
// COMPONENTE: Person Card (Grid View)
// ============================================

interface PersonCardProps {
  person: Person;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PersonCard({ person, onView, onEdit, onDelete }: PersonCardProps) {
  const listConfig = listTypeConfig[person.list_type];
  const statusCfg = statusConfig[person.status];
  const ListIcon = listConfig.icon;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all group"
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={person.photo_url} />
            <AvatarFallback className="text-lg bg-primary/10">
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{person.name}</h3>
              <Badge 
                variant="secondary" 
                className={cn('text-xs', listConfig.color)}
              >
                <ListIcon className="w-3 h-3 mr-1" />
                {listConfig.label}
              </Badge>
            </div>

            {person.role && (
              <p className="text-sm text-muted-foreground truncate">{person.role}</p>
            )}

            {person.company && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                {person.company}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className={statusCfg.color}>{statusCfg.label}</span>
              <span className="flex items-center gap-1">
                <ScanFace className="w-3 h-3" />
                {person.recognition_count}
              </span>
              {person.last_seen_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(person.last_seen_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              )}
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
  person?: Person | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Person>) => Promise<void>;
}

function PersonFormDialog({ person, isOpen, onClose, onSave }: PersonFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Person>>({
    name: '',
    document: '',
    email: '',
    phone: '',
    company: '',
    department: '',
    role: '',
    list_type: 'visitor',
    status: 'active',
    notes: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingEncoding, setIsGeneratingEncoding] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        document: person.document || '',
        email: person.email || '',
        phone: person.phone || '',
        company: person.company || '',
        department: person.department || '',
        role: person.role || '',
        list_type: person.list_type,
        status: person.status,
        notes: person.notes || '',
      });
      setPhotoPreview(person.photo_url || null);
    } else {
      setFormData({
        name: '',
        document: '',
        email: '',
        phone: '',
        company: '',
        department: '',
        role: '',
        list_type: 'visitor',
        status: 'active',
        notes: '',
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [person, isOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateFaceEncoding = async (imageBase64: string): Promise<number[] | null> => {
    setIsGeneratingEncoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-face-encoding', {
        body: { imageBase64: imageBase64.split(',')[1] },
      });

      if (error) throw error;
      if (data.success && data.encoding) {
        toast.success(`Encoding facial gerado (qualidade: ${Math.round(data.quality * 100)}%)`);
        return data.encoding;
      }
      return null;
    } catch (error) {
      console.error('Erro ao gerar encoding:', error);
      toast.error('Erro ao gerar encoding facial');
      return null;
    } finally {
      setIsGeneratingEncoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      let photo_url = person?.photo_url;
      let face_encoding = person?.face_encoding;
      let encoding_quality = person?.encoding_quality;

      // Upload da foto se houver nova
      if (photoFile && photoPreview) {
        const fileName = `${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('face-photos')
          .upload(fileName, photoFile);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('face-photos')
          .getPublicUrl(fileName);
        
        photo_url = publicUrl;

        // Gerar encoding facial
        const encoding = await generateFaceEncoding(photoPreview);
        if (encoding) {
          face_encoding = encoding;
          encoding_quality = 0.85; // Valor estimado
        }
      }

      await onSave({ 
        ...formData, 
        photo_url, 
        face_encoding,
        encoding_quality,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {person ? 'Editar Pessoa' : 'Cadastrar Pessoa'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para {person ? 'atualizar' : 'cadastrar'} a pessoa no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Foto */}
          <div className="md:col-span-1 flex flex-col items-center gap-4">
            <Avatar className="w-32 h-32">
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
            {isGeneratingEncoding && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Gerando encoding facial...
              </p>
            )}
          </div>

          {/* Dados */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label htmlFor="document">Documento</Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => setFormData(f => ({ ...f, document: e.target.value }))}
                  placeholder="CPF, RG, etc"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(f => ({ ...f, company: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>

              <div>
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))}
                  placeholder="Setor/Departamento"
                />
              </div>

              <div>
                <Label htmlFor="role">Cargo</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))}
                  placeholder="Cargo/Função"
                />
              </div>

              <div>
                <Label htmlFor="list_type">Tipo de Lista</Label>
                <Select
                  value={formData.list_type}
                  onValueChange={(v) => setFormData(f => ({ ...f, list_type: v as ListType }))}
                >
                  <SelectTrigger id="list_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(listTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData(f => ({ ...f, status: v as PersonStatus }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isGeneratingEncoding}>
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
  person: Person | null;
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
  const [recognitionLogs, setRecognitionLogs] = useState<RecognitionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

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

  const listConfig = listTypeConfig[person.list_type];
  const statusCfg = statusConfig[person.status];
  const ListIcon = listConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={person.photo_url} />
              <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span>{person.name}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn('text-white text-xs', listConfig.bgColor)}>
                  <ListIcon className="w-3 h-3 mr-1" />
                  {listConfig.label}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', statusCfg.color)}>
                  {statusCfg.label}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="access">Acesso</TabsTrigger>
            <TabsTrigger value="history">
              Histórico
              {recognitionLogs.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {recognitionLogs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                {person.document && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Documento</Label>
                    <p className="font-medium">{person.document}</p>
                  </div>
                )}
                {person.email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <p className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      {person.email}
                    </p>
                  </div>
                )}
                {person.phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      {person.phone}
                    </p>
                  </div>
                )}
                {person.company && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Empresa</Label>
                    <p className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      {person.company}
                    </p>
                  </div>
                )}
                {person.department && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Departamento</Label>
                    <p>{person.department}</p>
                  </div>
                )}
                {person.role && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cargo</Label>
                    <p>{person.role}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Reconhecimentos</Label>
                  <p className="flex items-center gap-1">
                    <ScanFace className="w-3 h-3 text-muted-foreground" />
                    {person.recognition_count} vezes
                  </p>
                </div>
                {person.last_seen_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Última vez visto</Label>
                    <p className="flex items-center gap-1 text-sm">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {format(new Date(person.last_seen_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {person.last_seen_camera_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Camera className="w-3 h-3" />
                        {person.last_seen_camera_name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Encoding Quality */}
              {person.encoding_quality !== undefined && person.encoding_quality > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Qualidade do Encoding Facial</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <ScanFace className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            'h-full rounded-full transition-all',
                            person.encoding_quality > 0.7 ? 'bg-green-500' :
                            person.encoding_quality > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${person.encoding_quality * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(person.encoding_quality * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {person.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{person.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t">
                Cadastrado em {format(new Date(person.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </TabsContent>

            {/* Access Tab */}
            <TabsContent value="access" className="space-y-4 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Controle de Acesso</CardTitle>
                  <CardDescription>
                    Configurações de horário e câmeras permitidas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Verificação de Horário</p>
                      <p className="text-xs text-muted-foreground">
                        Restringe acesso por horário configurado
                      </p>
                    </div>
                    <Badge variant={person.access_schedule?.enabled ? 'default' : 'secondary'}>
                      {person.access_schedule?.enabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Câmeras Permitidas</p>
                      <p className="text-xs text-muted-foreground">
                        {person.allowed_cameras?.length 
                          ? `${person.allowed_cameras.length} câmeras configuradas`
                          : 'Todas as câmeras (sem restrição)'}
                      </p>
                    </div>
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="m-0">
              {loadingLogs ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : recognitionLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum reconhecimento registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recognitionLogs.map(log => (
                    <div 
                      key={log.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      {log.face_snapshot ? (
                        <img 
                          src={log.face_snapshot} 
                          alt="Snapshot"
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ScanFace className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Camera className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">
                            {log.camera_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(log.similarity * 100)}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
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
// COMPONENTE PRINCIPAL: PeoplePage
// ============================================

export function PeoplePage() {
  // Estado
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    listType: 'all',
    status: 'all',
  });
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Person | null>(null);
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
          person.email,
          person.phone,
          person.company,
          person.department,
          person.role,
          person.document,
        ].filter(Boolean).map(f => f!.toLowerCase());
        
        if (!searchFields.some(f => f.includes(query))) {
          return false;
        }
      }

      // List type
      if (filters.listType !== 'all' && person.list_type !== filters.listType) {
        return false;
      }

      // Status
      if (filters.status !== 'all' && person.status !== filters.status) {
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
    employees: people.filter(p => p.list_type === 'employee').length,
    visitors: people.filter(p => p.list_type === 'visitor').length,
    blacklist: people.filter(p => p.list_type === 'blacklist').length,
    active: people.filter(p => p.status === 'active').length,
  }), [people]);

  // Handlers
  const handleSave = async (data: Partial<Person>) => {
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
            recognition_count: 0,
          });
        
        if (error) throw error;
      }
      
      loadPeople();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const handleDelete = async (person: Person) => {
    try {
      const { error } = await supabase
        .from('registered_persons')
        .delete()
        .eq('id', person.id);
      
      if (error) throw error;
      
      toast.success('Pessoa excluída');
      loadPeople();
      setSelectedPerson(null);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  };

  const openEdit = (person: Person) => {
    setEditingPerson(person);
    setIsFormOpen(true);
    setSelectedPerson(null);
  };

  const openCreate = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  // Loading
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Button onClick={openCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastrar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Funcionários</p>
                <p className="text-2xl font-bold text-blue-500">{stats.employees}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Visitantes</p>
                <p className="text-2xl font-bold text-purple-500">{stats.visitors}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Lista Negra</p>
                <p className="text-2xl font-bold text-red-500">{stats.blacklist}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, empresa..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.listType}
          onValueChange={(v) => setFilters(f => ({ ...f, listType: v }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(listTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', config.bgColor)} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className={config.color}>{config.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.search || filters.listType !== 'all' || filters.status !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilters({ search: '', listType: 'all', status: 'all' })}
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}

        <div className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        Mostrando {paginatedPeople.length} de {filteredPeople.length} pessoas
      </div>

      {/* People Grid/List */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma pessoa encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.search || filters.listType !== 'all' || filters.status !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece cadastrando a primeira pessoa'}
          </p>
          <Button onClick={openCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastrar pessoa
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedPeople.map(person => (
            <PersonCard
              key={person.id}
              person={person}
              onView={() => setSelectedPerson(person)}
              onEdit={() => openEdit(person)}
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
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reconhecimentos</TableHead>
                <TableHead>Última vez visto</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPeople.map(person => {
                const listConfig = listTypeConfig[person.list_type];
                const statusCfg = statusConfig[person.status];
                const ListIcon = listConfig.icon;
                
                return (
                  <TableRow 
                    key={person.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={person.photo_url} />
                          <AvatarFallback className="text-xs">
                            {person.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{person.name}</p>
                          {person.role && (
                            <p className="text-xs text-muted-foreground">{person.role}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', listConfig.color)}>
                        <ListIcon className="w-3 h-3 mr-1" />
                        {listConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {person.company || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={cn('text-sm', statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {person.recognition_count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {person.last_seen_at 
                        ? formatDistanceToNow(new Date(person.last_seen_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedPerson(person); 
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation(); 
                            openEdit(person); 
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setDeleteConfirm(person); 
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            Próxima
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <PersonFormDialog
        person={editingPerson}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPerson(null);
        }}
        onSave={handleSave}
      />

      <PersonDetailsDialog
        person={selectedPerson}
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onEdit={() => {
          if (selectedPerson) openEdit(selectedPerson);
        }}
        onDelete={() => {
          if (selectedPerson) setDeleteConfirm(selectedPerson);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deleteConfirm} 
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.name}</strong>?
              Esta ação não pode ser desfeita e todo o histórico de reconhecimentos será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PeoplePage;
