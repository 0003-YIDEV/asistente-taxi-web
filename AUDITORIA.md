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
