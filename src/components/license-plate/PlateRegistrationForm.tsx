import { memo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RegisteredPlate {
  id: string;
  plate: string;
  owner_name: string | null;
  vehicle_type: string | null;
  color: string | null;
  list_type: string;
  notes: string | null;
}

interface PlateRegistrationFormProps {
  registeredPlates: RegisteredPlate[];
  onAdd: (plate: { plate: string; owner_name: string; vehicle_type: string; color: string; notes: string; list_type: 'whitelist' | 'blacklist' | 'visitor' }) => void;
  onDelete: (id: string) => void;
}

export const PlateRegistrationForm = memo(function PlateRegistrationForm({
  registeredPlates, onAdd, onDelete,
}: PlateRegistrationFormProps) {
  const [newPlate, setNewPlate] = useState({
    plate: '', owner_name: '', vehicle_type: 'car', color: '', notes: '', list_type: 'whitelist' as string,
  });

  const handleSubmit = () => {
    if (!newPlate.plate) return;
    onAdd(newPlate);
    setNewPlate({ plate: '', owner_name: '', vehicle_type: 'car', color: '', notes: '', list_type: 'whitelist' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Cadastrar Placa</CardTitle>
          <CardDescription>Adicione placas autorizadas ou na blacklist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input placeholder="ABC1D23" value={newPlate.plate} onChange={(e) => setNewPlate({ ...newPlate, plate: e.target.value.toUpperCase() })} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Proprietário</Label>
              <Input placeholder="Nome do proprietário" value={newPlate.owner_name} onChange={(e) => setNewPlate({ ...newPlate, owner_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Veículo</Label>
              <Input placeholder="Carro, Moto..." value={newPlate.vehicle_type} onChange={(e) => setNewPlate({ ...newPlate, vehicle_type: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input placeholder="Preto, Branco..." value={newPlate.color} onChange={(e) => setNewPlate({ ...newPlate, color: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Lista</Label>
            <div className="flex gap-4">
              {(['whitelist', 'blacklist', 'visitor'] as const).map(type => (
                <Button key={type} variant={newPlate.list_type === type ? 'default' : 'outline'} onClick={() => setNewPlate({ ...newPlate, list_type: type })} className={cn(type === 'blacklist' && newPlate.list_type === type && 'bg-destructive')}>
                  {type === 'whitelist' && 'Autorizado'}
                  {type === 'blacklist' && 'Blacklist'}
                  {type === 'visitor' && 'Visitante'}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input placeholder="Notas adicionais..." value={newPlate.notes} onChange={(e) => setNewPlate({ ...newPlate, notes: e.target.value })} />
          </div>
          <Button onClick={handleSubmit} className="w-full"><Plus className="h-4 w-4 mr-2" />Cadastrar Placa</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Placas Cadastradas ({registeredPlates.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {registeredPlates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma placa cadastrada</div>
            ) : (
              <div className="space-y-2">
                {registeredPlates.map(plate => (
                  <div key={plate.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <span className="font-mono font-bold">{plate.plate}</span>
                      {plate.owner_name && <span className="text-sm text-muted-foreground ml-2">{plate.owner_name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={plate.list_type === 'blacklist' ? 'destructive' : 'secondary'}>{plate.list_type}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(plate.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
});
