#!/bin/bash
# Database Seed Script

set -e

echo "🌱 Seeding database..."

# Run seed file
npx supabase db seed

echo "✅ Seeding complete!"
