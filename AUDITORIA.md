# AUDITORIA — asistente-taxi-web

Proyecto: Asistente de gestión fiscal y administrativa para taxistas autónomos
Stack: Next.js 16 App Router · React 19 · Tailwind v4 · Prisma · framer-motion

---

## Sesión 2026-05-26

**Rama:** `feature/index-9-servicios`
**Operador:** Zyro (Claude Sonnet 4.6)

### Commits realizados

| Hash | Descripción |
|------|-------------|
| `a9f62d0` | feat(servicios): tipos Servicio y Procedimiento + datos hardcoded de los 9 servicios |
| `d84eae0` | feat(componentes): ServicioCard con efecto flotante |
| `f6488fe` | feat(componentes): ServiciosIndex grid responsive + panel flotante de procedimientos |
| `6971c1c` | feat(tramitar): modo anotación manual para procedimientos sin plantilla |
| `3c823a3` | feat(manual): mover ManualViewer a ruta /manual |
| `424cbc8` | feat(index): reemplazar bento dashboard por ServiciosIndex |
| `400e13d` | chore: confirmar limpieza footer interno Clifford Standard Spoke |
| `060a9eb` | feat(index): rediseño — lista vertical + modal centrado + dashboard derecho |
| `8be5c21` | feat(nav): FloatingNav persistente — Manual + Usuario + Logout |

### Archivos creados
- `src/data/servicios.ts` — tipos e interfaces Servicio/Procedimiento + getServicios()
- `src/components/ServicioCard.tsx` — card individual con efecto flotante
- `src/components/ServiciosIndex.tsx` — grid/lista + modal centrado + dashboard derecho
- `src/app/manual/page.tsx` — ruta /manual con ManualViewer
- `src/components/FloatingNav.tsx` — nav flotante (Manual + Usuario + Logout)

### Archivos modificados
- `src/components/TramitarModal.tsx` — añadida prop procedimientoSinPlantilla + modo anotación manual
- `src/app/page.tsx` — reemplazado bento por ServiciosIndex, eliminado footer interno
- `src/app/layout.tsx` — añadido FloatingNav global

### Decisiones arquitectónicas
- ServiciosIndex: lista vertical (no grid) + panel de procedimientos como modal centrado (no drawer lateral)
- Dashboard derecho restaurado con AlertsModule + ChecklistModule + enlaces externos
- Procedimientos sin plantilla abren TramitarModal en modo textarea libre
- FloatingNav: logout y usuario como placeholders hasta que auth esté conectada a la UI
- `src/lib/db.ts` queda sin trackear (gitignored, Prisma ya lo gestiona)

### Hallazgos del repositorio del socio (origin/main)
- Auth con NextAuth v5 + middleware de protección ya implementados
- Modelo Client con NIF/IBAN cifrados (fieldEncryption) en Prisma
- getClients() server action carga clientes reales desde BD del VPS
- TramitarModal del socio ya no usa CLIENTES_DUMMY → necesita merge
- ChecklistModule del socio acepta clientId → actualizar llamada en ServiciosIndex

### Pendiente para próxima sesión
- Rebase feature/index-9-servicios sobre origin/main (2 conflictos: page.tsx, TramitarModal)
- Ejecutar npm install tras pull (package.json cambió)
- Actualizar FloatingNav logout para usar signOut() de next-auth/react
- PR feature/index-9-servicios → main tras resolver conflictos

### Seguridad
- Sin secrets en commits verificado
- db.ts sin trackear (contiene credenciales DB)
- NIF/IBAN cifrados en BD (trabajo del socio, ya en schema)

---

## Post-sesión 2026-05-26 — GitCoWork

### Commit adicional
| Hash | Descripción |
|------|-------------|
| `b2a5559` | docs: añadir protocolo GitCoWork de coordinación equipo |

### Archivos añadidos
- `GITCOWORK.md` — protocolo de coordinación git para equipos con IA (agnóstico: Claude, Gemini, Copilot)

### Decisión
- Skill `gitcowork` creada en ZYRO/SKILLS/ como workflow recurrente
- GITCOWORK.md en el repo para que el socio la descargue e instale en su Gemini
- Protocolo basado en WORKING_ON.md como sistema de claiming de archivos + árbol de decisión de conflictos + ciclo entrada/cierre automatizado
- Investigación de mercado: nicho sin competidor directo (tick-md es lo más cercano pero cubre tareas, no archivos)

---

## Sesión 2026-05-27

**Rama:** `feature/auth-user-button`
**Operador:** Gemini CLI

### Commits realizados

| Hash | Descripción |
|------|-------------|
| `2447417` | feat(auth): implementar página de perfil y conectar FloatingNav |
| `23662af` | chore: actualizar WORKING_ON con perfil completado |
| `[PENDING]` | feat(auth): implementación de Argon2id + script seed para admin inicial |

