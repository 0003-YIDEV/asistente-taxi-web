"use client";

import Link from "next/link";
import { BookOpen, UserCircle, LogOut } from "lucide-react";

export function FloatingNav() {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2">
      {/* Manual */}
      <Link
        href="/manual"
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)] transition-all duration-200"
        title="Manual interno"
      >
        <BookOpen size={15} />
        <span className="hidden sm:inline">Manual</span>
      </Link>

      {/* Usuario (placeholder hasta auth) */}
      <button
        disabled
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-400 cursor-not-allowed opacity-60"
        title="Perfil de usuario (próximamente)"
      >
        <UserCircle size={15} />
        <span className="hidden sm:inline">Usuario</span>
      </button>

      {/* Cerrar sesión (placeholder hasta auth) */}
      <button
        disabled
        className="p-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-gray-400 cursor-not-allowed opacity-60"
        title="Cerrar sesión (próximamente)"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
