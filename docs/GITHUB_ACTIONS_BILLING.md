# 🔧 Guia para Resolver GitHub Actions Billing

## Problema Atual

Os workflows do GitHub Actions estão falhando porque o repositório é **privado** e os minutos gratuitos foram consumidos.

## Soluções Disponíveis

### Opção 1: Adicionar Billing (Recomendado para Produção)

1. Acesse [GitHub Settings > Billing](https://github.com/settings/billing)
2. Adicione um método de pagamento
3. Configure um spending limit para Actions
4. Os workflows voltarão a funcionar automaticamente

**Custo estimado:** ~$0.008/minuto para Linux runners

### Opção 2: Tornar o Repositório Público (Temporário)

1. Vá em Settings > General > Danger Zone
2. Clique em "Change repository visibility"
3. Mude para Public
4. Repositórios públicos têm Actions ilimitados!

⚠️ **Atenção:** Só faça isso se não houver dados sensíveis no código.

### Opção 3: Usar Self-Hosted Runners

1. Configure um servidor próprio como runner
2. Acesse Settings > Actions > Runners
3. Clique em "New self-hosted runner"
4. Siga as instruções de instalação

**Vantagem:** Sem custo de minutos
**Desvantagem:** Requer infraestrutura própria

### Opção 4: Executar Testes Localmente

Enquanto o billing não é resolvido, execute localmente:

```bash
# Instalar dependências
npm install

# Rodar testes
npm run test

# Rodar linting
npm run lint

# Rodar build
npm run build

# Rodar Storybook
npm run storybook
```

## Verificando Status Atual

```bash
# Via GitHub CLI
gh run list --repo adm01-debug/vis-o

# Via API
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/adm01-debug/vis-o/actions/runs
```

## Configuração Recomendada

Para um projeto de produção, recomendamos:

1. **Billing configurado** com spending limit de $50-100/mês
2. **Branch protection** com required status checks
3. **Caching habilitado** nos workflows para economizar minutos

## Links Úteis

- [GitHub Actions Pricing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- [Managing Spending Limits](https://docs.github.com/en/billing/managing-billing-for-github-actions/managing-your-spending-limit-for-github-actions)
- [Self-hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners)

---

*Documento criado em 11/01/2026*
