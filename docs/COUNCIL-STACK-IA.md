# Council — Stack de IA para la gestoría

> Acta de deliberación. Decisión de infraestructura de IA del producto.
> Fecha: 2026-05-27. Alimentado por investigación con fuentes primarias (ver final).

## Pregunta

¿Qué proveedor/modelo y qué filosofía de datos para: (1) asistente guiado **no-sensible**,
(2) extracción de documentos **sensibles**, (3) razonamiento fiscal futuro — sobre un VPS
**CPU-only**, con datos de salud (mutua) de por medio?

## Contexto verificado (researcher)

- **VPS CPU-only** (Hetzner típico, comparte recursos con Postgres+Next+Traefik). Un modelo
  14B local va a 3-7 tok/s → viable para extracción **asíncrona**, marginal para chat.
- **Proveedores UE RGPD-compliant** (hosting UE, sin entrenamiento, DPA): Mistral La
  Plateforme 🇫🇷, IONOS AI Model Hub 🇩🇪 (datos no salen de Alemania), Scaleway 🇫🇷,
  OVHcloud 🇫🇷. Coste a este volumen: **<5 €/mes**.
- **Modelos auto-alojables** (español + extracción JSON): **Qwen2.5-14B / Qwen3-8B-14B**
  (Q4_K_M). DeepSeek: **API en China → fuera por RGPD**; pesos abiertos auto-alojados sí valen.
- **No existe** LLM fiscal español de producción → la vía es Qwen/Mistral + **RAG sobre el manual**.

## Perfiles y posiciones (resumen)

- **DPO:** datos ordinarios → encargado UE (Art. 28) es legal, no obliga a auto-alojar.
  Datos de salud (mutua) = categoría especial (Art. 9) → DPIA + minimización; enrutar aparte.
- **Arquitecto:** "self-host vs API" es falso dilema → **capa agnóstica con enrutado por
  sensibilidad**. Una interfaz, varios backends, flag de sensibilidad por petición.
- **Seguridad:** auto-alojar traslada toda la superficie al equipo; un encargado UE
  certificado (ISO 27001) puede tener mejor postura. Claves fuera del repo; `temperature=0`
  + validación de esquema en extracción.
- **Lean/coste:** 14B local ahoga el VPS actual → exigiría 2ª máquina (coste+ops). API UE
  <5€/mes y cero mantenimiento. Soberanía total ahora = sobre-ingeniería para 15-20 clientes.
- **Fiscal/dominio:** error de extracción → posible sanción. **Revisión humana obligatoria**
  de toda salida con efecto fiscal → baja el listón de calidad necesario, habilita modelos pequeños.

## Veredicto

1. **Arquitectura (unánime):** capa **agnóstica de proveedor con enrutado por sensibilidad**.
   Base y mecanismo de cumplimiento RGPD por código. Se construye sí o sí.
2. **Asistente guiado (no-sensible) — arrancar ya:** **API europea**. Recomendación del
   council: **Mistral La Plateforme** (mejor español, ~5€/mes), con capa agnóstica para saltar
   a IONOS si se quiere más conservadurismo. **Proveedor final: ABIERTO** (lo decide el usuario).
3. **Extracción de documentos (sensible) — diferido a fase C, dirección marcada:**
   - Datos ordinarios → **encargado UE con DPA** (IONOS 🇩🇪, tiene OCR, datos solo en DE).
   - Documentos con **datos de salud (mutua)** → enrutar aparte: anonimizar antes, o
     auto-alojar Qwen solo para esos.
   - Auto-alojamiento general → **futuro**, cuando el volumen justifique coste/ops.
4. **Condiciones innegociables:**
   - DPA firmado con el proveedor **antes** de cualquier dato real.
   - **DPIA** antes de activar extracción de documentos sensibles.
   - **Revisión humana** de toda salida de IA con efecto fiscal.
   - Claves de API fuera del repo; `temperature=0` + validación de esquema en extracción.

**En una frase:** *capa agnóstica + API UE (Mistral recomendado) para el asistente guiado
ahora; encargado UE (IONOS) para extracción sensible después con DPA/DPIA y revisión humana;
auto-alojar como meta futura, no como requisito de arranque.*

## Abierto / pendiente

- **Proveedor final del asistente** (Mistral vs IONOS) — lo decide el usuario.
- Hardware exacto del VPS (RAM) — relevante solo cuando lleguemos a auto-alojar.

## Fuentes

Mistral Privacy Policy · Scaleway Generative APIs Data Privacy · OVHcloud AI Endpoints ·
IONOS AI Model Hub · DeepSeek/EU regulators (usercentrics, euronews) · Qwen3 Blog ·
Qwen2.5 OCR benchmark (HN) · MEL Legal Spanish LM (arXiv 2501.16011). Detalle en el
historial de la sesión (researcher, 2026-05-27).
