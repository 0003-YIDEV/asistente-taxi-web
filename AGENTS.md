<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## ✅ Checklist de Validación Local (Obligatorio)
Antes de realizar un commit o intentar un despliegue, el agente DEBE:

1. **Prisma Schema:**
   - Ejecutar `npx prisma validate` para asegurar la integridad de las relaciones.
   - Ejecutar `npx prisma format` para mantener el estándar visual y de mapeo.
2. **Type Safety:**
   - Ejecutar `npx tsc --noEmit` para capturar errores de tipado, especialmente en la frontera entre Server Actions y Client Components.
3. **Docker Build Readiness:**
   - Verificar que el `Dockerfile` incluya variables de entorno provisionales (`ARG DATABASE_URL`) para la fase de construcción estática.
   - Asegurar que `src/generated/prisma` está configurado correctamente en el generador.
   - Para evitar desincronización de credenciales, el agente debe priorizar el uso de variables de interpolación en docker-compose.yml (ej. ${VAR}) en lugar de valores literales. Cualquier cambio en las credenciales debe realizarse ÚNICAMENTE en el archivo .env.
   - En builds standalone de Next.js, el entorno runner es minimalista. Si se requieren herramientas de CLI adicionales (como Prisma) para tareas de post-despliegue, estas deben ser instaladas explícitamente en la /etapa final del Dockerfile
4. **Git Hygiene:**
   - Confirmar que todos los archivos nuevos están en el índice (`git status`).
