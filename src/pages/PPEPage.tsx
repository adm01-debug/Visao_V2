/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: PPEPage (Equipamentos de Proteção Individual)
 */

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCameras } from '@/hooks/useCameras';
import { usePPEDetection } from '@/hooks/usePPEDetection';
import { ComplianceCard } from '@/components/ppe/ComplianceCard';
import { PPEZonesTab } from '@/components/ppe/PPEZonesTab';
import { PPEViolationsTab } from '@/components/ppe/PPEViolationsTab';
import { PPERealtimeTab } from '@/components/ppe/PPERealtimeTab';
import { HardHat, Shield, AlertTriangle, CheckCircle2, XCircle, Activity, Users, Camera, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { PageMeta } from '@/components/PageMeta';

export default function PPEPage() {
  const { cameras } = useCameras();
  const [selectedCamera, setSelectedCamera] = useState('');
  const ppeDetection = usePPEDetection({ onViolation: (v) => toast.error(`Violação PPE: ${v.zoneName}`) });

  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0]!.id);
  }, [cameras]);

  return (
    <div role="main" aria-label="Detecção de EPIs" className="container mx-auto p-6 space-y-6">
      <PageMeta title="Detecção de EPI" description="Monitore o uso de equipamentos de proteção individual" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HardHat className="w-8 h-8 text-primary" />Detecção de EPIs
          </h1>
          <p className="text-muted-foreground mt-1">Monitore o uso de Equipamentos de Proteção Individual em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger className="w-[200px]"><Camera className="w-4 h-4 mr-2" /><SelectValue placeholder="Selecione câmera" /></SelectTrigger>
            <SelectContent>{cameras.map(cam => <SelectItem key={cam.id} value={cam.id}>{cam.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant={ppeDetection.isDetecting ? 'destructive' : 'default'} onClick={() => ppeDetection.isDetecting ? ppeDetection.stopContinuousDetection() : null}>
            {ppeDetection.isDetecting ? <><XCircle className="w-4 h-4 mr-2" />Parar</> : <><Activity className="w-4 h-4 mr-2" />Iniciar</>}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ComplianceCard title="Detecções Atuais" value={ppeDetection.stats.totalDetections} icon={Users} />
        <ComplianceCard title="Em Conformidade" value={ppeDetection.stats.compliantCount} icon={CheckCircle2} color="success" />
        <ComplianceCard title="Violações" value={ppeDetection.stats.violationCount} icon={AlertTriangle} color="danger" />
        <ComplianceCard
          title="Taxa de Conformidade"
          value={`${ppeDetection.stats.complianceRate.toFixed(1)}%`}
          icon={Shield}
          color={ppeDetection.stats.complianceRate >= 90 ? 'success' : ppeDetection.stats.complianceRate >= 70 ? 'warning' : 'danger'}
          trend={ppeDetection.stats.complianceRate >= 80 ? 'up' : 'down'}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="zones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="zones"><Settings className="w-4 h-4 mr-2" />Zonas PPE</TabsTrigger>
          <TabsTrigger value="violations"><AlertTriangle className="w-4 h-4 mr-2" />Violações Recentes</TabsTrigger>
          <TabsTrigger value="realtime"><Activity className="w-4 h-4 mr-2" />Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <PPEZonesTab zones={ppeDetection.zones} selectedCamera={selectedCamera} createZone={ppeDetection.createZone} deleteZone={ppeDetection.deleteZone} />
        </TabsContent>
        <TabsContent value="violations">
          <PPEViolationsTab violations={ppeDetection.violations} acknowledgeViolation={ppeDetection.acknowledgeViolation} />
        </TabsContent>
        <TabsContent value="realtime">
          <PPERealtimeTab detections={ppeDetection.detections} isDetecting={ppeDetection.isDetecting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
