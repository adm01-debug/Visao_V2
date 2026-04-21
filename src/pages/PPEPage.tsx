/**
 * VISÃO - Página: Detecção de EPIs - Design Premium
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
import { HardHat, AlertTriangle, CheckCircle2, XCircle, Activity, Shield, Camera, Settings } from 'lucide-react';
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
    <div role="main" aria-label="Detecção de EPIs" className="min-h-screen bg-background">
      <PageMeta title="Detecção de EPI" description="Monitore o uso de equipamentos de proteção individual" />

      {/* Premium Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[hsl(var(--severity-medium))]/10 border border-[hsl(var(--severity-medium))]/20">
                <HardHat className="w-6 h-6 text-[hsl(var(--severity-medium))]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Detecção de EPIs</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Monitore o uso de Equipamentos de Proteção Individual em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger className="w-[200px] border-border/40">
                  <Camera className="w-4 h-4 mr-2" /><SelectValue placeholder="Selecione câmera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map(cam => <SelectItem key={cam.id} value={cam.id}>{cam.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant={ppeDetection.isDetecting ? 'destructive' : 'default'}
                onClick={() => ppeDetection.isDetecting ? ppeDetection.stopContinuousDetection() : null}
              >
                {ppeDetection.isDetecting ? <><XCircle className="w-4 h-4 mr-2" />Parar</> : <><Activity className="w-4 h-4 mr-2" />Iniciar</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ComplianceCard title="Detecções Atuais" value={ppeDetection.stats.totalDetections} icon={HardHat} />
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
          <TabsList className="bg-muted/50 border border-border/30">
            <TabsTrigger value="zones" className="gap-2"><Settings className="w-4 h-4" /><span className="hidden sm:inline">Zonas PPE</span></TabsTrigger>
            <TabsTrigger value="violations" className="gap-2"><AlertTriangle className="w-4 h-4" /><span className="hidden sm:inline">Violações</span></TabsTrigger>
            <TabsTrigger value="realtime" className="gap-2"><Activity className="w-4 h-4" /><span className="hidden sm:inline">Monitoramento</span></TabsTrigger>
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
    </div>
  );
}
