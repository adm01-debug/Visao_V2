# ✅ Checklist Guiado de QA — Responsividade & Mobile Nav

> **Como usar:** copie este arquivo para `docs/qa-runs/QA-YYYY-MM-DD-<release>.md`, preencha cada caixa com `[x]`, anote evidências e anexe screenshots em `docs/qa-runs/assets/<run-id>/`.
> Critério: **um único FAIL bloqueia a release** até reabertura com correção documentada.

---

## 🧾 Identificação da Run

| Campo | Valor |
|---|---|
| Data (YYYY-MM-DD) | `____` |
| Release / Commit | `____` |
| Responsável QA | `____` |
| Browser/Device de teste | `____` |
| Pasta de evidências | `docs/qa-runs/assets/____/` |

**Veredito final:** ⬜ PASS ⬜ FAIL ⬜ PASS COM RESSALVAS

---

## 0. Pré-requisitos

- [ ] Preview resetado via `npm run preview:reset` (lockfile sincronizado)
- [ ] Login efetuado no preview (sessão ativa em `/dashboard`, não em `/auth`)
- [ ] Console limpo na carga inicial (sem `console.error` legítimo)
- [ ] Pasta de assets criada: `docs/qa-runs/assets/<run-id>/`

---

## 1. Rotas Autenticadas — Desktop (1280×720)

| # | Rota | Carrega s/ erro | H1 visível | Sem layout shift | Screenshot | Notas |
|---|---|---|---|---|---|---|
| 1 | `/dashboard` | ⬜ | ⬜ | ⬜ | `desktop-dashboard.png` | |
| 2 | `/cameras` | ⬜ | ⬜ | ⬜ | `desktop-cameras.png` | |
| 3 | `/alerts` | ⬜ | ⬜ | ⬜ | `desktop-alerts.png` | |
| 4 | `/heatmap` | ⬜ | ⬜ | ⬜ | `desktop-heatmap.png` | |
| 5 | `/analytics` | ⬜ | ⬜ | ⬜ | `desktop-analytics.png` | |
| 6 | `/recordings` | ⬜ | ⬜ | ⬜ | `desktop-recordings.png` | |
| 7 | `/people` | ⬜ | ⬜ | ⬜ | `desktop-people.png` | |
| 8 | `/license-plate` | ⬜ | ⬜ | ⬜ | `desktop-license-plate.png` | |
| 9 | `/settings` | ⬜ | ⬜ | ⬜ | `desktop-settings.png` | |
| 10 | `/users` (admin) | ⬜ | ⬜ | ⬜ | `desktop-users.png` | |
| 11 | `/notification-settings` | ⬜ | ⬜ | ⬜ | `desktop-notif.png` | |
| 12 | `/zones` | ⬜ | ⬜ | ⬜ | `desktop-zones.png` | |

**Resultado seção 1:** ⬜ PASS ⬜ FAIL — Falhas: `____`

---

## 2. Rotas Autenticadas — Mobile (iPhone 12, 390×844)

| # | Rota | BottomNav visível | Último item NÃO sob a barra | Sem overflow horizontal | Screenshot inferior | Notas |
|---|---|---|---|---|---|---|
| 1 | `/dashboard` | ⬜ | ⬜ | ⬜ | `mobile-dashboard-bottom.png` | |
| 2 | `/cameras` | ⬜ | ⬜ | ⬜ | `mobile-cameras-bottom.png` | |
| 3 | `/alerts` | ⬜ | ⬜ | ⬜ | `mobile-alerts-bottom.png` | |
| 4 | `/heatmap` | ⬜ | ⬜ | ⬜ | `mobile-heatmap-bottom.png` | |
| 5 | `/analytics` | ⬜ | ⬜ | ⬜ | `mobile-analytics-bottom.png` | |
| 6 | `/recordings` | ⬜ | ⬜ | ⬜ | `mobile-recordings-bottom.png` | |
| 7 | `/people` | ⬜ | ⬜ | ⬜ | `mobile-people-bottom.png` | |
| 8 | `/license-plate` | ⬜ | ⬜ | ⬜ | `mobile-license-plate-bottom.png` | |
| 9 | `/settings` | ⬜ | ⬜ | ⬜ | `mobile-settings-bottom.png` | |
| 10 | `/users` | ⬜ | ⬜ | ⬜ | `mobile-users-bottom.png` | |
| 11 | `/notification-settings` | ⬜ | ⬜ | ⬜ | `mobile-notif-bottom.png` | |
| 12 | `/zones` | ⬜ | ⬜ | ⬜ | `mobile-zones-bottom.png` | |

**Resultado seção 2:** ⬜ PASS ⬜ FAIL — Falhas: `____`

---

## 3. Drawer / BottomNavigation — Comportamento (mobile 390×844)

Testar em **3 rotas-chave**: `/dashboard`, `/heatmap`, `/analytics`.

