---
name: Preview Reset & QA
description: Script reset-preview-qa.sh + npm run preview:reset para zerar caches, reinstalar deps com lockfile e disparar QA visual
type: feature
---

# Preview Reset & QA Visual

Antes de iniciar uma rodada de QA visual, use o reset determinístico para garantir que o bundle do preview reflete exatamente o lockfile.

## Comandos

| Comando                        | O que faz                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run preview:reset`        | Ciclo completo: limpa caches → `npm ci` → gates → build → `qa:visual-snapshots` → relatório HTML |
| `npm run preview:reset:fast`   | Pula `npm ci` (apenas se `node_modules` está consistente com o lockfile)                         |
| `npm run preview:reset:no-qa`  | Apenas reset + build, sem rodar QA visual                                                        |
| `npm run preview:reset-and-qa` | Alias do ciclo completo                                                                          |

## Garantias

1. **Lock determinístico** — usa `npm ci`, falha se `package-lock.json` ausente.
2. **Gates obrigatórios** — `check:mobile-nav` e `check:page-content` rodam antes do build.
3. **Build production** — força recompilação completa do bundle.
4. **QA visual + relatório** — gera `scripts/qa-screenshots-report.html` para revisão.

## Quando usar

- Antes de aprovar uma release que exige validação visual.
- Após mudanças em dependências ou no lockfile.
- Quando o preview parece mostrar bundle stale (HMR corrompido, cache do Vite).
