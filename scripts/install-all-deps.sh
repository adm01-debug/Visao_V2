#!/bin/bash

echo "🚀 Instalando todas as dependências necessárias..."

# Dependências de Segurança
echo ""
echo "📦 Dependências de Segurança:"
npm install dompurify @types/dompurify sanitize-html @types/sanitize-html

# Dependências de Qualidade
echo ""
echo "📦 Dependências de Qualidade:"
npm install -D @sentry/react msw @testing-library/user-event cypress

# Dependências PWA
echo ""
echo "📦 Dependências PWA:"
npm install -D vite-plugin-pwa workbox-window

# Dependências Storybook
echo ""
echo "📦 Dependências Storybook:"
npm install -D @storybook/react-vite @storybook/addon-essentials @storybook/addon-a11y @storybook/addon-interactions @storybook/test

# React Query Devtools
echo ""
echo "📦 React Query Devtools:"
npm install -D @tanstack/react-query-devtools

echo ""
echo "✅ Todas as dependências instaladas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. npm run build (para verificar)"
echo "   2. npm run test (para rodar testes)"
echo "   3. npm run storybook (para ver stories)"
