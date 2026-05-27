"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { saveEncrypted, readEncrypted, deleteFile } from "@/lib/storage/vault";
import { sha256 } from "@/lib/crypto/fileEncryption";
import { appendAudit } from "@/lib/audit";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MIME_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

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
async function docDe(documentoId: string, userId: string) {
  const d = await db.documento.findUnique({ where: { id: documentoId } });
  if (!d) throw new Error("Documento no encontrado");
  await assertCliente(d.clientId, userId);
  return d;
}
async function carpetaDe(carpetaId: string, userId: string) {
  const f = await db.carpeta.findUnique({ where: { id: carpetaId } });
  if (!f) throw new Error("Carpeta no encontrada");
  await assertCliente(f.clientId, userId);
  return f;
}

// ── Lecturas ───────────────────────────────────────────────────────
export async function listarCarpetas(clientId: string, parentId: string | null = null) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.carpeta.findMany({ where: { clientId, parentId, eliminadoEn: null }, orderBy: { nombre: "asc" } });
}

export async function listarDocumentos(clientId: string, carpetaId: string | null = null) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.documento.findMany({
    where: { clientId, carpetaId, eliminadoEn: null },
    orderBy: { nombre: "asc" },
    include: { workflow: { select: { nombre: true } } },
  });
}

// Todas las carpetas del cliente (para el selector de destino al mover por menú).
export async function listarTodasCarpetas(clientId: string) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.carpeta.findMany({ where: { clientId, eliminadoEn: null }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, parentId: true } });
}

export async function buscar(clientId: string, filtros: { texto?: string; estado?: string; mime?: string }) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.documento.findMany({
    where: {
      clientId,
      eliminadoEn: null,
      ...(filtros.texto ? { nombre: { contains: filtros.texto, mode: "insensitive" } } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.mime ? { mime: { startsWith: filtros.mime } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { workflow: { select: { nombre: true } } },
  });
}

// ── Documentos ─────────────────────────────────────────────────────
export async function subirDocumento(clientId: string, carpetaId: string | null, formData: FormData) {
  const { id, email } = await sesion();
  await assertCliente(clientId, id);
  if (carpetaId) await carpetaDe(carpetaId, id);

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Fichero ausente");
  if (file.size === 0) throw new Error("Fichero vacío");
  if (file.size > MAX_BYTES) throw new Error(`Fichero demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)`);
  if (!MIME_PERMITIDOS.has(file.type)) throw new Error(`Tipo no permitido: ${file.type || "desconocido"}`);

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);

  // Detección de duplicados (mismo cliente, mismo contenido)
  const dup = await db.documento.findFirst({ where: { clientId, hashSha256: hash, eliminadoEn: null }, select: { id: true, nombre: true } });
  if (dup) return { ok: false as const, duplicado: true, nombreExistente: dup.nombre };

  const saved = saveEncrypted(clientId, buf);
  const doc = await db.documento.create({
    data: {
      clientId,
      carpetaId,
      nombre: file.name,
      mime: file.type,
      tamanoBytes: saved.tamano,
      rutaRelativa: saved.rutaRelativa,
      hashSha256: saved.hash,
      origen: "subido",
    },
  });
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_UPLOAD", entity: "Documento", entityId: doc.id, meta: { clientId, nombre: doc.nombre } });
  revalidatePath("/boveda");
  return { ok: true as const, id: doc.id };
}

export async function descargarDocumento(documentoId: string) {
  const { id, email } = await sesion();
  const doc = await docDe(documentoId, id);
  const buf = readEncrypted(doc.rutaRelativa, doc.hashSha256);
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_DOWNLOAD", entity: "Documento", entityId: doc.id, meta: { clientId: doc.clientId } });
  return { nombre: doc.nombre, mime: doc.mime, base64: buf.toString("base64") };
}

// Borrado RECUPERABLE: el documento va a la papelera (no se toca el fichero cifrado).
export async function borrarDocumento(documentoId: string) {
  const { id, email } = await sesion();
  const doc = await docDe(documentoId, id);
  await db.documento.update({ where: { id: doc.id }, data: { eliminadoEn: new Date() } });
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_TRASH", entity: "Documento", entityId: doc.id, meta: { clientId: doc.clientId, nombre: doc.nombre } });
  revalidatePath("/boveda");
}

export async function moverDocumento(documentoId: string, carpetaDestinoId: string | null) {
  const { id } = await sesion();
  const doc = await docDe(documentoId, id);
  if (carpetaDestinoId) {
    const destino = await carpetaDe(carpetaDestinoId, id);
    if (destino.clientId !== doc.clientId) throw new Error("Carpeta de otro cliente");
  }
  await db.documento.update({ where: { id: doc.id }, data: { carpetaId: carpetaDestinoId } });
  revalidatePath("/boveda");
}

export async function renombrarDocumento(documentoId: string, nombre: string) {
  const { id } = await sesion();
  const doc = await docDe(documentoId, id);
  const n = nombre.trim();
  if (!n) throw new Error("Nombre vacío");
  await db.documento.update({ where: { id: doc.id }, data: { nombre: n } });
  revalidatePath("/boveda");
}

// Fecha-solo (YYYY-MM-DD) → mediodía local: evita el off-by-one por zona horaria.
function fechaSolo(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (!v) return null;
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v);
}

