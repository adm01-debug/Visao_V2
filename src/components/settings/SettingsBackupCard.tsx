import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileJson, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { humanizeFunctionError } from '@/lib/edgeFunctionErrors';
import { toast } from 'sonner';

const SCHEMA_VERSION = '1.0.0';

type BackupCounts = { cameras: number; zones: number; rules: number; notifications: number };

type BackupPayload = {
  schema_version?: string;
  exported_at?: string;
  data?: {
    cameras?: unknown[];
    zones?: unknown[];
    rules?: unknown[];
    notifications?: unknown[];
  };
};

// Contrato real da RPC `import_settings_backup`: { imported: {...}, updated, skipped }
type ImportResult = {
  imported?: { cameras?: number; zones?: number; rules?: number; notifications?: number };
  updated?: number;
  skipped?: number;
};

const COUNT_LABELS: Array<[keyof BackupCounts, string]> = [
  ['cameras', 'câmeras'],
  ['zones', 'zonas'],
  ['rules', 'regras'],
  ['notifications', 'notificações'],
];

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function countOf(payload: BackupPayload): BackupCounts {
  const data = payload.data ?? {};
  return {
    cameras: listOf(data.cameras).length,
    zones: listOf(data.zones).length,
    rules: listOf(data.rules).length,
    notifications: listOf(data.notifications).length,
  };
}

function describe(counts: BackupCounts): string {
  return COUNT_LABELS.filter(([key]) => counts[key] > 0)
    .map(([key, label]) => `${counts[key]} ${label}`)
    .join(', ');
}

/**
 * Exporta e importa a configuração persistida (câmeras, zonas, regras,
 * notificações) via edge function `settings-backup`. O backup nunca inclui
 * segredos: a função aplica whitelist de campos e descarta URLs com credenciais.
 */
export function SettingsBackupCard() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<{ payload: BackupPayload; counts: BackupCounts } | null>(
    null
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    const { data, error } = await supabase.functions.invoke('settings-backup', { method: 'GET' });
    setExporting(false);
    if (error) {
      const { message } = await humanizeFunctionError(error, 'Não foi possível gerar o backup');
      toast.error(message);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visao-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Backup gerado (${describe(countOf(data as BackupPayload)) || 'vazio'})`);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    setPending(null);
    setFileName(file.name);
    let parsed: BackupPayload;
    try {
      parsed = JSON.parse(await file.text()) as BackupPayload;
    } catch {
      toast.error('Arquivo não é um JSON válido');
      return;
    }
    if (
      parsed.data !== undefined &&
      (typeof parsed.data !== 'object' || parsed.data === null || Array.isArray(parsed.data))
    ) {
      toast.error('Arquivo inválido: o campo "data" deve ser um objeto');
      return;
    }
    if (parsed.schema_version !== SCHEMA_VERSION) {
      toast.error(
        `Backup incompatível: esperado schema ${SCHEMA_VERSION}, recebido ${parsed.schema_version ?? 'nenhum'}`
      );
      return;
    }
    setPending({ payload: parsed, counts: countOf(parsed) });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setImporting(true);
    const { data, error } = await supabase.functions.invoke('settings-backup', {
      method: 'POST',
      body: {
        schema_version: SCHEMA_VERSION,
        data: pending.payload.data ?? {},
        conflict_strategy: 'skip',
      },
    });
    setImporting(false);
    if (error) {
      const { message } = await humanizeFunctionError(error, 'Importação falhou');
      toast.error(message);
      return;
    }
    const summary = (data?.data ?? data ?? {}) as ImportResult;
    const inserted = summary.imported ?? {};
    const totalInserted =
      (inserted.cameras ?? 0) +
      (inserted.zones ?? 0) +
      (inserted.rules ?? 0) +
      (inserted.notifications ?? 0);
    const skipped = summary.skipped ?? 0;
    setResult(
      `${totalInserted} registro(s) importado(s)` +
        (skipped > 0 ? `, ${skipped} ignorado(s) (já existiam ou sem vínculo válido)` : '')
    );
    setPending(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
    toast.success('Configuração importada');
  };

  const handleCancel = () => {
    setPending(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Backup da configuração
        </CardTitle>
        <CardDescription>
          Leva câmeras, zonas, regras e notificações para um arquivo JSON e traz de volta em outro
          ambiente. Senhas e URLs com credenciais ficam de fora do arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Gerando…' : 'Exportar configuração'}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            Escolher arquivo para importar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Arquivo de backup para importar"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        {fileName && !pending && (
          <p className="text-sm text-muted-foreground">Arquivo selecionado: {fileName}</p>
        )}

        {pending && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {describe(pending.counts) || 'Arquivo sem registros'} — {fileName}
            </p>
            <p className="text-sm text-muted-foreground">
              Registros já existentes são preservados; a importação só adiciona o que falta. Zonas
              de câmeras que não existem no ambiente são ignoradas.
            </p>
            {pending.counts.notifications > 0 && (
              <p className="text-xs text-muted-foreground">
                {pending.counts.notifications} configuração(ões) de notificação serão criadas no seu
                usuário.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={importing}>
                {importing ? 'Importando…' : 'Confirmar importação'}
              </Button>
              <Button variant="ghost" onClick={handleCancel} disabled={importing}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {result && (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            {result}
          </p>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium">O que vai no arquivo</p>
          <p className="text-sm text-muted-foreground">
            Somente identificação e conteúdo de configuração; nenhuma credencial.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Câmeras: nome, local e estado</li>
            <li>Zonas: nome, pontos do polígono e a câmera dona</li>
            <li>Regras: nome, descrição, condições, ações e se está ativa</li>
            <li>Notificações: canais, filtros de severidade e horários</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
