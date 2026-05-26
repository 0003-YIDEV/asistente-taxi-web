"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronRight, ExternalLink } from "lucide-react";
import {
  PlayCircle, StopCircle, PenSquare, FileText, Fuel,
  Award, Car, Shield, Headphones, type LucideProps,
} from "lucide-react";
import { getServicios, type Servicio, type Procedimiento } from "@/data/servicios";
import { PLANTILLAS, type PlantillaDummy } from "@/lib/serviciosData";
import { AlertsModule } from "./AlertsModule";
import { ChecklistModule } from "./ChecklistModule";
import { ClientSelector } from "./ClientSelector";
import { TramitarModal } from "./TramitarModal";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  PlayCircle, StopCircle, PenSquare, FileText, Fuel,
  Award, Car, Shield, Headphones,
};

const ENLACES_EXTERNOS = [
  { label: "Sede AEAT", url: "https://sede.agenciatributaria.gob.es/" },
  { label: "Import@ss (TGSS)", url: "https://portal.seg-social.gob.es/" },
  { label: "Portal IMET", url: "https://taxi.amb.cat/" },
  { label: "DGT · Trámites", url: "https://sede.dgt.gob.es/" },
];

type AnotacionManual = { servicioId: string; procedimientoId: string; nombre: string };

const servicios = getServicios();

export function ServiciosIndex() {
  const [servicioActivo, setServicioActivo] = useState<Servicio | null>(null);
  const [plantillaAbierta, setPlantillaAbierta] = useState<PlantillaDummy | null>(null);
  const [anotacionAbierta, setAnotacionAbierta] = useState<AnotacionManual | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!servicioActivo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setServicioActivo(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [servicioActivo]);

  function abrirProcedimiento(proc: Procedimiento, servicio: Servicio) {
    if (proc.plantillaId) {
      const plantilla = PLANTILLAS.find((p) => p.id === proc.plantillaId) ?? null;
      if (plantilla) {
        setPlantillaAbierta(plantilla);
        setServicioActivo(null);
        return;
      }
    }
    setAnotacionAbierta({
      servicioId: servicio.id,
      procedimientoId: proc.id,
      nombre: proc.nombre,
    });
    setServicioActivo(null);
  }

  function cerrarModal() {
    setPlantillaAbierta(null);
    setAnotacionAbierta(null);
  }

  return (
    <>
      {/* Layout dos columnas */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Columna izquierda: índice vertical de 9 servicios ── */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-xs font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">
                Servicios · {servicios.length} áreas
              </h2>
            </div>
            <ul className="flex flex-col divide-y divide-gray-50">
              {servicios.map((s) => {
                const Icon = ICON_MAP[s.icono] ?? FileText;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setServicioActivo(s)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--color-brand-primary)]/5 transition-colors group text-left"
                    >
                      <span className="text-xs font-bold text-[var(--color-brand-secondary)] tabular-nums w-5 shrink-0">
                        {String(s.numero).padStart(2, "0")}
                      </span>
                      <div className="p-1.5 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)] group-hover:text-white transition-colors shrink-0">
                        <Icon size={15} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-800 leading-snug min-w-0 truncate">
                        {s.nombre}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">
                          {s.procedimientos.length} proc.
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-gray-300 group-hover:text-[var(--color-brand-primary)] transition-colors"
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ── Columna derecha: dashboard ── */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">

          {/* Próximos plazos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider mb-4">
              Próximos Plazos
            </h2>
            <AlertsModule />
          </div>

          {/* Tareas y checklists */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xs font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">
                Tareas y Checklists
              </h2>
              <ClientSelector selectedId={activeClientId} onSelect={setActiveClientId} />
            </div>
            <ChecklistModule clientId={activeClientId} />
          </div>

          {/* Enlaces externos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider mb-3">
              Sedes Oficiales
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ENLACES_EXTERNOS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all group"
                >
                  <span className="text-sm font-medium text-gray-700">{link.label}</span>
                  <ExternalLink
                    size={13}
                    className="text-gray-300 group-hover:text-[var(--color-brand-primary)] transition-colors shrink-0"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal centrado de procedimientos ── */}
      <AnimatePresence>
        {servicioActivo && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setServicioActivo(null)}
              aria-hidden="true"
            />

            {/* Panel centrado */}
            <motion.div
              key="overlay"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setServicioActivo(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2, type: "spring", damping: 28, stiffness: 320 }}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[80dvh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label={`Procedimientos: ${servicioActivo.nombre}`}
              >
                {/* Cabecera */}
                <header className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">
                      Servicio {String(servicioActivo.numero).padStart(2, "0")}
                    </span>
                    <h2 className="text-base font-semibold text-gray-900 leading-snug">
                      {servicioActivo.nombre}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {servicioActivo.procedimientos.length} procedimiento
                      {servicioActivo.procedimientos.length !== 1 ? "s" : ""} · selecciona uno para tramitar
                    </p>
                  </div>
                  <button
                    onClick={() => setServicioActivo(null)}
                    className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mt-0.5"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </header>

                {/* Grid de cards de procedimientos */}
                <div className="overflow-y-auto p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {servicioActivo.procedimientos.map((proc, idx) => (
                      <motion.button
                        key={proc.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.18 }}
                        onClick={() => abrirProcedimiento(proc, servicioActivo)}
                        className="text-left flex flex-col gap-2.5 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/30 transition-all duration-200 group"
                      >
                        <span className="text-sm font-medium text-gray-800 leading-snug">
                          {proc.nombre}
                        </span>
                        <span
                          className={[
                            "text-xs px-2 py-0.5 rounded-full self-start font-medium",
                            proc.plantillaId
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-600",
                          ].join(" ")}
                        >
                          {proc.plantillaId ? "Con plantilla" : "Anotación manual"}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal tramitar */}
      <TramitarModal
        plantilla={plantillaAbierta}
        procedimientoSinPlantilla={anotacionAbierta ?? undefined}
        onClose={cerrarModal}
      />
    </>
  );
}
