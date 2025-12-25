# 🚀 Guia de Releases - VISÃO

## Versionamento Semântico

Este projeto segue o [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis

## Processo de Release

### 1. Preparação

```bash
# Atualizar branch main
git checkout main
git pull origin main

# Verificar testes
npm run test
npm run lint
npm run type-check
```

### 2. Criar Release Branch

```bash
git checkout -b release/vX.Y.Z
```

### 3. Atualizar Versão

```bash
# Patch (bug fixes)
npm version patch

# Minor (new features)
npm version minor

# Major (breaking changes)
npm version major
```

### 4. Atualizar CHANGELOG

Adicionar ao `CHANGELOG.md`:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Nova funcionalidade

### Changed
- Alteração

### Fixed
- Correção de bug

### Removed
- Funcionalidade removida
```

### 5. Commit e Tag

```bash
git add .
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

### 6. Push

```bash
git push origin release/vX.Y.Z
git push origin vX.Y.Z
```

### 7. Criar Pull Request

1. Abrir PR de `release/vX.Y.Z` para `main`
2. Aguardar aprovação e CI
3. Merge com squash

### 8. Deploy

O deploy é automático via GitHub Actions após merge na `main`.

## Hotfix

```bash
# Criar branch de hotfix
git checkout -b hotfix/vX.Y.Z main

# Aplicar correção
# ...

# Commit
git commit -m "fix: descrição do hotfix"

# Atualizar versão
npm version patch

# Push e criar PR
git push origin hotfix/vX.Y.Z
```

## Rollback

```bash
# Reverter para versão anterior
git revert HEAD

# Ou reverter para tag específica
git checkout vX.Y.Z
```

## Ambientes

| Ambiente | Branch | URL |
|----------|--------|-----|
| Development | `develop` | dev.visao.app |
| Staging | `main` | staging.visao.app |
| Production | `main` (tag) | visao.app |

## Checklist de Release

- [ ] Testes passando
- [ ] Lint sem erros
- [ ] Type-check OK
- [ ] CHANGELOG atualizado
- [ ] Versão atualizada
- [ ] Tag criada
- [ ] PR aprovado
- [ ] Deploy verificado

---

*Última atualização: 25/12/2024*
