#!/bin/bash
set -e

# Script de despliegue para el VPS Hetzner

echo "🚀 Iniciando despliegue en horus.support..."

# Asegurarse de que estamos en el directorio correcto
cd "$(dirname "$0")/.."

# 1. Actualizar código
echo "📥 Actualizando código desde Git..."
git pull origin main

# 2. Levantar servicios con Docker Compose
echo "🏗️ Construyendo y levantando contenedores..."
docker-compose -f docker-compose.prod.yml up --build -d

# 3. Aplicar migraciones de base de datos
echo "🗄️ Aplicando migraciones de Prisma..."
docker-compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy --schema ./prisma/schema.prisma

# 4. Limpieza (opcional)
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

echo "✅ Despliegue completado con éxito!"
