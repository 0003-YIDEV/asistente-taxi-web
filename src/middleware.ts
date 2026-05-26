import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// El middleware corre en Edge Runtime: usa la config edge-safe (sin adapter
// Prisma), nunca @/auth, que arrastraría `pg`/`node:util/types` al Edge.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = ["/login"].includes(nextUrl.pathname);

  if (isApiAuthRoute) return;

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
