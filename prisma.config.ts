import { defineConfig } from "@prisma/config";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL no definida. Carga .env.local antes de prisma: " +
      "set -a; source .env.local; set +a; npx prisma ...",
  );
}

export default defineConfig({
  datasource: { url },
});
