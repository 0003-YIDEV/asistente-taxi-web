import type { NextConfig } from "next";

// Reconversión a núcleo full-stack (2026-05-19): se elimina el export estático
// (output:'export') y el basePath de GitHub Pages. La app deja de ser un sitio
// estático público y pasa a app con servidor (Route Handlers / Server Actions).
// Despliegue objetivo: self-host UE. NO reintroducir 'output: export' ni Pages.
const nextConfig: NextConfig = {};

export default nextConfig;
