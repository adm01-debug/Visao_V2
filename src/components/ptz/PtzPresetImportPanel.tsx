import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface OnvifPreset {
  token: string;
  name: string;
  pan?: number;
  tilt?: number;
  zoom?: number;
}

interface Draft {
  token: string;
  name: string;
  preset_number: number;
  selected: boolean;
}

interface Props {
  cameraId: string;
  onImported?: () => void;
}

/**
 * Importa presets ONVIF já existentes na câmera, permitindo selecionar
 * quais importar e renomear individualmente antes de salvar.
 */
export function PtzPresetImportPanel({ cameraId, onImported }: Props) {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  const fetchList = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ptz-presets-import', {
        body: { camera_id: cameraId, mode: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.hint ?? data.error);
      return data as { presets: OnvifPreset[] };
    },
    onSuccess: (data) => {
      const presets = data.presets ?? [];
      if (presets.length === 0) {
        setDrafts([]);
        toast.info('Nenhum preset encontrado na câmera');
        return;
      }
      setDrafts(
        presets.map((p, idx) => {
          const n = Number(p.token);
          return {
            token: p.token,
            name: p.name?.trim() || `Preset ${idx + 1}`,
            preset_number: Number.isFinite(n) && n >= 1 && n <= 255 ? n : idx + 1,
            selected: true,
          };
        })
      );
      toast.success(`${presets.length} preset(s) encontrado(s) na câmera`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importSelected = useMutation({
    mutationFn: async () => {
      const selections = (drafts ?? [])
        .filter((d) => d.selected)
        .map((d) => ({
          token: d.token,
          name: d.name.trim() || `Preset ${d.preset_number}`,
          preset_number: d.preset_number,
        }));
      if (selections.length === 0) throw new Error('Selecione pelo menos um preset');
      const { data, error } = await supabase.functions.invoke('ptz-presets-import', {
        body: { camera_id: cameraId, mode: 'import', selections },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.hint ?? data.error);
      return data as { imported: number; errors?: Array<{ token: string; error: string }> };
    },
    onSuccess: (data) => {
      if (data.imported > 0) toast.success(`${data.imported} preset(s) importado(s)`);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} preset(s) não puderam ser importados`);
      }
      onImported?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (token: string, patch: Partial<Draft>) =>
    setDrafts((prev) =>
      prev ? prev.map((d) => (d.token === token ? { ...d, ...patch } : d)) : prev
    );

  const toggleAll = (value: boolean) =>
    setDrafts((prev) => (prev ? prev.map((d) => ({ ...d, selected: value })) : prev));

  const selectedCount = (drafts ?? []).filter((d) => d.selected).length;

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Importar presets da câmera</p>
          <p className="text-xs text-muted-foreground">
            Traz presets já configurados na câmera via ONVIF e permite renomear.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchList.mutate()}
          disabled={fetchList.isPending}
        >
          {fetchList.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : drafts ? (
            <RefreshCw className="w-4 h-4 mr-1.5" />
          ) : (
            <Download className="w-4 h-4 mr-1.5" />
          )}
          {drafts ? 'Atualizar' : 'Buscar presets'}
        </Button>
      </div>

      {drafts && drafts.length === 0 && (
        <Alert>
          <AlertTitle>Nenhum preset na câmera</AlertTitle>
          <AlertDescription>
            A câmera não retornou presets ONVIF. Você pode criar novos usando os controles acima.
          </AlertDescription>
        </Alert>
      )}

      {drafts && drafts.length > 0 && (
        <div className="rounded-md border border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ptz-import-all"
                checked={selectedCount === drafts.length}
                onCheckedChange={(v) => toggleAll(Boolean(v))}
              />
              <label htmlFor="ptz-import-all" className="cursor-pointer">
                Selecionar todos ({selectedCount}/{drafts.length})
              </label>
            </div>
            <Badge variant="secondary">{drafts.length} na câmera</Badge>
          </div>
          <ScrollArea className="h-56">
            <ul className="divide-y divide-border/60">
              {drafts.map((d) => (
                <li key={d.token} className="flex items-center gap-2 px-3 py-2">
                  <Checkbox
                    checked={d.selected}
                    onCheckedChange={(v) => update(d.token, { selected: Boolean(v) })}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={255}
                    className="h-8 w-16"
                    value={d.preset_number}
                    onChange={(e) =>
                      update(d.token, {
                        preset_number: Math.max(1, Math.min(255, Number(e.target.value) || 1)),
                      })
                    }
                  />
                  <Input
                    className="h-8 flex-1"
                    maxLength={60}
                    value={d.name}
                    onChange={(e) => update(d.token, { name: e.target.value })}
                    placeholder={`Preset ${d.preset_number}`}
                  />
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px]"
                    title={`Token ONVIF: ${d.token}`}
                  >
                    {d.token.slice(0, 8)}
                  </Badge>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <div className="flex items-center justify-end border-t border-border/60 bg-muted/20 px-3 py-2">
            <Button
              size="sm"
              onClick={() => importSelected.mutate()}
              disabled={importSelected.isPending || selectedCount === 0}
            >
              {importSelected.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Importar {selectedCount} selecionado(s)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
