# Sistema unificado de filtros

Todas as páginas com filtros usam o hook `useManagedFilters` para garantir
quatro melhorias de UX consistentes:

1. **Modal de confirmação** antes de limpar filtros (lista os campos ativos).
2. **Toast detalhado** mostrando exatamente o que foi removido (filtros + chaves localStorage).
3. **Botão "Desfazer"** no toast por 10 segundos, restaurando filtros e localStorage.
4. **Persistência por usuário** via Supabase (tabela `user_filter_preferences`),
   com estratégia _localStorage-first + background sync_ — filtros viajam entre
   navegadores sem latência perceptível na primeira pintura.

## API

```ts
import { useManagedFilters } from '@/hooks/useManagedFilters';

interface MyFilters {
  search: string;
  severity: string[];
  cameraId: string;
  [key: string]: unknown;
}

const defaults: MyFilters = { search: '', severity: [], cameraId: 'all' };

const { filters, setFilters, clearFilters, hasActiveFilters, activeEntries } =
  useManagedFilters<MyFilters>({
    scope: 'alerts', // FilterScope: chave única por página
    defaults,
    labels: {
      // pt-BR para o toast e modal
      search: 'busca',
      severity: 'severidade',
      cameraId: 'câmera',
    },
    persistKeys: ['alerts-sort-v1'], // chaves localStorage extras a limpar
    confirm: true, // default: true
  });
```

### Props

| Prop          | Tipo                               | Default       | Descrição                                            |
| ------------- | ---------------------------------- | ------------- | ---------------------------------------------------- |
| `scope`       | `FilterScope \| string`            | obrigatório   | identificador único usado em localStorage e Supabase |
| `defaults`    | `T`                                | obrigatório   | valores neutros do filtro                            |
| `labels`      | `Partial<Record<keyof T, string>>` | `{}`          | rótulos legíveis em pt-BR para toast/modal           |
| `persistKeys` | `string[]`                         | `[]`          | chaves localStorage adicionais a limpar e restaurar  |
| `confirm`     | `boolean`                          | `true`        | exibe modal antes de limpar                          |
| `isActive`    | `(k, v, def) => boolean`           | smart default | predicate "valor está ativo?"                        |

### Retorno

| Campo              | Tipo                         | Descrição                                      |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `filters`          | `T`                          | estado atual                                   |
| `setFilters`       | `(T \| (prev) => T) => void` | setter (debounce 800ms para Supabase)          |
| `clearFilters`     | `() => void`                 | dispara confirmação → limpa → toast com undo   |
| `hasActiveFilters` | `boolean`                    | há ao menos um filtro fora do default          |
| `activeEntries`    | `{ key, label }[]`           | filtros ativos com rótulos prontos para badges |

## Adicionar uma nova `scope`

1. Use uma string única (idealmente alinhada com `FilterScope`).
2. Defina `defaults` no call-site da página.
3. Mapeie `labels` em pt-BR — esses rótulos aparecem no modal e no toast.
4. Pronto. A persistência local + remota funciona automaticamente.

## Edge cases

- **Usuário não logado** → só localStorage (Supabase é skip silencioso).
- **Offline** → sync remoto retorna erro silencioso, localStorage continua source-of-truth.
- **Conflito multi-aba** → último write wins por `updated_at`.
- **`hasActiveFilters` false** → `clearFilters()` mostra `toast.info("Nenhum filtro ativo")` sem abrir modal.

## Tabela Supabase

`user_filter_preferences` (`user_id`, `scope`, `filters` jsonb, RLS por `auth.uid()`),
`UNIQUE(user_id, scope)`, trigger `update_updated_at_column`.

## Páginas migradas

- ✅ `RecognitionLogsPage` (referência)
- ⏳ AlertsPage, CamerasPage, PeoplePage, ZonesPage, RecordingsPage,
  AnalysisHistoryPanel, LicensePlatePage (history) — migração leve, ~5–10 linhas.

## Compatibilidade legada

`useFilterStore` (Zustand) ganhou um wrapper de `clearFilters` com toast detalhado +
undo (10s). Páginas antigas que ainda usam o store recebem o mesmo UX.
