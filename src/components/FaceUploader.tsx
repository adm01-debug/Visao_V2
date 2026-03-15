// @ts-nocheck
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: FaceUploader - Upload e cadastro rápido de faces
 */

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, Camera, User, X, Check, Loader2, 
  ImagePlus, Trash2, RefreshCw
} from 'lucide-react';

interface FaceUploaderProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FaceUploader({ onSuccess, onCancel }: FaceUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    list_type: 'unknown' as 'whitelist' | 'blacklist' | 'vip' | 'unknown',
    notes: ''
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione uma imagem.',
          variant: 'destructive'
        });
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast({
        title: 'Erro ao acessar câmera',
        description: 'Verifique as permissões do navegador.',
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'captured-face.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(canvas.toDataURL('image/jpeg'));
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Upload and save
  const handleSubmit = async () => {
    if (!selectedFile || !formData.name) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione uma imagem e preencha o nome.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Upload image
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `faces/${fileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('faces')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('faces')
        .getPublicUrl(filePath);

      setUploadProgress(80);

      // Save to database
      const { error: insertError } = await supabase
        .from('known_faces')
        .insert([{
          name: formData.name,
          document: formData.document || null,
          list_type: formData.list_type,
          notes: formData.notes || null,
          image_url: urlData.publicUrl,
          detection_count: 0
        }]);

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast({
        title: 'Sucesso!',
        description: 'Face cadastrada com sucesso.',
      });

      onSuccess?.();
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl('');
      setFormData({
        name: '',
        document: '',
        list_type: 'unknown',
        notes: ''
      });
    } catch (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Cadastro Rápido de Face
        </CardTitle>
        <CardDescription>
          Faça upload de uma foto ou capture pela câmera
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode selector */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'upload' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setMode('upload'); stopCamera(); }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button
            variant={mode === 'camera' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setMode('camera'); startCamera(); }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Câmera
          </Button>
        </div>

        {/* Upload area */}
        {mode === 'upload' && !previewUrl && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Clique ou arraste uma imagem aqui
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou GIF até 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Camera view */}
        {mode === 'camera' && !previewUrl && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-black"
            />
            {isCameraActive && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <Button onClick={capturePhoto} size="lg" className="rounded-full">
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {previewUrl && (
          <div className="relative">
            <Avatar className="w-32 h-32 mx-auto">
              <AvatarImage src={previewUrl} alt="Preview" />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-0 right-1/4"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document">Documento</Label>
              <Input
                id="document"
                placeholder="CPF/RG"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Classificação</Label>
              <Select 
                value={formData.list_type} 
                onValueChange={(v) => setFormData({ ...formData, list_type: v as typeof formData.list_type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whitelist">Autorizado</SelectItem>
                  <SelectItem value="blacklist">Bloqueado</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="unknown">Desconhecido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              placeholder="Notas adicionais"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Progress */}
        {isUploading && (
          <Progress value={uploadProgress} className="h-2" />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isUploading}>
              Cancelar
            </Button>
          )}
          <Button 
            className="flex-1" 
            onClick={handleSubmit} 
            disabled={!selectedFile || !formData.name || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Cadastrar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
