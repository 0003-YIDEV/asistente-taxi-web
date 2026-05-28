// Capa AGNÓSTICA de proveedor de IA. Hoy: Gemini (AI Studio, pruebas). Mañana: Mistral/IONOS
// o modelo auto-alojado, cambiando AI_PROVIDER sin tocar el resto del código.
// Mecanismo de cumplimiento RGPD: el llamador decide QUÉ texto entra aquí — al asistente
// guiado solo debe llegar estructura del trámite + manual, NUNCA datos de cliente.

export type ChatMsg = { rol: "user" | "assistant"; texto: string };

export class IAError extends Error {}

export async function chatIA(opts: { system: string; mensajes: ChatMsg[] }): Promise<string> {
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
async function chatGemini({ system, mensajes }: { system: string; mensajes: ChatMsg[] }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new IAError("Falta GEMINI_API_KEY en el entorno.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: mensajes.map((m) => ({
      role: m.rol === "assistant" ? "model" : "user",
      parts: [{ text: m.texto }],
    })),
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new IAError("No se pudo contactar con el proveedor de IA.");
  }
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new IAError(`El proveedor de IA devolvió ${res.status}. ${detalle.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) throw new IAError(`Respuesta bloqueada por el proveedor: ${data.promptFeedback.blockReason}`);
  const texto = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!texto) throw new IAError("El proveedor de IA no devolvió respuesta.");
  return texto;
}
