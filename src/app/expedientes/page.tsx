import { ClipboardList } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ExpedientesWizard } from "@/components/ExpedientesWizard";

export const dynamic = "force-dynamic";

export default async function ExpedientesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-8">
        <div className="bg-[var(--color-brand-primary)] p-2.5 rounded-xl text-white shadow-lg shadow-[var(--color-brand-primary)]/20">
          <ClipboardList size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trámites guiados</h1>
          <p className="text-sm text-gray-500 font-medium">Asistente paso a paso por cliente · expedientes</p>
        </div>
      </header>
      <ExpedientesWizard />
    </main>
  );
}
