#!/bin/bash
# Install security dependencies
npm install dompurify sanitize-html --save

# Install quality dependencies  
npm install @sentry/react msw @testing-library/user-event --save-dev

# Install PWA support
npm install vite-plugin-pwa --save-dev

# Install Storybook
npx storybook@latest init --skip-install

echo "Dependencies installed successfully!"
