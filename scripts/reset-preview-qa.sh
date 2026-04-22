#!/usr/bin/env bash
#
# reset-preview-qa.sh
# -------------------
# Reseta o ambiente de preview com lock de dependências e prepara o QA visual.
#
# Etapas:
#   1. Limpa caches (dist, node_modules/.cache, .vite, playwright cache de screenshots).
#   2. Reinstala dependências de forma determinística via `npm ci` (usa package-lock.json).
#   3. Re-executa os gates de pré-build (mobile-nav + page-content).
#   4. Build production-ready do bundle.
#   5. Dispara a suíte de QA visual (qa-visual-snapshots) e gera o relatório HTML.
#
# Uso:
#   bash scripts/reset-preview-qa.sh           # ciclo completo
#   bash scripts/reset-preview-qa.sh --no-qa   # apenas reset + build
#   bash scripts/reset-preview-qa.sh --fast    # pula limpeza pesada de node_modules
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SKIP_QA=false
FAST=false
for arg in "$@"; do
  case "$arg" in
    --no-qa) SKIP_QA=true ;;
    --fast)  FAST=true ;;
    *) echo "⚠️  Argumento desconhecido: $arg" ;;
  esac
done

log() { echo -e "\n\033[1;36m▶ $1\033[0m"; }
ok()  { echo -e "\033[1;32m✓ $1\033[0m"; }
err() { echo -e "\033[1;31m✗ $1\033[0m" >&2; }

log "1/5 — Limpando caches do preview"
rm -rf dist .vite node_modules/.cache playwright-report test-results 2>/dev/null || true
ok "Caches removidos"

if [ "$FAST" = false ]; then
  log "2/5 — Reinstalando dependências com lockfile (npm ci)"
  if [ ! -f package-lock.json ]; then
    err "package-lock.json ausente — abortando para evitar deriva de versões"
    exit 1
  fi
  npm ci --no-audit --no-fund
  ok "Dependências sincronizadas com package-lock.json"
else
  log "2/5 — [--fast] Pulando reinstalação; verificando integridade do lockfile"
  npm ls --depth=0 > /dev/null 2>&1 || {
    err "Estado de node_modules inconsistente — rode sem --fast"
    exit 1
  }
  ok "node_modules consistente com lockfile"
fi

log "3/5 — Executando gates de pré-build"
npm run check:mobile-nav
npm run check:page-content
ok "Gates aprovados"

log "4/5 — Buildando bundle production"
npm run build
ok "Build concluído"

if [ "$SKIP_QA" = true ]; then
  log "5/5 — [--no-qa] QA visual pulado por flag"
  ok "Reset completo (sem QA)"
  exit 0
fi

log "5/5 — Rodando QA visual + relatório de screenshots"
if npm run qa:visual-snapshots; then
  ok "QA visual concluído"
else
  err "QA visual falhou — verifique playwright-report/"
  npm run report:qa-screenshots || true
  exit 1
fi

npm run report:qa-screenshots
ok "Relatório QA disponível em scripts/qa-screenshots-report.html"

echo -e "\n\033[1;32m🎉 Preview resetado e pronto para validação visual.\033[0m"
