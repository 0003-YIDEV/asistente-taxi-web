// Lectura server-side de los workflows desde la BD.
// Reconstruye la forma `Workflow` (la misma que workflows.ts) para que el viewer
// no note la diferencia de fuente. Fallback: si la BD está vacía, usa el archivo estático.
import { db } from "@/lib/db";
import { WORKFLOWS, type Workflow, type OutputWorkflow, type NivelAuto } from "@/data/workflows";

export async function getWorkflowsFromDB(): Promise<Workflow[]> {
  const rows = await db.workflow.findMany({
    orderBy: { orden: "asc" },
    include: { pasos: { orderBy: { orden: "asc" } } },
  });

  // Sin datos en BD todavía → fallback al archivo estático (no romper la web).
  if (rows.length === 0) return WORKFLOWS;

  return rows.map((r) => ({
    id: r.id,
    servicioId: r.servicioId,
    nombre: r.nombre,
    refManual: r.refManual,
    esOrquestador: r.esOrquestador,
    meta: {
      portal: r.metaPortal ?? undefined,
      identificacion: r.metaIdentificacion ?? undefined,
      plazo: r.metaPlazo ?? undefined,
      baseNormativa: r.metaBaseNormativa ?? undefined,
      resultado: r.metaResultado ?? undefined,
    },
    gateEntrada: r.gateEntrada,
    inputs: r.inputs,
    pasos: r.pasos.map((p) => ({
      accion: p.accion,
      validacion: p.validacion ?? undefined,
      nivel: p.nivel as NivelAuto,
      gate: p.gate ?? undefined,
      refWorkflow: p.refWorkflow ?? undefined,
    })),
    outputs: (r.outputs as unknown as OutputWorkflow[]) ?? [],
    post: r.post,
    excepciones: r.excepciones,
    automatizacion: {
      puede: r.autoPuede,
      asistido: r.autoAsistido,
      noPuede: r.autoNoPuede,
    },
  }));
}
