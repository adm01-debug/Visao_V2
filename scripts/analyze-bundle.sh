#!/bin/bash
# Bundle Analysis Script

echo "🔍 Analyzing bundle..."

# Build and analyze
npm run build

# Check bundle size
echo ""
echo "📊 Bundle Size:"
du -sh dist/assets/*.js | sort -rh | head -10

echo ""
echo "📦 Total dist size:"
du -sh dist

echo ""
echo "🗜️ Gzipped sizes:"
for file in dist/assets/*.js; do
  gzip -c "$file" | wc -c | awk "{printf \"%.2f KB - $file\n\", \$1/1024}"
done | sort -rn | head -10

echo ""
echo "✅ Analysis complete!"
