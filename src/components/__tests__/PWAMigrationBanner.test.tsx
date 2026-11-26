/**
 * Regressão: `src/main.tsx` registra o service worker push-only em `/sw.js` em
 * toda carga. A checagem de resíduo tratava QUALQUER registration como sobra do
 * PWA antigo, então o banner aparecia sempre e ainda desregistrava o worker do
 * próprio app (quebrando push). Este teste fixa a distinção.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PWAMigrationBanner } from '../PWAMigrationBanner';

type FakeRegistration = {
  active: { scriptURL: string } | null;
  unregister: ReturnType<typeof vi.fn>;
};

function registration(scriptURL: string): FakeRegistration {
  return { active: { scriptURL }, unregister: vi.fn().mockResolvedValue(true) };
}

function stubBrowser(regs: FakeRegistration[], cacheKeys: string[] = []) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations: vi.fn().mockResolvedValue(regs) },
  });
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: {
      keys: vi.fn().mockResolvedValue(cacheKeys),
      delete: vi.fn().mockResolvedValue(true),
    },
  });
}

afterEach(() => {
  localStorage.clear();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  Reflect.deleteProperty(window, 'caches');
});

describe('PWAMigrationBanner', () => {
  it('preserva o service worker de push e remove apenas resíduos', async () => {
    const app = registration('https://visao.test/sw.js');
    const legacy = registration('https://visao.test/legacy-pwa-sw.js');
    stubBrowser([app, legacy]);

    render(<PWAMigrationBanner />);

    await waitFor(() => expect(legacy.unregister).toHaveBeenCalledTimes(1));
    expect(app.unregister).not.toHaveBeenCalled();
    expect((await screen.findByRole('status')).textContent).toMatch(/atualização do sistema/i);
  });

  it('não mostra o banner quando só existe o worker do app', async () => {
    const app = registration('https://visao.test/sw.js');
    stubBrowser([app]);

    render(<PWAMigrationBanner />);

    await waitFor(() => expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledTimes(1));
    expect(app.unregister).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('mostra o banner e apaga cache stale quando não há worker alheio', async () => {
    stubBrowser([registration('https://visao.test/sw.js')], ['workbox-precache-v2', 'outra']);

    render(<PWAMigrationBanner />);

    await waitFor(() => expect(caches.delete).toHaveBeenCalledWith('workbox-precache-v2'));
    expect(caches.delete).not.toHaveBeenCalledWith('outra');
    expect(screen.queryByRole('status')).not.toBeNull();
  });
});
