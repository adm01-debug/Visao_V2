/**
 * Onda Shinobi 6 — Página de Máscaras de Movimento.
 * Seleciona câmera → editor visual + lista de máscaras existentes.
 */
import { useMemo, useState } from 'react';
import { Trash2, EyeOff, Eye, ShieldCheck, ShieldOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageMeta } from '@/components/PageMeta';
import { MotionMaskEditor } from '@/components/motion/MotionMaskEditor';
import { useMotionMasks } from '@/hooks/useMotionMasks';
import type { MaskMode, MotionMask } from '@/hooks/useMotionMasks';
import { useCameras } from '@/hooks/useCameras';
import { PageContent } from '@/components/layout/MainLayout';
import { editMaskSchema } from '@/lib/motionMaskEditSchema';

export default function MotionMasksPage() {
  const { cameras } = useCameras();
  const [cameraId, setCameraId] = useState<string>('');
  const activeId = cameraId || cameras[0]?.id || '';
  const { masks, loading, create, update, toggle, remove } = useMotionMasks(activeId || undefined);

  // Edição de nome/regra/sensibilidade sem redesenhar o polígono (o desenho é do editor acima).
  const [editing, setEditing] = useState<MotionMask | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftMode, setDraftMode] = useState<MaskMode>('include');
  const [draftSensitivity, setDraftSensitivity] = useState(50);
  const [saving, setSaving] = useState(false);

  const openEdit = (mask: MotionMask) => {
    setDraftName(mask.name);
    setDraftMode(mask.mode);
    setDraftSensitivity(mask.sensitivity);
    setEditing(mask);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const parsed = editMaskSchema.safeParse({
      name: draftName,
      mode: draftMode,
      sensitivity: draftSensitivity,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revise os campos da máscara.');
      return;
    }
    setSaving(true);
    try {
      const ok = await update(editing.id, parsed.data);
      if (ok) setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const activeCamera = useMemo(() => cameras.find((c) => c.id === activeId), [cameras, activeId]);

  return (
    <PageContent className="p-4 sm:p-6">
      <PageMeta
        title="Máscaras de Movimento · VISÃO"
        description="Desenhe regiões poligonais para incluir ou excluir áreas da detecção de movimento em cada câmera."
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Máscaras de Movimento</h1>
          <p className="text-sm text-muted-foreground">
            Desenhe áreas para <strong>incluir</strong> ou <strong>excluir</strong> da detecção —
            regras <em>exclude</em> vencem <em>include</em>.
          </p>
        </div>
        <div className="min-w-[240px]">
          <Select value={activeId} onValueChange={setCameraId}>
            <SelectTrigger aria-label="Selecionar câmera">
              <SelectValue placeholder="Selecione uma câmera…" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!activeId ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Cadastre uma câmera para começar a desenhar máscaras.
          </CardContent>
        </Card>
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
                onSave={async (input) => {
                  await create(input);
                }}
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
                    <li
                      key={m.id}
                      className="flex items-center gap-3 border border-border rounded-lg p-3"
                    >
                      <span
                        aria-hidden
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{m.name}</span>
                          <Badge
                            variant={m.mode === 'include' ? 'default' : 'destructive'}
                            className="gap-1"
                          >
                            {m.mode === 'include' ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <ShieldOff className="w-3 h-3" />
                            )}
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
                      {m.enabled ? (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(m)}
                        aria-label={`Editar ${m.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
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

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar máscara</DialogTitle>
            <DialogDescription>
              Nome, regra e sensibilidade. Para mudar o desenho, crie uma nova máscara no editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-mask-name">Nome</Label>
              <Input
                id="edit-mask-name"
                value={draftName}
                maxLength={80}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mask-mode">Regra</Label>
              <Select value={draftMode} onValueChange={(v) => setDraftMode(v as MaskMode)}>
                <SelectTrigger id="edit-mask-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="include">Incluir — só o interior é analisado</SelectItem>
                  <SelectItem value="exclude">Excluir — o interior é ignorado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mask-sensitivity">Sensibilidade (0 a 100)</Label>
              <Input
                id="edit-mask-sensitivity"
                type="number"
                min={0}
                max={100}
                value={draftSensitivity}
                onChange={(e) => setDraftSensitivity(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving || !draftName.trim()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
