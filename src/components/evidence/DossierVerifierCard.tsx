/**
 * Onda 160 — Conferidor de dossiê recebido.
 *
 * Roda inteiramente no navegador, sem rede: é exatamente esse o valor. Quem
 * recebe um dossiê precisa poder conferir sem depender do sistema que emitiu —
 * conferência que passa pelo emissor não vale contra o emissor.
 */

import { useCallback, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSearch, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseDossier,
  verifyDossier,
  type DossierTone,
  type DossierVerification,
} from '@/lib/evidence/custodyDossier';

const TONE_CLASS: Record<DossierTone, string> = {
  positive: 'border-success/40',
  warning: 'border-warning/40',
  critical: 'border-destructive/40',
};

interface RejectedFile {
  readonly fileName: string;
  readonly message: string;
}

export function DossierVerifierCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    fileName: string;
    verification: DossierVerification;
  } | null>(null);
  const [rejected, setRejected] = useState<RejectedFile | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setResult(null);
    setRejected(null);
    try {
      const text = await file.text();
      const parsed = parseDossier(text);
      if (!parsed.ok) {
        setRejected({ fileName: file.name, message: parsed.message });
        return;
      }
      const verification = await verifyDossier(parsed.dossier);
      setResult({ fileName: file.name, verification });
    } catch (e) {
      setRejected({
        fileName: file.name,
        message: e instanceof Error ? e.message : 'não foi possível ler o arquivo',
      });
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSearch className="h-5 w-5 text-primary" aria-hidden="true" />
          Conferir dossiê recebido
        </CardTitle>
        <CardDescription>
          Confere um arquivo de dossiê no seu próprio navegador, sem enviar nada para o servidor.
          Serve para checar cópias entregues a terceiros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Arquivo de dossiê em JSON"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            {busy ? 'Conferindo…' : 'Selecionar arquivo JSON'}
          </Button>
        </div>

        {rejected && (
          <Alert variant="destructive">
            <AlertTitle>Arquivo não conferido</AlertTitle>
            <AlertDescription>
              {rejected.fileName}: {rejected.message}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div
            className={cn(
              'space-y-2 rounded-lg border-2 p-4',
              TONE_CLASS[result.verification.tone]
            )}
            aria-live="polite"
          >
            <p className="text-sm font-semibold">{result.verification.headline}</p>
            <p className="text-sm text-muted-foreground">{result.verification.detail}</p>
            <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex gap-1">
                <dt>Arquivo:</dt>
                <dd className="font-mono">{result.fileName}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Selo:</dt>
                <dd className="font-mono">{result.verification.rootHash.slice(0, 16)}…</dd>
              </div>
            </dl>
            <p className="border-t pt-2 text-xs text-muted-foreground">
              {result.verification.disclosure}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
