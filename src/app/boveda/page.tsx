import { FolderLock } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BovedaExplorer } from "@/components/BovedaExplorer";

export const dynamic = "force-dynamic";

export default async function BovedaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-8">
        <div className="bg-[var(--color-brand-primary)] p-2.5 rounded-xl text-white shadow-lg shadow-[var(--color-brand-primary)]/20">
          <FolderLock size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bóveda Documental</h1>
          <p className="text-sm text-gray-500 font-medium">Documentos cifrados por cliente · acceso auditado</p>
        </div>
      </header>
      <BovedaExplorer />
    </main>
  );
}
