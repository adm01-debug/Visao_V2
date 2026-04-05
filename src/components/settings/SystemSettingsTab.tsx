import { Camera, AlertTriangle, Users, Activity, HardDrive, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { SettingsSection } from './SettingsSection';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { SystemStats, GeneralSettings, NotificationSettings, AnalysisSettings, FaceRecognitionSettings } from './types';

interface Props {
  stats: SystemStats;
  onClearData: (type: string) => void;
  generalSettings: GeneralSettings;
  notificationSettings: NotificationSettings;
  analysisSettings: AnalysisSettings;
  faceSettings: FaceRecognitionSettings;
}

export function SystemSettingsTab({ stats, onClearData, generalSettings, notificationSettings, analysisSettings, faceSettings }: Props) {
  const handleExport = () => {
    const data = {
      general: generalSettings, notifications: notificationSettings,
      analysis: analysisSettings, face: faceSettings, exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visao-config-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    toast.success('Configurações exportadas');
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Camera, color: 'text-primary', label: 'Câmeras', value: `${stats.onlineCameras}/${stats.totalCameras}` },
          { icon: AlertTriangle, color: 'text-warning', label: 'Alertas', value: stats.totalAlerts },
          { icon: Users, color: 'text-success', label: 'Pessoas', value: stats.totalPersons },
          { icon: Activity, color: 'text-primary', label: 'Zonas', value: stats.totalZones },
        ].map(({ icon: Icon, color, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SettingsSection title="Armazenamento" description="Uso de disco e banco de dados" icon={HardDrive}>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Espaço Utilizado</span>
              <span>{stats.storageUsed}% de {stats.storageTotal} GB</span>
            </div>
            <Progress value={stats.storageUsed} className="h-2" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Tamanho do Banco</span><span className="font-medium">{stats.dbSize}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Uptime</span><span className="font-medium">{stats.uptime}</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Manutenção" description="Limpeza de dados" icon={Trash2}>
        <div className="space-y-3">
          {[
            { type: 'alerts', title: 'Limpar Alertas', desc: 'Remove todos os alertas' },
            { type: 'history', title: 'Limpar Histórico', desc: 'Análises e reconhecimentos' },
            { type: 'zones', title: 'Limpar Eventos de Zonas', desc: 'Contagens e eventos' },
          ].map(({ type, title, desc }, i) => (
            <div key={type}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onClearData(type)}>Limpar</Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Backup & Exportação" description="Exportar configurações" icon={Download}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />Exportar Config
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
