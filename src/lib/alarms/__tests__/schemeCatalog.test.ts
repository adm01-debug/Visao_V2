import { describe, expect, it } from 'vitest';
import {
  buildSchemeContext,
  reconcileSelection,
  sanitizeCatalog,
  sanitizeIds,
  selectSingle,
  toggleSelection,
} from '@/lib/alarms/schemeCatalog';

const catalog = {
  known: true,
  options: [
    { id: 'cam-1', label: 'Portaria' },
    { id: 'cam-2', label: 'Doca' },
  ],
};

describe('Onda 220 — catálogo de origens e bibliotecas', () => {
  it('K1: id escolhido que sumiu do catálogo vira ausência declarada, nunca sumiço', () => {
    const view = reconcileSelection(['cam-1', 'cam-9'], catalog);
    expect(view.selected).toEqual(['cam-1', 'cam-9']);
    expect(view.present.map((o) => o.id)).toEqual(['cam-1']);
    expect(view.missingIds).toEqual(['cam-9']);
  });

  it('K2: catálogo desconhecido não acusa ninguém de ter sumido', () => {
    const view = reconcileSelection(['cam-9'], { known: false, options: [] });
    expect(view.missingIds).toEqual([]);
    expect(view.catalogKnown).toBe(false);
    expect(view.selected).toEqual(['cam-9']);
  });

  it('K3/K4: entrada hostil é saneada sem lançar e preserva a ordem', () => {
    expect(sanitizeIds([' cam-2 ', 'cam-2', 42, '', null, 'cam-1'])).toEqual(['cam-2', 'cam-1']);
    expect(sanitizeIds('cam-1')).toEqual([]);
  });

  it('K5: catálogo com id repetido mantém a primeira ocorrência e nunca rótulo vazio', () => {
    const canon = sanitizeCatalog({
      known: true,
      options: [
        { id: 'cam-1', label: 'Primeiro' },
        { id: 'cam-1', label: 'Segundo' },
        { id: 'cam-3', label: '   ' },
      ],
    });
    expect(canon.options).toEqual([
      { id: 'cam-1', label: 'Primeiro' },
      { id: 'cam-3', label: 'cam-3' },
    ]);
  });

  it('K6: fantasma pode ser desmarcado (senão o operador fica preso a ele)', () => {
    expect(toggleSelection(['cam-1', 'cam-9'], 'cam-9')).toEqual(['cam-1']);
    expect(toggleSelection(['cam-1'], '  ')).toEqual(['cam-1']);
  });

  it('K6: seleção exclusiva nunca deixa duas bibliotecas', () => {
    expect(selectSingle(['lib-a'], 'lib-b')).toEqual(['lib-b']);
    expect(selectSingle(['lib-a'], 'lib-a')).toEqual([]);
    expect(selectSingle(['lib-a', 'lib-b'], 'lib-b')).toEqual(['lib-b']);
  });

  it('K7: sem catálogo conhecido não existe vínculo declarado (S6 não pode recusar no escuro)', () => {
    expect(buildSchemeContext([{ id: 'lib', label: 'lib', deviceIds: [] }], false)).toEqual({});
    expect(
      buildSchemeContext([{ id: 'lib', label: 'lib', deviceIds: ['cam-1'] }], true).faceLibraries,
    ).toEqual([{ libraryId: 'lib', deviceIds: ['cam-1'] }]);
  });
});
