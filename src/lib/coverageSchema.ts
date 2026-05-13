/**
 * VISÃO - Coverage report Zod schema + safe parser
 *
 * Valida o `coverage-report.json` retornado por `scripts/build-coverage-report.mjs`
 * antes de entregar ao dashboard. Aplica fallbacks seguros (zeros) para campos
 * ausentes/inválidos, evitando crash caso o JSON esteja incompleto, malformado
 * ou em uma versão antiga do schema.
 */
import { z } from "zod";
import type { CoverageReport } from "@/types/coverage";

const metricSchema = z
  .object({
    pct: z.number().finite().min(0).max(100).catch(0),
    total: z.number().int().nonnegative().catch(0),
    covered: z.number().int().nonnegative().catch(0),
    skipped: z.number().int().nonnegative().catch(0),
  })
  .catch(() => ({ pct: 0, total: 0, covered: 0, skipped: 0 }));

const totalsSchema = z
  .object({
    statements: metricSchema,
    branches: metricSchema,
    functions: metricSchema,
    lines: metricSchema,
  })
  .catch(() => ({
    statements: { pct: 0, total: 0, covered: 0, skipped: 0 },
    branches: { pct: 0, total: 0, covered: 0, skipped: 0 },
    functions: { pct: 0, total: 0, covered: 0, skipped: 0 },
    lines: { pct: 0, total: 0, covered: 0, skipped: 0 },
  }));

const fileEntrySchema = z.object({
  path: z.string().min(1),
  statements: metricSchema,
  branches: metricSchema,
  functions: metricSchema,
  lines: metricSchema,
});

const safeFilesSchema = z
  .array(z.unknown())
  .catch(() => [])
  .transform((arr) =>
    arr
      .map((entry) => {
        const parsed = fileEntrySchema.safeParse(entry);
        return parsed.success ? parsed.data : null;
      })
      .filter((e): e is z.infer<typeof fileEntrySchema> => e !== null),
  );

const alertSchema = z
  .object({
    threshold: z.number().finite().nonnegative().catch(2),
    delta: z.number().finite().nullable().catch(null),
    dropExceeded: z.boolean().catch(false),
    previousPct: z.number().finite().min(0).max(100).nullable().catch(null),
    previousGeneratedAt: z.string().nullable().catch(null),
  })
  .optional();

export const coverageReportSchema = z
  .object({
    generatedAt: z
      .string()
      .min(1)
      .catch(() => new Date().toISOString()),
    totals: totalsSchema,
    files: safeFilesSchema,
    alert: alertSchema,
  })
  .catch(() => ({
    generatedAt: new Date().toISOString(),
    totals: {
      statements: { pct: 0, total: 0, covered: 0, skipped: 0 },
      branches: { pct: 0, total: 0, covered: 0, skipped: 0 },
      functions: { pct: 0, total: 0, covered: 0, skipped: 0 },
      lines: { pct: 0, total: 0, covered: 0, skipped: 0 },
    },
    files: [],
    alert: undefined,
  }));

export interface ParseCoverageResult {
  report: CoverageReport;
  /** True quando o JSON original era inválido/parcial e o schema aplicou fallbacks. */
  degraded: boolean;
  /** Mensagens de aviso enriquecidas com o que estava faltando. */
  warnings: string[];
}

/**
 * Parse seguro do JSON de coverage. Sempre retorna um `CoverageReport` válido,
 * mesmo se a entrada for `null`, objeto vazio, ou estrutura inesperada.
 */
export function parseCoverageReport(raw: unknown): ParseCoverageResult {
  const warnings: string[] = [];
  let degraded = false;

  if (raw == null || typeof raw !== "object") {
    warnings.push("JSON ausente ou não é um objeto — usando fallback vazio.");
    degraded = true;
    return {
      report: coverageReportSchema.parse({}),
      degraded,
      warnings,
    };
  }

  // Pré-checagens para warnings descritivos (o schema já tolera tudo via .catch).
  const obj = raw as Record<string, unknown>;
  if (typeof obj.generatedAt !== "string") {
    warnings.push("Campo `generatedAt` ausente/inválido.");
    degraded = true;
  }
  if (obj.totals == null || typeof obj.totals !== "object") {
    warnings.push("Campo `totals` ausente/inválido.");
    degraded = true;
  }
  if (!Array.isArray(obj.files)) {
    warnings.push("Campo `files` ausente ou não é array.");
    degraded = true;
  }

  const report = coverageReportSchema.parse(raw);

  // Detecta files removidos pelo filtro (entradas inválidas).
  if (Array.isArray(obj.files) && report.files.length < obj.files.length) {
    const dropped = obj.files.length - report.files.length;
    warnings.push(`${dropped} arquivo(s) ignorado(s) por entradas inválidas.`);
    degraded = true;
  }

  return { report, degraded, warnings };
}
