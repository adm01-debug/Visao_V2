# ⚠️ GitHub Actions Billing Issue

## Problema

Os workflows do GitHub Actions estão falhando devido ao limite de minutos gratuitos para repositórios privados.

## Status Atual

| Workflow | Status |
|----------|--------|
| CI | ❌ Falha (billing) |
| Lint | ❌ Falha (billing) |
| Test | ❌ Falha (billing) |
| Deploy | ❌ Falha (billing) |
| Security | ❌ Falha (billing) |
| ... | ❌ (34 workflows) |

## Soluções Disponíveis

### Opção A: Adicionar Billing (Recomendado para produção)

1. Acesse: `https://github.com/settings/billing`
2. Em "Actions", clique em "Set up payment"
3. Configure um método de pagamento
4. Defina um limite de gastos

**Custo estimado:** ~$0.008/min para Linux

### Opção B: Tornar Repositório Público

1. Acesse: `https://github.com/adm01-debug/vis-o/settings`
2. Role até "Danger Zone"
3. Clique em "Change repository visibility"
4. Selecione "Public"

**Nota:** Repositórios públicos têm Actions ilimitados

### Opção C: Self-Hosted Runners

1. Configure uma máquina ou VM
2. Instale o GitHub Actions Runner
3. Registre no repositório

**Docs:** https://docs.github.com/en/actions/hosting-your-own-runners

### Opção D: Reduzir Workflows (Temporário)

Desabilitar workflows não essenciais:

```bash
# Em .github/workflows/, renomeie para .disabled:
mv visual-regression.yml visual-regression.yml.disabled
mv lighthouse.yml lighthouse.yml.disabled
```

## Workflows Essenciais (Manter Ativos)

1. `ci.yml` - Build e validação
2. `test.yml` - Testes automatizados
3. `lint.yml` - Linting de código
4. `security.yml` - Análise de segurança

## Workflows Opcionais (Podem ser desabilitados)

- Visual Regression
- Lighthouse CI
- Accessibility Tests
- Coverage Report
- Storybook Deploy
- etc.

## Próximos Passos

1. [ ] Escolher uma das opções acima
2. [ ] Implementar a solução
3. [ ] Verificar que workflows voltaram a funcionar
4. [ ] Atualizar este documento

---

## Links Úteis

- [GitHub Actions Billing](https://docs.github.com/en/billing/managing-billing-for-github-actions)
- [Actions Usage Limits](https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration)
- [Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)

---

*Documento criado como parte do Sprint 8 de CI/CD*
