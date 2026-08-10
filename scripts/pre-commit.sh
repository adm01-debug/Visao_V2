#!/bin/bash
set -e
echo "🔍 Running pre-commit checks..."
npm run lint
npm run type-check
npm run test:unit -- --run
echo "✅ All checks passed!"
