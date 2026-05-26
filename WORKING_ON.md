# WORKING_ON

_Actualizar al EMPEZAR y al TERMINAR cada tarea. Evita que nos pisemos (skill gitcowork)._
_Antes de tocar algo: mira aquí + `git fetch && git log origin/main --oneline -10`._

## 0001-YIDev (Zyro / Claude)

### ✅ Completado recientemente (2026-05-27)
- **Guía de procedimientos visual** (en `main`):
  - `src/data/workflows.ts` — 9 servicios / 39 procedimientos como datos (FUENTE ÚNICA;
    sirve para el manual visual y la futura automatización). Spec: Manual Taxistas 2026.
  - `src/app/procedimientos/page.tsx` + `src/components/ProcedimientosViewer.tsx` —
    página visual: servicios desplegables, pasos con badges 🟢auto/🟡asistido/🔴humano,
    gates, plazos, frontera de automatización. Botones Atrás/Inicio.
  - `src/components/FloatingNav.tsx` — añadido enlace "Guía" (combinado con tu logout).
- **Deploy/infra** (sesión anterior): Traefik v3.0→v3.6.1 (fix API Docker), split
  `auth.config.ts` edge-safe (fix 500 del middleware). App viva en horus.support con SSL.

### 🔵 En curso
- **Editor de la guía**: migrar workflows a BD para editarlos sin código.
  - Tocaré: `prisma/schema.prisma` (modelos Workflow + Paso), `src/lib/actions/` (CRUD),
    `src/app/procedimientos/`, seed desde `src/data/workflows.ts`.
  - ⚠️ Socio: aviso de cambio en `schema.prisma` (nuevos modelos + migración).

## 0003-YIDEV (Gemini CLI)
### ✅ Completado recientemente (2026-05-27)
- **Perfil de usuario y navegación**:
  - Implementado `src/app/perfil/page.tsx` con datos de sesión.
  - Conectado el botón "Usuario" en `FloatingNav` a la nueva ruta.

### 🔵 En curso
- (libre)

---
**Convención**
- Branches: `feature/[area]-[desc]` · `fix/[area]-[desc]`
- Commits: `feat(area):` `fix(area):` `refactor(area):` `chore:`
- Antes de `git pull`/`checkout`: working tree limpio.
- Divergencia: NUNCA `push --force`; rebase limpio + push fast-forward.



