import { describe, expect, it } from 'vitest';
import {
  diagnoseScheduleForm,
  emptyScheduleForm,
  formToSchedule,
  parseClock,
  scheduleToForm,
  type ScheduleFormState,
} from '@/lib/alarms/alarmScheduleForm';
import { isWithinSchedule, normalizeSchedule } from '@/lib/alarms/alarmAggregation';
import { admitSchemeSubmission, emptyFormState } from '@/lib/alarms/alarmSchemeForm';

const day = (...rows: { start: string; end: string }[]): ScheduleFormState => [
  rows.map((r, i) => ({ id: `r${i}`, ...r })),
  [],
  [],
  [],
  [],
  [],
  [],
];

describe('Onda 221 — agenda semanal (S8)', () => {
  it('G1: agenda vazia é 24×7 declarado e persiste como null', () => {
    const diag = diagnoseScheduleForm(emptyScheduleForm());
    expect(diag.alwaysOn).toBe(true);
    expect(diag.valid).toBe(true);
    expect(formToSchedule(emptyScheduleForm())).toBeNull();
    expect(isWithinSchedule(null, Date.UTC(2026, 6, 28, 4, 12))).toBe(true);
  });

  it('G2: o sétimo período é recusado e nomeado, jamais truncado em silêncio', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({
      start: `0${i}:00`,
      end: `0${i}:30`,
    }));
    const diag = diagnoseScheduleForm(day(...rows));
    const issue = diag.issues.find((i) => i.code === 'too_many_periods');
    expect(issue).toBeDefined();
    expect(issue?.rowIds).toEqual(['r6']);
    // O avaliador cortaria o excedente sem avisar — por isso recusamos antes.
    expect(normalizeSchedule(formToSchedule(day(...rows)))[0]).toHaveLength(6);
  });

  it('G3: período degenerado é recusado por ser ambíguo entre "nada" e "24h"', () => {
    const diag = diagnoseScheduleForm(day({ start: '08:00', end: '08:00' }));
    expect(diag.issues.map((i) => i.code)).toContain('degenerate_period');
  });

  it('G4: cruzar a meia-noite é válido e declarado', () => {
    const diag = diagnoseScheduleForm(day({ start: '22:00', end: '06:00' }));
    expect(diag.valid).toBe(true);
    expect(diag.crossMidnightRowIds).toEqual(['r0']);
    const schedule = formToSchedule(day({ start: '22:00', end: '06:00' }));
    expect(isWithinSchedule(schedule, Date.UTC(2026, 6, 26, 23, 30))).toBe(true);
    expect(isWithinSchedule(schedule, Date.UTC(2026, 6, 26, 12, 0))).toBe(false);
  });

  it('G5: sobreposição é recusada, inclusive atravessando a meia-noite', () => {
    expect(
      diagnoseScheduleForm(
        day({ start: '08:00', end: '12:00' }, { start: '11:00', end: '13:00' })
      ).issues.map((i) => i.code)
    ).toContain('overlapping_periods');
    expect(
      diagnoseScheduleForm(
        day({ start: '22:00', end: '06:00' }, { start: '05:00', end: '07:00' })
      ).issues.map((i) => i.code)
    ).toContain('overlapping_periods');
    // Encostar não é sobrepor.
    expect(
      diagnoseScheduleForm(day({ start: '08:00', end: '12:00' }, { start: '12:00', end: '13:00' }))
        .valid
    ).toBe(true);
  });

  it('G6: 24:00 só vale como término', () => {
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('24:00', { allowEndOfDay: true })).toBe(1440);
    expect(diagnoseScheduleForm(day({ start: '20:00', end: '24:00' })).valid).toBe(true);
    expect(
      diagnoseScheduleForm(day({ start: '20:00', end: '00:00' })).issues.map((i) => i.code)
    ).toContain('invalid_end');
  });

  it('G7: round-trip preserva as janelas exibidas', () => {
    const state = day({ start: '06:30', end: '09:00' }, { start: '18:00', end: '23:59' });
    const back = scheduleToForm(formToSchedule(state));
    expect(back[0]?.map((r) => `${r.start}-${r.end}`)).toEqual(['06:30-09:00', '18:00-23:59']);
  });

  it('G8/F1: agenda inválida bloqueia a gravação do esquema', () => {
    const form = {
      ...emptyFormState(),
      name: 'Cerca',
      sources: 'cam-1',
      actions: [
        {
          id: 'a1',
          kind: 'display_live' as const,
          displayChannels: 'cam-1',
          recordChannels: '',
          missingChannels: '',
        },
      ],
      schedule: day({ start: '08:00', end: '08:00' }),
    };
    const admission = admitSchemeSubmission(form);
    expect(admission.allowed).toBe(false);
    expect(admission.refusals.map((r) => r.code)).toContain('schedule_invalid');
  });
});
