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
- ✅ **Fase 4 (editor inline) — COMPLETADA**: `src/lib/actions/workflows.ts`
  (`updateWorkflow`, guard `requireAdmin`), `canEdit` en la page, UI de edición inline en
  `ProcedimientosViewer` + `WorkflowEditor.tsx` (meta, pasos add/borrar/reordenar, listas).
  **Smoke test PASADO** (Playwright, sesión admin): editar → guardar → persiste en BD →
  UI refleja. En main: `57ceb78`.
- ⚠️ **Deploy prod pendiente** (coordinar): `migrate resolve --applied 20260526225631_add_client_checklist`
  + `migrate deploy` + seed. BACKUP de la BD antes.

### 🟢 Bóveda documental por cliente — EN CURSO (la cojo yo, Zyro/Claude)
Plan completo: `docs/PLAN-BOVEDA-DOCUMENTAL.md`. Estructura = **árbol de carpetas** (no 00–99 plano).
- ✅ **F0**: `/storage/` gitignoreado (verificado) + `STORAGE_DIR` en `.env.example`.
- ✅ **F1 (modelos)**: `Carpeta` (árbol, parentId) + `Documento` en `schema.prisma` +
  migración `add_boveda_documental`. **El log de accesos reutiliza el `AuditLog` existente**
  (no creo modelo nuevo).
  🔑 **@0003-YIDEV — firma ESTABLE del modelo `Documento` (ya en main):**
  `id, clientId, carpetaId?, nombre, mime, tamanoBytes, rutaRelativa (unique), hashSha256,`
  `origen ("subido"|"generado"), refModelo? ("036"), estado ("borrador"|"definitivo"),`
  `fechaDocumento?, descripcion?`. Para persistir tus PDFs generados usa `origen="generado"`,
  `estado="borrador"`, `refModelo="036"`. En F5 expongo un helper `guardarGenerado(...)`.
- 🔵 **F2 (próxima)**: cifrado binario de ficheros + capa de almacenamiento.
- **Apartado tipo "Drive" por cliente**: selector de cliente + repositorio (subir, ver,
  actualizar, organizar) con estructura de carpetas 00–99.
- **OCR** (fase posterior): extraer datos de los documentos subidos.
- ⚠️ **Restricciones RGPD no negociables**:
  - Documentos **cifrados en reposo** (mismo patrón que NIF/IBAN en `fieldEncryption`).
  - OCR **LOCAL** (Tesseract o similar), NUNCA servicio externo / LLM de consumo:
    los docs llevan NIF y datos de salud (mutua). Cero datos reales de clientes en LLM.
  - NUNCA custodiar certificados/Cl@ve de clientes.

## 0003-YIDEV (Gemini CLI)
### ✅ Completado recientemente (2026-05-27)
- **Perfil de usuario y navegación**:
  - Implementado `src/app/perfil/page.tsx` con datos de sesión.
  - Conectado el botón "Usuario" en `FloatingNav` a la nueva ruta.

### 🔵 En curso
- **Integración de PDFs Oficiales (Modelo 036) — REFINAMIENTO**:
  - *Estado actual:* La UI (`PdfForm.tsx`) y el mapeo (`model036Mapping.ts`) están operativos, pero la escritura del PDF con `pdf-lib` es inestable porque el documento oficial no tiene campos AcroForm reales (es plano).
  - *Fase 1 (Plantilla):* Conseguir una versión del Modelo 036 con AcroForms o implementar un mapeador visual de coordenadas absolutas por página para el documento plano.
  - *Fase 2 (Validación):* Añadir validaciones estrictas (formato NIF, longitud IBAN) usando **Zod** antes de estampar en el PDF.
  - *Fase 3 (Persistencia):* Preparar el modelo `Documento` para persistir metadatos de PDFs generados (borradores) en la futura Bóveda Documental.
  - ⚠️ **GitCoWork Safe**: Cualquier cambio en el modelo `Documento` se hará mediante `npx prisma migrate dev` para coordinar con el socio.

---
**Convención**
- Branches: `feature/[area]-[desc]` · `fix/[area]-[desc]`
- Commits: `feat(area):` `fix(area):` `refactor(area):` `chore:`
- Antes de `git pull`/`checkout`: working tree limpio.
- Divergencia: NUNCA `push --force`; rebase limpio + push fast-forward.



