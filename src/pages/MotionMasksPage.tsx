/**
 * Onda Shinobi 6 — Página de Máscaras de Movimento.
 * Seleciona câmera → editor visual + lista de máscaras existentes.
 */
import { useMemo, useState } from 'react';
import { Trash2, EyeOff, Eye, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageMeta } from '@/components/PageMeta';
import { MotionMaskEditor } from '@/components/motion/MotionMaskEditor';
import { useMotionMasks } from '@/hooks/useMotionMasks';
import { useCameras } from '@/hooks/useCameras';

export default function MotionMasksPage() {
  const { cameras } = useCameras();
  const [cameraId, setCameraId] = useState<string>('');
  const activeId = cameraId || cameras[0]?.id || '';
  const { masks, loading, create, toggle, remove } = useMotionMasks(activeId || undefined);

  const activeCamera = useMemo(() => cameras.find((c) => c.id === activeId), [cameras, activeId]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta
        title="Máscaras de Movimento · VISÃO"
        description="Desenhe regiões poligonais para incluir ou excluir áreas da detecção de movimento em cada câmera."
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Máscaras de Movimento</h1>
          <p className="text-sm text-muted-foreground">
            Desenhe áreas para <strong>incluir</strong> ou <strong>excluir</strong> da detecção — regras <em>exclude</em> vencem <em>include</em>.
          </p>
        </div>
        <div className="min-w-[240px]">
          <Select value={activeId} onValueChange={setCameraId}>
            <SelectTrigger aria-label="Selecionar câmera">
              <SelectValue placeholder="Selecione uma câmera…" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!activeId ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Cadastre uma câmera para começar a desenhar máscaras.
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Desenhar em: {activeCamera?.name ?? 'Câmera'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MotionMaskEditor
                cameraId={activeId}
                previewSrc={undefined}
                onSave={async (input) => { await create(input); }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Máscaras desta câmera ({masks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : masks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhuma máscara ainda. Desenhe uma no editor acima.
                </p>
              ) : (
                <ul className="space-y-2">
                  {masks.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 border border-border rounded-lg p-3">
                      <span
                        aria-hidden
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{m.name}</span>
                          <Badge variant={m.mode === 'include' ? 'default' : 'destructive'} className="gap-1">
                            {m.mode === 'include' ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                            {m.mode === 'include' ? 'Incluir' : 'Excluir'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {m.polygon.length} pontos · sens {m.sensitivity}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={m.enabled}
                        onCheckedChange={(v) => toggle(m.id, v)}
                        aria-label={`${m.enabled ? 'Desativar' : 'Ativar'} máscara ${m.name}`}
                      />
                      {m.enabled ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => remove(m.id)}
                        aria-label={`Remover ${m.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
