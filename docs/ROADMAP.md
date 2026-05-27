# ROADMAP — Gestión fiscal vertical + IA para taxistas autónomos

> Fuente de verdad de la dirección del producto. Actualizar al cerrar cada etapa.
> Última actualización: 2026-05-27.

## Visión

Convertir la herramienta de **gestión** actual (expedientes + bóveda documental + guía
de procedimientos) en una herramienta **fiscal-vertical** para taxistas autónomos
(IAE 721.2 / CNAE 4932, AMB Barcelona), apoyada por **IA** que asesora, extrae datos y
—más adelante— ejecuta pasos con supervisión humana.

**NO es:** contabilidad PGC genérica, CRM genérico, ni reimplementación de la presentación
AEAT. El puente "gestión → fiscal" es **libros-registro + motor de cálculo de módulos**,
no contabilidad de doble partida (un taxista en módulos no lleva contabilidad).

## Decisiones de rumbo (2026-05-27)

- **Alcance:** Gestión + módulo fiscal (libros-registro + motor 303/131 + calendario/alertas).
  La contabilidad PGC completa queda **fuera** salvo pivote futuro a "autónomos generales".
- **IA:** arrancar con **OCR funcional + Copiloto de procedimientos (A)** → luego
  **extracción inteligente (C)** → luego **agente que ejecuta (B)**.
- **Orden de arranque:** tras los fundamentos (Etapa 0), **IA primero** (OCR + Copiloto A);
  el núcleo fiscal va justo después.
- **RGPD (no negociable):** cero datos reales de clientes en LLM de consumo; OCR local;
  nunca custodiar certificados/Cl@ve; cifrado en reposo + audit log (ya implementados).

## Estado actual (lo que YA existe)

- **Auth.js + adaptador Prisma**; `otplib`+`qrcode` instalados (MFA listo para activar).
- **Cifrado AES-256-GCM** en reposo: campos (NIF/IBAN) y ficheros binarios.
- **AuditLog con cadena de hash** (log inmutable).
- **Bóveda documental**: árbol de carpetas, papelera (soft-delete), vencimientos,
  vínculo a trámite, búsqueda, contadores/avisos por cliente.
- **PostgreSQL** (habilita `pgvector` sin infra nueva).
- **Generación de PDF** (`pdf-lib`; Modelo 036 en curso — @0003-YIDEV).
- **Datos de dominio:** `Client` con flag de régimen; `Workflow`+`WorkflowPaso` (39
  procedimientos del manual en BD, editables) → base del Copiloto.

**Falta:** motor fiscal, libros-registro, planificador (cron), email, OCR, IA.

---

## Etapas

### Etapa 0 · Fundamentos transversales
*Pequeña pero habilita casi todo. Va primero sí o sí.*
- Activar **MFA (TOTP)** — enchufar `otplib`/`qrcode` ya presentes.
- **Worker de tareas programadas (cron) + email** (Resend/SMTP). Necesario para alertas
  fiscales y habilita la auto-purga de papelera (anotada como feature futura).
- Habilitar **`pgvector`** en Postgres.
- *Desbloquea:* alertas, copiloto, seguridad para datos reales.

### Etapa 1 · Arranque IA (OCR + Copiloto A)
- **OCR funcional** — `Tesseract.js` local + `pdf-parse` para PDFs con capa de texto.
  Extrae texto de cualquier documento subido a la Bóveda. 100% local (RGPD).
  *Base sobre la que se monta la Etapa 3 (C).*
- **Copiloto A** — chat que asesora usando el **manual + los 39 workflows en BD**, RAG
  sobre `pgvector`, Claude API en modo **zero-retention / sin entrenamiento**.
  **Cero datos de cliente.** Copiloto interno para los asesores.

### Etapa 2 · Núcleo fiscal (el valor del 80%)
- **Libros-registro** — modelo `Movimiento` (ingreso/gasto/inversión), enlazado al
  documento-factura de la Bóveda.
- **Motor de cálculo módulos 303/131** — TypeScript puro. La dificultad son las reglas
  fiscales (módulos 721.2), no el código.
- **Calendario fiscal + alertas escaladas T-15/7/1** (usa el worker de Etapa 0).
- **Alerta roja declaración km gasóleo (31-mar)** — exclusión del censo si falla.

### Etapa 3 · IA extracción (C)
- Factura de gasóleo / ITV / recibo subido → OCR (Etapa 1) + estructuración → **rellena
  solo** los `Movimiento` (Etapa 2) y los vencimientos. Mata la entrada manual de datos.
- *Depende de:* Etapa 1 (OCR) + Etapa 2 (modelo de movimientos).

### Etapa 4 · IA agente (B)
- Tool-use sobre las server actions, **con confirmación humana** antes de cada acción
  ("crea el expediente de alta de Juan", "genera el borrador del 036").
- *Depende de:* etapas anteriores + guardarraíles de seguridad.

---

## Modelos de datos nuevos previstos

- **`Movimiento`** (libro-registro): `clientId`, `tipo` (ingreso|gasto|inversion),
  `fecha`, `concepto`, `baseImponible`, `ivaTipo`, `ivaCuota`, `total`, `categoria`,
  `documentoId?` (factura en la Bóveda), `ejercicio`, `trimestre`. Importes en claro
  (necesarios para agregación/cálculo; no son identificativos por sí solos).
- **`DeclaracionFiscal`**: `clientId`, `modelo` (303|131), `periodo`, `ejercicio`,
  `datos` (JSON calculado), `estado` (borrador|presentado), `documentoId?` (PDF generado).
- **`EventoFiscal` / `Vencimiento`**: `clientId?`, `tipo`, `fechaLimite`, `estado`,
  `recurrencia` — calendario de plazos no atados a un documento.
- **`ParametrosModulo`** (o campos en `Client`): parámetros del módulo 721.2 para el cálculo.
- **(IA)** `DocChunk`/embeddings en `pgvector` para el RAG del Copiloto.

## Infra nueva a introducir

- `pgvector` (extensión Postgres) · `Tesseract.js` + `pdf-parse` (OCR local) ·
  worker cron (`node-cron` o contenedor programado) · email (Resend/SMTP) ·
  SDK de Anthropic (Claude, zero-retention).

## Riesgos / notas RGPD

- DPIA antes del primer dato real (hay datos de salud: mutua).
- IA: documentos con NIF/datos sensibles → OCR y estructuración **locales**; si se usa
  Claude API, solo con DPA + zero-retention y **nunca** con datos identificativos crudos
  salvo necesidad justificada y minimizada.
- Verificar/renovar apoderamientos REGAP anteriores a abril-2021 (caducaron abril 2026).

## Cómo retomar

Empezar por **Etapa 0** (fundamentos). Siguiente decisión de diseño abierta: elección de
proveedor de email y forma del worker cron (contenedor aparte vs proceso en la app).