| # | Critério | Dashboard | Heatmap | Analytics |
|---|---|---|---|---|
| 1 | Tap em categoria ativa **abre** o drawer | ⬜ | ⬜ | ⬜ |
| 2 | Tap novamente **fecha** o drawer | ⬜ | ⬜ | ⬜ |
| 3 | Tap em categoria inativa **navega** sem abrir drawer | ⬜ | ⬜ | ⬜ |
| 4 | Backdrop fecha o drawer ao tocar fora | ⬜ | ⬜ | ⬜ |
| 5 | Botão "X" interno fecha o drawer | ⬜ | ⬜ | ⬜ |
| 6 | Selecionar item dentro do drawer fecha o drawer | ⬜ | ⬜ | ⬜ |
| 7 | Drawer **não cobre** os ícones da BottomNav | ⬜ | ⬜ | ⬜ |
| 8 | Animação de abrir/fechar suave (sem flicker) | ⬜ | ⬜ | ⬜ |

**Screenshots obrigatórios:**
- [ ] `drawer-dashboard-open.png` (drawer aberto)
- [ ] `drawer-dashboard-closed.png` (drawer fechado após nav)
- [ ] `drawer-overlay-edge.png` (faixa inferior mostrando drawer + nav alinhados)

**Resultado seção 3:** ⬜ PASS ⬜ FAIL — Falhas: `____`

---

## 4. Padding `mb-mobile-nav` (heurística visual)

- [ ] `npm run check:mobile-nav` retorna exit 0
- [ ] `npm run test:mobile-nav-content-overlap` passa (zero overlaps)
- [ ] `npm run test:mobile-nav-runtime` passa (padding aplicado)
- [ ] Nenhuma página redeclara `mb-mobile-nav` manualmente (validado pelo script)

**Evidência:** colar saída resumida dos comandos abaixo.
```
npm run check:mobile-nav        → ____
npm run test:mobile-nav-runtime  → ____
```

**Resultado seção 4:** ⬜ PASS ⬜ FAIL

---

## 5. Páginas Standalone (sem MainLayout)

| Rota | Sem BottomNav | Sem Sidebar | Layout centralizado | Screenshot |
|---|---|---|---|---|
| `/auth` | ⬜ | ⬜ | ⬜ | `standalone-auth.png` |
| `/acesso-negado` | ⬜ | ⬜ | ⬜ | `standalone-403.png` |
| `/reset-password` | ⬜ | ⬜ | ⬜ | `standalone-reset.png` |
| `/rota-inexistente` (404) | ⬜ | ⬜ | ⬜ | `standalone-404.png` |

**Resultado seção 5:** ⬜ PASS ⬜ FAIL

---

## 6. Console & Network Hygiene

- [ ] Zero `console.error` legítimos durante o sweep desktop
- [ ] Zero `console.error` legítimos durante o sweep mobile
- [ ] Nenhuma requisição 4xx/5xx inesperada (excetuar telemetria opcional)
- [ ] Service worker não bloqueia recursos críticos

**Erros conhecidos ignorados:** Vite HMR ping, `lovable-badge`, eventuais 404 de favicon dev.

**Erros novos capturados:**
```
____
```

**Resultado seção 6:** ⬜ PASS ⬜ FAIL

---

## 7. Anexos & Evidências

Estrutura recomendada da pasta `docs/qa-runs/assets/<run-id>/`:

```
<run-id>/
├── desktop-*.png              (12 screenshots desktop)
├── mobile-*-bottom.png        (12 screenshots mobile inferior)
├── drawer-*.png               (3 screenshots drawer)
├── standalone-*.png           (4 screenshots standalone)
├── console-errors.txt         (saída agregada de console)
└── notes.md                   (observações livres do QA)
```

- [ ] Todos os arquivos listados foram anexados
- [ ] Nomenclatura segue o padrão acima
- [ ] `notes.md` preenchido (mesmo que com "sem observações")

---

## 8. Issues Encontradas

> Se zero issues, escrever explicitamente: **"Nenhuma regressão detectada."**

| # | Severidade | Rota / Componente | Descrição | Reprodução | Screenshot | Status |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

---

## 9. Cobertura Automatizada Equivalente

Antes de fechar a run, confirmar que os E2E continuam verdes (fonte da verdade contínua):

- [ ] `npm run test:smoke` — PASS
- [ ] `npm run test:mobile-nav-runtime` — PASS
- [ ] `npm run test:mobile-nav-overlap` — PASS
- [ ] `npm run test:mobile-nav-content-overlap` — PASS
- [ ] `npm run test:mobile-drawer` — PASS
- [ ] `npm run qa:visual-snapshots` — PASS

---

## 10. Aprovação Final

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| QA | `____` | ⬜ APROVADO ⬜ REPROVADO | `____` |
| Tech Lead | `____` | ⬜ APROVADO ⬜ REPROVADO | `____` |

**Comentário final:**
```
____
```

---

📎 **Referência cruzada:**
- [`docs/QA-MANUAL-RESPONSIVIDADE.md`](./QA-MANUAL-RESPONSIVIDADE.md) — relatório consolidado
- [`docs/LAYOUTS.md`](./LAYOUTS.md) §11 — Camada 0 (rotas standalone)
- [`scripts/reset-preview-qa.sh`](../scripts/reset-preview-qa.sh) — reset determinístico
