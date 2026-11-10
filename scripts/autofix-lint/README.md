# Autofix de lint

`lint-staged.config.js` e a unica configuracao de commit: ESLint fix, Prettier e
ESLint obrigatorio em sequencia, com globs disjuntos e sem engolir falhas.

O workflow `lint-autofix.yml` gera somente um artefato de patch. Nao escreve em
branches, nao faz push, nao adiciona comentarios e nao pula CI. Execucao manual
em `main` ou `develop` e recusada. O escopo e o diff da PR (ou ultimo commit no
modo manual), limitado a fontes sob `src/`, `tests/`, `scripts/` e
`supabase/functions/`, excluindo delecoes. Os caminhos passam por argv e JSON
em memoria, sem interpolacao em shell. O ESLint aplica apenas fixes de layout e
depois roda sem escrita; erros remanescentes bloqueiam a geracao do patch.
TypeScript estrito tambem precisa passar antes do upload do artefato.

Teste: `node --test scripts/autofix-lint/run.test.mjs`.
