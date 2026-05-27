import { db } from "@/lib/db";
import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma";

// Escribe una entrada en el AuditLog encadenada por hash (append-only).
// El hash incluye ts + datos de la fila → único aunque dos appends compartan prevHash.
export async function appendAudit(entry: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string; // p.ej. DOC_UPLOAD, DOC_DOWNLOAD, DOC_DELETE, DOC_MOVE, FOLDER_CREATE
  entity?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  const prev = await db.auditLog.findFirst({ orderBy: { ts: "desc" }, select: { hash: true } });
  const prevHash = prev?.hash ?? null;
  const ts = new Date();
  const canonical = JSON.stringify({
    prevHash,
    ts: ts.toISOString(),
    actorId: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId ?? null,
    meta: entry.meta ?? null,
  });
  const hash = createHash("sha256").update(canonical).digest("hex");
  await db.auditLog.create({
    data: {
      ts,
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      meta: entry.meta == null ? undefined : (entry.meta as Prisma.InputJsonValue),
      prevHash,
      hash,
    },
  });
}
