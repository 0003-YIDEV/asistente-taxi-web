"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2, UserX } from "lucide-react";
import { clsx } from "clsx";
import {
  getChecklistProgress,
  toggleChecklistItem,
} from "@/lib/actions/checklist";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

const DEFAULT_GROUPS: ChecklistGroup[] = [
  {
    title: "Alta de Actividad",
    items: [
      { id: "alta-reta", label: "Seguridad Social (RETA)", completed: false },
      { id: "alta-037", label: "Hacienda (Modelo 037)", completed: false },
      { id: "alta-imet", label: "Comunicación IMET", completed: false },
      {
        id: "alta-gasoleo",
        label: "Alta Gasóleo Profesional",
        completed: false,
      },
    ],
  },
  {
    title: "Gestión Trimestral",
    items: [
      { id: "tri-docs", label: "Pedir documentación (Día 1)", completed: false },
      {
        id: "tri-pres",
        label: "Presentar modelos (Día 19)",
        completed: false,
      },
      {
        id: "tri-just",
        label: "Enviar justificante (Día 20)",
        completed: false,
      },
    ],
  },
];

export function ChecklistModule({ clientId }: { clientId: string | null }) {
  const [groups, setGroups] = useState<ChecklistGroup[]>(DEFAULT_GROUPS);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (clientId) {
      queueMicrotask(() => {
        if (mounted) setCargando(true);
      });
      getChecklistProgress(clientId)
        .then((progress) => {
          if (mounted) {
            setGroups((prevGroups) =>
              prevGroups.map((group) => ({
                ...group,
                items: group.items.map((item) => ({
                  ...item,
                  completed: progress.some(
                    (p) => p.itemId === item.id && p.completed,
                  ),
                })),
              })),
            );
          }
        })
        .finally(() => {
          if (mounted) setCargando(false);
        });
    } else {
      queueMicrotask(() => {
        if (mounted) setGroups(DEFAULT_GROUPS);
      });
    }
    return () => {
      mounted = false;
    };
  }, [clientId]);

  const toggleItem = async (groupIdx: number, itemId: string) => {
    if (!clientId) return;

    const newGroups = [...groups];
    const group = newGroups[groupIdx];
    const item = group.items.find((i) => i.id === itemId);

    if (item) {
      const newStatus = !item.completed;
      // Optimistic update
      item.completed = newStatus;
      setGroups(newGroups);

      try {
        await toggleChecklistItem(clientId, itemId, newStatus);
      } catch (error) {
        // Rollback on error
        item.completed = !newStatus;
        setGroups([...newGroups]);
        console.error("Error al actualizar checklist:", error);
      }
    }
  };

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <UserX size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">
          Selecciona un cliente para gestionar sus tareas y checklists.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6">
      {cargando && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <Loader2 size={24} className="animate-spin text-brand-primary" />
        </div>
      )}
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
            {group.title}
          </h4>
          <div className="flex flex-col gap-2">
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(gIdx, item.id)}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all text-left group",
                  item.completed
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-gray-100 text-gray-700 hover:border-gray-300",
                )}
              >
                {item.completed ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Circle
                    size={18}
                    className="text-gray-300 group-hover:text-gray-400"
                  />
                )}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