export async function editarMetaDocumento(
  documentoId: string,
  meta: {
    estado?: string;
    fechaDocumento?: string | null;
    fechaVencimiento?: string | null;
    descripcion?: string | null;
    workflowId?: string | null;
  },
) {
  const { id } = await sesion();
  const doc = await docDe(documentoId, id);
  await db.documento.update({
    where: { id: doc.id },
    data: {
      ...(meta.estado ? { estado: meta.estado } : {}),
      ...(meta.fechaDocumento !== undefined ? { fechaDocumento: fechaSolo(meta.fechaDocumento) } : {}),
      ...(meta.fechaVencimiento !== undefined ? { fechaVencimiento: fechaSolo(meta.fechaVencimiento) } : {}),
      ...(meta.descripcion !== undefined ? { descripcion: meta.descripcion } : {}),
      ...(meta.workflowId !== undefined ? { workflowId: meta.workflowId || null } : {}),
    },
  });
  revalidatePath("/boveda");
}

// Trámites de la Guía para el selector de vínculo (id + nombre).
export async function listarWorkflowsParaVincular() {
  await sesion();
  return db.workflow.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true, servicioId: true } });
}

// Documentos con vencimiento dentro de los próximos `dias` (o ya vencidos) de un cliente.
export async function documentosPorVencer(clientId: string, dias = 30) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  return db.documento.findMany({
    where: { clientId, eliminadoEn: null, fechaVencimiento: { not: null, lte: limite } },
    orderBy: { fechaVencimiento: "asc" },
    select: { id: true, nombre: true, fechaVencimiento: true, carpetaId: true },
  });
}

// Resumen por cliente para la sidebar: nº de documentos activos, vencidos y por vencer (≤30d).
// Una sola consulta de todos los docs activos del usuario; agregación en memoria.
export async function resumenDocsPorCliente(dias = 30) {
  const { id } = await sesion();
  const docs = await db.documento.findMany({
    where: { client: { userId: id }, eliminadoEn: null },
    select: { clientId: true, fechaVencimiento: true },
  });
  const ahora = Date.now();
  const limite = ahora + dias * 86400000;
  const out: Record<string, { docs: number; vencidos: number; porVencer: number }> = {};
  for (const d of docs) {
    const r = (out[d.clientId] ??= { docs: 0, vencidos: 0, porVencer: 0 });
    r.docs++;
    if (d.fechaVencimiento) {
      const t = new Date(d.fechaVencimiento).getTime();
      if (t < ahora) r.vencidos++;
      else if (t <= limite) r.porVencer++;
    }
  }
  return out;
}

