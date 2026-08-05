# VISÃO — Checklist de regressão pré-release

> **Objetivo:** validação rápida (≤ 5 min) antes de aprovar cada release. Marque `[x]` PASS, `[!]` FAIL (e abra issue), `[-]` N/A.
> **Pré-requisito:** sessão autenticada confirmada (ver `docs/QA-MANUAL-RESPONSIVIDADE.md` §7.0).
> **Ambiente:** Preview Lovable + viewport mobile (iPhone 12 / 390×844) + viewport desktop (1280×720).

---

## 📋 Metadados do release

- **Versão / commit:** `__________`
- **Data / responsável:** `__________`
- **Resultado final:** ☐ APROVADO ☐ BLOQUEADO

---

## 1. Rotas autenticadas — smoke navigation

Para cada rota: clicar no link, aguardar render, validar **(a)** sem tela branca, **(b)** console sem erros vermelhos, **(c)** sem overlap da BottomNav.

| #   | Rota                | Desktop | Mobile | Console limpo |
| --- | ------------------- | ------- | ------ | ------------- |
| 1   | `/dashboard`        | ☐       | ☐      | ☐             |
| 2   | `/cameras`          | ☐       | ☐      | ☐             |
| 3   | `/alerts`           | ☐       | ☐      | ☐             |
| 4   | `/heatmap`          | ☐       | ☐      | ☐             |
| 5   | `/analytics`        | ☐       | ☐      | ☐             |
| 6   | `/recordings`       | ☐       | ☐      | ☐             |
| 7   | `/people`           | ☐       | ☐      | ☐             |
| 8   | `/license-plate`    | ☐       | ☐      | ☐             |
| 9   | `/face-recognition` | ☐       | ☐      | ☐             |
| 10  | `/zones`            | ☐       | ☐      | ☐             |
| 11  | `/settings`         | ☐       | ☐      | ☐             |
| 12  | `/users` (admin)    | ☐       | ☐      | ☐             |

---

## 2. Rotas standalone — sem chrome esperado

Validar **AUSÊNCIA** de Sidebar (desktop) e BottomNav (mobile).

| #   | Rota                      | Desktop sem Sidebar | Mobile sem BottomNav |
| --- | ------------------------- | ------------------- | -------------------- |
| 1   | `/auth`                   | ☐                   | ☐                    |
| 2   | `/acesso-negado`          | ☐                   | ☐                    |
| 3   | `/reset-password`         | ☐                   | ☐                    |
| 4   | `/rota-inexistente` (404) | ☐                   | ☐                    |

---

## 3. BottomNav mobile — itens e categorias

Abrir `/dashboard` em mobile. Validar que cada categoria expande e navega corretamente.

| Categoria                                           | Ícone visível | Expande ao tocar | Item default abre rota |
| --------------------------------------------------- | ------------- | ---------------- | ---------------------- |
| **Monitor** (`/dashboard`)                          | ☐             | ☐                | ☐                      |
| ↳ Dashboard, Câmeras, Gravações                     | —             | ☐                | ☐                      |
| **Segurança** (`/alerts`)                           | ☐             | ☐                | ☐                      |
| ↳ Alertas, Pânico, Regras*, Autom.*, EPIs           | —             | ☐                | ☐                      |
| **Intel** (`/analytics`)                            | ☐             | ☐                | ☐                      |
| ↳ Analytics, Rec. IA, Facial, Placas, Calor, Relat. | —             | ☐                | ☐                      |
| **Gestão** (`/zones`)                               | ☐             | ☐                | ☐                      |
| ↳ Pessoas*, Zonas                                   | —             | ☐                | ☐                      |
| **Config*** (`/settings`)                           | ☐             | ☐                | ☐                      |
| ↳ Geral, Notif., Streams, Telegram                  | —             | ☐                | ☐                      |

`*` = item filtrado por RBAC (manager+/operator+); validar visibilidade conforme role logada.

---

## 4. Drawer / Sidebar mobile (hamburger)

Em `/dashboard` mobile:

- ☐ Botão hamburger visível no topo
- ☐ Toque abre drawer lateral com animação suave
- ☐ Drawer mostra todas as categorias e itens permitidos pelo RBAC
- ☐ Toque em item navega e fecha o drawer
- ☐ Toque fora do drawer fecha o overlay

---

## 5. Layout / responsividade — armadilhas conhecidas

- ☐ Último elemento de **cada** rota auth NÃO é coberto pela BottomNav (scroll até o fim)
- ☐ `/heatmap`, `/analytics`, `/dashboard` renderizam gráficos sem overflow horizontal
- ☐ Touch targets da BottomNav ≥ 44×44px (validação visual)
- ☐ Safe-area iOS respeitada (sem corte por notch/home indicator)
- ☐ Tema dark/light alterna sem flash branco

---

## 6. Auth & sessão

- ☐ Login com Google OAuth funciona
- ☐ Login com email/senha funciona
- ☐ Logout retorna para `/auth`
- ☐ Reload em rota auth mantém sessão (não redireciona)
- ☐ Acesso a rota restrita sem permissão → `/acesso-negado`

---

## 7. Atalhos automatizados (recomendado antes do manual)

Executar local antes de iniciar o checklist manual — se algum falhar, **bloquear release**:

```bash
npm run check:mobile-nav            # auditoria estática mb-mobile-nav (8 camadas)
npm run test:mobile-nav-runtime     # padding runtime em ~15 rotas
npm run test:mobile-nav-class       # presença literal da classe no DOM
npm run qa:visual-snapshots         # screenshots desktop+mobile de 15 rotas
npm run report:qa-screenshots       # gera qa-screenshots/index.html para revisão
```

| Suite                                | Status        |
| ------------------------------------ | ------------- |
| `check:mobile-nav`                   | ☐ PASS ☐ FAIL |
| `test:mobile-nav-runtime`            | ☐ PASS ☐ FAIL |
| `test:mobile-nav-class`              | ☐ PASS ☐ FAIL |
| `qa:visual-snapshots` (revisão HTML) | ☐ PASS ☐ FAIL |

---

## 8. Critério de aprovação

✅ **APROVAR release** somente se:

1. Todas as rotas das §§1-2 marcadas PASS (ou justificadas como N/A com link para issue).
2. BottomNav §3 e Drawer §4 100% PASS.
3. Nenhum item da §5 (armadilhas) FAIL.
4. Auth §6 100% PASS.
5. Suítes automatizadas §7 todas PASS.

❌ **BLOQUEAR** se qualquer FAIL em §§3, 4, 5, 6 ou §7.

---

## 9. Observações do release

```
__________________________________________________________
__________________________________________________________
__________________________________________________________
```
