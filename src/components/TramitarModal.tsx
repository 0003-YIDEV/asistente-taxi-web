"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, ArrowLeft, Copy, AlertTriangle, Loader2 } from "lucide-react";
import {
  type ClienteDummy,
  type PlantillaDummy,
} from "@/lib/serviciosData";
import { rellenarPlantilla } from "@/lib/fillPlantilla";
import { getClients } from "@/lib/actions/client";

import { PdfForm } from "./PdfForm";

interface ProcedimientoSinPlantilla {
  servicioId: string;
  procedimientoId: string;
  nombre: string;
  pdfId?: string;
}

interface TramitarModalProps {
  plantilla: PlantillaDummy | null;
  procedimientoSinPlantilla?: ProcedimientoSinPlantilla;
  onClose: () => void;
}

export function TramitarModal({ plantilla, procedimientoSinPlantilla, onClose }: TramitarModalProps) {
  const [clientes, setClientes] = useState<ClienteDummy[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cliente, setCliente] = useState<ClienteDummy | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ediciones, setEdiciones] = useState<Record<string, string>>({});
  const [anotacion, setAnotacion] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Cargar clientes desde la BD al abrir el modal.
  useEffect(() => {
    let mounted = true;
    if (plantilla) {
      queueMicrotask(() => {
        if (mounted) setCargando(true);
      });
      getClients()
        .then((data) => {
          if (mounted) setClientes(data);
        })
        .finally(() => {
          if (mounted) setCargando(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [plantilla]);

  const abierto = plantilla !== null || procedimientoSinPlantilla !== undefined;

  // Reset cada vez que se abre o cambia la plantilla/procedimiento.
  useEffect(() => {
    queueMicrotask(() => {
      setCliente(null);
      setBusqueda("");
      setEdiciones({});
      setAnotacion("");
      setCopiado(false);
    });
  }, [plantilla, procedimientoSinPlantilla]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onClose]);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.nif.toLowerCase().includes(q) ||
        c.numLicencia.toLowerCase().includes(q),
    );
  }, [busqueda, clientes]);

  const resultado = useMemo(
    () => (plantilla && cliente ? rellenarPlantilla(plantilla, cliente) : null),
    [plantilla, cliente],
  );

  if (!abierto) return null;

  const modoAnotacion = procedimientoSinPlantilla !== undefined && plantilla === null;
  const titulo = modoAnotacion ? procedimientoSinPlantilla!.nombre : plantilla!.servicio;
  const paso: "cliente" | "documento" = cliente ? "documento" : "cliente";

  function textoPlano(): string {
    if (!resultado) return "";
    return resultado.segmentos
      .map((s) =>
        s.tipo === "texto"
          ? s.valor
          : s.faltante
            ? (ediciones[s.clave] ?? "")
            : s.valor,
      )
      .join("");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoPlano());
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  async function copiarAnotacion() {
    try {
      await navigator.clipboard.writeText(anotacion);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const pendientes = resultado
    ? resultado.faltantes.filter((k) => !(ediciones[k]?.trim())).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            {paso === "documento" && (
              <button
                onClick={() => setCliente(null)}
                className="text-gray-400 hover:text-brand-primary"
                aria-label="Volver"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {titulo}
              </p>
              <p className="text-xs text-gray-500">
                {paso === "cliente"
                  ? "Paso 1 · Elige cliente"
                  : `Paso 2 · ${cliente?.nombre ?? ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        {paso === "cliente" && (
          <div className="p-4 flex flex-col gap-3 overflow-auto">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, NIF o nº licencia…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              {cargando && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <Loader2 size={24} className="animate-spin" />
                  <p className="text-sm font-medium">Cargando clientes...</p>
                </div>
              )}
              {!cargando && clientesFiltrados.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Sin resultados
                </p>
              )}
              {!cargando && clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCliente(c)}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:border-brand-primary hover:bg-brand-primary/5 transition text-left"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {c.nombre}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {c.nif} · {c.numLicencia} · {c.regimen}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === "documento" && modoAnotacion && (
          <div className="flex flex-col overflow-hidden">
            {procedimientoSinPlantilla?.pdfId ? (
              <PdfForm 
                pdfId={procedimientoSinPlantilla.pdfId} 
                cliente={cliente!} 
              />
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 text-blue-600 text-xs font-semibold">
                  <AlertTriangle size={14} />
                  ANOTACIÓN MANUAL · sin plantilla — escribe libremente
                </div>
                <div className="p-4 overflow-auto flex-1">
                  <textarea
                    autoFocus
                    value={anotacion}
                    onChange={(e) => setAnotacion(e.target.value)}
                    placeholder="Escribe aquí las notas o instrucciones para este trámite…"
                    className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-sm text-gray-800 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                  />
                </div>
                <footer className="flex items-center justify-between gap-3 p-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Cliente: <strong>{cliente?.nombre}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCliente(null)}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cambiar cliente
                    </button>
                    <button
                      onClick={copiarAnotacion}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:opacity-90 transition"
                    >
                      <Copy size={15} /> {copiado ? "Copiado ✓" : "Copiar texto"}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </div>
        )}

        {paso === "documento" && resultado && (
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-status-warning/10 border-b border-status-warning/20 text-status-warning text-xs font-semibold">
              <AlertTriangle size={14} />
              BORRADOR — PENDIENTE DE REVISIÓN PROFESIONAL · no enviar ni firmar
              sin revisar
            </div>
            <div className="p-4 overflow-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {resultado.segmentos.map((s, i) =>
                  s.tipo === "texto" ? (
                    <span key={i}>{s.valor}</span>
                  ) : s.faltante ? (
                    <input
                      key={i}
                      value={ediciones[s.clave] ?? ""}
                      onChange={(e) =>
                        setEdiciones((prev) => ({
                          ...prev,
                          [s.clave]: e.target.value,
                        }))
                      }
                      placeholder={s.clave}
                      className="inline-block min-w-[7rem] px-1 mx-0.5 align-baseline border-b-2 border-status-warning bg-status-warning/5 text-gray-900 focus:outline-none"
                    />
                  ) : (
                    <span
                      key={i}
                      className="bg-brand-primary/5 rounded px-0.5"
                      title={`Autorrelleno: ${s.clave}`}
                    >
                      {s.valor}
                    </span>
                  ),
                )}
              </pre>
            </div>
            <footer className="flex items-center justify-between gap-3 p-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {pendientes > 0
                  ? `${pendientes} campo(s) por completar a mano`
                  : "Todos los campos completados"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCliente(null)}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cambiar cliente
                </button>
                <button
                  onClick={copiar}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:opacity-90 transition"
                >
                  <Copy size={15} /> {copiado ? "Copiado ✓" : "Copiar borrador"}
                </button>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