// ── Carpetas ───────────────────────────────────────────────────────
export async function crearCarpeta(clientId: string, parentId: string | null, nombre: string) {
  const { id, email } = await sesion();
  await assertCliente(clientId, id);
  if (parentId) await carpetaDe(parentId, id);
  const n = nombre.trim();
  if (!n) throw new Error("Nombre vacío");
  const carpeta = await db.carpeta.create({ data: { clientId, parentId, nombre: n } });
  await appendAudit({ actorId: id, actorEmail: email, action: "FOLDER_CREATE", entity: "Carpeta", entityId: carpeta.id, meta: { clientId, nombre: n } });
  revalidatePath("/boveda");
  return carpeta;
}

export async function renombrarCarpeta(carpetaId: string, nombre: string) {
  const { id } = await sesion();
  const f = await carpetaDe(carpetaId, id);
  const n = nombre.trim();
  if (!n) throw new Error("Nombre vacío");
  await db.carpeta.update({ where: { id: f.id }, data: { nombre: n } });
  revalidatePath("/boveda");
}

export async function moverCarpeta(carpetaId: string, nuevoParentId: string | null) {
  const { id } = await sesion();
  const f = await carpetaDe(carpetaId, id);
  if (nuevoParentId) {
    if (nuevoParentId === carpetaId) throw new Error("Una carpeta no puede ser su propio padre");
    const destino = await carpetaDe(nuevoParentId, id);
    if (destino.clientId !== f.clientId) throw new Error("Carpeta de otro cliente");
    // Anti-ciclo: el destino no puede ser descendiente de la carpeta movida
    let cursor: string | null = destino.parentId;
    while (cursor) {
      if (cursor === carpetaId) throw new Error("No se puede mover una carpeta dentro de sí misma");
      const padre: { parentId: string | null } | null = await db.carpeta.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = padre?.parentId ?? null;
    }
  }
  await db.carpeta.update({ where: { id: f.id }, data: { parentId: nuevoParentId } });
  revalidatePath("/boveda");
}

// Devuelve los ids de toda la rama (la carpeta + descendientes), incluida la raíz.
// Recorre TODO el árbol (sin filtrar por papelera) para arrastrar/restaurar la rama completa.
async function idsSubarbol(clientId: string, raizId: string): Promise<string[]> {
  const todas = await db.carpeta.findMany({ where: { clientId }, select: { id: true, parentId: true } });
  const hijosDe = new Map<string, string[]>();
  for (const c of todas) {
    const arr = hijosDe.get(c.parentId ?? "") ?? [];
    arr.push(c.id);
    hijosDe.set(c.parentId ?? "", arr);
  }
  const acc: string[] = [];
  const pila = [raizId];
  while (pila.length) {
    const cur = pila.pop()!;
    acc.push(cur);
    for (const h of hijosDe.get(cur) ?? []) pila.push(h);
  }
  return acc;
}

// Borrado RECUPERABLE: la carpeta y TODO su subárbol (subcarpetas + documentos) van a la
// papelera. Estilo Drive: borrar una carpeta arrastra su contenido. Nada se borra de disco.
export async function borrarCarpeta(carpetaId: string) {
  const { id, email } = await sesion();
  const f = await carpetaDe(carpetaId, id);
  const rama = await idsSubarbol(f.clientId, f.id);
  const ahora = new Date();
  await db.$transaction([
    db.carpeta.updateMany({ where: { id: { in: rama }, eliminadoEn: null }, data: { eliminadoEn: ahora } }),
    db.documento.updateMany({ where: { carpetaId: { in: rama }, eliminadoEn: null }, data: { eliminadoEn: ahora } }),
  ]);
  await appendAudit({ actorId: id, actorEmail: email, action: "FOLDER_TRASH", entity: "Carpeta", entityId: f.id, meta: { clientId: f.clientId, ramaCount: rama.length } });
  revalidatePath("/boveda");
}

