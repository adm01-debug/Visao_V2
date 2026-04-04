import { useState, useEffect, useCallback } from 'react';
import { Camera, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { ZoneEditor } from '@/components/ZoneEditor';
import { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { zoneTypeConfig, defaultColors, parsePointsData, type ZoneType, type DbZone, type ZoneFormData } from './zonesConfig';

interface ZoneEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  camera: any;
  zone?: DbZone | null;
  onSave: (data: TablesInsert<'zones'> | TablesUpdate<'zones'>) => Promise<void>;
}

export function ZoneEditorSheet({ isOpen, onClose, camera, zone, onSave }: ZoneEditorSheetProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ZoneFormData>({
    name: '', type: 'counting', color: defaultColors[0], is_active: true, pointsData: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'rectangle' | 'polygon' | 'line'>('rectangle');
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    if (zone) {
      const pointsData = parsePointsData(zone.points);
      setFormData({ name: zone.name, type: zone.type as ZoneType, color: zone.color || defaultColors[0], is_active: zone.is_active, pointsData });
      setOpacity(pointsData?.opacity || 0.3);
    } else {
      setFormData({ name: '', type: 'counting', color: defaultColors[Math.floor(Math.random() * defaultColors.length)], is_active: true, pointsData: null });
      setOpacity(0.3);
    }
  }, [zone, isOpen]);

  const handleZoneDrawn = useCallback((points: { x: number; y: number }[]) => {
    const shape = drawingMode === 'line' ? 'line' : drawingMode === 'rectangle' ? 'rectangle' : 'polygon';
    setFormData(f => ({ ...f, pointsData: { shape, coordinates: points, opacity } }));
    toast.success(`Zona desenhada com ${points.length} pontos`);
  }, [drawingMode, opacity]);

  const handleSubmit = async () => {
    if (!formData.name) { toast.error('Nome é obrigatório'); return; }
    if (!formData.pointsData || formData.pointsData.coordinates.length < 2) { toast.error('Desenhe a zona no vídeo'); return; }
    if (!user?.id) { toast.error('Usuário não autenticado'); return; }

    setIsSubmitting(true);
    try {
      const pointsWithOpacity = { ...formData.pointsData, opacity };
      if (zone) {
        await onSave({ name: formData.name, type: formData.type, color: formData.color, is_active: formData.is_active, points: pointsWithOpacity as unknown });
      } else {
        await onSave({ name: formData.name, type: formData.type, color: formData.color, is_active: formData.is_active, points: pointsWithOpacity as unknown, camera_id: camera?.id, user_id: user.id });
      }
      onClose();
      toast.success(zone ? 'Zona atualizada' : 'Zona criada');
    } catch { toast.error('Erro ao salvar'); } finally { setIsSubmitting(false); }
  };

  const selectedType = zoneTypeConfig[formData.type];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{zone ? 'Editar Zona' : 'Criar Nova Zona'}</SheetTitle>
          <SheetDescription>Câmera: {camera?.name}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Desenhar Zona</Label>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                {(['rectangle', 'polygon', 'line'] as const).map(mode => (
                  <Button key={mode} variant={drawingMode === mode ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setDrawingMode(mode)}>
                    {mode === 'rectangle' ? 'Retângulo' : mode === 'polygon' ? 'Polígono' : 'Linha'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative border-2 border-dashed border-muted">
              {camera?.stream_url ? (
                <VideoStreamPlayer cameraId={camera.id} streamUrl={camera.stream_url} protocol={camera.stream_protocol || 'hls'} cameraName={camera.name} />
              ) : camera?.thumbnail ? (
                <img src={camera.thumbnail} alt={camera.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted"><Camera className="w-12 h-12 text-muted-foreground" /></div>
              )}
              <div className="absolute inset-0">
                <ZoneEditor
                  existingZones={formData.pointsData ? [{ id: 'temp', name: formData.name || 'Nova Zona', type: formData.type, geometry: { shape: formData.pointsData.shape, points: formData.pointsData.coordinates }, color: formData.color, opacity, enabled: true } as unknown] : []}
                  onZoneCreated={(z) => handleZoneDrawn(z.geometry?.points || [])}
                  selectedColor={formData.color}
                  drawingMode={drawingMode}
                />
              </div>
            </div>
            {formData.pointsData && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
                <Check className="w-4 h-4" />
                Zona desenhada: {formData.pointsData.shape} com {formData.pointsData.coordinates.length} pontos
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setFormData(f => ({ ...f, pointsData: null }))}>Limpar</Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome da Zona *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Entrada Principal" />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(f => ({ ...f, type: v as ZoneType }))}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(zoneTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2"><div className={cn('w-2 h-2 rounded-full', config.bgColor)} />{config.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{selectedType?.description}</p>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-2 mt-2">
                {defaultColors.map(color => (
                  <button key={color} className={cn('w-7 h-7 rounded-lg transition-all', formData.color === color && 'ring-2 ring-offset-2 ring-primary')} style={{ backgroundColor: color }} onClick={() => setFormData(f => ({ ...f, color }))} />
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Opacidade: {Math.round(opacity * 100)}%</Label>
              <Slider value={[opacity * 100]} onValueChange={([v]) => setOpacity(v / 100)} min={10} max={80} step={5} className="mt-2" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div><p className="text-sm font-medium">Zona Ativa</p><p className="text-xs text-muted-foreground">Desative para pausar monitoramento</p></div>
            <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))} />
          </div>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.pointsData} className="flex-1">
              {isSubmitting ? 'Salvando...' : (zone ? 'Atualizar' : 'Criar Zona')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
