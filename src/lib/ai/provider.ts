// Capa AGNÓSTICA de proveedor de IA. Hoy: Gemini (AI Studio, pruebas). Mañana: Mistral/IONOS
// o modelo auto-alojado, cambiando AI_PROVIDER sin tocar el resto del código.
// Mecanismo de cumplimiento RGPD: el llamador decide QUÉ texto entra aquí — al asistente
// guiado solo debe llegar estructura del trámite + manual, NUNCA datos de cliente.

export type ChatMsg = { rol: "user" | "assistant"; texto: string };

// Declaración de herramienta (function-calling). `parameters` = JSON Schema.
export type Herramienta = { name: string; description: string; parameters: Record<string, unknown> };
export type LlamadaHerramienta = { name: string; args: Record<string, unknown> };
// Respuesta del modelo: texto y/o llamadas a herramientas que el HUMANO confirmará.
export type RespuestaIA = { texto: string; llamadas: LlamadaHerramienta[] };

export class IAError extends Error {}

export async function chatIA(opts: { system: string; mensajes: ChatMsg[]; tools?: Herramienta[] }): Promise<RespuestaIA> {
  const provider = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  switch (provider) {
    case "gemini":
      return chatGemini(opts);
    case "none":
    default:
      throw new IAError("Asistente IA no configurado. Define AI_PROVIDER y la clave del proveedor en .env.local.");
  }
}

// ── Backend Gemini (Google AI Studio) vía REST, sin dependencias ──
async function chatGemini({ system, mensajes, tools }: { system: string; mensajes: ChatMsg[]; tools?: Herramienta[] }): Promise<RespuestaIA> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new IAError("Falta GEMINI_API_KEY en el entorno.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents: mensajes.map((m) => ({
      role: m.rol === "assistant" ? "model" : "user",
      parts: [{ text: m.texto }],
    })),
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };
  if (tools?.length) body.tools = [{ functionDeclarations: tools }];

  // Reintentos con backoff ante errores transitorios (429 cuota, 503 saturación).
  const REINTENTABLE = new Set([429, 503]);
  const MAX = 3;
  let res: Response | null = null;
  for (let intento = 0; intento < MAX; intento++) {
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      throw new IAError("No se pudo contactar con el proveedor de IA.");
    }
    if (res.ok) break;
    const ultimo = intento === MAX - 1;
    if (REINTENTABLE.has(res.status)) {
      if (ultimo) {
        throw new IAError(
          res.status === 429
            ? "Se ha alcanzado el límite de uso del plan gratuito de Gemini. Espera un minuto y reintenta, o usa un modelo/plan con más cuota."
            : "El asistente está saturado ahora mismo (mucha demanda en el modelo). Prueba de nuevo en unos segundos.",
        );
      }
      await new Promise((r) => setTimeout(r, 600 * (intento + 1))); // 0.6s, 1.2s
      continue;
    }
    const detalle = await res.text().catch(() => "");
    throw new IAError(`El proveedor de IA devolvió ${res.status}. ${detalle.slice(0, 160)}`);
  }
  if (!res || !res.ok) throw new IAError("El asistente no está disponible. Prueba de nuevo en unos segundos.");

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) throw new IAError(`Respuesta bloqueada por el proveedor: ${data.promptFeedback.blockReason}`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const texto = parts.map((p) => p.text ?? "").join("").trim();
  const llamadas = parts
    .filter((p) => p.functionCall)
    .map((p) => ({ name: p.functionCall!.name, args: p.functionCall!.args ?? {} }));
  if (!texto && llamadas.length === 0) throw new IAError("El proveedor de IA no devolvió respuesta.");
  return { texto, llamadas };
}
