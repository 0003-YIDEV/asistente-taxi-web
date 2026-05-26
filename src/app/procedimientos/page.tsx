import { ListChecks } from "lucide-react";
import { ProcedimientosViewer } from "@/components/ProcedimientosViewer";
import { getWorkflowsFromDB } from "@/lib/workflows-db";

// Lee siempre fresco de la BD (la guía es editable desde la web).
export const dynamic = "force-dynamic";

export default async function ProcedimientosPage() {
  const workflows = await getWorkflowsFromDB();
  return (
    <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-8">
        <div className="bg-[var(--color-brand-primary)] p-2.5 rounded-xl text-white shadow-lg shadow-[var(--color-brand-primary)]/20">
          <ListChecks size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Guía de Procedimientos</h1>
          <p className="text-sm text-gray-500 font-medium">
            Cada trámite paso a paso · 🟢 auto · 🟡 asistido · 🔴 humano
          </p>
        </div>
      </header>

      <ProcedimientosViewer workflows={workflows} />
    </main>
  );
}
