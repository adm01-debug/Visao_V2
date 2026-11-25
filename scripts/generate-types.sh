#!/bin/bash
# Generate TypeScript types from Supabase
echo "🔄 Generating types..."
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
echo "✅ Types generated!"
