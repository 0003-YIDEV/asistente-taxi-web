# Plan — Bóveda Documental por Cliente (explorador tipo Drive/Finder)

**Estado:** PLANIFICADO (sin código aún) · **Owner:** Zyro/Claude (0001-YIDev)
**Fecha:** 2026-05-27 · **Coordinación:** @0003-YIDEV depende del modelo `Documento`

## Objetivo
Apartado tipo "Drive/Finder" por cliente: subir, ver, previsualizar, descargar,
organizar (árbol de carpetas), buscar y borrar los documentos de cada cliente,
con cifrado en reposo. Base para: (a) gestión documental del despacho,
(b) persistencia de los PDFs que genera el socio (Modelo 036),
(c) futuro OCR local, (d) alertas de vencimiento.

## Decisiones tomadas
- **Estructura:** árbol de carpetas **anidado** (parentId), estilo Finder real.
- **Almacenamiento:** carpeta gitignoreada, ruta por env `STORAGE_DIR`
  (local: `./storage`; VPS: volumen Docker). NUNCA en el repo.
- **Ruta física plana por UUID:** `storage/<clientId>/<uuid>` — el árbol vive SOLO
  en la BD (`carpetaId`). Mover/renombrar = operación de BD; los ficheros nunca se
  mueven en disco (rápido, sin corromper rutas).
- **Cifrado:** reutilizar `src/lib/crypto/fieldEncryption.ts` (AES-256-GCM,
  `ENCRYPTION_KEY`), añadiendo variante **binaria** para ficheros.
- **Metadatos** en PostgreSQL; **bytes cifrados** en disco.
- **UI v1:** preview inline (PDF/imagen), búsqueda/filtros, drag & drop, toggle
  lista/cuadrícula, breadcrumb, operaciones de carpeta.
- **Extra incluidas (baratas, alto valor):** log de accesos (RGPD), detección de
  duplicados por hash.
- **OCR:** fuera de este plan (fase posterior, local).

## Restricciones RGPD (no negociables)
- Ficheros cifrados en reposo (AES-256-GCM) + hash SHA-256 (integridad).
- Ruta de almacenamiento gitignoreada y fuera de control de versiones.
- Guard de sesión + verificación de propiedad (el asesor solo accede a SUS clientes).
- Log de accesos inmutable (quién/qué/cuándo).
- NUNCA custodiar certificados/Cl@ve. NUNCA enviar contenido a LLM externo.
- Borrado: hard-delete real disponible (derecho de supresión).

---

## FASE 0 — Blindaje previo (sin feature aún)
**Objetivo:** imposible filtrar documentos de cliente al repo.
1. `.gitignore`: añadir `/storage/`.
2. `storage/.gitkeep` (estructura, NO datos).
3. Verificar `git status` no rastrea nada bajo `storage/` (crear dummy, comprobar, borrar).
4. `.env.example`: documentar `STORAGE_DIR` y `ENCRYPTION_KEY`.
- **Validación:** dummy en `storage/` → git lo ignora.
- **Commit:** `chore(boveda): gitignore storage + env docs`

## FASE 1 — Modelo de datos
**Objetivo:** modelos `Carpeta`, `Documento`, `AccesoLog` + migración coordinada.
1. `prisma/schema.prisma`:
   - **`Carpeta`**: `id, clientId (FK→Client Cascade), parentId (self FK? nullable),`
     `nombre, createdAt, updatedAt` · `@@index([clientId, parentId])`.
   - **`Documento`**: `id, clientId (FK→Client Cascade), carpetaId (FK→Carpeta? nullable=raíz),`
     `nombre, mime, tamanoBytes, rutaRelativa (UNIQUE), hashSha256,`
     `origen ("subido"|"generado"), refModelo? , estado ("borrador"|"definitivo"),`
     `fechaDocumento? , descripcion? , createdAt, updatedAt` · `@@index([clientId, carpetaId])`
     · `@@index([clientId, hashSha256])` (duplicados).
   - **`AccesoLog`**: `id, userId, documentoId? , carpetaId? , accion`
     `("ver"|"descargar"|"subir"|"borrar"|"mover"|"renombrar"|"crear_carpeta"),`
     `createdAt` · `@@index([documentoId])`.
   - Relaciones inversas en `Client`: `carpetas Carpeta[]`, `documentos Documento[]`.
2. `npx prisma validate` + `npx prisma format`.
3. `npx prisma migrate dev --name add_boveda_documental` (coordinado con socio).
4. `npx tsc --noEmit`.
- **Validación:** migración aplicada, schema válido, tsc limpio.
- **Commit:** `feat(boveda): modelos Carpeta + Documento + AccesoLog + migración`.
- ⚠️ **Avisar al socio** en WORKING_ON: modelo `Documento` ya en main (firma estable).

## FASE 2 — Cifrado de ficheros + capa de almacenamiento
**Objetivo:** guardar/leer/borrar ficheros cifrados de forma segura.
1. `src/lib/crypto/fileEncryption.ts`: `encryptBuffer(buf): Buffer` /
   `decryptBuffer(buf): Buffer` (AES-256-GCM, mismo `ENCRYPTION_KEY`,
   formato `[version][iv][tag][ct]`); `sha256(buf): string`.
