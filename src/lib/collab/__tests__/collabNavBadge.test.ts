/**
 * Onda 139 — varredura combinatória do contador da rede colaborativa.
 * Invariantes C1..C8 descritas em `collabNavBadge.ts`.
 */

import { describe, it, expect } from 'vitest';
import {
  ageInHours,
  buildCollabNavBadge,
  summarizeCollabUnread,
  STALE_ACTIONABLE_HOURS,
  type CollabUnreadRow,
} from '../collabNavBadge';

const NOW = new Date('2026-07-26T12:00:00.000Z');

function row(partial: Partial<CollabUnreadRow>): CollabUnreadRow {
  return {
    organization_id: partial.organization_id ?? 'org-1',
    unread: partial.unread ?? 0,
    silenced: partial.silenced ?? 0,
    actionable: partial.actionable ?? 0,
    critical: partial.critical ?? 0,
    oldest_unread_at: partial.oldest_unread_at ?? null,
  };
}

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 3_600_000).toISOString();
}

describe('ageInHours (C8)', () => {
  it('entradas inválidas viram null em vez de NaN', () => {
    for (const bad of [null, undefined, '', '   ', 'ontem', 'not-a-date']) {
      expect(ageInHours(bad as string | null, NOW)).toBeNull();
    }
  });

  it('timestamp no futuro nunca vira idade negativa', () => {
    expect(ageInHours(new Date(NOW.getTime() + 3_600_000).toISOString(), NOW)).toBeNull();
  });

  it('idade é medida em horas', () => {
    expect(ageInHours(hoursAgo(48), NOW)).toBeCloseTo(48, 6);
  });
});

describe('summarizeCollabUnread (C2, C5)', () => {
  it('lista vazia ou nula devolve retrato zerado', () => {
    for (const input of [null, undefined, []]) {
      const s = summarizeCollabUnread(input as CollabUnreadRow[] | null, NOW);
      expect(s.unread).toBe(0);
      expect(s.oldestAgeHours).toBeNull();
    }
  });

  it('C2 soma os não lidos de todas as organizações', () => {
    for (let orgs = 1; orgs <= 12; orgs++) {
      const rows = Array.from({ length: orgs }, (_, i) =>
        row({ organization_id: `org-${i}`, unread: i + 1, silenced: 3 })
      );
      const expected = (orgs * (orgs + 1)) / 2;
      const s = summarizeCollabUnread(rows, NOW);
      expect(s.unread).toBe(expected);
      expect(s.organizations).toBe(orgs);
      expect(s.silenced).toBe(orgs * 3);
    }
  });

  it('C5 satura acionável/crítico pelo total não lido da própria linha', () => {
    const s = summarizeCollabUnread([row({ unread: 3, actionable: 9, critical: 7 })], NOW);
    expect(s.actionable).toBe(3);
    expect(s.critical).toBe(3);
  });

  it('valores sujos não contaminam a soma', () => {
    const dirty = [
      row({ unread: Number.NaN }),
      row({ unread: -5 }),
      row({ unread: Number.POSITIVE_INFINITY }),
      row({ unread: 2.9 }),
    ];
    expect(summarizeCollabUnread(dirty, NOW).unread).toBe(2);
  });

  it('guarda a maior idade entre as organizações', () => {
    const s = summarizeCollabUnread(
      [
        row({ organization_id: 'a', unread: 1, oldest_unread_at: hoursAgo(5) }),
        row({ organization_id: 'b', unread: 1, oldest_unread_at: hoursAgo(70) }),
        row({ organization_id: 'c', unread: 1, oldest_unread_at: 'lixo' }),
      ],
      NOW
    );
    expect(s.oldestAgeHours).toBeCloseTo(70, 6);
  });
});

describe('buildCollabNavBadge (C1, C3, C4, C6, C7)', () => {
  it('C1 sem avisos visíveis não há badge', () => {
    expect(buildCollabNavBadge(null).badge).toBeUndefined();
    const s = summarizeCollabUnread([row({ unread: 0, silenced: 40 })], NOW);
    expect(buildCollabNavBadge(s).badge).toBeUndefined();
  });

  it('C3 silenciados não alteram valor, tom nem pulso', () => {
    for (let silenced = 0; silenced <= 50; silenced += 5) {
      const s = summarizeCollabUnread(
        [row({ unread: 4, silenced, actionable: 0, critical: 0, oldest_unread_at: hoursAgo(100) })],
        NOW
      );
      const b = buildCollabNavBadge(s);
      expect(b.badge).toBe(4);
      expect(b.tone).toBe('default');
      expect(b.pulse).toBe(false);
    }
  });

  it('C4/C6/C7 varredura combinatória de tom, pulso e rótulo', () => {
    let checked = 0;
    for (let unread = 1; unread <= 20; unread++) {
      for (const actionable of [0, 1, unread]) {
        for (const critical of [0, 1, unread]) {
          for (const hours of [0, 1, STALE_ACTIONABLE_HOURS - 0.5, STALE_ACTIONABLE_HOURS, 200]) {
            const s = summarizeCollabUnread(
              [row({ unread, actionable, critical, oldest_unread_at: hoursAgo(hours) })],
              NOW
            );
            const b = buildCollabNavBadge(s);
            checked++;

            expect(b.badge).toBe(unread); // C2 no nível do badge
            const effActionable = Math.min(actionable, unread);
            const effCritical = Math.min(critical, unread);
            expect(b.tone).toBe(
              effCritical > 0 ? 'destructive' : effActionable > 0 ? 'warning' : 'default'
            ); // C4
            expect(b.pulse).toBe(effActionable > 0 && hours >= STALE_ACTIONABLE_HOURS); // C6
            expect(b.srLabel).toContain(String(unread)); // C7
            expect(b.srLabel).not.toContain('NaN');
            expect(b.srLabel.length).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('C6 informativo antigo não pulsa', () => {
    const s = summarizeCollabUnread(
      [row({ unread: 9, actionable: 0, oldest_unread_at: hoursAgo(1000) })],
      NOW
    );
    expect(buildCollabNavBadge(s).pulse).toBe(false);
  });

  it('limiar inválido cai no padrão em vez de pulsar sempre', () => {
    const s = summarizeCollabUnread(
      [row({ unread: 2, actionable: 2, oldest_unread_at: hoursAgo(3) })],
      NOW
    );
    for (const bad of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(buildCollabNavBadge(s, bad).pulse).toBe(false);
    }
  });
});
