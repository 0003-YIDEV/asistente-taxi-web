"use client";

import { useEffect, useState } from "react";
import { getClients, createClient } from "@/lib/actions/client";
import { Users, ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { type ClienteDummy } from "@/lib/serviciosData";

interface ClientSelectorProps {
  onSelect: (clientId: string | null) => void;
  selectedId: string | null;
}

export function ClientSelector({ onSelect, selectedId }: ClientSelectorProps) {
  const [clients, setClients] = useState<ClienteDummy[]>([]);
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;
    getClients()
      .then((data) => {
        if (mounted) setClients(data);
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedId);

  async function handleAddDummy() {
    const dummy = {
      nombre: "Nuevo Taxista " + (clients.length + 1),
      nif: "00000000T",
      domicilio: "C/ Real 123",
      iban: "ES00 0000 0000 0000 0000 0000",
      email: "taxista@example.com",
      telefono: "600 000 000",
      numLicencia: "AMB-0000",
      matricula: "0000 AAA",
      regimen: "Módulos (simplificado)",
    };
    const newClient = await createClient(dummy);
    setClients([...clients, newClient]);
    onSelect(newClient.id);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-brand-primary transition-all shadow-sm"
      >
        <Users size={16} className="text-gray-400" />
        <span
          className={clsx(selectedClient ? "text-gray-900" : "text-gray-500")}
        >
          {selectedClient ? selectedClient.nombre : "Seleccionar Cliente"}
        </span>
        {cargando ? (
          <Loader2 size={14} className="animate-spin text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Ninguno
              {!selectedId && <Check size={14} className="text-brand-primary" />}
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <div className="max-h-60 overflow-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{c.nombre}</span>
                    <span className="text-[10px] text-gray-400">{c.nif}</span>
                  </div>
                  {selectedId === c.id && (
                    <Check size={14} className="text-brand-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={handleAddDummy}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brand-primary font-bold hover:bg-brand-primary/5 transition-colors"
            >
              <Plus size={14} /> Añadir cliente dummy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
