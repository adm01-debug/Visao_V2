/**
 * VISÃO - Sistema de Vigilância Inteligente
 * PersonForm Component
 */

import { memo, useState } from 'react';
import { User, Camera, Upload, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { z } from 'zod';

export type PersonListType = 'authorized' | 'vip' | 'blocked' | 'unknown';

const personSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  listType: z.enum(['authorized', 'vip', 'blocked', 'unknown']),
  department: z.string().max(50).optional(),
  role: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean(),
});

export interface PersonFormData {
  name: string;
  listType: PersonListType;
  department?: string;
  role?: string;
  notes?: string;
  photoUrl?: string;
  isActive: boolean;
}

interface PersonFormProps {
  onSubmit: (data: PersonFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<PersonFormData>;
  isLoading?: boolean;
  className?: string;
}

const listTypeOptions: { value: PersonListType; label: string; color: string }[] = [
  { value: 'authorized', label: 'Autorizado', color: 'text-green-500' },
  { value: 'vip', label: 'VIP', color: 'text-primary' },
  { value: 'blocked', label: 'Bloqueado', color: 'text-destructive' },
  { value: 'unknown', label: 'Desconhecido', color: 'text-muted-foreground' },
];

function PersonFormComponent({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  className
}: PersonFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [listType, setListType] = useState<PersonListType>(initialData?.listType || 'authorized');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data = {
      name: name.trim(),
      listType,
      department: department.trim() || undefined,
      role: role.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    };

    const result = personSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    await onSubmit({
      ...data,
      photoUrl: photoPreview || undefined,
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
          {/* Photo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Foto"
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <label
                htmlFor="person-photo"
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="person-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Ativo</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              maxLength={100}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          {/* List Type */}
          <div>
            <Label>Tipo</Label>
            <Select value={listType} onValueChange={(v) => setListType(v as PersonListType)}>
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

          {/* Department & Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: TI"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Gerente"
                maxLength={50}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
              rows={3}
              maxLength={500}
            />
          </div>

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

export const PersonForm = memo(PersonFormComponent);
