import { ServiciosIndex } from '@/components/ServiciosIndex';
import { LayoutDashboard } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-10">
        <div className="bg-[var(--color-brand-primary)] p-2.5 rounded-xl text-white shadow-lg shadow-[var(--color-brand-primary)]/20">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Asistente Taxi 2026</h1>
          <p className="text-sm text-gray-500 font-medium">Gestión Fiscal y Administrativa</p>
        </div>
      </header>

      <ServiciosIndex />
    </main>
  );
}
