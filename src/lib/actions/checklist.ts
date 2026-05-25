"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getChecklistProgress(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Opcional: Verificar propiedad del cliente
  const client = await db.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) return [];

  return await db.checklistProgress.findMany({
    where: { clientId },
  });
}

export async function toggleChecklistItem(
  clientId: string,
  itemId: string,
  completed: boolean,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  // Verificar que el cliente pertenece al usuario
  const client = await db.client.findUnique({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) throw new Error("Cliente no encontrado o no autorizado");

  await db.checklistProgress.upsert({
    where: {
      clientId_itemId: { clientId, itemId },
    },
    update: { completed },
    create: { clientId, itemId, completed },
  });

  revalidatePath("/");
}
