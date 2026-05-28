"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { marcarPaso } from "@/lib/actions/expedientes";

// Acción que el asistente PROPONE y el humano CONFIRMA antes de ejecutar.
// Principio "operate, don't extract": el modelo decide el QUÉ (por nombre/orden);
// el expedienteId lo pone la UI (no el modelo) y los valores sensibles NUNCA vienen del modelo.
export type AccionTramite =
  | { tipo: "marcar_paso"; orden: number; estado: "hecho" | "saltado" | "pendiente"; etiqueta: string };

const ESTADOS_OK = new Set(["hecho", "saltado", "pendiente"]);

// Ejecuta una acción confirmada, SIEMPRE acotada a un expediente concreto.
// expedienteId viene de la UI (contexto del chat), nunca del modelo.
export async function ejecutarAccionTramite(expedienteId: string, accion: AccionTramite) {
  const s = await auth();
  if (!s?.user?.id) throw new Error("No autorizado");
  const userId = s.user.id as string;

  // Defensa en profundidad: el expediente debe ser del usuario (marcarPaso lo revalida igual).
  const exp = await db.expediente.findUnique({
    where: { id: expedienteId },
    include: { client: { select: { userId: true } } },
  });
  if (!exp) throw new Error("Expediente no encontrado");
  if (exp.client.userId !== userId) throw new Error("No autorizado");

  switch (accion.tipo) {
    case "marcar_paso": {
      if (!ESTADOS_OK.has(accion.estado)) throw new Error("Estado de paso no válido");
      if (!Number.isInteger(accion.orden) || accion.orden < 1) throw new Error("Orden de paso no válido");
      // El modelo refiere el paso por ORDEN (1-based); resolvemos a id dentro de ESTE expediente.
      const paso = await db.expedientePaso.findFirst({
        where: { expedienteId, orden: accion.orden - 1 },
        select: { id: true },
      });
      if (!paso) throw new Error(`No existe el paso ${accion.orden} en este trámite`);
      await marcarPaso(paso.id, accion.estado);
      return { ok: true as const, mensaje: `Paso ${accion.orden} marcado como ${accion.estado}.` };
    }
    default:
      throw new Error("Acción no soportada");
  }
}
