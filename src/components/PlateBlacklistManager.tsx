/**
 * VISÃO - Sistema de Vigilância Inteligente
 * PlateBlacklistManager Component
 */

import { memo, useState, useMemo } from 'react';
import { 
  Car, 
  Plus, 
  Trash2, 
  Search,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Edit,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type PlateListType = 'allowed' | 'blocked' | 'alert';

export interface RegisteredPlate {
  id: string;
  plate: string;
  listType: PlateListType;
  ownerName?: string;
  vehicleType?: string;
  color?: string;
  notes?: string;
  createdAt: Date | string;
}

interface PlateBlacklistManagerProps {
  plates: RegisteredPlate[];
  onAdd: (plate: Omit<RegisteredPlate, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (id: string, plate: Partial<RegisteredPlate>) => Promise<void>;
  onExport?: () => void;
  onImport?: (file: File) => Promise<void>;
  className?: string;
}

const listTypeConfig: Record<PlateListType, { label: string; color: string; icon: typeof CheckCircle }> = {
  allowed: { label: 'Permitido', color: 'bg-green-500', icon: CheckCircle },
  blocked: { label: 'Bloqueado', color: 'bg-destructive', icon: Ban },
  alert: { label: 'Alerta', color: 'bg-warning', icon: AlertTriangle },
};

function PlateBlacklistManagerComponent({
  plates,
  onAdd,
  onDelete,
  onEdit,
  onExport,
  onImport,
  className
}: PlateBlacklistManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<PlateListType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newType, setNewType] = useState<PlateListType>('blocked');
  const [newNotes, setNewNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredPlates = useMemo(() => {
    return plates.filter(plate => {
      const matchesSearch = plate.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           plate.ownerName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || plate.listType === filterType;
      return matchesSearch && matchesType;
    });
  }, [plates, searchQuery, filterType]);

  const handleAdd = async () => {
    if (!newPlate.trim()) return;
    
    setIsAdding(true);
    try {
      await onAdd({
        plate: newPlate.trim().toUpperCase(),
        listType: newType,
        ownerName: newOwner.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      setNewPlate('');
      setNewOwner('');
      setNewNotes('');
      setIsDialogOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const stats = useMemo(() => ({
    total: plates.length,
    allowed: plates.filter(p => p.listType === 'allowed').length,
    blocked: plates.filter(p => p.listType === 'blocked').length,
    alert: plates.filter(p => p.listType === 'alert').length,
  }), [plates]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Gerenciador de Placas
          </CardTitle>
          <div className="flex gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Placa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Placa *</Label>
                    <Input
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1234"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <Label>Proprietário</Label>
                    <Input
                      value={newOwner}
                      onChange={(e) => setNewOwner(e.target.value)}
                      placeholder="Nome do proprietário"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as PlateListType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">Permitido</SelectItem>
                        <SelectItem value="blocked">Bloqueado</SelectItem>
                        <SelectItem value="alert">Alerta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Observações"
                    />
                  </div>
                  <Button onClick={handleAdd} disabled={!newPlate.trim() || isAdding} className="w-full">
                    {isAdding ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-secondary text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.allowed}</div>
            <div className="text-xs text-muted-foreground">Permitidos</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">Bloqueados</div>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <div className="text-2xl font-bold text-warning">{stats.alert}</div>
            <div className="text-xs text-muted-foreground">Alertas</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar placa ou proprietário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as PlateListType | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="allowed">Permitidos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
              <SelectItem value="alert">Alertas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Plates List */}
        {filteredPlates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma placa encontrada</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPlates.map((plate) => {
              const config = listTypeConfig[plate.listType];
              const Icon = config.icon;
              return (
                <div
                  key={plate.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className={cn("w-2 h-full rounded-full", config.color)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{plate.plate}</span>
                      <Badge variant="outline" className="gap-1">
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </div>
                    {plate.ownerName && (
                      <p className="text-sm text-muted-foreground">{plate.ownerName}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(plate.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const PlateBlacklistManager = memo(PlateBlacklistManagerComponent);
