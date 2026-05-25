# Etapa 1: Instalación de dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Etapa 2: Construcción de la aplicación
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría de Next.js durante la construcción
ENV NEXT_TELEMETRY_DISABLED 1

# Necesario para que Prisma no falle durante el build (estático/colección de datos)
ARG DATABASE_URL="postgresql://placeholder:5432/db"
ENV DATABASE_URL=$DATABASE_URL

# Generar Cliente de Prisma (salida personalizada en src/generated/prisma)
RUN npx prisma generate

# Construir Next.js
RUN npm run build

# Etapa 3: Ejecutor de producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios para el modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