2. `src/lib/storage/vault.ts`:
   - `getStorageDir()` — lee/valida `STORAGE_DIR` (existe + escribible).
   - `saveEncrypted(clientId, buf)` → `{rutaRelativa, hash, tamano}` (ruta plana UUID).
   - `readEncrypted(rutaRelativa)` → buffer descifrado (+ verifica hash).
   - `deleteFile(rutaRelativa)`.
   - Anti path-traversal: ruta derivada solo de UUID + clientId, nunca de input usuario.
- **Validación:** test standalone — cifrar→escribir→leer→descifrar, comparar hash;
  confirmar que el fichero en disco NO es legible en claro.
- **Commit:** `feat(boveda): cifrado binario de ficheros + capa de almacenamiento`

## FASE 3 — Server actions (CRUD + carpetas + log)
**Objetivo:** lógica servidor con guards + auditoría. Validación con **Zod**.
1. `src/lib/actions/boveda.ts` (`"use server"`), todas con guard sesión + propiedad cliente:
   - **Documentos:** `listar(clientId, carpetaId?)`, `subir(clientId, carpetaId, formData)`
     (valida mime/tamaño ≤20MB, cifra, detecta duplicado por hash → avisa, guarda, fila,
     log), `descargar(documentoId)` (descifra, verifica hash, log), `borrar(documentoId)`
     (fila + fichero + log), `mover(documentoId, carpetaDestinoId)`, `renombrar(documentoId, nombre)`,
     `editarMeta(documentoId, {estado, fechaDocumento, descripcion})`.
   - **Carpetas:** `crearCarpeta(clientId, parentId?, nombre)`, `renombrarCarpeta`,
     `moverCarpeta` (validar NO ciclos: el destino no puede ser descendiente),
     `borrarCarpeta` (bloquear si no vacía, o borrado recursivo explícito).
   - **Búsqueda:** `buscar(clientId, {texto?, estado?, mime?})`.
2. `revalidatePath` donde toque.
- **Validación:** smoke test de la lógica contra BD + disco.
- **Commit:** `feat(boveda): server actions documentos + carpetas + búsqueda + log`

## FASE 4 — UI explorador (Drive/Finder)
**Objetivo:** interfaz usable.
1. Ruta `/boveda`: selector de cliente (reusar `ClientSelector`).
2. **Breadcrumb** (Cliente › Carpeta › Subcarpeta…) + navegación por árbol.
3. **Toggle lista/cuadrícula**; iconos por tipo (PDF, imagen, doc, otro).
4. **Drag & drop** para subir (+ botón clásico) con barra de progreso/estados.
5. **Preview inline** de PDF/imagen (descifrado al vuelo vía `descargar`).
6. **Búsqueda/filtros** (nombre, estado, tipo) dentro del cliente.
7. Acciones: crear carpeta, renombrar, mover (drag o menú), borrar (con confirmación),
   editar metadatos (estado/fecha/descripción).
8. Estados: vacío, subiendo, error. Acceso: usuarios logueados (¿solo admin? decidir en F4).
- **Validación:** smoke test Playwright (login → crear carpeta → subir → preview →
  buscar → mover → descargar → borrar).
- **Commit:** `feat(boveda): UI explorador tipo Drive (árbol, preview, búsqueda, dnd)`

## FASE 5 — Integración socio (Modelo 036)
**Objetivo:** que los PDFs generados se guarden en la Bóveda.
1. Exponer `guardarGenerado(clientId, carpetaId, nombre, buf, refModelo)`
   (`origen="generado"`, `estado="borrador"`) para el flujo de PDF del socio.
2. Coordinar firma con el socio vía WORKING_ON.
- **Commit:** `feat(boveda): API para persistir PDFs generados`

## FASE 6 — (RECOMENDADA, confirmar) Vencimientos + vínculo a trámite
**Alto valor, conecta Bóveda con el núcleo del producto.**
- `Documento.fechaVencimiento?` + alerta escalada (ITV, seguro, licencia, **apoderamiento
  REGAP** — caduca y excluye del censo). Reusar el sistema de alertas existente.
- `Documento.workflowId?` / vínculo a instancia de trámite → el 036 generado queda atado
  a su trámite de alta. Une Bóveda + Guía de procedimientos.
- **Decisión pendiente:** incluir ahora o tras tener la Bóveda básica funcionando.

---

## Fuera de scope (por ahora)
- OCR (fase futura, local con Tesseract).
- Versionado de documentos / papelera (soft-delete).
- Compartir documentos con el cliente (portal cliente = fase futura del roadmap).
- Antivirus de subidas (evaluar si se abre a terceros).

## Orden gitcowork
Cada fase: `fetch` → trabajar → validar → `commit` → `fetch` → rebase si hace falta →
push FF. Nunca `push --force`. Avisar en WORKING_ON al tocar `schema.prisma`.
