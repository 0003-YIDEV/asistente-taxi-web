# Plan — Flujo Trámites ↔ Bóveda + datos (camino a la automatización)

> Veredicto del council (2026-05-28) + plan de construcción reordenado.
> Objetivo: herramienta intuitiva y asistida hoy, que escale a semi → casi → automática.

## Visión

Conectar los **Trámites guiados** (expedientes) con la **Bóveda documental** y los **datos**
del cliente, de modo que cada trámite "sepa" qué necesita y qué produce, lo recopile/genere
en su sitio sin que el asesor navegue a mano, y muestre siempre **qué falta**.

## Principio rector (decisión de arquitectura)

**Cada interacción manual = una server action limpia, idempotente y desacoplada de la UI.**
Rellenar datos, adjuntar documento, marcar paso, generar output → todas son acciones que hoy
pulsa el humano y que **mañana ejecutará el agente** (forma B del asistente IA). La UI es solo
un cliente más de esas acciones. Esto NO es coste extra: es la inversión que habilita la
automatización sin reescribir.

La frontera **🟢auto / 🟡asistido / 🔴humano** que ya vive en cada `WorkflowPaso` es el **mapa
de automatización**: define qué pasos podrá ejecutar el agente primero. Dejar en el modelo el
hueco para que un paso 🟢auto declare "qué acción ejecuta" (no hace falta llenarlo aún).

## La escalera de automatización

1. **Manual (hoy):** el humano rellena datos, adjunta docs, marca pasos.
2. **Asistido (sin IA):** pre-rellenar datos desde la ficha del `Client`; sugerir docs de la Bóveda.
3. **Casi-automático (IA):** OCR/extracción pre-rellena datos; la IA ejecuta los pasos 🟢auto, el humano valida los 🔴.
4. **Automático:** encadena pasos auto con checkpoints humanos en los gates.

## Modelo de datos (aditivo)

- **`Expediente.datos`** (JSON) — datos del trámite (keyed por input). Flexible ahora; tipar
  cuando el módulo fiscal lo exija. **Cifrar los sensibles** (IBAN) igual que en `Client`.
- **`ExpedienteDocumento`** — vínculo documento↔expediente: `{ expedienteId, documentoId (SetNull),
  rol ("aportado"|"generado"), etiqueta }`. Reutiliza las acciones de la Bóveda (subir/preview).

## Orden de construcción (reordenado por el council — lo que más renta primero)

1. **B2 · Outputs → carpeta automática.** Al iniciar el trámite, auto-crear las carpetas de los
   `outputs` en la Bóveda del cliente. Sección "Produce": cada artefacto con su carpeta; subir →
   cae directo en su carpeta + vínculo rol `generado`. *(máximo valor/intuición, mínimo riesgo)*
2. **Pre-rellenado de datos desde la ficha del cliente.** NIF/IBAN/domicilio ya están en `Client`
   → escalón "asistido" gratis, sin IA.
3. **B3 · Documentos aportados.** Adjuntar → subir nuevo o **elegir de la Bóveda** del cliente
   (vínculo rol `aportado`), con preview y quitar.
4. **B1 · Formulario de datos completo.** Resto de `inputs` como campos; guardar en `Expediente.datos`,
   cifrando los sensibles. Cobra pleno sentido cuando alimente el cálculo fiscal / el PDF (036).

## UX / vanguardia

- Una pantalla por trámite con **indicador de completitud** (datos X/Y · docs X/Y · pasos X/Y)
  y **"qué falta / siguiente acción sugerida"**. Ese es el hilo que lo hace intuitivo.
- Subir siempre va a la carpeta correcta (cero navegación).

## RGPD

- Docs aportados/generados → cifrados en la Bóveda (heredado).
- `Expediente.datos`: cifrar IBAN y similares; nunca datos de salud en claro.

## Cómo retomar

Empezar por **B2** (outputs → carpeta automática + auto-crear carpetas al iniciar). Construir
las acciones limpias e idempotentes desde el principio (substrato del futuro agente).
