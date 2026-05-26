"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { NivelAuto } from "@/data/workflows";

// Doble candado: la UI oculta el botón, pero el servidor SIEMPRE valida el rol.
async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") throw new Error("No autorizado: se requiere rol admin");
}

export interface PasoInput {
  accion: string;
  validacion?: string | null;
  nivel: NivelAuto;
  gate?: string | null;
  refWorkflow?: string | null;
}

export interface UpdateWorkflowInput {
  nombre: string;
  refManual: string;
  metaPortal?: string | null;
  metaIdentificacion?: string | null;
  metaPlazo?: string | null;
  metaBaseNormativa?: string | null;
  metaResultado?: string | null;
  gateEntrada: string[];
  inputs: string[];
  post: string[];
  excepciones: string[];
  autoPuede: string[];
  autoAsistido: string[];
  autoNoPuede: string[];
  pasos: PasoInput[];
}

export async function updateWorkflow(id: string, data: UpdateWorkflowInput) {
  await requireAdmin();

  // Reemplaza el workflow + sus pasos en una transacción (orden = índice del array).
  await db.$transaction([
    db.workflowPaso.deleteMany({ where: { workflowId: id } }),
    db.workflow.update({
      where: { id },
      data: {
        nombre: data.nombre,
        refManual: data.refManual,
        metaPortal: data.metaPortal ?? null,
        metaIdentificacion: data.metaIdentificacion ?? null,
        metaPlazo: data.metaPlazo ?? null,
        metaBaseNormativa: data.metaBaseNormativa ?? null,
        metaResultado: data.metaResultado ?? null,
        gateEntrada: data.gateEntrada,
        inputs: data.inputs,
        post: data.post,
        excepciones: data.excepciones,
        autoPuede: data.autoPuede,
        autoAsistido: data.autoAsistido,
        autoNoPuede: data.autoNoPuede,
        pasos: {
          create: data.pasos.map((p, idx) => ({
            orden: idx,
            accion: p.accion,
            validacion: p.validacion ?? null,
            nivel: p.nivel,
            gate: p.gate ?? null,
            refWorkflow: p.refWorkflow ?? null,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/procedimientos");
}
