/**
 * VISÃO - Banner de migração para InsightFace ArcFace 512D.
 * Exibido em Settings → Face quando há pessoas com encoding legado.
 */
import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useInsightFace } from '@/lib/insightface';
import { useToast } from '@/hooks/use-toast';

export function InsightFaceMigrationBanner() {
  const { pendingMigration, migrateBatch } = useInsightFace();
  const { toast } = useToast();
  const [migrated, setMigrated] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const total = pendingMigration.data ?? 0;
  const progress = total + migrated === 0 ? 100 : (migrated / (total + migrated)) * 100;

  if (pendingMigration.isLoading) return null;
  if (total === 0 && migrated === 0) {
    return (
      <Alert className="border-primary/40 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertTitle>InsightFace ArcFace ativo</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Todas as pessoas cadastradas estão usando embeddings 512D do modelo ArcFace r100.
        </AlertDescription>
      </Alert>
    );
  }

  const runMigration = async () => {
    setIsRunning(true);
    try {
      let remaining = total;
      while (remaining > 0) {
        const result = await migrateBatch.mutateAsync(10);
        setMigrated((m) => m + result.succeeded);
        remaining = result.remaining;
        if (result.failed > 0) {
          toast({
            title: `${result.failed} falhas neste lote`,
            description: result.errors[0]?.message ?? 'Ver logs',
            variant: 'destructive',
          });
        }
        if (result.processed === 0) break;
      }
      toast({
        title: 'Migração concluída',
        description: `${migrated} pessoas migradas para InsightFace ArcFace 512D.`,
      });
    } catch (err) {
      toast({
        title: 'Migração interrompida',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Alert className="border-warning/40 bg-warning/5">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle>Migração para InsightFace ArcFace disponível</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-muted-foreground">
          {total} pessoa{total === 1 ? '' : 's'} ainda usa{total === 1 ? '' : 'm'} o modelo legado
          face-api.js (128D). Migre para o ArcFace r100 (512D) para reconhecimento com precisão
          superior a 99.8% (LFW benchmark).
        </p>
        {isRunning && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {migrated} de {total + migrated} migradas
            </p>
          </div>
        )}
        <Button
          onClick={runMigration}
          disabled={isRunning || total === 0}
          size="sm"
        >
          {isRunning ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Migrando…</>
          ) : (
            <>Migrar agora ({total})</>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
