/**
 * VISÃO - Sistema de Vigilância Inteligente
 * VehicleForm Component
 */

import { memo, useState } from 'react';
import { Car, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { z } from 'zod';

export type VehicleListType = 'allowed' | 'blocked' | 'alert';
export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'other';

const vehicleSchema = z.object({
  plate: z.string().trim().min(1, 'Placa é obrigatória').max(10, 'Placa muito longa')
    .regex(/^[A-Z0-9]+$/, 'Placa deve conter apenas letras e números'),
  listType: z.enum(['allowed', 'blocked', 'alert']),
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'bus', 'other']),
  ownerName: z.string().max(100).optional(),
  color: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean(),
});

export interface VehicleFormData {
  plate: string;
  listType: VehicleListType;
  vehicleType: VehicleType;
  ownerName?: string;
  color?: string;
  notes?: string;
  isActive: boolean;
}

interface VehicleFormProps {
  onSubmit: (data: VehicleFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<VehicleFormData>;
  isLoading?: boolean;
  className?: string;
}

const listTypeOptions: { value: VehicleListType; label: string; color: string }[] = [
  { value: 'allowed', label: 'Permitido', color: 'text-green-500' },
  { value: 'blocked', label: 'Bloqueado', color: 'text-destructive' },
  { value: 'alert', label: 'Alerta', color: 'text-warning' },
];

const vehicleTypeOptions: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Carro' },
  { value: 'motorcycle', label: 'Moto' },
  { value: 'truck', label: 'Caminhão' },
  { value: 'bus', label: 'Ônibus' },
  { value: 'other', label: 'Outro' },
];

function VehicleFormComponent({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  className
}: VehicleFormProps) {
  const [plate, setPlate] = useState(initialData?.plate || '');
  const [listType, setListType] = useState<VehicleListType>(initialData?.listType || 'allowed');
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialData?.vehicleType || 'car');
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || '');
  const [color, setColor] = useState(initialData?.color || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data = {
      plate: plate.trim().toUpperCase(),
      listType,
      vehicleType,
      ownerName: ownerName.trim() || undefined,
      color: color.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    };

    const result = vehicleSchema.safeParse(data);
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

    await onSubmit(data);
  };

  return (
    <Card className={cn("w-full max-w-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          {initialData ? 'Editar Veículo' : 'Cadastrar Veículo'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Active Status */}
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Ativo</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Plate */}
          <div>
            <Label htmlFor="plate">Placa *</Label>
            <Input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC1234"
              maxLength={10}
              className="font-mono text-lg"
            />
            {errors.plate && <p className="text-sm text-destructive mt-1">{errors.plate}</p>}
          </div>

          {/* List Type & Vehicle Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={listType} onValueChange={(v) => setListType(v as VehicleListType)}>
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
            <div>
              <Label>Tipo de Veículo</Label>
              <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerName">Proprietário</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nome do proprietário"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Preto"
                maxLength={30}
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

export const VehicleForm = memo(VehicleFormComponent);
