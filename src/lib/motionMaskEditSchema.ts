import { z } from 'zod';

/**
 * Validacao da edicao de mascara de movimento (nome, regra e sensibilidade).
 * Fica fora da pagina para o teste cobrir a regra sem montar o componente.
 */
export const editMaskSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome.').max(80, 'Use no máximo 80 caracteres.'),
  mode: z.enum(['include', 'exclude']),
  sensitivity: z
    .number({ error: 'Sensibilidade deve ser um número.' })
    .int('Use um número inteiro.')
    .min(0, 'Sensibilidade mínima: 0.')
    .max(100, 'Sensibilidade máxima: 100.'),
});
