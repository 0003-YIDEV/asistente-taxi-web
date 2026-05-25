import { defineConfig } from "@prisma/config";

const url = process.env.DATABASE_URL || "postgresql://placeholder:5432/db";

export default defineConfig({
  datasource: { url },
});
