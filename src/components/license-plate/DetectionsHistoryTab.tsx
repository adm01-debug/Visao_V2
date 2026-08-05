import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { PlateDetection } from './useLicensePlateData';

interface Props {
  detections: PlateDetection[];
  onSearch: (query: string) => void;
}

export function DetectionsHistoryTab({ detections, onSearch }: Props) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const exportCSV = () => {
    if (!detections.length) return;
    const csv = ['Placa,Câmera,Confiança,Status,Data/Hora']
      .concat(
        detections.map(
          (d) =>
            `${d.plate},${d.camera_name},${(d.confidence * 100).toFixed(0)}%,${d.is_blacklisted ? 'Bloqueado' : 'Normal'},${format(new Date(d.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}`
        )
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deteccoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exportado com sucesso!' });
  };

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader>
        <CardTitle>Histórico de Detecções</CardTitle>
        <CardDescription>Últimas 100 placas detectadas pelo sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Buscar placa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm border-border/40 bg-card/60"
          />
          <Button onClick={() => onSearch(searchQuery)}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Câmera</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma detecção encontrada
                </TableCell>
              </TableRow>
            ) : (
              detections.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono font-bold">{d.plate}</TableCell>
                  <TableCell>{d.camera_name}</TableCell>
                  <TableCell>
                    <Badge variant={d.confidence > 0.9 ? 'default' : 'secondary'}>
                      {(d.confidence * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {d.is_blacklisted ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Bloqueado
                      </Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(d.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
