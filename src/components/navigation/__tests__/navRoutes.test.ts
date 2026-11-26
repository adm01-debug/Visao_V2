import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { allCategories as bottomClasses } from '@/components/navigation/bottomNavData';
import { createSidebarCategories } from '@/components/sidebar/config/categories';
import { isNavPathActive } from '@/components/sidebar/hooks/useSidebarState';
import type { SidebarStatus } from '@/hooks/useSidebarStatus';
import type { AppRole } from '@/hooks/useUserRole';

const EMPTY_STATUS: SidebarStatus = {
  unreadAlerts: 0,
  onlineCameras: 0,
  totalCameras: 0,
  activeRules: 0,
  totalRules: 0,
  registeredPersons: 0,
  activeZones: 0,
  openMaintenanceAlerts: 0,
  openMaintenanceCritical: 0,
  maintenanceAtCeiling: 0,
  collabUnread: 0,
  collabActionable: 0,
  collabCritical: 0,
  collabOldestAgeHours: null,
  isLoading: false,
};

const HIERARCHY: Record<AppRole, number> = { viewer: 0, operator: 1, manager: 2, admin: 3 };

interface RouteInfo {
  path: string;
  minRole?: AppRole;
}

/** Rotas declaradas em App.tsx, com o guard `minRole` do proprio bloco. */
const appRoutes = (() => {
  const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const starts = [...source.matchAll(/<Route\b/g)].map((m) => m.index ?? 0);
  const routes: RouteInfo[] = [];
  starts.forEach((start, i) => {
    const block = source.slice(start, starts[i + 1] ?? source.length);
    const path = /path="([^"]+)"/.exec(block);
    if (!path) return;
    const guard = /minRole="(viewer|operator|manager|admin)"/.exec(block);
    routes.push({ path: path[1], minRole: guard ? (guard[1] as AppRole) : undefined });
  });
  return routes;
})();

const sidebarItems = createSidebarCategories(EMPTY_STATUS).flatMap((c) => c.items);
const bottomItems = bottomClasses.flatMap((c) => c.items);
const allItems = [...sidebarItems, ...bottomItems];

/** As 13 telas que passaram a ter entrada no menu (antes so por URL). */
const EXPOSED_ROUTES = [
  '/stream-health',
  '/bandwidth-monitor',
  '/motion-masks',
  '/timelapse',
  '/schedules',
  '/event-alerts',
  '/alerts-timeline',
  '/evaluation',
  '/agentes-locais',
  '/stream-alert-thresholds',
  '/operations',
  '/admin/api-usage',
  '/admin/csp-reports',
];

describe('menu x rotas (App.tsx)', () => {
  it('todas as 13 telas expostas existem como rota em App.tsx', () => {
    const paths = appRoutes.map((r) => r.path);
    expect(EXPOSED_ROUTES.filter((p) => !paths.includes(p))).toEqual([]);
  });

  it('todo item de menu aponta para rota existente', () => {
    const known = new Set(appRoutes.map((r) => r.path));
    const orfas = allItems.filter((i) => !known.has(i.path)).map((i) => i.path);
    expect(orfas).toEqual([]);
  });

  it.each([
    ['sidebar', () => sidebarItems],
    ['gaveta mobile', () => bottomItems],
  ])('nao ha id ou path duplicado em %s', (_nome, get) => {
    const items = get();
    const ids = items.map((i) => i.id);
    expect(ids.length).toBe(new Set(ids).size);
    const paths = items.map((i) => i.path);
    expect(paths.length).toBe(new Set(paths).size);
  });

  it('o minRole das telas expostas nao e mais permissivo que o guard da rota', () => {
    const byPath = new Map(appRoutes.map((r) => [r.path, r.minRole]));
    const furos = allItems
      .filter((item) => EXPOSED_ROUTES.includes(item.path) && byPath.get(item.path))
      .filter((item) => {
        const exigido = byPath.get(item.path) as AppRole;
        return !item.minRole || HIERARCHY[item.minRole] < HIERARCHY[exigido];
      })
      .map(
        (item) =>
          `${item.path}: rota exige ${byPath.get(item.path)}, menu declara ${item.minRole ?? 'nenhum'}`
      );
    expect(furos).toEqual([]);
  });
});

describe('isNavPathActive', () => {
  it('nao marca /alerts quando a rota atual e /alerts-timeline', () => {
    expect(isNavPathActive('/alerts-timeline', '/alerts')).toBe(false);
    expect(isNavPathActive('/alerts-timeline', '/alerts-timeline')).toBe(true);
  });

  it('mantem a subrota destacada e o dashboard so na rota exata', () => {
    expect(isNavPathActive('/cameras/frota', '/cameras')).toBe(true);
    expect(isNavPathActive('/dashboard/full', '/dashboard')).toBe(false);
    expect(isNavPathActive('/operations', '/operations')).toBe(true);
  });

  it('na rota de um item, so ele (e o item pai) ficam ativos', () => {
    const conflitos: string[] = [];
    for (const item of sidebarItems) {
      const pais = sidebarItems
        .filter((outro) => outro.path !== item.path && item.path.startsWith(`${outro.path}/`))
        .map((outro) => outro.path);
      const ativos = sidebarItems
        .filter((outro) => isNavPathActive(item.path, outro.path))
        .map((outro) => outro.path);
      const inesperados = ativos.filter((path) => path !== item.path && !pais.includes(path));
      if (inesperados.length > 0) conflitos.push(`${item.path} -> ${inesperados.join(', ')}`);
    }
    expect(conflitos).toEqual([]);
  });
});