// ── Papelera ───────────────────────────────────────────────────────
// Lista las eliminaciones "de nivel superior" del cliente: documentos cuya carpeta NO está
// también en la papelera, y carpetas cuyo padre NO está también en la papelera. Así no se
// muestran los hijos arrastrados por el borrado de una carpeta (se restauran con su rama).
export async function listarPapelera(clientId: string) {
  const { id } = await sesion();
  await assertCliente(clientId, id);

  const [carpetas, documentos] = await Promise.all([
    db.carpeta.findMany({
      where: { clientId, eliminadoEn: { not: null } },
      orderBy: { eliminadoEn: "desc" },
      select: { id: true, nombre: true, parentId: true, eliminadoEn: true },
    }),
    db.documento.findMany({
      where: { clientId, eliminadoEn: { not: null } },
      orderBy: { eliminadoEn: "desc" },
      select: { id: true, nombre: true, mime: true, carpetaId: true, eliminadoEn: true },
    }),
  ]);

  const carpetasBorradas = new Set(carpetas.map((c) => c.id));
  return {
    carpetas: carpetas.filter((c) => !c.parentId || !carpetasBorradas.has(c.parentId)),
    documentos: documentos.filter((d) => !d.carpetaId || !carpetasBorradas.has(d.carpetaId)),
  };
}

export async function restaurarDocumento(documentoId: string) {
  const { id, email } = await sesion();
  const doc = await docDe(documentoId, id);
  // Si su carpeta ya no existe o sigue en la papelera, lo devolvemos a la raíz (sin huérfanos).
  let destino = doc.carpetaId;
  if (destino) {
    const c = await db.carpeta.findUnique({ where: { id: destino }, select: { eliminadoEn: true } });
    if (!c || c.eliminadoEn) destino = null;
  }
  await db.documento.update({ where: { id: doc.id }, data: { eliminadoEn: null, carpetaId: destino } });
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_RESTORE", entity: "Documento", entityId: doc.id, meta: { clientId: doc.clientId } });
  revalidatePath("/boveda");
}

export async function restaurarCarpeta(carpetaId: string) {
  const { id, email } = await sesion();
  const f = await carpetaDe(carpetaId, id);
  const rama = await idsSubarbol(f.clientId, f.id);
  // Si su padre sigue en la papelera (o no existe), la carpeta vuelve a la raíz.
  let nuevoParent = f.parentId;
  if (nuevoParent) {
    const p = await db.carpeta.findUnique({ where: { id: nuevoParent }, select: { eliminadoEn: true } });
    if (!p || p.eliminadoEn) nuevoParent = null;
  }
  await db.$transaction([
    db.carpeta.update({ where: { id: f.id }, data: { parentId: nuevoParent } }),
    db.carpeta.updateMany({ where: { id: { in: rama } }, data: { eliminadoEn: null } }),
    db.documento.updateMany({ where: { carpetaId: { in: rama } }, data: { eliminadoEn: null } }),
  ]);
  await appendAudit({ actorId: id, actorEmail: email, action: "FOLDER_RESTORE", entity: "Carpeta", entityId: f.id, meta: { clientId: f.clientId, ramaCount: rama.length } });
  revalidatePath("/boveda");
}

// Borrado DEFINITIVO de un documento: elimina el fichero cifrado del disco y la fila.
export async function eliminarDefinitivoDocumento(documentoId: string) {
  const { id, email } = await sesion();
  const doc = await docDe(documentoId, id);
  deleteFile(doc.rutaRelativa);
  await db.documento.delete({ where: { id: doc.id } });
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_DELETE", entity: "Documento", entityId: doc.id, meta: { clientId: doc.clientId, nombre: doc.nombre } });
  revalidatePath("/boveda");
}

