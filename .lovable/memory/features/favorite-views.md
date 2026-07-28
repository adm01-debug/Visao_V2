---
name: Visualizações favoritas (mosaicos nomeados)
description: Onda 188 — arranjo posicional de mosaico como prova; célula vaga nunca compacta, quota 24 por usuário, gate db:check:favorite-views
type: feature
---
Rota `/visualizacoes` (alias `/favoritos`), item "Visualizações" na categoria Monitoramento.

Regras invioláveis:
- **Posição é prova**: câmera removida/invisível deixa a célula **vazia** (`camera_removed`), jamais desloca as demais. Nunca recompactar a lista (o `useMonitorGroups` antigo recompactava — não copiar esse comportamento).
- Regra única de restauração em `src/lib/views/favoriteViewRestore.ts` (`restoreFavoriteView`), com vacância (`empty`, `camera_removed`, `duplicate_camera`) e transbordo (`out_of_capacity`, `duplicate_slot`). UI apenas exibe o veredito.
- Redução de layout nunca apaga silenciosamente: o que não cabe vira transbordo declarado e é avisado ao usuário.
- Quota **24 favoritos/usuário** (`MAX_FAVORITE_VIEWS`) por gatilho `trg_mg_quota`; `slot_index` físico 0..31 (`MAX_SLOT_INDEX`) independe do layout visual.
- `trg_mgc_ownership` impede gravar slot em grupo de outro dono; `trg_mgc_slot_limit` cobre INSERT **e** UPDATE (UPDATE de `group_id` era o furo).
- `anon` sem qualquer privilégio em `monitor_groups`/`monitor_group_cameras`; ordenação da barra por `last_used_at DESC`.

Validação: `npm run db:check:favorite-views` (dentro de `db:check:all`) e `scripts/simulate-wave188-favorite-views.mjs`.
