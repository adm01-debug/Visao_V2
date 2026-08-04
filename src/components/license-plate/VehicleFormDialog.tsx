import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { VehicleFormData, Vehicle } from './useLicensePlateData';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVehicle: Vehicle | null;
  formData: VehicleFormData;
  onFormChange: (data: VehicleFormData) => void;
  onSave: () => void;
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  editingVehicle,
  formData,
  onFormChange,
  onSave,
}: Props) {
  const update = (partial: Partial<VehicleFormData>) => onFormChange({ ...formData, ...partial });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingVehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do veículo para cadastro no sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa *</Label>
              <Input
                id="plate"
                placeholder="ABC-1234"
                value={formData.plate}
                onChange={(e) => update({ plate: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list_type">Tipo *</Label>
              <Select value={formData.list_type} onValueChange={(v) => update({ list_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whitelist">Autorizado</SelectItem>
                  <SelectItem value="blacklist">Bloqueado</SelectItem>
                  <SelectItem value="visitor">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_name">Proprietário</Label>
            <Input
              id="owner_name"
              placeholder="Nome do proprietário"
              value={formData.owner_name}
              onChange={(e) => update({ owner_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Tipo de Veículo</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(v) => update({ vehicle_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Carro</SelectItem>
                  <SelectItem value="motorcycle">Moto</SelectItem>
                  <SelectItem value="truck">Caminhão</SelectItem>
                  <SelectItem value="bus">Ônibus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                placeholder="Ex: Preto"
                value={formData.color}
                onChange={(e) => update({ color: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              placeholder="Notas adicionais"
              value={formData.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
