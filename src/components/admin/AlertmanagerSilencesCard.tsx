import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BellOff, ShieldAlert, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Matcher {
  name: string;
  value: string;
  isRegex: boolean;
}

interface Silence {
  id: string;
  matchers: Matcher[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
  status?: { state: string };
}

const DANGEROUS_VALUE = /^\.\*+$/;

function isDangerousMatcher(m: Matcher): boolean {
  const v = (m.value ?? '').trim();
  return !v || (m.isRegex && DANGEROUS_VALUE.test(v));
}

async function invokeSilence<T>(
  action: string,
  payload?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = 'POST'
): Promise<T> {
  const query = new URLSearchParams();
  if (action && method !== 'DELETE') query.set('action', action);
  const path = `alertmanager-silence${query.toString() ? `?${query.toString()}` : ''}`;
  const { data, error } = await supabase.functions.invoke(path, {
    method,
    body: method === 'GET' ? undefined : payload,
  });
  if (error) throw error;
  return data as T;
}

export function AlertmanagerSilencesCard() {
  const qc = useQueryClient();
  const [matchers, setMatchers] = useState<Matcher[]>([
    { name: 'alertname', value: '', isRegex: false },
  ]);
  const [duration, setDuration] = useState<number>(60);
  const [comment, setComment] = useState<string>('');
  const [justification, setJustification] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['alertmanager-silences'],
    queryFn: async () => {
      const res = await invokeSilence<{ silences?: Silence[] }>('list', undefined, 'GET');
      return res.silences ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleaned = matchers.filter((m) => m.name.trim() && m.value.trim());
      if (cleaned.length === 0) throw new Error('Adicione ao menos um matcher válido');
      if (cleaned.some(isDangerousMatcher))
        throw new Error('Matcher global (".*") não é permitido');
      if (comment.trim().length < 5) throw new Error('Comentário obrigatório (mín. 5 caracteres)');
      if (!Number.isInteger(duration) || duration < 5 || duration > 1440) {
        throw new Error('Duração inválida (5–1440 minutos)');
      }
      return invokeSilence<{ silenceID: string }>('create', {
        matchers: cleaned,
        durationMinutes: duration,
        comment: comment.trim(),
      });
    },
    onSuccess: (res) => {
      toast.success(`Silence criado: ${res.silenceID.slice(0, 8)}…`);
      setComment('');
      setMatchers([{ name: 'alertname', value: '', isRegex: false }]);
      qc.invalidateQueries({ queryKey: ['alertmanager-silences'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao criar silence'),
  });

  const expireMutation = useMutation({
    mutationFn: async (id: string) => {
      if (justification.trim().length < 5) {
        throw new Error('Justificativa obrigatória (mín. 5 caracteres) para expirar');
      }
      return invokeSilence(
        `?id=${encodeURIComponent(id)}`,
        { justification: justification.trim() },
        'DELETE'
      );
    },
    onSuccess: () => {
      toast.success('Silence expirado');
      setJustification('');
      qc.invalidateQueries({ queryKey: ['alertmanager-silences'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao expirar silence'),
  });

  const addMatcher = () =>
    setMatchers((prev) => [...prev, { name: '', value: '', isRegex: false }]);
  const removeMatcher = (idx: number) => setMatchers((prev) => prev.filter((_, i) => i !== idx));
  const updateMatcher = (idx: number, patch: Partial<Matcher>) =>
    setMatchers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <BellOff className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Alertmanager — Silences ativos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de criação */}
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldAlert className="h-4 w-4" />
            Criar novo silence
          </div>
          <div className="space-y-2">
            {matchers.map((m, idx) => {
              const dangerous = m.value.trim() && isDangerousMatcher(m);
              return (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="label (ex: alertname)"
                    value={m.name}
                    onChange={(e) => updateMatcher(idx, { name: e.target.value })}
                    className="w-40"
                    aria-label={`Nome do matcher ${idx + 1}`}
                  />
                  <Input
                    placeholder="valor"
                    value={m.value}
                    onChange={(e) => updateMatcher(idx, { value: e.target.value })}
                    className="w-56"
                    aria-label={`Valor do matcher ${idx + 1}`}
                    aria-invalid={dangerous ? true : undefined}
                  />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={m.isRegex}
                      onChange={(e) => updateMatcher(idx, { isRegex: e.target.checked })}
                      aria-label={`Regex ${idx + 1}`}
                    />
                    regex
                  </label>
                  {dangerous && <Badge variant="destructive">bloqueado</Badge>}
                  {matchers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMatcher(idx)}
                      aria-label={`Remover matcher ${idx + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addMatcher} aria-label="Adicionar matcher">
              <Plus className="mr-1 h-3 w-3" /> matcher
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="silence-duration">Duração (min)</Label>
              <Input
                id="silence-duration"
                type="number"
                min={5}
                max={1440}
                value={duration}
                onChange={(e) => setDuration(Number.parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="silence-comment">Motivo / ticket (mín. 5)</Label>
              <Input
                id="silence-comment"
                placeholder="INC-1234 — investigando"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            aria-label="Criar silence"
          >
            {createMutation.isPending ? 'Criando…' : 'Criar silence'}
          </Button>
        </div>

        {/* Justificativa global p/ expiração */}
        <div className="space-y-1">
          <Label htmlFor="silence-justification">Justificativa para expirar (mín. 5)</Label>
          <Textarea
            id="silence-justification"
            placeholder="Ex.: incidente encerrado no ticket INC-1234"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>

        {/* Lista de silences */}
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao listar: {(error as Error)?.message ?? 'erro'}
          </p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum silence ativo.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((s) => {
              const endsAt = new Date(s.endsAt);
              const active = s.status?.state === 'active';
              return (
                <li key={s.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-xs text-foreground truncate" title={s.id}>
                        {s.id}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {s.matchers?.map((m, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {m.name}
                            {m.isRegex ? '=~' : '='}
                            &quot;{m.value}&quot;
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Por {s.createdBy} · expira em{' '}
                        {formatDistanceToNow(endsAt, { locale: ptBR, addSuffix: true })}
                      </p>
                      {s.comment && (
                        <p className="text-xs text-muted-foreground italic">“{s.comment}”</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={active ? 'default' : 'secondary'}>
                        {s.status?.state ?? 'active'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => expireMutation.mutate(s.id)}
                        disabled={expireMutation.isPending}
                        aria-label={`Expirar silence ${s.id}`}
                      >
                        Expirar
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
