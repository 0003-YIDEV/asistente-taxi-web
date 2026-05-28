"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { chatIA, IAError, type ChatMsg, type Herramienta } from "@/lib/ai/provider";
import type { AccionTramite } from "@/lib/actions/asistente-acciones";
import { appendAudit } from "@/lib/audit";

const NIVEL_TXT: Record<string, string> = { auto: "automatizable", asistido: "asistido", humano: "requiere persona" };

const BASE_SISTEMA = [
  "Eres el asistente de una gestoría española hiper-especializada en taxistas autónomos (IAE 721.2 / CNAE 4932, Área Metropolitana de Barcelona).",
  "Ayudas al ASESOR (no al cliente final): resuelves dudas de procedimientos y le orientas por la app.",
  "La app tiene estas secciones (rutas para enlaces): Inicio (/), Guía del manual (/procedimientos), Trámites guiados (/expedientes), Bóveda documental (/boveda), Manual (/manual), Usuario (/perfil).",
  "Cuando sugieras ir a una sección, INCLUYE un enlace markdown con su ruta para que el asesor pulse y vaya directo. Ejemplos: «ve a [Trámites](/expedientes) y crea el trámite», «súbelo en la [Bóveda](/boveda)». Usa solo esas rutas internas.",
  "Cuando el asesor te pregunte por un trámite, ANTES DE NADA dile lo que necesita para hacerlo: qué DATOS y documentos hacen falta y cuántos pasos tiene (está en tu contexto). Después ofrécele dos enlaces: ver el detalle en la Guía con la ruta «/procedimientos?wf=ID» (ID = el id exacto del trámite que aparece en el contexto, p. ej. /procedimientos?wf=alta-reta) y empezarlo para un cliente en [Trámites](/expedientes).",
  "Responde en español, claro y conciso. Si algo no está en tu contexto, dilo y NO inventes datos, plazos ni importes.",
  "NUNCA pidas ni manejes datos personales del cliente (NIF, IBAN, datos de salud): solo orientas sobre el procedimiento.",
].join("\n");

// Herramienta que el modelo puede PROPONER (el humano confirma antes de ejecutar).
// Solo se ofrece cuando el asesor está dentro de un trámite concreto.
const TOOL_MARCAR_PASO: Herramienta = {
  name: "marcar_paso",
  description:
    "Marca un paso del trámite actual como hecho, saltado o pendiente. Úsalo cuando el asesor confirme que ha completado o quiere saltar un paso concreto. El paso se identifica por su número de orden (empezando en 1), tal como aparece en la lista de pasos del contexto.",
  parameters: {
    type: "object",
    properties: {
      orden: { type: "integer", description: "Número del paso (1-based), tal como aparece en la lista." },
      estado: { type: "string", enum: ["hecho", "saltado", "pendiente"], description: "Nuevo estado del paso." },
    },
    required: ["orden", "estado"],
  },
};

const TOOL_RELLENAR: Herramienta = {
  name: "rellenar_dato",
  description:
    "Rellena un dato NO SENSIBLE del trámite actual (p. ej. fecha, provincia, mutua, base de cotización). NUNCA la uses para IBAN, NIF, DNI, número de cuenta o tarjeta: esos los rellena el asesor a mano en la pestaña Datos. El campo debe coincidir exactamente con uno de los 'Datos necesarios' del trámite.",
  parameters: {
    type: "object",
    properties: {
      campo: { type: "string", description: "Nombre exacto del dato, tal como aparece en 'Datos necesarios'." },
      valor: { type: "string", description: "Valor a rellenar (solo datos NO sensibles)." },
    },
    required: ["campo", "valor"],
  },
};

// Traduce las llamadas del modelo a acciones validadas. Descarta lo que no cuadre:
// el modelo propone, pero los argumentos se validan aquí antes de ofrecérselos al humano.
function mapearAcciones(llamadas: { name: string; args: Record<string, unknown> }[]): AccionTramite[] {
  const out: AccionTramite[] = [];
  for (const ll of llamadas) {
    if (ll.name === "marcar_paso") {
      const orden = Number(ll.args.orden);
      const estado = String(ll.args.estado);
      if (Number.isInteger(orden) && orden >= 1 && (estado === "hecho" || estado === "saltado" || estado === "pendiente")) {
        out.push({ tipo: "marcar_paso", orden, estado, etiqueta: `Marcar paso ${orden} como ${estado}` });
      }
    } else if (ll.name === "rellenar_dato") {
      const campo = String(ll.args.campo ?? "").trim();
      const valor = String(ll.args.valor ?? "");
      // Guard RGPD: descarta propuestas sobre campos sensibles antes de ofrecerlas al humano.
      if (campo && !/iban|cuenta|tarjeta|nif|dni/i.test(campo)) {
        out.push({ tipo: "rellenar_dato", campo, valor, etiqueta: `Rellenar «${campo}» con «${valor}»` });
      }
    }
  }
  return out;
}

