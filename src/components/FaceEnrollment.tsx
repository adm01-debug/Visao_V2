/**
 * VISÃO - Sistema de Vigilância Inteligente
 * FaceEnrollment Component
 */

import { memo, useState, useRef, useCallback } from 'react';
import { Camera, Upload, User, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FaceEnrollmentData {
  name: string;
  imageData: string;
  department?: string;
  notes?: string;
}

interface FaceEnrollmentProps {
  onEnroll: (data: FaceEnrollmentData) => Promise<void>;
  onCancel?: () => void;
  isProcessing?: boolean;
  className?: string;
}

function FaceEnrollmentComponent({
  onEnroll,
  onCancel,
  isProcessing = false,
  className
}: FaceEnrollmentProps) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageData(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !imageData) {
      setError('Nome e foto são obrigatórios');
      return;
    }
    
    await onEnroll({
      name: name.trim(),
      imageData,
      department: department.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleReset = () => {
    setImageData(null);
    setError(null);
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Cadastro Facial
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Image Capture/Upload Area */}
        <div className="space-y-2">
          <Label>Foto</Label>
          
          {!imageData && !isCapturing && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={startCamera}
                className="flex-1 gap-2"
              >
                <Camera className="w-4 h-4" />
                Usar Câmera
              </Button>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
          
          {isCapturing && (
            <div className="space-y-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border"
              />
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1 gap-2">
                  <Camera className="w-4 h-4" />
                  Capturar
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          {imageData && (
            <div className="space-y-2">
              <img 
                src={imageData} 
                alt="Foto capturada"
                className="w-full rounded-lg border"
              />
              <Button variant="outline" onClick={handleReset} className="w-full gap-2">
                <X className="w-4 h-4" />
                Nova Foto
              </Button>
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          
          <div>
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ex: Segurança, TI, RH"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
            />
          </div>
        </div>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || !imageData || isProcessing}
            className="flex-1 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Cadastrar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const FaceEnrollment = memo(FaceEnrollmentComponent);
