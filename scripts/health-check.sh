#!/bin/bash
# Health Check Script

URL="${1:-http://localhost:5173}"

echo "🏥 Health check for $URL"

# Check main page
echo -n "Main page: "
if curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
fi

# Check health endpoint
echo -n "Health endpoint: "
if curl -s -o /dev/null -w "%{http_code}" "$URL/health" | grep -q "200"; then
  echo "✅ OK"
else
  echo "⚠️ Not available"
fi

# Check response time
echo -n "Response time: "
TIME=$(curl -s -o /dev/null -w "%{time_total}" "$URL")
echo "${TIME}s"

echo ""
echo "✅ Health check complete!"
