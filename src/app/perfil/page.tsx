import { auth } from "@/auth";
import { UserCircle, Mail, Shield, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PerfilPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
      <header className="mb-10">
        <Link 
          href="/"
          className="text-sm font-medium text-[var(--color-brand-primary)] hover:underline mb-4 inline-block"
        >
          ← Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mi Perfil</h1>
        <p className="text-gray-500">Configuración de la cuenta y datos del asesor</p>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 flex flex-col items-center border-b border-gray-50 bg-gray-50/30">
          <div className="w-24 h-24 rounded-full bg-[var(--color-brand-primary)]/10 flex items-center justify-center text-[var(--color-brand-primary)] mb-4">
            <UserCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-4">Datos de la cuenta</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Rol</p>
                  <p className="text-sm font-medium text-gray-900">Administrador / Asesor</p>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-50">
            <button 
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
