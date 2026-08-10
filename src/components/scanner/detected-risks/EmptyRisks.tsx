import { EMPTY_ICON } from './types';

export function EmptyRisks() {
  const Icon = EMPTY_ICON;
  return (
    <div className="py-10 text-center" role="status">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
      <p className="mt-2 text-sm font-medium text-foreground">Nenhum risco detectado</p>
      <p className="text-xs text-muted-foreground">
        O scanner não identificou ameaças no último ciclo.
      </p>
    </div>
  );
}
