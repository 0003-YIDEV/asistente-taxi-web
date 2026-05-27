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
  return db.carpeta.findMany({ where: { clientId, parentId }, orderBy: { nombre: "asc" } });
}

export async function listarDocumentos(clientId: string, carpetaId: string | null = null) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.documento.findMany({ where: { clientId, carpetaId }, orderBy: { nombre: "asc" } });
}

// Todas las carpetas del cliente (para el selector de destino al mover por menú).
export async function listarTodasCarpetas(clientId: string) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.carpeta.findMany({ where: { clientId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, parentId: true } });
}

export async function buscar(clientId: string, filtros: { texto?: string; estado?: string; mime?: string }) {
  const { id } = await sesion();
  await assertCliente(clientId, id);
  return db.documento.findMany({
    where: {
      clientId,
      ...(filtros.texto ? { nombre: { contains: filtros.texto, mode: "insensitive" } } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.mime ? { mime: { startsWith: filtros.mime } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
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
  const dup = await db.documento.findFirst({ where: { clientId, hashSha256: hash }, select: { id: true, nombre: true } });
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

export async function borrarDocumento(documentoId: string) {
  const { id, email } = await sesion();
  const doc = await docDe(documentoId, id);
  deleteFile(doc.rutaRelativa);
  await db.documento.delete({ where: { id: doc.id } });
  await appendAudit({ actorId: id, actorEmail: email, action: "DOC_DELETE", entity: "Documento", entityId: doc.id, meta: { clientId: doc.clientId, nombre: doc.nombre } });
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

export async function editarMetaDocumento(
  documentoId: string,
  meta: { estado?: string; fechaDocumento?: string | null; descripcion?: string | null },
) {
  const { id } = await sesion();
  const doc = await docDe(documentoId, id);
  await db.documento.update({
    where: { id: doc.id },
    data: {
      ...(meta.estado ? { estado: meta.estado } : {}),
      ...(meta.fechaDocumento !== undefined
        ? {
            // Fecha-solo (YYYY-MM-DD): fijar a mediodía local evita el off-by-one por
            // zona horaria al guardar en una columna timestamp sin tz.
            fechaDocumento: meta.fechaDocumento
              ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(meta.fechaDocumento) ? `${meta.fechaDocumento}T12:00:00` : meta.fechaDocumento)
              : null,
          }
        : {}),
      ...(meta.descripcion !== undefined ? { descripcion: meta.descripcion } : {}),
    },
  });
  revalidatePath("/boveda");
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

export async function borrarCarpeta(carpetaId: string) {
  const { id, email } = await sesion();
  const f = await carpetaDe(carpetaId, id);
  const [hijos, docs] = await Promise.all([
    db.carpeta.count({ where: { parentId: carpetaId } }),
    db.documento.count({ where: { carpetaId } }),
  ]);
  if (hijos > 0 || docs > 0) throw new Error("La carpeta no está vacía. Vacíala antes de borrarla.");
  await db.carpeta.delete({ where: { id: f.id } });
  await appendAudit({ actorId: id, actorEmail: email, action: "FOLDER_DELETE", entity: "Carpeta", entityId: f.id, meta: { clientId: f.clientId } });
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
