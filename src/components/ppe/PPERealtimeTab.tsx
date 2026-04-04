import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PPEIcon } from './PPEIcon';
import { PPE_LABELS, PPEType } from '@/hooks/usePPEDetection';
import { Activity, Eye, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PPEDetectionItem {
  type: PPEType;
  status: 'detected' | 'missing' | 'unknown';
}

interface PPEDetection {
  personId: string;
  isCompliant: boolean;
  timestamp: number;
  items: PPEDetectionItem[];
}

interface PPERealtimeTabProps {
  detections: PPEDetection[];
  isDetecting: boolean;
}

export function PPERealtimeTab({ detections, isDetecting }: PPERealtimeTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Monitoramento em Tempo Real
          {isDetecting && (
            <Badge variant="default" className="animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />Analisando
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {detections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma pessoa detectada no momento</p>
            <p className="text-sm">{isDetecting ? 'Aguardando detecções...' : 'Clique em "Iniciar" para começar o monitoramento'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {detections.map(detection => (
              <Card key={detection.personId} className={cn("border-2", detection.isCompliant ? "border-green-500/50" : "border-red-500/50")}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={detection.isCompliant ? 'default' : 'destructive'}>
                      {detection.isCompliant ? <><CheckCircle2 className="w-3 h-3 mr-1" />Conforme</> : <><AlertTriangle className="w-3 h-3 mr-1" />Não Conforme</>}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{format(detection.timestamp, 'HH:mm:ss')}</span>
                  </div>
                  <div className="space-y-2">
                    {detection.items.map(item => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PPEIcon type={item.type} />
                          <span className="text-sm">{PPE_LABELS[item.type].pt}</span>
                        </div>
                        <Badge variant={item.status === 'detected' ? 'default' : item.status === 'missing' ? 'destructive' : 'secondary'}>
                          {item.status === 'detected' ? '✓' : item.status === 'missing' ? '✗' : '?'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
