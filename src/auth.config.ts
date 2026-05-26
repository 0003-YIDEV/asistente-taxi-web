import type { NextAuthConfig } from "next-auth";

// Config edge-safe (SIN adapter Prisma): la usan el middleware (Edge Runtime)
// y auth.ts. El adapter Prisma se añade solo en auth.ts (Node), nunca aquí,
// para que el middleware no arrastre `pg`/`node:util/types` al Edge Runtime.
export const authConfig = {
  providers: [], // Los providers se añaden en auth.ts para incluir lógica de BD
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
