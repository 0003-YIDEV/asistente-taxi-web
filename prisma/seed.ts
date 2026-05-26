// Seed combinado:
//  1) Admin inicial (argon2id) — requiere ADMIN_EMAIL / ADMIN_PASSWORD en el entorno.
//  2) Guía de procedimientos: carga los workflows de src/data/workflows.ts (idempotente).
// Ejecutar: npx tsx prisma/seed.ts (con DATABASE_URL + ADMIN_* en el entorno).
import { PrismaClient, Prisma } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as argon2 from "argon2";
import { WORKFLOWS } from "../src/data/workflows";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME || "Asesor Admin";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn("⚠️  ADMIN_EMAIL/ADMIN_PASSWORD no definidos — se omite el seed de admin.");
    return;
  }

  const passwordHash = await argon2.hash(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, role: "admin" },
    create: { email: adminEmail, name: adminName, passwordHash, role: "admin" },
  });
  console.log(`✅ Admin creado/actualizado: ${admin.email} (ID: ${admin.id})`);
}

async function seedWorkflows() {
  await prisma.workflowPaso.deleteMany();
  await prisma.workflow.deleteMany();

  for (let i = 0; i < WORKFLOWS.length; i++) {
    const w = WORKFLOWS[i];
    await prisma.workflow.create({
      data: {
        id: w.id,
        servicioId: w.servicioId,
        nombre: w.nombre,
        refManual: w.refManual,
        esOrquestador: w.esOrquestador ?? false,
        orden: i,
        metaPortal: w.meta.portal ?? null,
        metaIdentificacion: w.meta.identificacion ?? null,
        metaPlazo: w.meta.plazo ?? null,
        metaBaseNormativa: w.meta.baseNormativa ?? null,
        metaResultado: w.meta.resultado ?? null,
        gateEntrada: w.gateEntrada,
        inputs: w.inputs,
        post: w.post,
        excepciones: w.excepciones,
        autoPuede: w.automatizacion.puede,
        autoAsistido: w.automatizacion.asistido ?? [],
        autoNoPuede: w.automatizacion.noPuede,
        outputs: w.outputs as unknown as Prisma.InputJsonValue,
        pasos: {
          create: w.pasos.map((p, idx) => ({
            orden: idx,
            accion: p.accion,
            validacion: p.validacion ?? null,
            nivel: p.nivel,
            gate: p.gate ?? null,
            refWorkflow: p.refWorkflow ?? null,
          })),
        },
      },
    });
  }

  const wf = await prisma.workflow.count();
  const ps = await prisma.workflowPaso.count();
  console.log(`✅ Seed workflows: ${wf} workflows, ${ps} pasos`);
}

async function main() {
  await seedAdmin();
  await seedWorkflows();
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(() => pool.end());
