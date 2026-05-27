"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { encryptField, decryptField } from "@/lib/crypto/fieldEncryption";
import { revalidatePath } from "next/cache";
import { CARPETAS_ESTANDAR } from "@/data/carpetas-estandar";
import { deleteFile } from "@/lib/storage/vault";

// Cifra solo si hay valor; los campos opcionales vacíos se guardan como "" (no cifrar
// "" produce un payload inválido que decryptField rechaza).
function encOpcional(v: string): string {
  return v && v.trim() ? encryptField(v) : "";
}
// Descifra solo si el valor está realmente cifrado (formato v1.). Vacío o payload
// malformado → "" (no tumbar toda la lista de clientes por un registro defectuoso).
function decOpcional(v: string | null | undefined): string {
  if (!v || !v.startsWith("v1.")) return "";
  try {
    return decryptField(v);
  } catch {
    return "";
  }
}

export async function getClients() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const clients = await db.client.findMany({
    where: { userId: session.user.id },
    orderBy: { nombre: "asc" },
  });

  return clients.map((c) => ({
    ...c,
    nif: decOpcional(c.nifEnc),
    iban: decOpcional(c.ibanEnc),
  }));
}

export async function createClient(formData: {
  nombre: string;
  nif: string;
  domicilio: string;
  iban: string;
  email: string;
  telefono: string;
  numLicencia: string;
  matricula: string;
  regimen: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  const { nif, iban, ...rest } = formData;

  const client = await db.client.create({
    data: {
      ...rest,
      userId: session.user.id,
      nifEnc: encOpcional(nif),
      ibanEnc: encOpcional(iban),
      // Estructura de carpetas estándar del despacho (raíz) para el nuevo cliente.
      carpetas: {
        create: CARPETAS_ESTANDAR.map((nombre) => ({ nombre })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/boveda");

  return {
    ...client,
    nif: decOpcional(client.nifEnc),
    iban: decOpcional(client.ibanEnc),
  };
}

export async function updateClient(
  id: string,
  formData: {
    nombre: string;
    nif: string;
    domicilio: string;
    iban: string;
    email: string;
    telefono: string;
    numLicencia: string;
    matricula: string;
    regimen: string;
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  // Verificar propiedad del cliente
  const existing = await db.client.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!existing) throw new Error("Cliente no encontrado o no autorizado");

  const { nif, iban, ...rest } = formData;
  const client = await db.client.update({
    where: { id },
    data: { ...rest, nifEnc: encOpcional(nif), ibanEnc: encOpcional(iban) },
  });

  revalidatePath("/");
  revalidatePath("/boveda");

  return {
    ...client,
    nif: decOpcional(client.nifEnc),
    iban: decOpcional(client.ibanEnc),
  };
}

export async function deleteClient(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  // Verificar propiedad del cliente
  const existing = await db.client.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!existing) throw new Error("Cliente no encontrado o no autorizado");

  // Borrar los ficheros cifrados del disco ANTES del cascade (el cascade de BD borra
  // Carpeta + Documento, pero no toca el filesystem).
  const docs = await db.documento.findMany({ where: { clientId: id }, select: { rutaRelativa: true } });
  for (const d of docs) deleteFile(d.rutaRelativa);

  // Borra el cliente; onDelete Cascade elimina sus carpetas y documentos.
  await db.client.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/boveda");
}
