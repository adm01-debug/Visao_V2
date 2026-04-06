import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Vehicle } from './useLicensePlateData';

interface Props {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'whitelist': return <Badge className="bg-success">Autorizado</Badge>;
    case 'blacklist': return <Badge variant="destructive">Bloqueado</Badge>;
    default: return <Badge variant="secondary">Visitante</Badge>;
  }
}

export function VehiclesTab({ vehicles, onEdit, onDelete }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = vehicles.filter(v => {
    const matchesSearch = v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.owner_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (filterType === 'all' || v.list_type === filterType);
  });

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader>
        <CardTitle>Veículos Cadastrados</CardTitle>
        <CardDescription>Gerencie a lista de veículos autorizados, bloqueados e visitantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Input placeholder="Buscar por placa ou proprietário..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 max-w-sm border-border/40 bg-card/60" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="whitelist">Autorizados</SelectItem>
              <SelectItem value="blacklist">Bloqueados</SelectItem>
              <SelectItem value="visitor">Visitantes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead><TableHead>Proprietário</TableHead><TableHead>Modelo</TableHead>
              <TableHead>Cor</TableHead><TableHead>Status</TableHead><TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum veículo encontrado</TableCell></TableRow>
            ) : filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono font-bold">{v.plate}</TableCell>
                <TableCell>{v.owner_name ?? '-'}</TableCell>
                <TableCell>{v.vehicle_type ?? '-'}</TableCell>
                <TableCell>{v.color ?? '-'}</TableCell>
                <TableCell>{getTypeBadge(v.list_type)}</TableCell>
                <TableCell>{format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(v)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
