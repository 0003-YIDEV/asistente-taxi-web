"use client";

import {
  PlayCircle, StopCircle, PenSquare, FileText, Fuel,
  Award, Car, Shield, Headphones, LucideProps,
} from "lucide-react";
import type { Servicio } from "@/data/servicios";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  PlayCircle,
  StopCircle,
  PenSquare,
  FileText,
  Fuel,
  Award,
  Car,
  Shield,
  Headphones,
};

interface ServicioCardProps {
  servicio: Servicio;
  seleccionado: boolean;
  onClick: () => void;
}

export function ServicioCard({ servicio, seleccionado, onClick }: ServicioCardProps) {
  const Icon = ICON_MAP[servicio.icono] ?? FileText;

  return (
    <button
      onClick={onClick}
      aria-pressed={seleccionado}
      className={[
        "group w-full text-left rounded-2xl border p-5 flex flex-col gap-3",
        "bg-white transition-all duration-200 cursor-pointer",
        "hover:shadow-xl hover:-translate-y-1 hover:border-[var(--color-brand-primary)]",
        seleccionado
          ? "border-[var(--color-brand-primary)] shadow-xl -translate-y-1 ring-2 ring-[var(--color-brand-primary)]/20"
          : "border-gray-200 shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={[
            "p-2.5 rounded-xl transition-colors duration-200",
            seleccionado
              ? "bg-[var(--color-brand-primary)] text-white"
              : "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] group-hover:bg-[var(--color-brand-primary)] group-hover:text-white",
          ].join(" ")}
        >
          <Icon size={20} />
        </div>
        <span className="text-xs font-bold text-[var(--color-brand-secondary)] tabular-nums mt-1">
          {String(servicio.numero).padStart(2, "0")}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">
          {servicio.nombre}
        </h3>
        <p className="text-xs text-[var(--color-brand-secondary)]">
          {servicio.procedimientos.length} procedimiento{servicio.procedimientos.length !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}
