import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useTestMode, type TestModeDuration, type TestModeScope } from '@/hooks/useTestMode';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Option {
  id: string;
  name: string;
}

interface Props {
  /** Escopo pré-definido. Quando informado, o seletor é ocultado. */
  fixedScope?: TestModeScope;
  /** IDs pré-selecionados. Usado com `fixedScope='camera'|'rule'`. */
  fixedScopeIds?: string[];
  /** Elemento que abre o diálogo (asChild). Default: botão padrão. */
  trigger?: React.ReactNode;
}

const DURATIONS: TestModeDuration[] = [5, 15, 30, 60];

export function TestModeDialog({ fixedScope, fixedScopeIds, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<TestModeScope>(fixedScope ?? 'all');
  const [scopeIds, setScopeIds] = useState<string[]>(fixedScopeIds ?? []);
  const [duration, setDuration] = useState<TestModeDuration>(15);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const { start } = useTestMode({ enableRealtime: false });

  useEffect(() => {
    if (!open || fixedScope || scope === 'all') return;
    const table = scope === 'camera' ? 'cameras' : 'rules';
    void supabase
      .from(table)
      .select('id, name')
      .order('name')
      .then(({ data }) => setOptions((data as Option[]) ?? []));
  }, [open, scope, fixedScope]);

  const toggleId = (id: string) =>
    setScopeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleStart = async () => {
    setLoading(true);
    const session = await start({
      scope,
      scopeIds: fixedScopeIds ?? scopeIds,
      durationMinutes: duration,
    });
    setLoading(false);
    if (session) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FlaskConical className="mr-2 h-4 w-4" />
            Modo teste
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-warning" />
            Ativar modo teste (dry-run)
          </DialogTitle>
          <DialogDescription>
            Durante a janela escolhida, o sistema continuará detectando pessoas fora do local e
            comportamentos suspeitos, mas <strong>não enviará</strong> notificações, Telegram,
            webhooks ou alertas definitivos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {!fixedScope && (
            <div className="space-y-2">
              <Label>Escopo</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => {
                  setScope(v as TestModeScope);
                  setScopeIds([]);
                }}
                className="grid grid-cols-3 gap-2"
              >
                {(['all', 'camera', 'rule'] as TestModeScope[]).map((s) => (
                  <Label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted"
                  >
                    <RadioGroupItem value={s} />
                    {s === 'all' ? 'Todos' : s === 'camera' ? 'Por câmera' : 'Por regra'}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {!fixedScope && scope !== 'all' && (
            <div className="space-y-2">
              <Label>Selecionar {scope === 'camera' ? 'câmeras' : 'regras'}</Label>
              <ScrollArea className="h-40 rounded-md border border-border p-2">
                {options.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
                ) : (
                  <ul className="space-y-1">
                    {options.map((o) => (
                      <li key={o.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`opt-${o.id}`}
                          checked={scopeIds.includes(o.id)}
                          onCheckedChange={() => toggleId(o.id)}
                        />
                        <Label
                          htmlFor={`opt-${o.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {o.name}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label>Duração</Label>
            <RadioGroup
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v) as TestModeDuration)}
              className="grid grid-cols-4 gap-2"
            >
              {DURATIONS.map((d) => (
                <Label
                  key={d}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted"
                >
                  <RadioGroupItem value={String(d)} />
                  {d} min
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleStart} disabled={loading}>
            {loading ? 'Iniciando…' : 'Iniciar modo teste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
