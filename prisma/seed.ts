import { PrismaClient } from "../src/generated/prisma";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME || "Asesor Admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be defined in the environment.");
    process.exit(1);
  }

  console.log(`🌱 Seeding initial admin: ${adminEmail}...`);

  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: passwordHash,
      role: "admin",
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: passwordHash,
      role: "admin",
    },
  });

  console.log(`✅ Admin created/updated: ${admin.email} (ID: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
