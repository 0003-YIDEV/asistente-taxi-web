"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { appendAudit } from "@/lib/audit";
import { encryptField, decryptField } from "@/lib/crypto/fieldEncryption";
import { subirDocumento } from "@/lib/actions/boveda";

// Claves de `datos` consideradas sensibles → se cifran en reposo (mismo patrón que NIF/IBAN).
const SENSIBLE = /iban|cuenta|tarjeta/i;
function cifrarDatos(datos: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(datos)) {
    out[k] = v && SENSIBLE.test(k) ? encryptField(v) : (v ?? "");
  }
  return out;
}
function descifrarDatos(datos: unknown): Record<string, string> {
  if (!datos || typeof datos !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(datos as Record<string, string>)) {
    if (typeof v === "string" && v.startsWith("v1.")) {
      try { out[k] = decryptField(v); } catch { out[k] = ""; }
    } else out[k] = (v as string) ?? "";
  }
  return out;
}
function decOpcional(v: string | null | undefined): string {
  if (!v || !v.startsWith("v1.")) return "";
  try { return decryptField(v); } catch { return ""; }
}

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

// Un expediente completo: pasos, datos (descifrados), documentos vinculados, e
// inputs/outputs del workflow (para las pestañas Datos y Documentos del wizard).
export async function getExpediente(expedienteId: string) {
  const { id } = await sesion();
  const e = await expedienteDe(expedienteId, id);
  const full = await db.expediente.findUnique({
    where: { id: e.id },
    include: {
      workflow: { select: { nombre: true, servicioId: true, metaPlazo: true, inputs: true, outputs: true } },
      client: { select: { id: true, nombre: true } },
      pasos: { orderBy: { orden: "asc" } },
      documentos: {
        orderBy: { createdAt: "asc" },
        include: { documento: { select: { id: true, nombre: true, mime: true, carpetaId: true } } },
      },
    },
  });
  if (!full) return null;
  return { ...full, datos: descifrarDatos(full.datos) };
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

  // Pre-rellenado "asistido sin IA": los datos que ya están en la ficha del cliente.
  const cliente = await db.client.findUnique({ where: { id: clientId }, select: { nifEnc: true, ibanEnc: true, domicilio: true } });
  const prefill: Record<string, string> = {};
  if (cliente) {
    const nif = decOpcional(cliente.nifEnc);
    const iban = decOpcional(cliente.ibanEnc);
    for (const label of wf.inputs) {
      const l = label.toLowerCase();
      if (/\bnif\b|dni/.test(l) && nif) prefill[label] = nif;
      else if (/iban/.test(l) && iban) prefill[label] = iban;
      else if (/domicilio|direcci/.test(l) && cliente.domicilio) prefill[label] = cliente.domicilio;
    }
  }

  const exp = await db.expediente.create({
    data: {
      clientId,
      workflowId,
      datos: Object.keys(prefill).length ? cifrarDatos(prefill) : undefined,
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

  // Asegura que existan las carpetas destino de los outputs en la Bóveda del cliente.
  const outputs = Array.isArray(wf.outputs) ? (wf.outputs as { artefacto: string; carpeta: string }[]) : [];
  const carpetasUnicas = [...new Set(outputs.map((o) => o.carpeta).filter(Boolean))];
  for (const nombre of carpetasUnicas) await ensureCarpetaRaiz(clientId, nombre);

  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_CREATE", entity: "Expediente", entityId: exp.id, meta: { clientId, workflowId, pasos: wf.pasos.length } });
  revalidatePath("/expedientes");
  return { id: exp.id };
}

// Busca una carpeta raíz del cliente por nombre; la crea si no existe. Devuelve su id.
async function ensureCarpetaRaiz(clientId: string, nombre: string): Promise<string> {
  const existente = await db.carpeta.findFirst({ where: { clientId, parentId: null, nombre, eliminadoEn: null }, select: { id: true } });
  if (existente) return existente.id;
  const nueva = await db.carpeta.create({ data: { clientId, parentId: null, nombre } });
  return nueva.id;
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

// ── Datos del trámite ──────────────────────────────────────────────
export async function guardarDatosExpediente(expedienteId: string, datos: Record<string, string>) {
  const { id, email } = await sesion();
  await expedienteDe(expedienteId, id);
  await db.expediente.update({ where: { id: expedienteId }, data: { datos: cifrarDatos(datos) } });
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_DATOS", entity: "Expediente", entityId: expedienteId });
  revalidatePath("/expedientes");
}

// Rellena UN campo de los datos del trámite (lo usa el asistente, con confirmación humana).
// Guardarraíl RGPD: rechaza campos sensibles — esos se rellenan a mano en la pestaña Datos,
// nunca por el chat (no deben pasar por el LLM). Merge: conserva el resto de datos.
export async function rellenarDatoExpediente(expedienteId: string, campo: string, valor: string) {
  const { id, email } = await sesion();
  const exp = await expedienteDe(expedienteId, id);
  if (SENSIBLE.test(campo) || /\bnif\b|dni/i.test(campo)) {
    throw new Error("Ese dato es sensible: rellénalo en la pestaña Datos, no por el chat.");
  }
  const wf = await db.workflow.findUnique({ where: { id: exp.workflowId }, select: { inputs: true } });
  // El campo debe corresponder a un input del trámite (sin exigir mayúsculas exactas).
  const canonico = wf?.inputs.find((i) => i.toLowerCase().trim() === campo.toLowerCase().trim());
  if (!canonico) throw new Error(`«${campo}» no es un dato de este trámite.`);
  const actuales = descifrarDatos(exp.datos);
  actuales[canonico] = valor; // guarda con la etiqueta canónica (la misma que usa la pestaña Datos)
  await db.expediente.update({ where: { id: expedienteId }, data: { datos: cifrarDatos(actuales) } });
  await appendAudit({ actorId: id, actorEmail: email, action: "EXPEDIENTE_DATO_IA", entity: "Expediente", entityId: expedienteId, meta: { campo: canonico } });
  revalidatePath("/expedientes");
  return { campo: canonico, valor };
}

// ── Documentos del trámite ─────────────────────────────────────────
// Documentos activos del cliente (para el selector "elegir de la Bóveda").
export async function listarDocsCliente(clientId: string) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.documento.findMany({
    where: { clientId, eliminadoEn: null },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, mime: true, carpetaId: true },
  });
}

// Sube un documento GENERADO por el trámite a la carpeta destino de su output y lo vincula.
export async function subirOutput(expedienteId: string, etiqueta: string, carpetaNombre: string, formData: FormData) {
  const { id } = await sesion();
  const exp = await expedienteDe(expedienteId, id);
  const carpetaId = await ensureCarpetaRaiz(exp.clientId, carpetaNombre);
  const res = await subirDocumento(exp.clientId, carpetaId, formData);
  if (!res.ok) return res; // duplicado u otro
  await db.expedienteDocumento.create({ data: { expedienteId, documentoId: res.id, rol: "generado", etiqueta } });
  revalidatePath("/expedientes");
  return res;
}

// Sube un documento APORTADO (lo que el trámite necesita) a la Bóveda y lo vincula.
export async function subirAportado(expedienteId: string, carpetaId: string | null, formData: FormData) {
  const { id } = await sesion();
  const exp = await expedienteDe(expedienteId, id);
  const res = await subirDocumento(exp.clientId, carpetaId, formData);
  if (!res.ok) return res;
  await db.expedienteDocumento.create({ data: { expedienteId, documentoId: res.id, rol: "aportado" } });
  revalidatePath("/expedientes");
  return res;
}

// Vincula un documento YA EXISTENTE de la Bóveda al expediente ("elegir de la Bóveda").
export async function vincularDocExistente(expedienteId: string, documentoId: string, rol = "aportado", etiqueta?: string) {
  const { id } = await sesion();
  const exp = await expedienteDe(expedienteId, id);
  const doc = await db.documento.findUnique({ where: { id: documentoId }, select: { clientId: true } });
  if (!doc || doc.clientId !== exp.clientId) throw new Error("Documento de otro cliente");
  const ya = await db.expedienteDocumento.findFirst({ where: { expedienteId, documentoId }, select: { id: true } });
  if (ya) return { id: ya.id }; // idempotente: no duplicar el vínculo
  const link = await db.expedienteDocumento.create({ data: { expedienteId, documentoId, rol, etiqueta } });
  revalidatePath("/expedientes");
  return { id: link.id };
}

// Quita el vínculo (NO borra el documento de la Bóveda).
export async function desvincularDoc(expedienteDocumentoId: string) {
  const { id } = await sesion();
  const link = await db.expedienteDocumento.findUnique({
    where: { id: expedienteDocumentoId },
    include: { expediente: { include: { client: { select: { userId: true } } } } },
  });
  if (!link) throw new Error("Vínculo no encontrado");
  if (link.expediente.client.userId !== id) throw new Error("No autorizado");
  await db.expedienteDocumento.delete({ where: { id: expedienteDocumentoId } });
  revalidatePath("/expedientes");
}
