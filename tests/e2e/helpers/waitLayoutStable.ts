/**
 * VISÃO E2E — espera o layout assentar antes de medir geometria.
 *
 * As rotas autenticadas renderizam cards que crescem quando os dados chegam
 * (`/alerts`, `/recordings`, `/cameras`). Medir com `waitForTimeout` fixo
 * depois de `domcontentloaded` captura um estado intermediário: um card
 * ainda compacto faz o conteúdo terminar em `bottom=539`, ou um botão
 * `position:fixed` aparece fora da viewport — ambos geram asserções de
 * sobreposição que não existem no estado final.
 *
 * `waitForLayoutStable` amostra `scrollHeight`/`clientHeight` do
 * `[data-app-scroll]` e a quantidade de nós até dois frames consecutivos
 * coincidirem, com timeout curto. Se o timeout expirar, segue adiante: a
 * medição real continua valendo, apenas sem a garantia de estabilidade.
 */
import type { Page } from '@playwright/test';

export interface LayoutStableOptions {
  /** Tempo máximo de espera em ms (padrão 4000). */
  timeout?: number;
  /** Intervalo entre amostras em ms (padrão 100). */
  interval?: number;
  /** Amostras consecutivas iguais exigidas (padrão 2). */
  consecutive?: number;
}

export async function waitForLayoutStable(
  page: Page,
  { timeout = 4000, interval = 100, consecutive = 2 }: LayoutStableOptions = {}
): Promise<void> {
  const deadline = Date.now() + timeout;
  let previous = '';
  let stable = 0;

  while (Date.now() < deadline) {
    const signature = await page
      .evaluate(() => {
        const scroll = document.querySelector<HTMLElement>('[data-app-scroll]');
        const main = document.querySelector('main');
        if (!scroll) return null;
        return [
          scroll.scrollHeight,
          scroll.clientHeight,
          main ? Math.round(main.getBoundingClientRect().height) : 0,
          document.body.querySelectorAll('*').length,
        ].join(':');
      })
      .catch(() => null);

    if (signature && signature === previous) {
      stable++;
      if (stable >= consecutive - 1) return;
    } else {
      stable = 0;
      previous = signature ?? '';
    }

    await page.waitForTimeout(interval);
  }
}
