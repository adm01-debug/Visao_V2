#!/bin/bash
# Generate TypeScript types from Supabase
#
# Escreve em arquivo temporario e so substitui o destino quando a CLI termina
# com sucesso E produz conteudo. Redirecionar direto (`> destino`) trunca o
# arquivo de tipos antes de a CLI falhar, deixando o cliente Supabase sem
# `Database` e o app sem type-check.
set -uo pipefail

target="src/integrations/supabase/types.ts"
tmp="$(mktemp "${target}.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

echo "🔄 Generating types..."
if ! npx supabase gen types typescript --local > "$tmp" || [ ! -s "$tmp" ]; then
  echo "❌ Falha ao gerar os tipos — '$target' foi preservado." >&2
  exit 1
fi

mv "$tmp" "$target"
trap - EXIT
echo "✅ Types generated!"
