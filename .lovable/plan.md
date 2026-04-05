
# 🎨 Reformulação Visual — VISÃO Design System

## Diagnóstico dos Problemas Atuais

1. **Cores competindo entre si**: Teal (primary) + laranja (accent/warning) + vermelho (destructive) + verde (success) criam ruído visual — muitas matizes saturadas competindo
2. **Cards sem hierarquia**: Stats cards, severity cards e alert items usam estilos similares, sem distinção clara de importância
3. **Barra de severidade**: Blocos sólidos de cor pura (vermelho, laranja, verde) são visualmente agressivos
4. **Repetição visual**: Lista de alertas é monótona — todos os itens idênticos, sem variação de densidade
5. **Badges desconexos**: `Médio` (verde), `Alto` (vermelho), `Operações` (laranja) — cores sem lógica coerente
6. **Sidebar sobrecarregada**: Badges de contagem com cores diferentes competem com a navegação
7. **Espaçamento inconsistente**: Padding e gaps variam sem padrão entre seções

## Plano de Ação (3 Fases)

### Fase 1 — Refinamento de Tokens (index.css)
- Suavizar paleta: reduzir saturação do primary de 84% para ~70%, criar tons mais sofisticados
- Adicionar camadas intermediárias: `--surface-elevated`, `--surface-sunken` para hierarquia
- Unificar gradients para serem mais sutis (de 135deg agressivo para gradientes mais suaves)
- Melhorar contraste card/background (atualmente quase iguais: 6% vs 8%)

### Fase 2 — Componentes Visuais Chave
- **AlertStatsCards**: Redesign com ícones mais integrados, números com destaque tipográfico
- **AlertSeveritySummary**: Severity cards com visual mais limpo, barra com cantos e transições suaves
- **AlertItem**: Adicionar borda esquerda colorida por severidade, melhorar hierarquia de informação
- **DashboardStats**: Unificar estilo com o resto do sistema

### Fase 3 — Coerência Global
- Padronizar espaçamento (gap-4 como base, gap-6 entre seções)
- Revisar todos os badges para usar a mesma escala de cores
- Garantir que dark e light themes mantêm a mesma qualidade

## Abordagem
Implementar Fase 1 primeiro (tokens) pois propaga automaticamente para todo o sistema, depois refinar componentes específicos.
