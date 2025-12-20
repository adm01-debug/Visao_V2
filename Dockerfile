# ============================================
# VISÃO - Sistema de Vigilância Inteligente
# Dockerfile para Produção
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY bun.lockb* ./

# Instalar dependências
RUN npm ci --only=production=false

# Copiar código fonte
COPY . .

# Build arguments para variáveis de ambiente
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_MEDIAMTX_URL

# Setar variáveis de ambiente para build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_MEDIAMTX_URL=$VITE_MEDIAMTX_URL

# Build da aplicação
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

# Copiar configuração do nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar modelos de ML (se existirem)
# COPY --from=builder /app/public/models /usr/share/nginx/html/models

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
