'use client';

import { AlertTriangle, Clock, Info } from 'lucide-react';

interface Deadline {
  title: string;
  date: string;
  type: 'critical' | 'warning' | 'info';
}

export function AlertsModule() {
  const deadlines: Deadline[] = [
    { title: 'Declaración Anual de Kilómetros', date: '31 de Marzo', type: 'critical' },
    { title: 'Primer Trimestre (303, 131)', date: '20 de Abril', type: 'warning' },
    { title: 'Renovación Ayuda Combustible', date: '30 de Junio', type: 'info' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {deadlines.map((item, idx) => (
        <div 
          key={idx} 
          className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50"
        >
          <div className={
            item.type === 'critical' ? "text-status-error" : 
            item.type === 'warning' ? "text-status-warning" : 
            "text-brand-primary"
          }>
            {item.type === 'critical' ? <AlertTriangle size={20} /> : <Clock size={20} />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">{item.title}</span>
            <span className="text-xs text-gray-500">Límite: {item.date}</span>
          </div>
        </div>
      ))}
      
      <div className="mt-2 p-3 bg-brand-primary/5 rounded-lg border border-brand-primary/10 flex gap-2 items-start">
        <Info size={16} className="text-brand-primary mt-0.5" />
        <p className="text-xs text-brand-secondary leading-relaxed">
          Recuerda presentar siempre de forma voluntaria para evitar sanciones del 50-150%.
        </p>
      </div>
    </div>
  );
}
