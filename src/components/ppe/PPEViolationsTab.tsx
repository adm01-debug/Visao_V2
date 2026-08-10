import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PPEIcon } from './PPEIcon';
import { PPE_LABELS } from '@/hooks/usePPEDetection';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { PPEViolation } from '@/hooks/usePPEDetection';

interface PPEViolationsTabProps {
  violations: PPEViolation[];
  acknowledgeViolation: (id: string) => void;
}

export function PPEViolationsTab({ violations, acknowledgeViolation }: PPEViolationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Violações Recentes</CardTitle>
        <CardDescription>Histórico de detecções de não conformidade</CardDescription>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
            <p>Nenhuma violação registrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Câmera</TableHead>
                <TableHead>EPIs Ausentes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((violation) => (
                <TableRow key={violation.id}>
                  <TableCell>
                    {format(new Date(violation.timestamp), 'dd/MM HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{violation.zoneName}</TableCell>
                  <TableCell>{violation.cameraId}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {violation.missingItems.map((type) => (
                        <Badge key={type} variant="destructive">
                          <PPEIcon type={type} className="mr-1" />
                          {PPE_LABELS[type].pt}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={violation.acknowledged ? 'secondary' : 'destructive'}>
                      {violation.acknowledged ? 'Reconhecida' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!violation.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeViolation(violation.id)}
                      >
                        Reconhecer
                      </Button>
                    )}
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
