/**
 * VISÃO - Coverage report types
 * Schema produced by `scripts/build-coverage-report.mjs` from
 * vitest's `coverage-summary.json`.
 */

export interface CoverageMetric {
  pct: number;
  total: number;
  covered: number;
  skipped?: number;
}

export interface CoverageFileEntry {
  /** Path relative to project root, normalized with forward slashes */
  path: string;
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
}

export interface CoverageTotals {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
}

export interface CoverageAlert {
  /** Threshold in percentage points that triggers a drop alert. */
  threshold: number;
  /** Statements pct delta vs previous report. Positive = improved, negative = dropped, null = first run. */
  delta: number | null;
  /** True when delta is negative AND |delta| >= threshold. */
  dropExceeded: boolean;
  /** Previous statements pct (null on first run). */
  previousPct: number | null;
  /** ISO timestamp of the previous report (null on first run). */
  previousGeneratedAt: string | null;
}

export interface CoverageReport {
  /** ISO timestamp of when the report was generated */
  generatedAt: string;
  totals: CoverageTotals;
  files: CoverageFileEntry[];
  /** Optional: missing in legacy reports (pre-alert era). */
  alert?: CoverageAlert;
}

export type CoverageMetricKey = keyof CoverageTotals;

export type CoverageStatus = "good" | "warning" | "poor";

export const getCoverageStatus = (pct: number): CoverageStatus => {
  if (pct >= 80) return "good";
  if (pct >= 50) return "warning";
  return "poor";
};
