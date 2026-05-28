"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { appendAudit } from "@/lib/audit";

// ── Guards ─────────────────────────────────────────────────────────
async function sesion() {
  const s = await auth();
  if (!s?.user?.id) throw new Error("No autorizado");
  return { id: s.user.id as string, email: s.user.email ?? null };
}
async function assertCliente(clientId: string, userId: string) {
  const c = await db.client.findFirst({ where: { id: clientId, userId }, select: { id: true } });
  if (!c) throw new Error("Cliente no encontrado o no autorizado");
}
// Devuelve el expediente comprobando que su cliente es del usuario.
async function expedienteDe(expedienteId: string, userId: string) {
  const e = await db.expediente.findUnique({ where: { id: expedienteId }, include: { client: { select: { userId: true } } } });
  if (!e) throw new Error("Expediente no encontrado");
  if (e.client.userId !== userId) throw new Error("No autorizado");
  return e;
}

const ESTADOS_PASO = new Set(["pendiente", "hecho", "saltado", "bloqueado"]);

// ── Lecturas ───────────────────────────────────────────────────────
// Expedientes de un cliente, con nombre del trámite y progreso (hechos/total).
export async function listarExpedientes(clientId: string) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  const exps = await db.expediente.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    include: {
      workflow: { select: { nombre: true, servicioId: true } },
      pasos: { select: { estado: true } },
    },
  });
  return exps.map((e) => {
    const total = e.pasos.length;
    const hechos = e.pasos.filter((p) => p.estado === "hecho" || p.estado === "saltado").length;
    return {
      id: e.id, estado: e.estado, pasoActual: e.pasoActual,
      iniciadoEn: e.iniciadoEn, cerradoEn: e.cerradoEn,
      workflowId: e.workflowId, workflowNombre: e.workflow.nombre, servicioId: e.workflow.servicioId,
      total, hechos,
    };
  });
}

// Un expediente completo con sus pasos ordenados (para el wizard).
export async function getExpediente(expedienteId: string) {
  const { id } = await sesion();
  const e = await expedienteDe(expedienteId, id);
  const full = await db.expediente.findUnique({
    where: { id: e.id },
    include: {
      workflow: { select: { nombre: true, servicioId: true, metaPlazo: true } },
      client: { select: { id: true, nombre: true } },
      pasos: { orderBy: { orden: "asc" } },
    },
  });
  return full;
}

// Trámites disponibles para iniciar un expediente (id + nombre + servicio).
export async function listarWorkflowsDisponibles() {
  await sesion();
  return db.workflow.findMany({
    orderBy: [{ servicioId: "asc" }, { orden: "asc" }],
    select: { id: true, nombre: true, servicioId: true },
  });
}

// ── Escrituras ─────────────────────────────────────────────────────
// Crea un expediente y CONGELA los pasos del workflow (snapshot): si el workflow
// se edita después, el expediente en marcha no cambia.
export async function crearExpediente(clientId: string, workflowId: string) {
  const { id, email } = await sesion();
  await assertCliente(clientId, id);

  const wf = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { pasos: { orderBy: { orden: "asc" } } },
  });
  if (!wf) throw new Error("Trámite no encontrado");

  const exp = await db.expediente.create({
    data: {
      clientId,
      workflowId,
      pasos: {
        create: wf.pasos.map((p) => ({
          workflowPasoId: p.id,
          orden: p.orden,
          accion: p.accion,
          nivel: p.nivel,
          gate: p.gate,
        })),
      },
    },
  });
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_CREATE", entity: "Expediente", entityId: exp.id, meta: { clientId, workflowId, pasos: wf.pasos.length } });
  revalidatePath("/expedientes");
  return { id: exp.id };
}

// Marca el estado de un paso (hecho/saltado/pendiente/bloqueado) y recalcula el expediente.
export async function marcarPaso(expedientePasoId: string, estado: string, nota?: string | null) {
  const { id, email } = await sesion();
  if (!ESTADOS_PASO.has(estado)) throw new Error("Estado de paso no válido");

  const paso = await db.expedientePaso.findUnique({
    where: { id: expedientePasoId },
    include: { expediente: { include: { client: { select: { userId: true } } } } },
  });
  if (!paso) throw new Error("Paso no encontrado");
  if (paso.expediente.client.userId !== id) throw new Error("No autorizado");

  await db.expedientePaso.update({
    where: { id: expedientePasoId },
    data: {
      estado,
      nota: nota === undefined ? undefined : nota,
      completadoEn: estado === "hecho" ? new Date() : null,
    },
  });

  await recalcularExpediente(paso.expedienteId);
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_PASO", entity: "ExpedientePaso", entityId: expedientePasoId, meta: { estado } });
  revalidatePath("/expedientes");
}

// Recalcula pasoActual (primer paso no resuelto) y cierra el expediente si todo está hecho/saltado.
async function recalcularExpediente(expedienteId: string) {
  const pasos = await db.expedientePaso.findMany({ where: { expedienteId }, orderBy: { orden: "asc" }, select: { orden: true, estado: true } });
  const pendiente = pasos.find((p) => p.estado === "pendiente" || p.estado === "bloqueado");
  const exp = await db.expediente.findUnique({ where: { id: expedienteId }, select: { estado: true } });
  if (!exp) return;

  if (!pendiente && exp.estado === "en_curso") {
    await db.expediente.update({ where: { id: expedienteId }, data: { estado: "completado", cerradoEn: new Date(), pasoActual: pasos.length } });
  } else if (pendiente) {
    // Si estaba completado y se reabre un paso, vuelve a en_curso.
    await db.expediente.update({
      where: { id: expedienteId },
      data: { pasoActual: pendiente.orden, ...(exp.estado === "completado" ? { estado: "en_curso", cerradoEn: null } : {}) },
    });
  }
}

export async function abandonarExpediente(expedienteId: string) {
  const { id, email } = await sesion();
  await expedienteDe(expedienteId, id);
  await db.expediente.update({ where: { id: expedienteId }, data: { estado: "abandonado", cerradoEn: new Date() } });
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_ABANDON", entity: "Expediente", entityId: expedienteId });
  revalidatePath("/expedientes");
}

export async function reabrirExpediente(expedienteId: string) {
  const { id, email } = await sesion();
  await expedienteDe(expedienteId, id);
  await db.expediente.update({ where: { id: expedienteId }, data: { estado: "en_curso", cerradoEn: null } });
  await recalcularExpediente(expedienteId);
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_REOPEN", entity: "Expediente", entityId: expedienteId });
  revalidatePath("/expedientes");
}

export async function borrarExpediente(expedienteId: string) {
  const { id, email } = await sesion();
  await expedienteDe(expedienteId, id);
  await db.expediente.delete({ where: { id: expedienteId } }); // cascade borra los pasos
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_DELETE", entity: "Expediente", entityId: expedienteId });
  revalidatePath("/expedientes");
}
