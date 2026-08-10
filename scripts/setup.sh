#!/bin/bash
# Initial setup script
echo "🚀 Setting up VIS-O..."

# Check Node version
NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env file - please configure it"
fi

echo "✅ Setup complete!"
echo "Run 'npm run dev' to start development server"
