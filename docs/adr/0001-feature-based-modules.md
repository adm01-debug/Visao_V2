# ADR 0001: Módulos Baseados em Features (Feature-based Architecture)

## Status

Aceito

## Contexto

O projeto VISÃO cresceu rapidamente, ultrapassando 700 arquivos. Uma estrutura puramente técnica (components/ hooks/ pages/) torna-se difícil de navegar e propicia o acoplamento indevido entre domínios distintos (ex: Alertas vs. Reconhecimento Facial).

## Decisão

Adotamos uma arquitetura baseada em features. Cada funcionalidade principal deve ter seu próprio diretório em `src/components/`, contendo seus subcomponentes, hooks específicos e tipos locais.

**Regras de Dependência:**

1. Componentes de uma feature (ex: `src/components/alerts/`) só podem importar de outras features se for através de bibliotecas compartilhadas (`src/lib/`) ou componentes de UI genéricos (`src/components/ui/`).
2. Páginas (`src/pages/`) servem como orquestradores que compõem múltiplas features.

## Consequências

- **Positivas:** Maior manutenibilidade, facilidade de encontrar código relacionado, desacoplamento.
- **Negativas:** Requer disciplina para não criar dependências circulares entre features.
- **Neutral:** Aumenta ligeiramente a profundidade da árvore de diretórios.
