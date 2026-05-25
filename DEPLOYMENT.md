# Guía de Despliegue VPS (horus.support)

Esta guía detalla los pasos para desplegar la aplicación en el VPS de Hetzner utilizando Docker y Traefik.

## 1. Configuración DNS
Asegúrate de que el registro **A** de `horus.support` apunte a la dirección IP de tu VPS Hetzner.

## 2. Preparación del Servidor
En el VPS, asegúrate de tener instalados:
*   Docker
*   Docker Compose (v2+)
*   Git

## 3. Clonar y Configurar
Si es la primera vez:
```bash
git clone <tu-repositorio-url> asistente-taxi
cd asistente-taxi
```

Configura las variables de entorno:
```bash
cp .env.example .env
nano .env
```

Rellena los valores obligatorios:
*   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
*   `DATABASE_URL` (ej: `postgresql://user:pass@postgres:5432/db`)
*   `AUTH_SECRET` (genera uno con `openssl rand -base64 32`)
*   `ENCRYPTION_KEY` (genera uno con `openssl rand -base64 32`)
*   `ACME_EMAIL` (tu email para certificados SSL de Let's Encrypt)

## 4. Despliegue
Ejecuta el script de despliegue:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

El script se encargará de:
1.  Hacer `git pull`.
2.  Construir la imagen de Next.js (standalone).
3.  Levantar Traefik (para SSL automático).
4.  Levantar Postgres.
5.  Aplicar migraciones de Prisma.

## 5. Verificación
Visita `https://horus.support` en tu navegador. Traefik debería haber generado un certificado válido automáticamente.
