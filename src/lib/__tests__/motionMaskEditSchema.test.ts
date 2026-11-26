import { describe, expect, it } from 'vitest';
import { editMaskSchema } from '../motionMaskEditSchema';

describe('editMaskSchema', () => {
  it('aceita nome, regra e sensibilidade validos e apara o nome', () => {
    const parsed = editMaskSchema.safeParse({
      name: '  portao  ',
      mode: 'include',
      sensitivity: 70,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ name: 'portao', mode: 'include', sensitivity: 70 });
  });

  it('recusa nome vazio ou so com espacos', () => {
    expect(
      editMaskSchema.safeParse({ name: '   ', mode: 'exclude', sensitivity: 50 }).success
    ).toBe(false);
  });

  it('recusa nome acima de 80 caracteres com a mensagem do campo', () => {
    const parsed = editMaskSchema.safeParse({
      name: 'a'.repeat(81),
      mode: 'exclude',
      sensitivity: 50,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('Use no máximo 80 caracteres.');
  });

  it('recusa sensibilidade fora de 0..100, fracionaria ou nao numerica', () => {
    for (const sensitivity of [-1, 101, 50.5, Number.NaN]) {
      const parsed = editMaskSchema.safeParse({ name: 'x', mode: 'exclude', sensitivity });
      expect(parsed.success, `sensitivity=${sensitivity}`).toBe(false);
    }
  });
});
