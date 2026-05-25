"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LayoutDashboard, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (res?.error) {
        setError("Credenciales inválidas");
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="bg-brand-primary p-3 rounded-xl text-white shadow-lg">
            <LayoutDashboard size={32} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Asistente Taxi 2026
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Gestión Clifford Standard
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
              required
            />
          </div>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
              required
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 font-medium text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:opacity-90 disabled:opacity-50 transition-all mt-2"
          >
            {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Usa admin@example.com / admin para la Fase 1
        </p>
      </div>
    </div>
  );
}