// Asistente flotante global. Si recibe expedienteId, añade el contexto de ESE trámite
// (estructura, NO datos del cliente). Si no, da ayuda general sobre los trámites disponibles.
// RGPD: al modelo solo va estructura de procedimientos + la pregunta. Nunca datos de cliente.
export async function asistenteGlobal(mensaje: string, historial: ChatMsg[] = [], expedienteId?: string) {
  const s = await auth();
  if (!s?.user?.id) throw new Error("No autorizado");
  const userId = s.user.id as string;

  const pregunta = mensaje.trim();
  if (!pregunta) throw new Error("Mensaje vacío");

  // Catálogo de trámites — SIEMPRE disponible, incluso dentro de un trámite, para que el
  // asesor pueda preguntar por OTROS trámites sin tener que salir. Solo ESTRUCTURA, cero datos de cliente.
  const wfs = await db.workflow.findMany({
    orderBy: [{ servicioId: "asc" }, { orden: "asc" }],
    select: { id: true, nombre: true, metaPlazo: true, inputs: true, outputs: true, _count: { select: { pasos: true } } },
  });
  const catalogo =
    `\nCONTEXTO: catálogo de trámites (${wfs.length}). De cada uno sabes qué datos/documentos necesita y cuántos pasos tiene:\n` +
    wfs
      .map((w) => {
        const outs = (w.outputs as { artefacto: string }[] | null) ?? [];
        const partes = [
          `${w._count.pasos} pasos`,
          w.metaPlazo ? `plazo: ${w.metaPlazo}` : "",
          w.inputs.length ? `necesita: ${w.inputs.join(", ")}` : "",
          outs.length ? `produce: ${outs.map((o) => o.artefacto).join(", ")}` : "",
        ].filter(Boolean).join(" · ");
        return `- «${w.nombre}» (id: ${w.id}) — ${partes}`;
      })
      .join("\n");

  // Si el asesor está dentro de un trámite suyo, AÑADIMOS su detalle (no sustituye al catálogo).
  let expActivo: string | null = null; // expediente del usuario confirmado → habilita las acciones
  let tramiteCtx = "";
  if (expedienteId) {
    const exp = await db.expediente.findUnique({
      where: { id: expedienteId },
      include: {
        client: { select: { userId: true } },
        workflow: { select: { nombre: true, metaPlazo: true, metaBaseNormativa: true, metaResultado: true, inputs: true } },
        pasos: { orderBy: { orden: "asc" }, select: { orden: true, accion: true, nivel: true, gate: true, estado: true } },
      },
    });
    if (exp && exp.client.userId === userId) {
      expActivo = exp.id;
      const pasosTxt = exp.pasos
        .map((p) => `${p.orden + 1}. [${NIVEL_TXT[p.nivel] ?? p.nivel}] ${p.accion}${p.gate ? ` (condición: ${p.gate})` : ""} — ${p.estado}`)
        .join("\n");
      tramiteCtx = [
        `CONTEXTO ACTIVO: el asesor está DENTRO del trámite «${exp.workflow.nombre}».`,
        exp.workflow.metaPlazo ? `Plazo: ${exp.workflow.metaPlazo}.` : "",
        exp.workflow.metaBaseNormativa ? `Base normativa: ${exp.workflow.metaBaseNormativa}.` : "",
        exp.workflow.inputs?.length ? `Datos necesarios: ${exp.workflow.inputs.join("; ")}.` : "",
        "Pasos:",
        pasosTxt,
        `El asesor está en el paso ${exp.pasoActual + 1}.`,
        "La herramienta marcar_paso SOLO afecta a ESTE trámite. Si el asesor pregunta por OTRO trámite (p. ej. el 303 estando en el alta RETA), respóndele con normalidad usando el catálogo y NO uses marcar_paso.",
        "Si el asesor confirma que ha completado o quiere saltar un paso de ESTE trámite, USA la herramienta marcar_paso (no lo des por hecho escribiendo solo texto). Refiere el paso por su número de orden.",
        "Si el asesor te da un dato NO sensible de ESTE trámite (fecha, provincia, mutua, base…), usa rellenar_dato con el nombre exacto del campo. NUNCA rellenes IBAN/NIF/DNI/cuenta por el chat: dile que lo ponga en la pestaña Datos.",
      ].filter(Boolean).join("\n");
    }
  }

  const contexto = catalogo + (tramiteCtx ? "\n\n" + tramiteCtx : "");

  // El modelo no sabe la fecha por sí mismo: se la damos (útil para plazos/vencimientos).
  const hoy = new Intl.DateTimeFormat("es-ES", { dateStyle: "full", timeZone: "Europe/Madrid" }).format(new Date());
  const system = `${BASE_SISTEMA}\nFecha de hoy: ${hoy}.\n${contexto}`;
  const mensajes: ChatMsg[] = [...historial.slice(-10), { rol: "user", texto: pregunta }];

  // Solo dentro de un trámite del usuario se ofrecen acciones (function-calling).
  const tools = expActivo ? [TOOL_MARCAR_PASO, TOOL_RELLENAR] : undefined;

  try {
    const { texto, llamadas } = await chatIA({ system, mensajes, tools });
    const acciones = expActivo ? mapearAcciones(llamadas) : [];
    await appendAudit({ actorId: userId, actorEmail: s.user.email ?? null, action: "ASISTENTE_QUERY", entity: expedienteId ? "Expediente" : "App", entityId: expedienteId ?? null });
    const respuesta = texto || (acciones.length ? "Te propongo esta acción — revísala y confírmala:" : "");
    return { ok: true as const, respuesta, acciones };
  } catch (e) {
    if (e instanceof IAError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "Error inesperado del asistente." };
  }
}
