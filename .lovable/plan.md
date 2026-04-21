

## Auditoria: imports não utilizados de `Skeleton`

Após varredura nos 27 arquivos que importam de `@/components/ui/skeleton`, **não há imports não utilizados** de `Skeleton`, `BrandedSkeleton`, `StatSkeleton`, `AlertSkeleton` ou `CameraSkeleton`. Todos os símbolos importados são referenciados pelo menos uma vez no JSX correspondente.

### Verificação realizada

Script comparou cada nome importado de `@/components/ui/skeleton` contra suas ocorrências no arquivo. Resultado: zero imports órfãos.

Páginas verificadas em detalhe (todas com uso real):

| Arquivo | Importa | Usos `<Skeleton>` |
|---|---|---|
| `PeoplePage.tsx` | Skeleton | 1 |
| `SettingsPage.tsx` | Skeleton | 2 |
| `SecurityPage.tsx` | Skeleton | 3 |
| `DashboardV2.tsx` | Skeleton | 1 |
| `BehaviorDetectionPage.tsx` | Skeleton | 1 |
| `PanicEventsPage.tsx` | Skeleton | 3 |
| `RecognitionLogsPage.tsx` | Skeleton | 1 |
| `AnalysisHistoryPanel.tsx` | Skeleton | 1 |
| `RecognitionAnalytics.tsx` | Skeleton | 2 |
| `PersonDetailsDialog.tsx` | Skeleton | 1 |

### Plano de ação

**Nenhuma alteração de código é necessária.** O ESLint `no-unused-vars` (parte do gate `lint:ci`) já garantiria a detecção e — caso surjam imports órfãos no futuro — o pipeline falharia automaticamente.

### Validação opcional (recomendada para confirmar)

Rodar localmente:
```bash
npm run lint:ci 2>&1 | grep -E "skeleton|Skeleton.*no-unused"
```

Se a saída for vazia (esperado), o estado atual está limpo e o item pode ser marcado como concluído sem edições.

### Próximo passo sugerido

Se você está vendo um warning específico em algum arquivo, **compartilhe a mensagem exata do lint/tsc** para que eu remova o import correto. Caso contrário, esta tarefa está concluída por inspeção — sem regressões e sem necessidade de PR.

