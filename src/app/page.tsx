import manualData from '@/data/manual.json';
import { BentoCard } from '@/components/BentoCard';
import { ManualViewer } from '@/components/ManualViewer';
import { ChecklistModule } from '@/components/ChecklistModule';
import { AlertsModule } from '@/components/AlertsModule';
import { 
  BookOpen, 
  CheckSquare, 
  Bell, 
  ExternalLink, 
  Search,
  LayoutDashboard
} from 'lucide-react';

export default function Home() {
  return (
    <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="bg-brand-primary p-2.5 rounded-xl text-white shadow-lg shadow-brand-primary/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Asistente Taxi 2026</h1>
            <p className="text-sm text-gray-500 font-medium">Gestión Fiscal y Administrativa · Clifford Standard</p>
          </div>
        </div>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar trámites, plazos o modelos..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
          />
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-min">
        
        {/* Lector del Manual */}
        <BentoCard 
          title="Manual de Consulta" 
          icon={<BookOpen size={18} />}
          className="md:col-span-2 md:row-span-3 min-h-[600px]"
        >
          <ManualViewer data={manualData} />
        </BentoCard>

        {/* Checklists Operativos */}
        <BentoCard 
          title="Tareas y Checklists" 
          icon={<CheckSquare size={18} />}
          className="md:col-span-2"
        >
          <ChecklistModule />
        </BentoCard>

        {/* Alertas y Plazos */}
        <BentoCard 
          title="Próximos Plazos" 
          icon={<Bell size={18} />}
          className="md:col-span-1 md:row-span-2"
        >
          <AlertsModule />
        </BentoCard>

        {/* Accesos Rápidos */}
        <BentoCard 
          title="Enlaces Externos" 
          className="md:col-span-1 md:row-span-2"
        >
          <div className="flex flex-col gap-2">
            {[
              { label: 'Sede AEAT', url: 'https://sede.agenciatributaria.gob.es/' },
              { label: 'Import@ss (TGSS)', url: 'https://portal.seg-social.gob.es/' },
              { label: 'Portal IMET', url: 'https://taxi.amb.cat/' },
              { label: 'DGT - Trámites', url: 'https://sede.dgt.gob.es/' },
            ].map((link, i) => (
              <a 
                key={i} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all group"
              >
                <span className="text-sm font-medium text-gray-700">{link.label}</span>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-brand-primary transition-colors" />
              </a>
            ))}
          </div>
        </BentoCard>

      </div>

      <footer className="mt-12 pt-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 font-medium">
          © 2026 Clifford Standard Spoke · Orquestador Alfredo · Hub & Spokes Ecosystem
        </p>
      </footer>
    </main>
  );
}
