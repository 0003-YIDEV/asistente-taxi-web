# ROADMAP — Gestión fiscal vertical + IA para taxistas autónomos

> Fuente de verdad de la dirección del producto. Actualizar al cerrar cada etapa.
> Última actualización: 2026-05-28.

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
- **Stack de IA (council 2026-05-27, ver `COUNCIL-STACK-IA.md`):** capa **agnóstica de
  proveedor con enrutado por sensibilidad**. Asistente guiado (no-sensible) → **API europea**
  (Mistral recomendado; proveedor final por decidir). Extracción sensible → **encargado UE
  con DPA** (IONOS), con datos de salud enrutados aparte (anonimizar o auto-alojar). Auto-alojar
  (Ollama+Qwen) = meta futura, no requisito de arranque. Condiciones: DPA antes de datos reales,
  DPIA antes de extracción sensible, revisión humana de toda salida con efecto fiscal.
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
  *Base sobre la que se monta la Etapa 3 (C).* (pendiente)
- ✅ **Copiloto A (HECHO)** — **asistente flotante global** consciente del contexto
  (`AsistenteFlotante` + `asistenteGlobal` + capa agnóstica `src/lib/ai/provider.ts`).
  Backend **Gemini** (pruebas; AI Studio del socio) intercambiable por env. Conoce el
  catálogo de trámites y, si estás dentro de un expediente, su estructura. **Cero datos de
  cliente** al modelo. Ver "Asistente IA — escalera de automatización" más abajo.

### Asistente IA — escalera de automatización
> El chat evoluciona de "habla" a "actúa". Modelo: cada respuesta = **texto + acciones**
> (botones que el humano confirma). Las acciones reusan las server actions limpias
> existentes (principio del council). Function-calling nativo del proveedor.

1. ✅ **Informativo (HECHO)** — responde, orienta, conoce el contexto del trámite.
2. **Interactivo (navegación + rellenar con un clic)** — la respuesta trae acciones:
   🧭 *navegar* (te lleva a la página), ✏️ *rellenar dato*, ✅ *marcar paso*, 📎 *adjuntar*,
   📄 *crear expediente*. El humano confirma cada una. *Primer corte: navegación clicable
   (quick-win) → luego function-calling para rellenar.*
3. **Casi-automático** — el agente encadena los pasos 🟢auto, se para en 🔴/gates.
4. **Automático con supervisión** — de principio a fin, parando en checkpoints (gates/firma).
- **Habilitador paralelo: OCR/extracción (Etapa 3 / forma C)** — lee un documento y propone
  rellenar datos → alimenta los escalones 2-3.
- **🔒 RGPD:** escalones 1-2 (sin enviar datos de cliente al modelo) pueden seguir con Gemini.
  En cuanto el agente **lea datos de cliente para decidir** (escalón 3+), enrutar al modelo
  RGPD-seguro vía la capa agnóstica (Mistral/IONOS/local) — nunca AI Studio gratuito.

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
  **capa agnóstica de IA** sobre API UE (Mistral/IONOS) + opción Ollama+Qwen auto-alojado (futuro).

## Riesgos / notas RGPD

- DPIA antes del primer dato real (hay datos de salud: mutua).
- IA: documentos con NIF/datos sensibles → encargado UE con DPA o auto-alojado; datos de
  salud (mutua, Art. 9) enrutados aparte (anonimizar o local). DPA antes de datos reales,
  DPIA antes de extracción sensible. Asistente guiado (no-sensible) → API UE sin problema.
- Verificar/renovar apoderamientos REGAP anteriores a abril-2021 (caducaron abril 2026).

## Cómo retomar

Empezar por **Etapa 0** (fundamentos). Siguiente decisión de diseño abierta: elección de
proveedor de email y forma del worker cron (contenedor aparte vs proceso en la app).
