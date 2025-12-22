import { ErrorBoundary } from "@/components/ErrorBoundary";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: PPEPage (Equipamentos de Proteção Individual)
 * 
 * Gerenciamento de zonas PPE e monitoramento de conformidade
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useCameras } from '@/hooks/useCameras';
import { usePPEDetection, PPE_LABELS, PPEType, PPEZoneConfig } from '@/hooks/usePPEDetection';
import { useI18n } from '@/contexts/i18n';
import { 
  HardHat,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Settings,
  Activity,
  TrendingUp,
  Users,
  Camera,
  Trash2,
  Edit,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function PPEIcon({ type, className }: { type: PPEType; className?: string }) {
  const icons: Record<PPEType, string> = {
    helmet: '🪖',
    vest: '🦺',
    goggles: '🥽',
    mask: '😷',
    gloves: '🧤',
    boots: '👢',
    earmuffs: '🎧',
    harness: '🪢',
  };
  return <span className={className}>{icons[type]}</span>;
}

function ComplianceCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'default'
}: { 
  title: string; 
  value: string | number; 
  icon: unknown;
  trend?: 'up' | 'down' | 'stable';
  color?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div role="main" className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", colorClasses[color])}>{value}</p>
          </div>
          <div className={cn("p-3 rounded-full bg-muted", colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className={cn("w-3 h-3", trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180')} />
            <span>{trend === 'up' ? 'Melhoria' : 'Queda'} vs. ontem</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PPEPage() {
  const { t } = useI18n();
  const { cameras } = useCameras();
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    requiredPPE: [] as PPEType[],
    alertOnViolation: true,
    gracePeriodSeconds: 5,
  });

  // Usar hook PPE para câmera selecionada
  const ppeDetection = usePPEDetection({
    cameraId: selectedCamera,
    cameraName: cameras.find(c => c.id === selectedCamera)?.name || '',
    config: {
      enabled: true,
      minConfidence: 0.6,
      detectionInterval: 2000,
      alertOnViolation: true,
      saveViolations: true,
      gracePeriodSeconds: 5,
    },
  });

  // Selecionar primeira câmera por padrão
  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0].id);
    }
  }, [cameras]);

  // Handler para adicionar zona
  const handleAddZone = async () => {
    if (!newZone.name || newZone.requiredPPE.length === 0) {
      toast.error('Preencha nome e selecione pelo menos um EPI');
      return;
    }

    const success = await ppeDetection.addZone({
      name: newZone.name,
      cameraId: selectedCamera,
      requiredPPE: newZone.requiredPPE,
      alertOnViolation: newZone.alertOnViolation,
      gracePeriodSeconds: newZone.gracePeriodSeconds,
      active: true,
    });

    if (success) {
      setIsAddingZone(false);
      setNewZone({
        name: '',
        requiredPPE: [],
        alertOnViolation: true,
        gracePeriodSeconds: 5,
      });
    }
  };

  // Toggle EPI na seleção
  const togglePPE = (type: PPEType) => {
    setNewZone(prev => ({
      ...prev,
      requiredPPE: prev.requiredPPE.includes(type)
        ? prev.requiredPPE.filter(t => t !== type)
        : [...prev.requiredPPE, type],
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div role="main" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HardHat className="w-8 h-8 text-primary" />
            {t('ppe.title', 'Detecção de EPIs')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('ppe.subtitle', 'Monitore o uso de Equipamentos de Proteção Individual em tempo real')}
          </p>
        </div>
        <div role="main" className="flex items-center gap-2">
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger className="w-[200px]">
              <Camera className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Selecione câmera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map(cam => (
                <SelectItem key={cam.id} value={cam.id}>
                  {cam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={ppeDetection.isRunning ? 'destructive' : 'default'}
            onClick={ppeDetection.toggle}
          >
            {ppeDetection.isRunning ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Parar
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Iniciar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ComplianceCard
          title="Detecções Atuais"
          value={ppeDetection.stats.totalDetections}
          icon={Users}
        />
        <ComplianceCard
          title="Em Conformidade"
          value={ppeDetection.stats.compliantCount}
          icon={CheckCircle2}
          color="success"
        />
        <ComplianceCard
          title="Violações"
          value={ppeDetection.stats.violationCount}
          icon={AlertTriangle}
          color="danger"
        />
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
          <TabsTrigger value="zones">
            <Settings className="w-4 h-4 mr-2" />
            Zonas PPE
          </TabsTrigger>
          <TabsTrigger value="violations">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Violações Recentes
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <Activity className="w-4 h-4 mr-2" />
            Monitoramento
          </TabsTrigger>
        </TabsList>

        {/* Tab: Zonas PPE */}
        <TabsContent value="zones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Zonas de EPI Obrigatório</CardTitle>
                <CardDescription>Configure áreas que requerem equipamentos de proteção específicos</CardDescription>
              </div>
              <Dialog open={isAddingZone} onOpenChange={setIsAddingZone}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Zona
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Zona PPE</DialogTitle>
                    <DialogDescription>
                      Defina uma área que requer uso de EPIs específicos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Zona</Label>
                      <Input
                        placeholder="Ex: Área de Produção"
                        value={newZone.name}
                        onChange={e => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EPIs Obrigatórios</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {(Object.keys(PPE_LABELS) as PPEType[]).map(type => (
                          <Button
                            key={type}
                            variant={newZone.requiredPPE.includes(type) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => togglePPE(type)}
                            className="flex flex-col h-16"
                          >
                            <PPEIcon type={type} className="text-xl" />
                            <span className="text-xs">{PPE_LABELS[type].pt}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div role="main" className="flex items-center justify-between">
                      <Label>Alertar violações</Label>
                      <Switch
                        checked={newZone.alertOnViolation}
                        onCheckedChange={v => setNewZone(prev => ({ ...prev, alertOnViolation: v }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Período de tolerância (segundos)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={newZone.gracePeriodSeconds}
                        onChange={e => setNewZone(prev => ({ ...prev, gracePeriodSeconds: parseInt(e.target.value) || 5 }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingZone(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddZone}>
                      Criar Zona
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {ppeDetection.zones.length === 0 ? (
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
                    {ppeDetection.zones.map(zone => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell>
                          <div role="main" className="flex gap-1">
                            {zone.requiredPPE.map(type => (
                              <Badge key={type} variant="outline">
                                <PPEIcon type={type} className="mr-1" />
                                {PPE_LABELS[type].pt}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={zone.alertOnViolation ? 'default' : 'secondary'}>
                            {zone.alertOnViolation ? 'Ativo' : 'Desativado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={zone.active ? 'default' : 'outline'}>
                            {zone.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => ppeDetection.deleteZone(zone.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Violações */}
        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <CardTitle>Violações Recentes</CardTitle>
              <CardDescription>Histórico de detecções de não conformidade</CardDescription>
            </CardHeader>
            <CardContent>
              {ppeDetection.recentViolations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
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
                    {ppeDetection.recentViolations.map(violation => (
                      <TableRow key={violation.id}>
                        <TableCell>
                          {format(new Date(violation.timestamp), 'dd/MM HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{violation.zoneName}</TableCell>
                        <TableCell>{violation.cameraName}</TableCell>
                        <TableCell>
                          <div role="main" className="flex gap-1">
                            {violation.missingItems.map(type => (
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
                              onClick={() => ppeDetection.acknowledgeViolation(violation.id)}
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
        </TabsContent>

        {/* Tab: Monitoramento em Tempo Real */}
        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Monitoramento em Tempo Real
                {ppeDetection.isRunning && (
                  <Badge variant="default" className="animate-pulse">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Analisando
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ppeDetection.currentDetections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma pessoa detectada no momento</p>
                  <p className="text-sm">
                    {ppeDetection.isRunning 
                      ? 'Aguardando detecções...' 
                      : 'Clique em "Iniciar" para começar o monitoramento'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ppeDetection.currentDetections.map(detection => (
                    <Card key={detection.personId} className={cn(
                      "border-2",
                      detection.compliant ? "border-green-500/50" : "border-red-500/50"
                    )}>
                      <CardContent className="pt-4">
                        <div role="main" className="flex items-center justify-between mb-2">
                          <Badge variant={detection.compliant ? 'default' : 'destructive'}>
                            {detection.compliant ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Conforme
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Não Conforme
                              </>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(detection.timestamp, 'HH:mm:ss')}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {detection.items.map(item => (
                            <div key={item.type} className="flex items-center justify-between">
                              <div role="main" className="flex items-center gap-2">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
