import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Config edge-safe (SIN adapter Prisma): la usan el middleware (Edge Runtime)
// y auth.ts. El adapter Prisma se añade solo en auth.ts (Node), nunca aquí,
// para que el middleware no arrastre `pg`/`node:util/types` al Edge Runtime.
export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // TODO: Implementar validación real con argon2id (R1.2)
        // Por ahora, este es un placeholder para la Fase 1.
        if (credentials?.email === "admin@example.com" && credentials?.password === "admin") {
          return { id: "1", name: "Asesor Admin", email: "admin@example.com" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
