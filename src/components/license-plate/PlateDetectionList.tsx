import { memo } from 'react';
import {
  Car,
  Camera,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Detection {
  id: string;
  plate: string;
  confidence: number;
  camera_name: string;
  timestamp: Date;
  image_url: string | null;
  status: string;
}

interface PlateDetectionListProps {
  detections: Detection[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDelete: (id: string) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'authorized':
      return (
        <Badge className="bg-success/15 text-success gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Autorizado
        </Badge>
      );
    case 'blacklist':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Blacklist
        </Badge>
      );
    case 'unauthorized':
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Não Autorizado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Eye className="h-3 w-3" />
          Desconhecido
        </Badge>
      );
  }
}

export const PlateDetectionList = memo(function PlateDetectionList({
  detections,
  searchQuery,
  onSearchChange,
  onDelete,
}: PlateDetectionListProps) {
  const filtered = detections.filter(
    (d) =>
      d.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.camera_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa ou câmera..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{detections.length} detecções</Badge>
      </div>
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhuma placa detectada</p>
              <p className="text-sm text-muted-foreground/70">
                Use a aba "Upload" para analisar imagens
              </p>
            </div>
          ) : (
            filtered.map((detection) => (
              <Card key={detection.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    {detection.image_url && (
                      <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={detection.image_url}
                          alt="Veículo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xl font-bold tracking-wider">
                          {detection.plate}
                        </span>
                        {getStatusBadge(detection.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {detection.camera_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(detection.timestamp, 'dd/MM HH:mm:ss', { locale: ptBR })}
                        </span>
                        <span>Confiança: {Math.round(detection.confidence * 100)}%</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(detection.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
