'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

export function ChecklistModule() {
  const [groups, setGroups] = useState<ChecklistGroup[]>([
    {
      title: 'Alta de Actividad',
      items: [
        { id: 'alta-reta', label: 'Seguridad Social (RETA)', completed: false },
        { id: 'alta-037', label: 'Hacienda (Modelo 037)', completed: false },
        { id: 'alta-imet', label: 'Comunicación IMET', completed: false },
        { id: 'alta-gasoleo', label: 'Alta Gasóleo Profesional', completed: false },
      ]
    },
    {
      title: 'Gestión Trimestral',
      items: [
        { id: 'tri-docs', label: 'Pedir documentación (Día 1)', completed: false },
        { id: 'tri-pres', label: 'Presentar modelos (Día 19)', completed: false },
        { id: 'tri-just', label: 'Enviar justificante (Día 20)', completed: false },
      ]
    }
  ]);

  const toggleItem = (groupIdx: number, itemId: string) => {
    const newGroups = [...groups];
    const item = newGroups[groupIdx].items.find(i => i.id === itemId);
    if (item) {
      item.completed = !item.completed;
      setGroups(newGroups);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{group.title}</h4>
          <div className="flex flex-col gap-2">
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(gIdx, item.id)}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  item.completed 
                    ? "bg-green-50 border-green-200 text-green-700" 
                    : "bg-white border-gray-100 text-gray-700 hover:border-gray-300"
                )}
              >
                {item.completed ? <CheckCircle2 size={18} /> : <Circle size={18} className="text-gray-300" />}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
