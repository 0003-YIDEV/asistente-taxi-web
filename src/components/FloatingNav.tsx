"use client";

import Link from "next/link";
import { BookOpen, UserCircle, LogOut, FileText } from "lucide-react";
import { signOut } from "next-auth/react";

export function FloatingNav() {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2">
      {/* Guía */}
      <Link
        href="/procedimientos"
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200"
        title="Guía de procedimientos"
      >
        <FileText size={15} />
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

      {/* Usuario */}
      <Link
        href="/perfil"
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        title="Mi Perfil"
      >
        <UserCircle size={15} />
        <span className="hidden sm:inline">Usuario</span>
      </Link>

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
