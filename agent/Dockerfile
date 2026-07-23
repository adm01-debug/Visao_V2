FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-fund --no-audit
COPY tsconfig.json ./
COPY src ./src
RUN npm install -D typescript && npx tsc -p tsconfig.json && npm prune --omit=dev
CMD ["node", "dist/index.js"]
