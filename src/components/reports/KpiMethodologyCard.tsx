/**
 * VISÃO — Seção "Como é calculado"
 *
 * Explica, de forma auditável, quais eventos e quais janelas de tempo
 * entram em cada KPI do Relatório Semanal, refletindo os critérios ativos
 * configurados pelo usuário.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Info } from 'lucide-react';
import {
  EVENT_TYPE_LABEL,
  SEVERITY_LABEL,
  WEEKDAY_LABEL,
  PRODUCTIVITY_SEVERITIES,
  includesEventType,
  type ProductivityConfig,
} from '@/lib/productivityConfig';

export interface KpiMethodologyCardProps {
  /** Critérios de produtividade atualmente aplicados. */
  config: ProductivityConfig;
  /** Janela do relatório em dias (7, 14, 30...). */
  rangeDays: number;
  className?: string;
}

interface KpiExplanation {
  id: string;
  title: string;
  source: string;
  included: string[];
  excluded: string[];
  formula: string;
  active: boolean;
}

function buildWindowLabel(config: ProductivityConfig): string {
  const crossesMidnight = config.windowStart > config.windowEnd;
  return `${config.windowStart}–${config.windowEnd}${crossesMidnight ? ' (turno noturno, cruza a meia-noite)' : ''}`;
}

function buildWeekdaysLabel(config: ProductivityConfig): string {
  if (config.weekdays.length === 7) return 'todos os dias da semana';
  if (config.weekdays.length === 0) return 'nenhum dia selecionado (resultado sempre zero)';
  return config.weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABEL[d])
    .join(', ');
}

function buildSeveritiesLabel(config: ProductivityConfig): string {
  if (config.severities.length === PRODUCTIVITY_SEVERITIES.length) return 'todas as severidades';
  if (config.severities.length === 0) return 'nenhuma severidade selecionada';
  return config.severities.map((s) => SEVERITY_LABEL[s]).join(', ');
}

export function KpiMethodologyCard({ config, rangeDays, className }: KpiMethodologyCardProps) {
  const windowLabel = buildWindowLabel(config);
  const weekdaysLabel = buildWeekdaysLabel(config);
  const severitiesLabel = buildSeveritiesLabel(config);
  const periodLabel = `últimos ${rangeDays} dias (do início do dia inicial até o fim do dia atual)`;

  const kpis: KpiExplanation[] = [
    {
      id: 'incidentes',
      title: 'Incidentes',
      source: 'Tabela de alertas (campo de data: horário do disparo do alerta).',
      included: [
        `Período: ${periodLabel}`,
        `Janela horária: ${windowLabel}`,
        `Dias considerados: ${weekdaysLabel}`,
        `Severidades: ${severitiesLabel}`,
      ],
      excluded: [
        'Alertas fora da janela horária configurada',
        'Alertas com severidade não selecionada',
        !includesEventType(config, 'alerts')
          ? 'Tipo “Alertas / incidentes” está desativado nos critérios'
          : '',
      ].filter(Boolean),
      formula: 'Incidentes = contagem de alertas que passam por todos os filtros acima.',
      active: includesEventType(config, 'alerts'),
    },
    {
      id: 'panico',
      title: 'Eventos de pânico',
      source: 'Contagem de acionamentos do botão de pânico no período.',
      included: [`Período: ${periodLabel}`, 'Todos os acionamentos registrados no período'],
      excluded: [
        'Não sofre filtro por severidade',
        !includesEventType(config, 'panic')
          ? 'Tipo “Eventos de pânico” está desativado nos critérios'
          : '',
      ].filter(Boolean),
      formula: 'Pânico = total de acionamentos no período (0 quando o tipo está desativado).',
      active: includesEventType(config, 'panic'),
    },
    {
      id: 'mtta',
      title: 'MTTA (minutos)',
      source: 'Alertas já filtrados que possuem horário de reconhecimento (acknowledged).',
      included: [
        'Somente alertas com reconhecimento registrado',
        `Mesmos filtros de janela e severidade dos Incidentes: ${windowLabel}`,
      ],
      excluded: [
        'Alertas sem reconhecimento (não entram na média)',
        'Alertas fora dos critérios de incidentes',
      ],
      formula:
        'MTTA = média de (horário do reconhecimento − horário do disparo), em minutos, sobre os alertas reconhecidos.',
      active: includesEventType(config, 'alerts'),
    },
    {
      id: 'reconhecimentos',
      title: 'Reconhecimentos',
      source: 'Registros de reconhecimento facial (campo de data: timestamp do reconhecimento).',
      included: [
        `Período: ${periodLabel}`,
        `Janela horária: ${windowLabel}`,
        `Dias considerados: ${weekdaysLabel}`,
      ],
      excluded: [
        'Reconhecimentos fora da janela horária ou dos dias configurados',
        !includesEventType(config, 'recognitions')
          ? 'Tipo “Reconhecimentos” está desativado nos critérios'
          : '',
      ].filter(Boolean),
      formula:
        'Reconhecimentos = total de registros filtrados. Taxa = registros com pessoa identificada ÷ total filtrado. Pessoas únicas = contagem distinta de identidades.',
      active: includesEventType(config, 'recognitions'),
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" aria-hidden="true" />
          Como é calculado
        </CardTitle>
        <CardDescription>
          Cada KPI abaixo mostra a fonte dos dados, os filtros aplicados e a fórmula exata usada no
          relatório.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(EVENT_TYPE_LABEL).map(([key, label]) => {
            const enabled = includesEventType(config, key as keyof typeof EVENT_TYPE_LABEL);
            return (
              <Badge key={key} variant={enabled ? 'default' : 'outline'}>
                {label}: {enabled ? 'incluído' : 'excluído'}
              </Badge>
            );
          })}
        </div>

        <Accordion type="single" collapsible className="w-full">
          {kpis.map((kpi) => (
            <AccordionItem key={kpi.id} value={kpi.id}>
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  {kpi.title}
                  {!kpi.active && (
                    <Badge variant="outline" className="text-xs">
                      desativado
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Fonte: </span>
                  {kpi.source}
                </p>
                <div>
                  <p className="font-medium text-foreground">Entra no cálculo</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    {kpi.included.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Não entra no cálculo</p>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    {kpi.excluded.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p className="rounded-md bg-muted p-3 text-foreground">{kpi.formula}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-4 text-xs text-muted-foreground">
          Os critérios são pessoais e ficam salvos na sua conta — alterá-los recalcula KPIs,
          gráficos e o PDF.
        </p>
      </CardContent>
    </Card>
  );
}
