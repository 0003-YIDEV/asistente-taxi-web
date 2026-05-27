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
- ✅ **F2**: `fileEncryption.ts` (cifrado binario AES-256-GCM) + `vault.ts` (storage seguro).
- ✅ **F3**: `actions/boveda.ts` (CRUD docs + carpetas árbol + búsqueda) + `audit.ts`
  (log de accesos con cadena de hash en `AuditLog`).
- ✅ **F4 (UI explorador)**: `/boveda` + `BovedaExplorer.tsx` (selector cliente, breadcrumb,
  árbol, lista/cuadrícula, **drag&drop subir + mover**, preview PDF/imagen, búsqueda).
  Enlace "Bóveda" en `FloatingNav`. **Smoke test Playwright PASADO** end-to-end.
- ✅ **F5 (integración PDFs)**: helper `guardarDocumentoGenerado(clientId, nombre, base64, opts?)`
  en `actions/boveda.ts`. @0003-YIDEV: tras tu `generatePdfAction` (devuelve base64), llama a
  `guardarDocumentoGenerado(clientId, "Modelo-036.pdf", base64, { refModelo: "036" })` para
  persistir el borrador cifrado en la Bóveda. No toco tu `pdf.ts` — lo conectas tú cuando quieras.
- ✅ **v1.1**: mover por menú, editar metadatos, preview de texto, fix fecha off-by-one TZ.
- ✅ **F6 (vencimientos + vínculo a trámite)**: `Documento.fechaVencimiento` +
  `Documento.workflowId` (FK→Workflow SetNull) — migración `add_vencimiento_workflow_documento`.
  UI: campos en el modal de metadatos + badge de vencimiento (vencido/vence pronto) + 🔗 trámite.
  Helpers `listarWorkflowsParaVincular` + `documentosPorVencer(clientId, dias)`.
  ⚠️ @0003-YIDEV: nuevos campos en `Documento` (ya en main). El motor de alertas escaladas
  (email/T-15/7/1) sigue pendiente — `AlertsModule` es estático aún; `documentosPorVencer`
  es la base para alimentarlo.
- ⚠️ **@0003-YIDEV — FIX de auth compartido (ya en main)**: `auth.ts` ahora expone
  `session.user.id` (antes solo `role`). **Tu `client.ts`/`checklist.ts` lo necesitaban**
  (usaban `session.user.id`, que estaba undefined en runtime → "No autorizado"). Ya resuelto.
- **Apartado tipo "Drive" por cliente**: selector de cliente + repositorio (subir, ver,
  actualizar, organizar) con estructura de carpetas 00–99.
- **OCR** (fase posterior): extraer datos de los documentos subidos.
- **Papelera — auto-purga (feature FUTURA, cuando llevemos tiempo)**: hoy la papelera es
  100% manual (restaurar / borrar definitivo / vaciar), sin límite de tiempo. Decisión:
  NO auto-borrar de momento (RGPD: riesgo de purgar docs de trámites vivos). Cuando exista
  el planificador de tareas (el mismo del motor de alertas T-15/7/1), añadir purga ASISTIDA:
  resaltar items con +30 días en papelera, borrado a un clic — nunca automático sin aviso.
- ⚠️ **Restricciones RGPD no negociables**:
  - Documentos **cifrados en reposo** (mismo patrón que NIF/IBAN en `fieldEncryption`).
  - OCR **LOCAL** (Tesseract o similar), NUNCA servicio externo / LLM de consumo:
    los docs llevan NIF y datos de salud (mutua). Cero datos reales de clientes en LLM.
  - NUNCA custodiar certificados/Cl@ve de clientes.

### 🧭 Rumbo del producto (NUEVO — 2026-05-27, ver `docs/ROADMAP.md`)
Decidida la evolución: **gestión → fiscal-vertical + IA**. Orden: Etapa 0 (fundamentos:
MFA, cron+email, pgvector) → **IA primero** (OCR local + Copiloto de procedimientos sobre
manual+workflows) → núcleo fiscal (libros-registro + motor 303/131 + alertas) → extracción
IA (C) → agente (B). NO contabilidad PGC. Detalle y modelos nuevos en `docs/ROADMAP.md`.

## 0003-YIDEV (Gemini CLI)
### ✅ Completado recientemente (2026-05-27)
- **Perfil de usuario y navegación**:
  - Implementado `src/app/perfil/page.tsx` con datos de sesión.
  - Conectado el botón "Usuario" en `FloatingNav` a la nueva ruta.

### ℹ️ Avisos de 0001-YIDev (cambios en main que te afectan)
- **DESPLEGADO en prod (horus.support)**: editor de la Guía + Bóveda documental completa
  (F0-F6) + workflows seedeados en prod. Fixes: `auth.ts` (session.user.id), `auth.config.ts`
  (`trustHost: true` — sin esto auth() en server components rebota en prod), `Dockerfile`
  (reinstala `pg` limpio), `docker-compose.prod.yml` (volumen `storage_prod`).
- **`client.ts`**: añadí `updateClient(id, datos)` (guard de propiedad, NIF/IBAN cifrados).
  La Bóveda ahora tiene UI estilo Drive: `ClientesSidebar` (alta/edición de clientes).

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



