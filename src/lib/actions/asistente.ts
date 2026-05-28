"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { chatIA, IAError, type ChatMsg } from "@/lib/ai/provider";
import { appendAudit } from "@/lib/audit";

const NIVEL_TXT: Record<string, string> = { auto: "automatizable", asistido: "asistido", humano: "requiere persona" };

const BASE_SISTEMA = [
  "Eres el asistente de una gestoría española hiper-especializada en taxistas autónomos (IAE 721.2 / CNAE 4932, Área Metropolitana de Barcelona).",
  "Ayudas al ASESOR (no al cliente final): resuelves dudas de procedimientos y le orientas por la app.",
  "La app tiene estas secciones (rutas para enlaces): Inicio (/), Guía del manual (/procedimientos), Trámites guiados (/expedientes), Bóveda documental (/boveda), Manual (/manual), Usuario (/perfil).",
  "Cuando sugieras ir a una sección, INCLUYE un enlace markdown con su ruta para que el asesor pulse y vaya directo. Ejemplos: «ve a [Trámites](/expedientes) y crea el trámite», «súbelo en la [Bóveda](/boveda)». Usa solo esas rutas internas.",
  "Responde en español, claro y conciso. Si algo no está en tu contexto, dilo y NO inventes datos, plazos ni importes.",
  "NUNCA pidas ni manejes datos personales del cliente (NIF, IBAN, datos de salud): solo orientas sobre el procedimiento.",
].join("\n");

// Asistente flotante global. Si recibe expedienteId, añade el contexto de ESE trámite
// (estructura, NO datos del cliente). Si no, da ayuda general sobre los trámites disponibles.
// RGPD: al modelo solo va estructura de procedimientos + la pregunta. Nunca datos de cliente.
export async function asistenteGlobal(mensaje: string, historial: ChatMsg[] = [], expedienteId?: string) {
  const s = await auth();
  if (!s?.user?.id) throw new Error("No autorizado");
  const userId = s.user.id as string;

  const pregunta = mensaje.trim();
  if (!pregunta) throw new Error("Mensaje vacío");

  let contexto = "";

  if (expedienteId) {
    // Contexto del trámite abierto (con comprobación de propiedad).
    const exp = await db.expediente.findUnique({
      where: { id: expedienteId },
      include: {
        client: { select: { userId: true } },
        workflow: { select: { nombre: true, metaPlazo: true, metaBaseNormativa: true, metaResultado: true, inputs: true } },
        pasos: { orderBy: { orden: "asc" }, select: { orden: true, accion: true, nivel: true, gate: true, estado: true } },
      },
    });
    if (exp && exp.client.userId === userId) {
      const pasosTxt = exp.pasos
        .map((p) => `${p.orden + 1}. [${NIVEL_TXT[p.nivel] ?? p.nivel}] ${p.accion}${p.gate ? ` (condición: ${p.gate})` : ""} — ${p.estado}`)
        .join("\n");
      contexto = [
        "",
        `CONTEXTO: el asesor está dentro del trámite «${exp.workflow.nombre}».`,
        exp.workflow.metaPlazo ? `Plazo: ${exp.workflow.metaPlazo}.` : "",
        exp.workflow.metaBaseNormativa ? `Base normativa: ${exp.workflow.metaBaseNormativa}.` : "",
        exp.workflow.inputs?.length ? `Datos necesarios: ${exp.workflow.inputs.join("; ")}.` : "",
        "Pasos:",
        pasosTxt,
        `El asesor está en el paso ${exp.pasoActual + 1}.`,
      ].filter(Boolean).join("\n");
    }
  }

  if (!contexto) {
    // Contexto general: catálogo de trámites disponibles para orientar.
    const wfs = await db.workflow.findMany({ orderBy: [{ servicioId: "asc" }, { orden: "asc" }], select: { nombre: true } });
    contexto = `\nCONTEXTO: trámites disponibles en la app (${wfs.length}):\n` + wfs.map((w) => `- ${w.nombre}`).join("\n");
  }

  const system = BASE_SISTEMA + "\n" + contexto;
  const mensajes: ChatMsg[] = [...historial.slice(-10), { rol: "user", texto: pregunta }];

  try {
    const respuesta = await chatIA({ system, mensajes });
    await appendAudit({ actorId: userId, actorEmail: s.user.email ?? null, action: "ASISTENTE_QUERY", entity: expedienteId ? "Expediente" : "App", entityId: expedienteId ?? null });
    return { ok: true as const, respuesta };
  } catch (e) {
    if (e instanceof IAError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "Error inesperado del asistente." };
  }
}
