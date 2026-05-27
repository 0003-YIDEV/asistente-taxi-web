"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { encryptField, decryptField } from "@/lib/crypto/fieldEncryption";
import { revalidatePath } from "next/cache";

export async function getClients() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const clients = await db.client.findMany({
    where: { userId: session.user.id },
    orderBy: { nombre: "asc" },
  });

  return clients.map((c) => ({
    ...c,
    nif: decryptField(c.nifEnc),
    iban: decryptField(c.ibanEnc),
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
      nifEnc: encryptField(nif),
      ibanEnc: encryptField(iban),
    },
  });

  revalidatePath("/");
  revalidatePath("/boveda");

  return {
    ...client,
    nif: decryptField(client.nifEnc),
    iban: decryptField(client.ibanEnc),
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
    data: { ...rest, nifEnc: encryptField(nif), ibanEnc: encryptField(iban) },
  });

  revalidatePath("/");
  revalidatePath("/boveda");

  return {
    ...client,
    nif: decryptField(client.nifEnc),
    iban: decryptField(client.ibanEnc),
  };
}
