import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PPEIcon } from './PPEIcon';
import { PPE_LABELS, PPEType, type PPEZoneConfig } from '@/hooks/usePPEDetection';
import { HardHat, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PPEZonesTabProps {
  zones: PPEZoneConfig[];
  selectedCamera: string;
  createZone: (config: { name: string; cameraId: string; requiredPPE: PPEType[]; alertEnabled: boolean; gracePeriodSeconds: number }) => Promise<boolean>;
  deleteZone: (id: string) => void;
}

export function PPEZonesTab({ zones, selectedCamera, createZone, deleteZone }: PPEZonesTabProps) {
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', requiredPPE: [] as PPEType[], alertOnViolation: true, gracePeriodSeconds: 5 });

  const togglePPE = (type: PPEType) => {
    setNewZone(prev => ({
      ...prev,
      requiredPPE: prev.requiredPPE.includes(type) ? prev.requiredPPE.filter(t => t !== type) : [...prev.requiredPPE, type],
    }));
  };

  const handleAddZone = async () => {
    if (!newZone.name || newZone.requiredPPE.length === 0) {
      toast.error('Preencha nome e selecione pelo menos um EPI');
      return;
    }
    const success = await createZone({
      name: newZone.name, cameraId: selectedCamera, requiredPPE: newZone.requiredPPE,
      alertEnabled: newZone.alertOnViolation, gracePeriodSeconds: newZone.gracePeriodSeconds,
    });
    if (success) {
      setIsAddingZone(false);
      setNewZone({ name: '', requiredPPE: [], alertOnViolation: true, gracePeriodSeconds: 5 });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Zonas de EPI Obrigatório</CardTitle>
          <CardDescription>Configure áreas que requerem equipamentos de proteção específicos</CardDescription>
        </div>
        <Dialog open={isAddingZone} onOpenChange={setIsAddingZone}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Zona</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Zona PPE</DialogTitle>
              <DialogDescription>Defina uma área que requer uso de EPIs específicos</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Zona</Label>
                <Input placeholder="Ex: Área de Produção" value={newZone.name} onChange={e => setNewZone(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>EPIs Obrigatórios</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(PPE_LABELS) as PPEType[]).map(type => (
                    <Button key={type} variant={newZone.requiredPPE.includes(type) ? 'default' : 'outline'} size="sm" onClick={() => togglePPE(type)} className="flex flex-col h-16">
                      <PPEIcon type={type} className="text-xl" />
                      <span className="text-xs">{PPE_LABELS[type].pt}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Alertar violações</Label>
                <Switch checked={newZone.alertOnViolation} onCheckedChange={v => setNewZone(prev => ({ ...prev, alertOnViolation: v }))} />
              </div>
              <div className="space-y-2">
                <Label>Período de tolerância (segundos)</Label>
                <Input type="number" min={0} max={60} value={newZone.gracePeriodSeconds} onChange={e => setNewZone(prev => ({ ...prev, gracePeriodSeconds: parseInt(e.target.value) || 5 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingZone(false)}>Cancelar</Button>
              <Button onClick={handleAddZone}>Criar Zona</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {zones.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <HardHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma zona PPE configurada</p>
            <p className="text-sm">Clique em "Nova Zona" para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
                <TableHead>EPIs Obrigatórios</TableHead>
                <TableHead>Alertas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map(zone => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {zone.requiredPPE.map(type => (
                        <Badge key={type} variant="outline"><PPEIcon type={type} className="mr-1" />{PPE_LABELS[type].pt}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={zone.alertEnabled ? 'default' : 'secondary'}>{zone.alertEnabled ? 'Ativo' : 'Desativado'}</Badge></TableCell>
                  <TableCell><Badge variant="default">Ativo</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
