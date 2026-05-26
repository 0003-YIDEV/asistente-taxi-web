import manualData from '@/data/manual.json';
import { ManualViewer } from '@/components/ManualViewer';
import { BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Manual interno · Asistente Taxi 2026',
};

export default function ManualPage() {
  return (
    <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <header className="flex items-center gap-3 mb-8">
        <div className="bg-[var(--color-brand-primary)] p-2.5 rounded-xl text-white shadow-lg shadow-[var(--color-brand-primary)]/20">
          <BookOpen size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manual interno</h1>
          <p className="text-sm text-gray-500 font-medium">Procedimientos y guías de la asesoría</p>
        </div>
      </header>
      <ManualViewer data={manualData} />
    </main>
  );
}
