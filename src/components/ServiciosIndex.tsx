"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { getServicios, type Servicio, type Procedimiento } from "@/data/servicios";
import { PLANTILLAS, type PlantillaDummy } from "@/lib/serviciosData";
import { ServicioCard } from "./ServicioCard";
import { TramitarModal } from "./TramitarModal";

type AnotacionManual = { servicioId: string; procedimientoId: string; nombre: string };

const servicios = getServicios();

export function ServiciosIndex() {
  const [servicioActivo, setServicioActivo] = useState<Servicio | null>(null);
  const [plantillaAbierta, setPlantillaAbierta] = useState<PlantillaDummy | null>(null);
  const [anotacionAbierta, setAnotacionAbierta] = useState<AnotacionManual | null>(null);

  function abrirServicio(servicio: Servicio) {
    setServicioActivo((prev) => (prev?.id === servicio.id ? null : servicio));
  }

  function cerrarServicio() {
    setServicioActivo(null);
  }

  function abrirProcedimiento(procedimiento: Procedimiento, servicio: Servicio) {
    if (procedimiento.plantillaId) {
      const plantilla = PLANTILLAS.find((p) => p.id === procedimiento.plantillaId) ?? null;
      if (plantilla) {
        setPlantillaAbierta(plantilla);
        return;
      }
    }
    setAnotacionAbierta({
      servicioId: servicio.id,
      procedimientoId: procedimiento.id,
      nombre: procedimiento.nombre,
    });
  }

  function cerrarModal() {
    setPlantillaAbierta(null);
    setAnotacionAbierta(null);
  }

  return (
    <>
      {/* Grid de 9 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicios.map((servicio) => (
          <ServicioCard
            key={servicio.id}
            servicio={servicio}
            seleccionado={servicioActivo?.id === servicio.id}
            onClick={() => abrirServicio(servicio)}
          />
        ))}
      </div>

      {/* Drawer lateral flotante */}
      <AnimatePresence>
        {servicioActivo && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={cerrarServicio}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.aside
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
              role="dialog"
              aria-label={`Procedimientos: ${servicioActivo.nombre}`}
            >
              {/* Cabecera del panel */}
              <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">
                    Servicio {String(servicioActivo.numero).padStart(2, "0")}
                  </span>
                  <h2 className="text-base font-semibold text-gray-900 leading-snug">
                    {servicioActivo.nombre}
                  </h2>
                  <p className="text-xs text-[var(--color-brand-secondary)] mt-0.5">
                    {servicioActivo.procedimientos.length} procedimiento{servicioActivo.procedimientos.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={cerrarServicio}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mt-0.5"
                  aria-label="Cerrar panel"
                >
                  <X size={18} />
                </button>
              </header>

              {/* Lista de procedimientos */}
              <ul className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {servicioActivo.procedimientos.map((proc, idx) => (
                  <motion.li
                    key={proc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                  >
                    <button
                      onClick={() => abrirProcedimiento(proc, servicioActivo)}
                      className="w-full text-left flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/5 hover:shadow-sm transition-all group"
                    >
                      <span className="text-sm text-gray-800 leading-snug">{proc.nombre}</span>
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-gray-300 group-hover:text-[var(--color-brand-primary)] transition-colors"
                      />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modal tramitar (plantilla o anotación manual) */}
      <TramitarModal
        plantilla={plantillaAbierta}
        procedimientoSinPlantilla={anotacionAbierta ?? undefined}
        onClose={cerrarModal}
      />
    </>
  );
}
