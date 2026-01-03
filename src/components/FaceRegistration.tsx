/**
 * VISÃO - Sistema de Vigilância Inteligente
 * FaceRegistration Component
 */

import { memo, useState } from 'react';
import { User, Upload, Camera, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type ListType = 'authorized' | 'vip' | 'blocked' | 'unknown';

export interface FaceRegistrationData {
  name: string;
  photoUrl?: string;
  photoFile?: File;
  listType: ListType;
  department?: string;
  role?: string;
  notes?: string;
}

interface FaceRegistrationProps {
  onSubmit: (data: FaceRegistrationData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<FaceRegistrationData>;
  isLoading?: boolean;
  className?: string;
}

const listTypeOptions: { value: ListType; label: string; color: string }[] = [
  { value: 'authorized', label: 'Autorizado', color: 'text-green-500' },
  { value: 'vip', label: 'VIP', color: 'text-primary' },
  { value: 'blocked', label: 'Bloqueado', color: 'text-destructive' },
  { value: 'unknown', label: 'Desconhecido', color: 'text-muted-foreground' },
];

function FaceRegistrationComponent({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  className
}: FaceRegistrationProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [listType, setListType] = useState<ListType>(initialData?.listType || 'authorized');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    
    await onSubmit({
      name: name.trim(),
      listType,
      department: department.trim() || undefined,
      role: role.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoPreview || undefined,
      photoFile: photoFile || undefined,
    });
  };

  return (
    <Card className={cn("w-full max-w-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {initialData ? 'Editar Pessoa' : 'Cadastrar Pessoa'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Foto"
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            {photoPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhotoPreview(null);
                  setPhotoFile(null);
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Remover foto
              </Button>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>

            <div>
              <Label htmlFor="listType">Tipo</Label>
              <Select value={listType} onValueChange={(v) => setListType(v as ListType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {listTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: TI, RH"
                />
              </div>
              <div>
                <Label htmlFor="role">Cargo</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex: Gerente"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="flex-1 gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export const FaceRegistration = memo(FaceRegistrationComponent);
