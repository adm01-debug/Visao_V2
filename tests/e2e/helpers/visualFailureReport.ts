/**
 * VISÃO - Visual Failure Report
 *
 * Gera um relatório Markdown pós-teste para regressões visuais que falharam,
 * com:
 *  - Diff de pixels (links para os PNGs `*-actual.png`, `*-expected.png`,
 *    `*-diff.png` produzidos pelo Playwright em `test-results/`).
 *  - Regiões cobertas pela BottomNavigation (medidas via getBoundingClientRect)
 *    listando tag, texto, retângulo e overlap em px.
 *  - Metadados da rota (URL, viewport, navTop).
 *
 * Saída: `test-results/visual-reports/<route>-report.md` + anexa ao Playwright
 * via `testInfo.attach`. Não roda em sucesso — é chamado dentro de
 * `try/catch` ao redor de `toHaveScreenshot`.
 */
import type { Page, TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface CoveredElement {
  tag: string;
  text: string;
  selector: string;
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  overlapPx: number;
}

export interface VisualReportData {
  routeName: string;
  routePath: string;
  url: string;
  viewport: { width: number; height: number };
  navTop: number;
  covered: CoveredElement[];
  scannedCount: number;
  errorMessage: string;
}

const REPORT_DIR = 'test-results/visual-reports';

/**
 * Coleta dados de cobertura da BottomNav sobre elementos visíveis.
 * Útil para snapshots Markdown, independente de overlap binário.
 */
export async function collectCoverageData(page: Page): Promise<{
  navTop: number;
  viewport: { width: number; height: number };
  covered: CoveredElement[];
  scannedCount: number;
}> {
  const data = await page.evaluate(() => {
    const TOLERANCE = 4;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const nav = document.querySelector(
      '[data-testid="bottom-navigation"], nav.fixed.bottom-0',
    ) as HTMLElement | null;
    const navTop = nav ? nav.getBoundingClientRect().top : vh;
    const scroll =
      (document.querySelector('[data-app-scroll]') as HTMLElement | null) ?? document.body;

    const sel =
      'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), h1, h2, h3, p, li, td, [data-card]';
    const candidates = Array.from(scroll.querySelectorAll<HTMLElement>(sel));

    const visible = candidates.filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.top < vh &&
        r.bottom > 0 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        parseFloat(cs.opacity || '1') >= 0.1
      );
    });

    const buildSelector = (el: HTMLElement): string => {
      if (el.id) return `#${el.id}`;
      const testId = el.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;
      const cls = (el.getAttribute('class') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((c) => `.${c}`)
        .join('');
      return `${el.tagName.toLowerCase()}${cls}`;
    };

    const covered: CoveredElement[] = visible
      .map((el) => {
        const r = el.getBoundingClientRect();
        const overlapPx = r.bottom - navTop;
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 80),
          selector: buildSelector(el),
          rect: {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            height: Math.round(r.height),
          },
          overlapPx: Math.round(overlapPx),
        };
      })
      .filter((c) => c.overlapPx > TOLERANCE && c.rect.top < navTop)
      .sort((a, b) => b.overlapPx - a.overlapPx);

    return {
      navTop: Math.round(navTop),
      viewport: { width: vw, height: vh },
      covered,
      scannedCount: visible.length,
    };
    type CoveredElement = {
      tag: string;
      text: string;
      selector: string;
      rect: {
        top: number;
        bottom: number;
        left: number;
        right: number;
        width: number;
        height: number;
      };
      overlapPx: number;
    };
  });

  return data;
}

/**
 * Localiza artefatos de diff que o Playwright escreve para um snapshot que
 * falhou. Retorna caminhos relativos ao diretório do report.
 */
async function findDiffArtifacts(
  testInfo: TestInfo,
  snapshotName: string,
): Promise<{ actual?: string; expected?: string; diff?: string }> {
  const outputDir = testInfo.outputDir;
  const baseName = snapshotName.replace(/\.png$/, '');
  const candidates = {
    actual: path.join(outputDir, `${baseName}-actual.png`),
    expected: path.join(outputDir, `${baseName}-expected.png`),
    diff: path.join(outputDir, `${baseName}-diff.png`),
  };
  const result: { actual?: string; expected?: string; diff?: string } = {};
  for (const [k, p] of Object.entries(candidates)) {
    try {
      await fs.access(p);
      result[k as keyof typeof result] = p;
    } catch {
      /* artefato pode não existir (e.g. baseline ausente) */
    }
  }
  return result;
}

