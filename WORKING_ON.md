# WORKING_ON

_Actualizar al EMPEZAR y al TERMINAR cada tarea. Evita que nos pisemos (skill gitcowork)._
_Antes de tocar algo: mira aquí + `git fetch && git log origin/main --oneline -10`._

## 0001-YIDev (Zyro / Claude)

### ✅ Completado recientemente (2026-05-27)
- **Guía de procedimientos visual** — ✅ EN MAIN y ✅ DESPLEGADA en
  **horus.support/procedimientos**:
  - `src/data/workflows.ts` — 9 servicios / 39 procedimientos como datos (FUENTE ÚNICA;
    sirve para el manual visual y la futura automatización). Spec: Manual Taxistas 2026.
  - `src/app/procedimientos/page.tsx` + `src/components/ProcedimientosViewer.tsx` —
    página visual: servicios desplegables, pasos con badges 🟢auto/🟡asistido/🔴humano,
    gates, plazos, frontera de automatización. Botones Atrás/Inicio.
  - `src/components/FloatingNav.tsx` — añadido enlace "Guía" (combinado con tu logout).
- **Deploy/infra** (sesión anterior): Traefik v3.0→v3.6.1 (fix API Docker), split
  `auth.config.ts` edge-safe (fix 500 del middleware). App viva en horus.support con SSL.

### 🟡 Editor de la guía — EN CURSO (migrar workflows a BD, editar sin código)
- ✅ **Fase 1-2**: modelos `Workflow` + `WorkflowPaso` en `schema.prisma`; migraciones
  separadas (`add_client_checklist` + `add_workflow_models`); `prisma/seed.ts` COMBINADO
  (tu admin argon2 + mis 37 workflows / 144 pasos). Historial de migraciones regularizado.
- ✅ **Fase 3 (lectura desde BD)**: `src/lib/workflows-db.ts` (`getWorkflowsFromDB`,
  fallback al .ts si BD vacía); `procedimientos/page.tsx` ahora es server component async
  que lee de BD; `ProcedimientosViewer` recibe `workflows` por props. Validado: 37 wf.
- 🔵 **Fase 4-5 (en curso)**: server actions de escritura (CRUD pasos/URLs) + UI de edición
  inline en `/procedimientos` (modo edición, **solo rol admin**). Ya creado:
  `src/lib/actions/workflows.ts` (`updateWorkflow`, guard `requireAdmin`). Falta `canEdit`
  en la page + UI de edición en `ProcedimientosViewer`.
- ⚠️ **Deploy prod pendiente** (coordinar): `migrate resolve --applied 20260526225631_add_client_checklist`
  + `migrate deploy` + seed. BACKUP de la BD antes.

### 🔭 Siguiente fase declarada (DESPUÉS del editor) — Bóveda documental por cliente
- **Apartado tipo "Drive" por cliente**: selector de cliente + repositorio de documentos
  asociados (subir, ver, actualizar, organizar). Encaja con el modelo `Documento`
  (estructura de carpetas 00–99) ya previsto en la arquitectura.
- **OCR** (fase posterior): extraer datos de los documentos subidos.
- ⚠️ **Restricciones RGPD no negociables** (heredadas del proyecto):
  - Documentos **cifrados en reposo** (mismo patrón que NIF/IBAN en `fieldEncryption`).
  - OCR **LOCAL** (Tesseract o similar), NUNCA servicio externo / LLM de consumo:
    los docs llevan NIF y datos de salud (mutua). Cero datos reales de clientes en LLM.
  - NUNCA custodiar certificados/Cl@ve de clientes.

## 0003-YIDEV (Gemini CLI)
### ✅ Completado recientemente (2026-05-27)
- **Perfil de usuario y navegación**:
  - Implementado `src/app/perfil/page.tsx` con datos de sesión.
  - Conectado el botón "Usuario" en `FloatingNav` a la nueva ruta.
- **Integración de PDFs Oficiales (Modelo 036)**:
  - Estructura de mapeo dinámico en `src/lib/pdf/model036Mapping.ts`.
  - Nuevo componente `PdfForm.tsx` para solicitar datos faltantes (Ref. Catastral, etc.).
  - Server Action `generatePdfAction` con `pdf-lib` para rellenar y descargar.
  - Conectado a `TramitarModal` y `ServiciosIndex`.

### 🔵 En curso
- **Refinamiento de Bóveda y Persistencia PDF**:
  - Preparar el modelo `Documento` para persistir metadatos de PDFs generados.
  - Implementar el guardado automático de borradores en la estructura de carpetas (01_Altas_Bajas) una vez que el socio despliegue la Bóveda.
  - ⚠️ **GitCoWork Safe**: Requiere coordinación por el nuevo modelo `Documento`.

---
**Convención**
- Branches: `feature/[area]-[desc]` · `fix/[area]-[desc]`
- Commits: `feat(area):` `fix(area):` `refactor(area):` `chore:`
- Antes de `git pull`/`checkout`: working tree limpio.
- Divergencia: NUNCA `push --force`; rebase limpio + push fast-forward.



