"use client";

import Link from "next/link";
import { BookOpen, ListChecks, UserCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function FloatingNav() {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2">
      {/* Procedimientos */}
      <Link
        href="/procedimientos"
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:bg-[var(--color-brand-primary)] hover:text-white hover:border-[var(--color-brand-primary)] transition-all duration-200"
        title="Guía de procedimientos"
      >
        <ListChecks size={15} />
        <span className="hidden sm:inline">Guía</span>
      </Link>

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

      {/* Cerrar sesión */}
      <button
        onClick={() => signOut()}
        className="p-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
        title="Cerrar sesión"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
