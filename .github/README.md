# 🔧 GitHub Configuration

## Estrutura

```
.github/
├── workflows/        # 34 CI/CD pipelines
├── ISSUE_TEMPLATE/   # Templates de issues
├── CODEOWNERS        # Code owners
├── CONTRIBUTING.md   # Guia de contribuição
├── SECURITY.md       # Política de segurança
└── dependabot.yml    # Configuração do Dependabot
```

## Workflows CI/CD (34)

### 🔄 Core CI
- `ci.yml` - Pipeline principal
- `test.yml` - Testes unitários
- `lint.yml` - Linting
- `coverage.yml` - Cobertura de código

### 🚀 Deploy
- `cd.yml` - Continuous Deployment
- `deploy.yml` - Deploy manual
- `preview.yml` - Preview environments
- `release.yml` - Releases

### 🔒 Segurança
- `security.yml` - Security checks
- `security-scan.yml` - Vulnerability scanning
- `codeql.yml` - CodeQL analysis
- `dependency-audit.yml` - Audit de deps

### 📊 Qualidade
- `e2e.yml` - Testes E2E
- `accessibility.yml` - Testes de acessibilidade
- `chromatic.yml` - Visual testing
- `visual-regression.yml` - Regressão visual

### ⚡ Performance
- `bundle-size.yml` - Tamanho do bundle
- `lighthouse.yml` - Lighthouse CI
- `performance.yml` - Testes de performance

### 🔧 Avançado
- `blue-green.yml` - Blue-green deploy
- `canary-deploy.yml` - Canary releases
- `k8s-deploy.yml` - Kubernetes deploy
- `rollback.yml` - Rollback automático

## Templates

### Issues
- Bug report
- Feature request
- Documentation

### Pull Requests
- Template padrão com checklist

## Automações

- **Dependabot** - Atualização automática de deps
- **Stale** - Fechamento de issues inativas
- **Labeler** - Labels automáticos

---

*Atualizado em 10/01/2026*