### Tareas completadas
- [x] Creación de `src/app/perfil/page.tsx` con datos de sesión reales.
- [x] Conexión del botón "Usuario" en `FloatingNav`.
- [x] Refactorización de `src/auth.ts` y `src/auth.config.ts` para eliminar credenciales hardcodeadas.
- [x] Implementación de verificación de contraseña con `argon2`.
- [x] Creación de `prisma/seed.ts` para inicialización segura de la cuenta admin vía variables de entorno.
- [x] Actualización de `Dockerfile` y `docker-compose` para soportar migraciones y seeding en producción.

### Próximos pasos
- Realizar el merge de `feature/auth-user-button` a `main`.
- Probar el flujo completo en un entorno de staging/Docker.
- Migrar el resto de workflows a la base de datos (tarea del socio en curso).

---

## Sesión 2026-05-28

**Rama:** `main`
**Operador:** Claude / Zyro (0001-YIDev)

### Resumen
Construido y **desplegado a producción** el **escalón 2 del asistente IA agéntico** (function-calling): el chat ahora orienta, navega, lleva a procedimientos concretos y **ejecuta acciones confirmables** dentro de un trámite. Principio rector: *"operate, don't extract"* — el modelo decide por nombre/orden, el `expedienteId` lo pone la UI, y los datos sensibles (IBAN/NIF) NUNCA pasan por el LLM (guard en prompt + mapper + server action).

### Commits realizados

| Hash | Descripción |
|------|-------------|
| `2cf9132` | fix(asistente): el panel del chat no se cierra al navegar |
| `b5e0e48` | feat(asistente): pre-flight (datos/pasos) + deep-link a la Guía |
| `ecbb549` | chore: WORKING_ON escalón 2 pre-flight + deep-link |
| `520aff1` | feat(asistente): substrato de acciones confirmables (marcar_paso) |
| `84951bb` | feat(asistente): function-calling marcar_paso con chips |
| `75ccc42` | fix(asistente): catálogo siempre disponible + botón limpiar |
| `9fefff0` | feat(expedientes): modal nuevo trámite con acordeón por servicio |
| `31e082a` | feat(asistente): acción rellenar_dato con guardarraíl de sensibles |
| `7067997` | fix(asistente): rellenar_dato tolera mayúsculas en el campo |
| `2ed1c88` | feat(asistente): fecha de hoy en el prompt + 429 vs 503 |
| `6fda9cc` | chore(ia): modelo por defecto gemini-3.1-flash-lite |
| `2367789` | chore: WORKING_ON escalón 2 completo |
| `9242156` | chore(deploy): pasar AI_PROVIDER/GEMINI_* al contenedor app |

### Tareas completadas
- [x] **Escalón 2 completo (VALIDADO en vivo):** navegación clicable · pre-flight (datos+pasos por trámite) · deep-link a la Guía (`/procedimientos?wf=ID`) · `marcar_paso` · `rellenar_dato`, todo con chips confirmables.
- [x] Capa de function-calling en `provider.ts` (`{texto, llamadas}`, tools a Gemini, parseo de `functionCall`).
- [x] Substrato `src/lib/actions/asistente-acciones.ts` (dispatcher `ejecutarAccionTramite`).
- [x] Server action `rellenarDatoExpediente` (merge + guard de sensibles + match case-insensitive).
- [x] Señal de refresco pub/sub (la vista del trámite se actualiza al ejecutar una acción).
- [x] El asistente conoce la fecha de hoy (Europe/Madrid). Mensaje 429 (cuota) ≠ 503 (saturación).
- [x] UX: panel no se cierra al navegar · botón "Nueva conversación" · catálogo siempre disponible · modal "nuevo trámite" con acordeón por servicio.
- [x] **Desplegado a prod (horus.support):** push a `main`, `AI_PROVIDER`/`GEMINI_API_KEY`/`GEMINI_MODEL` añadidas al `.env` del VPS y al `docker-compose.prod.yml`. Verificado: sitio 200 + vars en el contenedor. Sin migraciones nuevas.
- [x] Modelo IA: `gemini-3.1-flash-lite` (free tier: 500 req/día + tools; el 2.5-flash daba 20/día).

### Incidencias y resoluciones
- `AUTH_SECRET` quedó vacío al editar `.env.local` (al meter la key de Gemini) → regenerado con `openssl rand -base64 32`. Solo afectó a sesiones locales (re-login); datos cifrados intactos.
- `gemini-2.5-flash` agotó cuota (429 `RESOURCE_EXHAUSTED`, 20 req/día free) → cambio a `gemini-3.1-flash-lite`.

### Próximos pasos
- **Streaming del chat** (`streamGenerateContent` + SSE) — va "lentillo" porque espera la respuesta completa. Fix de percepción principal.
- Recortar el catálogo del prompt (39 trámites por turno).
- "+ Nuevo trámite" siempre visible (hoy hay que salir del trámite abierto).
- Escalón 3: encadenar pasos auto + más conexión con datos de la empresa.
- (Futuro) key dedicada de prod / billing o proveedor UE con DPA para datos reales.
