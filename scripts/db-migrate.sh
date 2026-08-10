#!/bin/bash
# Database Migration Script

set -e

echo "📊 Running database migrations..."

# Run Supabase migrations
npx supabase db push

echo "✅ Migrations complete!"