// Borrado DEFINITIVO de una carpeta: borra los ficheros de su rama, sus documentos y las carpetas.
export async function eliminarDefinitivoCarpeta(carpetaId: string) {
  const { id, email } = await sesion();
  const f = await carpetaDe(carpetaId, id);
  const rama = await idsSubarbol(f.clientId, f.id);
  const docs = await db.documento.findMany({ where: { carpetaId: { in: rama } }, select: { rutaRelativa: true } });
  for (const d of docs) deleteFile(d.rutaRelativa);
  await db.$transaction([
    db.documento.deleteMany({ where: { carpetaId: { in: rama } } }),
    // Borrar de hoja a raíz para no violar la FK self-relation (NoAction).
    ...rama.reverse().map((cid) => db.carpeta.delete({ where: { id: cid } })),
  ]);
  await appendAudit({ actorId: id, actorEmail: email, action: "FOLDER_DELETE", entity: "Carpeta", entityId: f.id, meta: { clientId: f.clientId, ramaCount: rama.length } });
  revalidatePath("/boveda");
}

// Vacía la papelera del cliente: borra definitivamente todo lo que esté en ella.
export async function vaciarPapelera(clientId: string) {
  const { id, email } = await sesion();
  await assertCliente(clientId, id);
  const docs = await db.documento.findMany({
    where: { clientId, eliminadoEn: { not: null } },
    select: { rutaRelativa: true },
  });
  for (const d of docs) deleteFile(d.rutaRelativa);
  // Carpetas en papelera ordenadas por profundidad (hoja → raíz) para respetar la FK.
  const carpetas = await db.carpeta.findMany({
    where: { clientId, eliminadoEn: { not: null } },
    select: { id: true, parentId: true },
  });
  const profundidad = (cid: string): number => {
    let d = 0, cur: string | null = cid;
    const byId = new Map(carpetas.map((c) => [c.id, c.parentId]));
    while (cur && byId.has(cur)) { cur = byId.get(cur) ?? null; d++; }
    return d;
  };
  const ordenadas = carpetas.map((c) => c.id).sort((a, b) => profundidad(b) - profundidad(a));
  await db.$transaction([
    db.documento.deleteMany({ where: { clientId, eliminadoEn: { not: null } } }),
    ...ordenadas.map((cid) => db.carpeta.delete({ where: { id: cid } })),
  ]);
  await appendAudit({ actorId: id, actorEmail: email, action: "TRASH_EMPTY", entity: "Client", entityId: clientId, meta: { docs: docs.length, carpetas: ordenadas.length } });
  revalidatePath("/boveda");
}

// ── Integración: documentos generados por la app (Fase 5) ──────────
// Persiste un documento GENERADO (p.ej. Modelo 036 de @0003-YIDEV) recibido en base64.
// Lo cifra y lo guarda como borrador en la Bóveda. No deduplica (los borradores se regeneran).
export async function guardarDocumentoGenerado(
  clientId: string,
  nombre: string,
  base64: string,
  opts?: { carpetaId?: string | null; refModelo?: string; mime?: string },
) {
  const { id, email } = await sesion();
  await assertCliente(clientId, id);
  const carpetaId = opts?.carpetaId ?? null;
  if (carpetaId) await carpetaDe(carpetaId, id);

  const buf = Buffer.from(base64, "base64");
  if (buf.length === 0) throw new Error("Contenido vacío");
  if (buf.length > MAX_BYTES) throw new Error("Documento generado demasiado grande");

  const saved = saveEncrypted(clientId, buf);
  const doc = await db.documento.create({
    data: {
      clientId,
      carpetaId,
      nombre,
      mime: opts?.mime ?? "application/pdf",
      tamanoBytes: saved.tamano,
      rutaRelativa: saved.rutaRelativa,
      hashSha256: saved.hash,
      origen: "generado",
      estado: "borrador",
      refModelo: opts?.refModelo ?? null,
    },
  });
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_GENERATE", entity: "Documento", entityId: doc.id, meta: { clientId, nombre, refModelo: opts?.refModelo ?? null } });
  revalidatePath("/boveda");
  return { id: doc.id };
}
