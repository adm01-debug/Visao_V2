# Onda 42 — Governança: SECURITY, CONTRIBUTING, CODING_STYLE

**Data:** 2026-07-17
**Origem:** auditoria comparativa VISÃO × OpenCV (docs institucionais 4.x).

## Escopo

Fechar os 3 gaps de governança extraídos **estritamente** dos arquivos `README.md`, `CONTRIBUTING.md` e `SECURITY.md` do repositório `opencv/opencv@4.x`:

- P1-A: canal dedicado de reporte de vulnerabilidades + template + espaço para chave PGP.
- P1-B: 5 regras objetivas de contribuição no topo do `CONTRIBUTING.md`.
- P2: `docs/CODING_STYLE.md` cobrindo o que ESLint/Prettier não pegam.

## Entregas

| Arquivo | Ação | Observação |
|---|---|---|
| `SECURITY.md` (raiz) | reescrito | Canal `security@visao.app`, template de report, referência à chave PGP, escopo in/out, SLA 48h. |
| `.github/SECURITY.md` | reescrito | Passa a apontar para a raiz (fonte única). |
| `docs/security/pgp-public-key.asc` | criado | **Placeholder explícito** — precisa ser substituído pelo time de segurança antes de qualquer disclosure público. |
| `CONTRIBUTING.md` | atualizado | Bloco "5 regras não-negociáveis" prependido, link para SECURITY e CODING_STYLE. |
| `docs/CODING_STYLE.md` | criado | 12 seções cobrindo TS, React, componentes, design system, hooks, edge functions, RLS, logs, performance, testes, commits e proibições. |

## Verificações

- [x] `SECURITY.md` não expõe chave privada nem endereço não controlado.
- [x] `docs/security/pgp-public-key.asc` marca-se como placeholder de forma inequívoca (comentários dentro do bloco PGP).
- [x] `CONTRIBUTING.md` mantém conteúdo detalhado existente; apenas ganhou resumo no topo.
- [x] `docs/CODING_STYLE.md` cita hierarquia de precedência (mem:// > style guide > preferência pessoal).
- [x] Zero mudança em código de aplicação, migrations, RLS, edge functions ou schema.

## Riscos residuais

- Endereço `security@visao.app` precisa existir e ter alguém monitorando; sem isso a política vira teatro (destacado no plano original).
- Chave PGP é **placeholder**; o time de segurança deve gerar a chave real, publicar o bloco público neste arquivo e comunicar a fingerprint.

## Pontuação

Mantido **10/10**. Onda foca em documentação institucional, sem impacto em runtime.
