#!/usr/bin/env bash
# VISÃO - Verificação rápida da stack.
# Detecta falhas de dependências (ex.: @rolldown/pluginutils ausente),
# erros de TypeScript e problemas de bootstrap do Vite antes do dev server subir.
#
# Uso: bash scripts/verify-stack.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log()  { printf "\033[1;36m[verify]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[verify:FAIL]\033[0m %s\n" "$*" >&2; exit 1; }
ok()   { printf "\033[1;32m[verify:OK]\033[0m %s\n" "$*"; }

STEP=0
next() { STEP=$((STEP + 1)); log "Passo $STEP: $*"; }

# ---------------------------------------------------------------------------
# 1) Instalação de dependências
# ---------------------------------------------------------------------------
next "bun install (dependências)"
if ! command -v bun >/dev/null 2>&1; then
  fail "Bun não encontrado no PATH."
fi
bun install --frozen-lockfile 2>&1 | tail -20 || {
  log "Lockfile divergente — tentando bun install sem --frozen-lockfile"
  bun install 2>&1 | tail -20 || fail "bun install falhou"
}
ok "dependências instaladas"

# ---------------------------------------------------------------------------
# 2) Módulos críticos presentes em node_modules
# ---------------------------------------------------------------------------
next "checagem de módulos críticos em node_modules"
CRITICAL_MODULES=(
  "lucide-react/dist"
  "framer-motion/dist"
  "@vitejs/plugin-react-swc/dist"
  "@rolldown/pluginutils"
  "fast-glob"
  "vite/dist"
  "react/index.js"
  "react-dom"
)
MISSING=()
for mod in "${CRITICAL_MODULES[@]}"; do
  if [ ! -e "node_modules/$mod" ]; then
    MISSING+=("$mod")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  fail "Módulos ausentes: ${MISSING[*]}"
fi
ok "todos os módulos críticos resolvidos"

# ---------------------------------------------------------------------------
# 3) Resolução ESM real (pega casos como @rolldown/pluginutils sem dist)
# ---------------------------------------------------------------------------
next "resolução ESM dos entrypoints críticos"
node --input-type=module -e "
import('lucide-react').catch(e => { console.error('lucide-react:', e.message); process.exit(1); });
import('framer-motion').catch(e => { console.error('framer-motion:', e.message); process.exit(1); });
import('@vitejs/plugin-react-swc').catch(e => { console.error('plugin-react-swc:', e.message); process.exit(1); });
import('vite').catch(e => { console.error('vite:', e.message); process.exit(1); });
" || fail "Falha ao importar um dos módulos críticos (provável dist ausente)."
ok "entrypoints ESM carregam"

# ---------------------------------------------------------------------------
# 4) TypeScript
# ---------------------------------------------------------------------------
next "typecheck (tsgo --noEmit)"
if npx --no-install tsgo --noEmit 2>&1 | tee /tmp/verify-tsc.log | tail -20; then
  if grep -qE "error TS[0-9]+" /tmp/verify-tsc.log; then
    fail "Erros de TypeScript detectados. Veja /tmp/verify-tsc.log"
  fi
else
  grep -qE "error TS[0-9]+" /tmp/verify-tsc.log && fail "Erros de TypeScript detectados."
fi
ok "TypeScript sem erros"

# ---------------------------------------------------------------------------
# 5) Bootstrap do Vite (carrega config + plugins sem servir requests)
# ---------------------------------------------------------------------------
next "bootstrap do Vite (resolveConfig)"
node --input-type=module -e "
import { resolveConfig } from 'vite';
const cfg = await resolveConfig({}, 'serve');
if (!cfg.plugins?.length) { console.error('Nenhum plugin resolvido'); process.exit(1); }
console.log('plugins:', cfg.plugins.length, '| mode:', cfg.mode);
" || fail "Vite não conseguiu resolver a config (verifique vite.config.ts e plugins)."
ok "Vite inicializa corretamente"

printf "\n\033[1;32m✔ Stack verificada com sucesso.\033[0m\n"
