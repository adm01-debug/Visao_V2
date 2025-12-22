import { EmptyState, ErrorState, LoadingSpinner, StatusBadge, TimeAgo } from "@/components";
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
  Camera,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
import { WebcamCapture } from '@/components/WebcamCapture';

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
        <div role="main" className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={person.photo_url || undefined} />
            <AvatarFallback className="text-lg bg-primary/10">
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div role="main" className="flex-1 min-w-0">
            <div role="main" className="flex items-center gap-2 mb-1">
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

            <div role="main" className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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

import { useStorage, STORAGE_BUCKETS } from '@/hooks/useStorage';
import { useFaceDetection, FaceEncoding } from '@/hooks/useFaceDetection';
import { useI18n } from '@/contexts/i18n';

interface PersonFormDialogProps {
  person?: DbPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DbPersonInsert>) => Promise<void>;
}

function PersonFormDialog({ person, isOpen, onClose, onSave }: PersonFormDialogProps) {
  const storage = useStorage();
  const faceDetection = useFaceDetection();
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    role: '',
    is_active: true,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [faceEncoding, setFaceEncoding] = useState<FaceEncoding | null>(null);
  const [faceValidation, setFaceValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        department: person.department || '',
        role: person.role || '',
        is_active: person.is_active,
      });
      setPhotoPreview(person.photo_url || null);
      setPhotoFile(null);
      // Se já tem encoding salvo, usa ele
      if (person.face_encoding) {
        setFaceEncoding(person.face_encoding as unknown as FaceEncoding);
        setFaceValidation({ valid: true, message: 'Encoding facial existente' });
      } else {
        setFaceEncoding(null);
        setFaceValidation(null);
      }
    } else {
      setFormData({
        name: '',
        department: '',
        role: '',
        is_active: true,
      });
      setPhotoPreview(null);
      setPhotoFile(null);
      setFaceEncoding(null);
      setFaceValidation(null);
    }
    setShowWebcam(false);
    storage.clearError();
    faceDetection.clearError();
  }, [person, isOpen]);

  // Detectar faces automaticamente quando uma foto é selecionada
  const detectFacesInPhoto = async (imageData: string, file: File) => {
    setFaceEncoding(null);
    setFaceValidation(null);
    
    toast.loading('Analisando rosto...', { id: 'face-detection' });
    
    const result = await faceDetection.detectFromBase64(imageData);
    const validation = faceDetection.validateFaceQuality(result);
    setFaceValidation(validation);

    if (validation.valid) {
      const encoding = faceDetection.generateEncoding(result);
      setFaceEncoding(encoding);
      toast.success('Rosto detectado com sucesso!', { id: 'face-detection' });
    } else {
      toast.error(validation.message, { id: 'face-detection' });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate using hook
      const validation = storage.validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      
      if (!validation.valid) {
        toast.error(validation.error || 'Arquivo inválido');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result as string;
        setPhotoPreview(imageData);
        // Detectar faces automaticamente
        await detectFacesInPhoto(imageData, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWebcamCapture = async (imageData: string, file: File) => {
    setPhotoPreview(imageData);
    setPhotoFile(file);
    setShowWebcam(false);
    // Detectar faces automaticamente
    await detectFacesInPhoto(imageData, file);
  };

  // Configurações de validação de qualidade
  const MIN_FACE_QUALITY = 0.5; // 50% de qualidade mínima
  const REQUIRE_FACE_FOR_NEW = true; // Exigir rosto para novos cadastros

  const canSave = useMemo(() => {
    // Se não tem foto, permite salvar (foto é opcional se não for novo cadastro)
    if (!photoFile && !photoPreview) {
      return !REQUIRE_FACE_FOR_NEW || !!person;
    }
    
    // Se tem foto nova, precisa ter validação de rosto válida
    if (photoFile) {
      return faceValidation?.valid === true;
    }
    
    // Se está editando e mantendo foto antiga com encoding existente
    if (person?.face_encoding) {
      return true;
    }
    
    return faceValidation?.valid === true;
  }, [photoFile, photoPreview, faceValidation, person]);

  const getSaveButtonMessage = () => {
    if (faceDetection.isDetecting) {
      return 'Analisando rosto...';
    }
    if (photoFile && !faceValidation) {
      return 'Aguardando análise...';
    }
    if (photoFile && faceValidation && !faceValidation.valid) {
      return 'Foto inválida';
    }
    if (REQUIRE_FACE_FOR_NEW && !person && !photoPreview) {
      return 'Foto obrigatória';
    }
    return 'Salvar';
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Validar qualidade do rosto se tem foto nova
    if (photoFile && (!faceValidation || !faceValidation.valid)) {
      toast.error(faceValidation?.message || 'É necessário uma foto com rosto bem enquadrado');
      return;
    }

    // Validar foto obrigatória para novos cadastros
    if (REQUIRE_FACE_FOR_NEW && !person && !photoPreview) {
      toast.error('Uma foto com rosto é obrigatória para novos cadastros');
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl = person?.photo_url || null;

      // Upload new photo if selected
      if (photoFile) {
        // Delete old photo if updating
        if (person?.photo_url) {
          const oldPath = storage.extractPathFromUrl(STORAGE_BUCKETS.PERSON_PHOTOS, person.photo_url);
          if (oldPath) {
            await storage.remove(STORAGE_BUCKETS.PERSON_PHOTOS, oldPath);
          }
        }
        
        const result = await storage.upload(photoFile, {
          bucket: STORAGE_BUCKETS.PERSON_PHOTOS,
        });
        
        if (!result) {
          toast.error(storage.error || 'Erro ao fazer upload da foto');
          return;
        }
        
        photoUrl = result.url;
      }

      await onSave({ 
        ...formData, 
        photo_url: photoUrl,
        // Salvar encoding facial se disponível (convertido para Json)
        face_encoding: faceEncoding ? JSON.parse(JSON.stringify(faceEncoding)) : null,
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

  const handleRemovePhoto = async () => {
    if (person?.photo_url) {
      const oldPath = storage.extractPathFromUrl(STORAGE_BUCKETS.PERSON_PHOTOS, person.photo_url);
      if (oldPath) {
        await storage.remove(STORAGE_BUCKETS.PERSON_PHOTOS, oldPath);
      }
    }
    setPhotoPreview(null);
    setPhotoFile(null);
    setFaceEncoding(null);
    setFaceValidation(null);
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
          {/* Webcam ou Foto */}
          {showWebcam ? (
            <WebcamCapture
              onCapture={handleWebcamCapture}
              onCancel={() => setShowWebcam(false)}
              quality={0.9}
              maxWidth={800}
              maxHeight={600}
            />
          ) : (
            <div role="main" className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className={cn(
                  "w-24 h-24 ring-2 ring-offset-2",
                  faceValidation?.valid ? "ring-green-500" : 
                  faceValidation && !faceValidation.valid ? "ring-destructive" : 
                  "ring-transparent"
                )}>
                  <AvatarImage src={photoPreview || undefined} />
                  <AvatarFallback className="text-2xl">
                    {formData.name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                {photoPreview && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                    onClick={handleRemovePhoto}
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
                {/* Indicador de detecção facial */}
                {faceDetection.isDetecting && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {!faceDetection.isDetecting && faceValidation?.valid && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                {!faceDetection.isDetecting && faceValidation && !faceValidation.valid && (
                  <div className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
              </div>
              
              <div role="main" className="flex items-center gap-3">
                <Label htmlFor="photo" className="cursor-pointer">
                  <div role="main" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="w-4 h-4" />
                    Upload
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </Label>
                <span className="text-muted-foreground">ou</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWebcam(true)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Webcam
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                JPEG, PNG ou WebP • Máx 5MB
              </p>

              {/* Status da detecção facial */}
              {photoPreview && faceValidation && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  faceValidation.valid 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {faceValidation.valid ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{faceValidation.message}</span>
                </div>
              )}

              {/* Informações do encoding */}
              {faceEncoding && faceEncoding.primaryFace && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1">
                  <div role="main" className="flex items-center gap-2">
                    <ScanFace className="w-3 h-3" />
                    <span>Encoding facial gerado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span>Qualidade: {Math.round(faceEncoding.primaryFace.quality * 100)}%</span>
                    <span>Confiança: {Math.round(faceEncoding.primaryFace.confidence * 100)}%</span>
                    {faceEncoding.primaryFace.attributes?.age && (
                      <span>Idade: ~{faceEncoding.primaryFace.attributes.age} anos</span>
                    )}
                    {faceEncoding.primaryFace.attributes?.gender && faceEncoding.primaryFace.attributes.gender !== 'unknown' && (
                      <span>Gênero: {faceEncoding.primaryFace.attributes.gender === 'male' ? 'Masculino' : 'Feminino'}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {storage.isUploading && storage.progress > 0 && storage.progress < 100 && (
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${storage.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Enviando foto... {storage.progress}%
                  </p>
                </div>
              )}
            </div>
          )}

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

            <div role="main" className="flex items-center justify-between">
              <Label htmlFor="is_active">Pessoa ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || faceDetection.isDetecting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || faceDetection.isDetecting || !canSave}
            className={cn(
              !canSave && !isSubmitting && !faceDetection.isDetecting && "opacity-50"
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : faceDetection.isDetecting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              getSaveButtonMessage()
            )}
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
              <div role="main" className="flex items-center gap-2 mt-1">
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
                      <div role="main" className="flex items-center justify-between">
                        <div role="main" className="flex items-center gap-2">
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
                          Confiança: {Math.round(Number(log.confidence) * 100)}%
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

export default function PeoplePage() {
  const { t } = useI18n();
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

  // Handlers
  const handleSavePerson = async (data: Partial<DbPersonInsert>) => {
    if (!user) return;

    if (editingPerson) {
      const { error } = await supabase
        .from('registered_persons')
        .update(data)
        .eq('id', editingPerson.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('registered_persons')
        .insert({ ...data, user_id: user.id } as DbPersonInsert);

      if (error) throw error;
    }

    loadPeople();
    setEditingPerson(null);
  };

  const handleDeletePerson = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('registered_persons')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toast.success('Pessoa removida');
      loadPeople();
    } catch (error) {
      toast.error('Erro ao remover');
      console.error(error);
    } finally {
      setDeleteConfirm(null);
      setSelectedPerson(null);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: people.length,
    active: people.filter(p => p.is_active).length,
    inactive: people.filter(p => !p.is_active).length,
  }), [people]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div role="main" className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Colaboradores
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie as pessoas cadastradas no sistema de reconhecimento
              </p>
            </div>

            <div role="main" className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={loadPeople}
                disabled={loading}
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
              <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div role="main" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div role="main" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div role="main" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.inactive}</p>
                    <p className="text-xs text-muted-foreground">Inativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        {/* Filters */}
        <div role="main" className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, departamento, cargo..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-9"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setFilters(f => ({ ...f, search: '' }))}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div role="main" className="flex items-center gap-2">
            <Switch
              id="active-only"
              checked={filters.activeOnly}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, activeOnly: checked }))}
            />
            <Label htmlFor="active-only" className="text-sm">
              Apenas ativos
            </Label>
          </div>

          <div role="main" className="flex items-center border rounded-lg p-1">
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

        {/* Loading */}
        {loading && (
          <div className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2'
          )}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-32' : 'h-16'} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredPeople.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-1">
              {filters.search || filters.activeOnly
                ? 'Nenhuma pessoa encontrada'
                : 'Nenhuma pessoa cadastrada'
              }
            </h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.activeOnly
                ? 'Tente ajustar os filtros'
                : 'Cadastre a primeira pessoa para começar'
              }
            </p>
            {!(filters.search || filters.activeOnly) && (
              <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar pessoa
              </Button>
            )}
          </div>
        )}

        {/* Grid View */}
        {!loading && viewMode === 'grid' && paginatedPeople.length > 0 && (
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
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && paginatedPeople.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPeople.map(person => (
                  <TableRow 
                    key={person.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <TableCell>
                      <div role="main" className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={person.photo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                    <TableCell className="text-muted-foreground">
                      {format(new Date(person.created_at), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedPerson(person); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
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
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div role="main" className="flex items-center justify-center gap-2 mt-6">
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
      </div>

      {/* Dialogs */}
      <PersonFormDialog
        person={editingPerson}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingPerson(null); }}
        onSave={handleSavePerson}
      />

      <PersonDetailsDialog
        person={selectedPerson}
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onEdit={() => {
          setEditingPerson(selectedPerson);
          setIsFormOpen(true);
          setSelectedPerson(null);
        }}
        onDelete={() => {
          setDeleteConfirm(selectedPerson);
          setSelectedPerson(null);
        }}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePerson}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