/**
 * Renderiza Markdown e grava em disco + anexa ao Playwright report.
 */
export async function writeVisualFailureReport(
  testInfo: TestInfo,
  data: VisualReportData,
  snapshotNames: string[],
): Promise<string> {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `${data.routeName}-report.md`);

  const diffs = await Promise.all(snapshotNames.map((n) => findDiffArtifacts(testInfo, n)));

  const lines: string[] = [];
  lines.push(`# Visual Failure Report — \`${data.routePath}\``);
  lines.push('');
  lines.push(`- **Rota**: \`${data.routePath}\``);
  lines.push(`- **URL final**: ${data.url}`);
  lines.push(`- **Viewport**: ${data.viewport.width}×${data.viewport.height}`);
  lines.push(`- **BottomNav top (y)**: ${data.navTop}px`);
  lines.push(`- **Elementos varridos**: ${data.scannedCount}`);
  lines.push(`- **Elementos cobertos**: ${data.covered.length}`);
  lines.push('');
  lines.push(`## Erro`);
  lines.push('```');
  lines.push(data.errorMessage.slice(0, 2000));
  lines.push('```');
  lines.push('');

  lines.push(`## Diffs de pixels`);
  if (snapshotNames.length === 0) {
    lines.push('_Nenhum snapshot reportado._');
  } else {
    for (let i = 0; i < snapshotNames.length; i++) {
      const name = snapshotNames[i];
      const d = diffs[i];
      lines.push(`### ${name}`);
      if (!d.actual && !d.expected && !d.diff) {
        lines.push('_Sem artefatos de diff (baseline pode estar ausente)._');
      } else {
        if (d.expected) lines.push(`- **Expected**: \`${d.expected}\``);
        if (d.actual) lines.push(`- **Actual**: \`${d.actual}\``);
        if (d.diff) lines.push(`- **Diff**: \`${d.diff}\``);
      }
      lines.push('');
    }
  }

  lines.push(`## Regiões cobertas pela BottomNavigation`);
  if (data.covered.length === 0) {
    lines.push(
      '_Nenhum elemento visível foi sobreposto. Falha provavelmente é puramente visual (cor/layout)._',
    );
  } else {
    lines.push('| # | Tag | Overlap | Rect (top/bottom) | Selector | Texto |');
    lines.push('|---|-----|---------|-------------------|----------|-------|');
    data.covered.slice(0, 20).forEach((c, i) => {
      const text = c.text.replace(/\|/g, '\\|').slice(0, 60);
      lines.push(
        `| ${i + 1} | \`${c.tag}\` | **${c.overlapPx}px** | ${c.rect.top}/${c.rect.bottom} | \`${c.selector}\` | ${text} |`,
      );
    });
    if (data.covered.length > 20) {
      lines.push('');
      lines.push(`_(+ ${data.covered.length - 20} elementos adicionais omitidos)_`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push(
    `_Gerado por \`tests/e2e/helpers/visualFailureReport.ts\` em ${new Date().toISOString()}_`,
  );

  const md = lines.join('\n');
  await fs.writeFile(reportPath, md, 'utf8');

  // Anexa ao Playwright report para visualização inline
  await testInfo.attach(`visual-report-${data.routeName}.md`, {
    body: md,
    contentType: 'text/markdown',
  });

  // Anexa também os PNGs de diff existentes
  for (let i = 0; i < snapshotNames.length; i++) {
    const d = diffs[i];
    for (const [kind, p] of Object.entries(d)) {
      if (!p) continue;
      try {
        const buf = await fs.readFile(p);
        await testInfo.attach(`${snapshotNames[i]}-${kind}`, {
          body: buf,
          contentType: 'image/png',
        });
      } catch {
        /* ignore */
      }
    }
  }

  return reportPath;
}

/** Conjunto de rotas elegíveis para relatório detalhado (conforme pedido). */
export const REPORT_ROUTES = new Set(['dashboard', 'heatmap', 'analytics']);
