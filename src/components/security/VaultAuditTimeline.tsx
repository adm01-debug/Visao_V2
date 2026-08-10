import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { History, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VaultAuditRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  camera_id: string | null;
  kek_version_from: number | null;
  kek_version_to: number | null;
  affected_rows: number | null;
  success: boolean;
  error_code: string | null;
  ip: string | null;
  created_at: string;
}

interface CoverageAlert {
  total: number;
  enveloped: number;
  legacy: number;
  oldest_wrap: string | null;
  severity: 'ok' | 'warn' | 'critical';
}

const ACTIONS = [
  'all',
  'store',
  'reveal',
  'audit',
  'migrate_batch',
  'rotate_key',
  'rotate_dek',
  'rewrap_kek',
  'backfill_envelope',
  'stats',
];

export function VaultAuditTimeline() {
  const [rows, setRows] = useState<VaultAuditRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const [auditRes, covRes] = await Promise.all([
      supabase
        .from('camera_vault_audit')
        .select(
          'id, actor_id, actor_role, action, camera_id, kek_version_from, kek_version_to, affected_rows, success, error_code, ip, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('camera_vault_coverage_alerts').select('*').maybeSingle(),
    ]);
    if (auditRes.error) toast.error('Falha ao carregar auditoria do cofre');
    else setRows((auditRes.data ?? []) as VaultAuditRow[]);
    if (!covRes.error) setCoverage((covRes.data as unknown as CoverageAlert) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (action === 'all' ? rows : rows.filter((r) => r.action === action)),
    [action, rows]
  );

  const sevVariant =
    coverage?.severity === 'critical'
      ? 'destructive'
      : coverage?.severity === 'warn'
        ? 'secondary'
        : 'default';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Auditoria do Cofre (Fortress 6)
          </CardTitle>
          {coverage && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={sevVariant}>
                {coverage.severity === 'critical' ? (
                  <ShieldAlert className="mr-1 h-3 w-3" />
                ) : (
                  <ShieldCheck className="mr-1 h-3 w-3" />
                )}
                Cobertura: {coverage.severity.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {coverage.enveloped}/{coverage.total} envelopadas
                {coverage.legacy > 0 && ` · ${coverage.legacy} legadas`}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum registro para o filtro selecionado.
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={r.success ? 'default' : 'destructive'}>{r.action}</Badge>
                  {r.actor_role && (
                    <Badge variant="outline" className="text-xs">
                      {r.actor_role}
                    </Badge>
                  )}
                  {r.affected_rows !== null && (
                    <span className="text-xs text-muted-foreground">{r.affected_rows} linhas</span>
                  )}
                  {r.error_code && <span className="text-xs text-destructive">{r.error_code}</span>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
