#!/bin/bash
# Generate TypeScript types from Supabase
echo "🔄 Generating types..."
npx supabase gen types typescript --local > src/types/database.ts
echo "✅ Types generated!"
