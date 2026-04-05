import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, ScanFace, CheckCircle, XCircle, X, Upload, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WebcamCapture } from '@/components/WebcamCapture';
import { useStorage, STORAGE_BUCKETS } from '@/hooks/useStorage';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import type { DbPerson, DbPersonInsert, FaceEncoding } from './types';

interface PersonFormDialogProps {
  person?: DbPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DbPersonInsert>) => Promise<void>;
}

const REQUIRE_FACE_FOR_NEW = true;

export function PersonFormDialog({ person, isOpen, onClose, onSave }: PersonFormDialogProps) {
  const storage = useStorage();
  const faceDetection = useFaceDetection();
  const [formData, setFormData] = useState({
    name: '', department: '', role: '', is_active: true as boolean, list_type: 'none', notes: '',
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
        name: person.name, department: person.department || '', role: person.role || '',
        is_active: person.is_active, list_type: person.list_type || 'none', notes: person.notes || '',
      });
      setPhotoPreview(person.photo_url || null);
      setPhotoFile(null);
      if (person.face_encoding) {
        setFaceEncoding(person.face_encoding as unknown as FaceEncoding);
        setFaceValidation({ valid: true, message: 'Encoding facial existente' });
      } else {
        setFaceEncoding(null);
        setFaceValidation(null);
      }
    } else {
      setFormData({ name: '', department: '', role: '', is_active: true, list_type: 'none', notes: '' });
      setPhotoPreview(null);
      setPhotoFile(null);
      setFaceEncoding(null);
      setFaceValidation(null);
    }
    setShowWebcam(false);
    storage.clearError?.();
  }, [person, isOpen]);

  const detectFacesInPhoto = async (imageData: string) => {
    setFaceEncoding(null);
    setFaceValidation(null);
    toast.loading('Analisando rosto...', { id: 'face-detection' });
    const result = await faceDetection.detectFaces(imageData);
    const firstFace = result[0];
    const validation = firstFace
      ? faceDetection.validateImageQuality(firstFace)
      : { isValid: false, issues: ['Nenhum rosto detectado'] };
    setFaceValidation({ valid: validation.isValid, message: validation.issues[0] || 'OK' });
    if (validation.isValid && firstFace) {
      const encoding = await faceDetection.generateEncoding(imageData);
      setFaceEncoding(encoding ? { encoding } : null);
      toast.success('Rosto detectado com sucesso!', { id: 'face-detection' });
    } else {
      toast.error(validation.issues[0] || 'Rosto inválido', { id: 'face-detection' });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = storage.validateFile(file, { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] });
    if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      setPhotoPreview(imageData);
      await detectFacesInPhoto(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleWebcamCapture = async (imageData: string, file: File) => {
    setPhotoPreview(imageData);
    setPhotoFile(file);
    setShowWebcam(false);
    await detectFacesInPhoto(imageData);
  };

  const canSave = useMemo(() => {
    if (!photoFile && !photoPreview) return !REQUIRE_FACE_FOR_NEW || !!person;
    if (photoFile) return faceValidation?.valid === true;
    if (person?.face_encoding) return true;
    return faceValidation?.valid === true;
  }, [photoFile, photoPreview, faceValidation, person]);

  const getSaveButtonMessage = () => {
    if (faceDetection.isProcessing) return 'Analisando rosto...';
    if (photoFile && !faceValidation) return 'Aguardando análise...';
    if (photoFile && faceValidation && !faceValidation.valid) return 'Foto inválida';
    if (REQUIRE_FACE_FOR_NEW && !person && !photoPreview) return 'Foto obrigatória';
    return 'Salvar';
  };

  const handleSubmit = async () => {
    if (!formData.name) { toast.error('Nome é obrigatório'); return; }
    if (photoFile && (!faceValidation || !faceValidation.valid)) {
      toast.error(faceValidation?.message || 'É necessário uma foto com rosto bem enquadrado');
      return;
    }
    if (REQUIRE_FACE_FOR_NEW && !person && !photoPreview) {
      toast.error('Uma foto com rosto é obrigatória para novos cadastros');
      return;
    }
    setIsSubmitting(true);
    try {
      let photoUrl = person?.photo_url || null;
      if (photoFile) {
        if (person?.photo_url) {
          const oldPath = storage.extractPathFromUrl(STORAGE_BUCKETS.PERSON_PHOTOS, person.photo_url);
          if (oldPath) await storage.remove(STORAGE_BUCKETS.PERSON_PHOTOS, oldPath);
        }
        const result = await storage.upload(photoFile, { bucket: STORAGE_BUCKETS.PERSON_PHOTOS });
        if (!result) { toast.error(storage.error || 'Erro ao fazer upload da foto'); return; }
        photoUrl = result.url;
      }
      await onSave({
        ...formData, photo_url: photoUrl,
        face_encoding: faceEncoding ? JSON.parse(JSON.stringify(faceEncoding)) : null,
      });
      onClose();
      toast.success(person ? 'Pessoa atualizada' : 'Pessoa cadastrada');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (person?.photo_url) {
      const oldPath = storage.extractPathFromUrl(STORAGE_BUCKETS.PERSON_PHOTOS, person.photo_url);
      if (oldPath) await storage.remove(STORAGE_BUCKETS.PERSON_PHOTOS, oldPath);
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
          <DialogTitle>{person ? 'Editar Pessoa' : 'Cadastrar Pessoa'}</DialogTitle>
          <DialogDescription>
            Preencha os dados para {person ? 'atualizar' : 'cadastrar'} a pessoa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showWebcam ? (
            <WebcamCapture onCapture={handleWebcamCapture} onCancel={() => setShowWebcam(false)} quality={0.9} maxWidth={800} maxHeight={600} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className={cn(
                  "w-24 h-24 ring-2 ring-offset-2",
                  faceValidation?.valid ? "ring-green-500" :
                  faceValidation && !faceValidation.valid ? "ring-destructive" : "ring-transparent"
                )}>
                  <AvatarImage src={photoPreview || undefined} />
                  <AvatarFallback className="text-2xl">{formData.name?.charAt(0) || 'P'}</AvatarFallback>
                </Avatar>
                {photoPreview && (
                  <Button variant="destructive" size="icon" className="absolute -top-1 -right-1 h-6 w-6 rounded-full" onClick={handleRemovePhoto} type="button">
                    <X className="w-3 h-3" />
                  </Button>
                )}
                {faceDetection.isProcessing && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {!faceDetection.isProcessing && faceValidation?.valid && (
                  <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground rounded-full p-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                {!faceDetection.isProcessing && faceValidation && !faceValidation.valid && (
                  <div className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="photo" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="w-4 h-4" />Upload
                  </div>
                  <Input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                </Label>
                <span className="text-muted-foreground">ou</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowWebcam(true)}>
                  <Camera className="w-4 h-4 mr-2" />Webcam
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP • Máx 5MB</p>

              {photoPreview && faceValidation && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  faceValidation.valid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {faceValidation.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{faceValidation.message}</span>
                </div>
              )}

              {faceEncoding?.primaryFace && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <ScanFace className="w-3 h-3" /><span>Encoding facial gerado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span>Qualidade: {Math.round(faceEncoding.primaryFace.quality * 100)}%</span>
                    <span>Confiança: {Math.round(faceEncoding.primaryFace.confidence * 100)}%</span>
                    {faceEncoding.primaryFace.attributes?.age && <span>Idade: ~{faceEncoding.primaryFace.attributes.age} anos</span>}
                    {faceEncoding.primaryFace.attributes?.gender && faceEncoding.primaryFace.attributes.gender !== 'unknown' && (
                      <span>Gênero: {faceEncoding.primaryFace.attributes.gender === 'male' ? 'Masculino' : 'Feminino'}</span>
                    )}
                  </div>
                </div>
              )}

              {storage.isUploading && storage.progress > 0 && storage.progress < 100 && (
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${storage.progress}%` }} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1">Enviando foto... {storage.progress}%</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div>
              <Label htmlFor="department">Departamento</Label>
              <Input id="department" value={formData.department} onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))} placeholder="Ex: TI, RH, Operações" />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Input id="role" value={formData.role} onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Analista, Gerente" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Pessoa ativa</Label>
              <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))} />
            </div>
            <div>
              <Label htmlFor="list_type">Classificação</Label>
              <select id="list_type" value={formData.list_type || 'none'} onChange={(e) => setFormData(f => ({ ...f, list_type: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="none">Nenhuma</option>
                <option value="whitelist">Whitelist (Autorizado)</option>
                <option value="blacklist">Blacklist (Bloqueado)</option>
                <option value="watchlist">Watchlist (Monitorado)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" value={formData.notes || ''} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Notas ou motivo da classificação" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || faceDetection.isProcessing}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || faceDetection.isProcessing || !canSave}
            className={cn(!canSave && !isSubmitting && !faceDetection.isProcessing && "opacity-50")}>
            {isSubmitting ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Salvando...</>)
              : faceDetection.isProcessing ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analisando...</>)
              : getSaveButtonMessage()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
