/**
 * Onda 223 — relógio de minuto compartilhado.
 *
 * Um único `setInterval` alinhado à virada do minuto serve toda a tela. Se cada
 * linha da tabela criasse o próprio temporizador, 60 esquemas virariam 60
 * timers desalinhados — e o painel mostraria linhas viradas e linhas atrasadas
 * ao mesmo tempo, que é exatamente a incoerência que este módulo evita.
 */

import { useEffect, useState } from 'react';

export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    // Alinha o primeiro tique à virada real do minuto do relógio.
    const delay = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      setNow(Date.now());
      interval = setInterval(() => setNow(Date.now()), 60_000);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return now;
}
