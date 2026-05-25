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
  return client;
}
