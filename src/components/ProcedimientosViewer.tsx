"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronDown, ArrowLeft, Home } from "lucide-react";
import { getServicios } from "@/data/servicios";
import { type Workflow, type NivelAuto } from "@/data/workflows";

const NIVEL: Record<NivelAuto, { dot: string; label: string; cls: string }> = {
  auto: { dot: "🟢", label: "Auto", cls: "bg-green-50 text-green-700 border-green-200" },
  asistido: { dot: "🟡", label: "Asistido", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  humano: { dot: "🔴", label: "Humano", cls: "bg-red-50 text-red-700 border-red-200" },
};

function Badge({ n }: { n: NivelAuto }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${NIVEL[n].cls}`}>
      {NIVEL[n].dot} {NIVEL[n].label}
    </span>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-[11px] font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">{titulo}</h4>
      {children}
    </div>
  );
}

function Lista({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-gray-400">—</p>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-gray-700 flex gap-2">
          <span className="text-gray-300">·</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function WorkflowCard({ w, open, onToggle }: { w: Workflow; open: boolean; onToggle: () => void }) {
  const conteo = w.pasos.reduce(
    (acc, p) => ({ ...acc, [p.nivel]: (acc[p.nivel] ?? 0) + 1 }),
    {} as Record<NivelAuto, number>,
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <ChevronRight size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{w.nombre}</p>
          <p className="text-xs text-gray-500">
            {w.refManual}
            {w.meta.plazo ? ` · plazo: ${w.meta.plazo}` : ""}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {(["auto", "asistido", "humano"] as NivelAuto[]).map((n) =>
            conteo[n] ? (
              <span key={n} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${NIVEL[n].cls}`}>
                {NIVEL[n].dot} {conteo[n]}
              </span>
            ) : null,
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4 border-t border-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {w.meta.portal && <p><span className="text-gray-400">Portal:</span> {w.meta.portal}</p>}
            {w.meta.identificacion && <p><span className="text-gray-400">Identificación:</span> {w.meta.identificacion}</p>}
            {w.meta.plazo && <p><span className="text-gray-400">Plazo:</span> {w.meta.plazo}</p>}
            {w.meta.resultado && <p><span className="text-gray-400">Resultado:</span> {w.meta.resultado}</p>}
            {w.meta.baseNormativa && <p className="sm:col-span-2"><span className="text-gray-400">Base normativa:</span> {w.meta.baseNormativa}</p>}
          </div>

          <Seccion titulo="Gate de entrada"><Lista items={w.gateEntrada} /></Seccion>
          <Seccion titulo="Inputs"><Lista items={w.inputs} /></Seccion>

          <Seccion titulo="Pasos">
            <ol className="flex flex-col gap-2">
              {w.pasos.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-xs font-bold text-gray-400 tabular-nums mt-0.5 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800">{p.accion}</p>
                      <span className="shrink-0"><Badge n={p.nivel} /></span>
                    </div>
                    {p.validacion && <p className="text-xs text-gray-500 mt-0.5">✓ {p.validacion}</p>}
                    {p.gate && <p className="text-xs text-red-600 font-medium mt-0.5">⚠ {p.gate}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Seccion>

          <Seccion titulo="Outputs"><Lista items={w.outputs.map((o) => `${o.artefacto} → ${o.carpeta}/`)} /></Seccion>
          <Seccion titulo="Después (dispara)"><Lista items={w.post} /></Seccion>
          {w.excepciones.length > 0 && <Seccion titulo="Excepciones"><Lista items={w.excepciones} /></Seccion>}

          <Seccion titulo="Automatización (frontera)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-green-50/60 rounded-lg p-3 border border-green-100">
                <p className="text-xs font-bold text-green-700 mb-1">🟢 Puede automatizarse</p>
                <Lista items={w.automatizacion.puede} />
              </div>
              {w.automatizacion.asistido?.length ? (
                <div className="bg-amber-50/60 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 mb-1">🟡 Asistido</p>
                  <Lista items={w.automatizacion.asistido} />
                </div>
              ) : null}
              <div className="bg-red-50/60 rounded-lg p-3 border border-red-100">
                <p className="text-xs font-bold text-red-700 mb-1">🔴 Humano obligatorio</p>
                <Lista items={w.automatizacion.noPuede} />
              </div>
            </div>
          </Seccion>
        </div>
      )}
    </div>
  );
}

export function ProcedimientosViewer({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter();
  // Agrupa los workflows por servicioId (la fuente ahora es la BD, vía props).
  const porServicio = useMemo(() => {
    const map = new Map<string, Workflow[]>();
    for (const w of workflows) {
      const arr = map.get(w.servicioId) ?? [];
      arr.push(w);
      map.set(w.servicioId, arr);
    }
    return map;
  }, [workflows]);

  const servicios = getServicios().filter((s) => (porServicio.get(s.id)?.length ?? 0) > 0);
  // Por defecto, el primer servicio desplegado
  const [servicioAbierto, setServicioAbierto] = useState<string | null>(servicios[0]?.id ?? null);
  const [procAbierto, setProcAbierto] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de navegación */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={15} /> Atrás
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Home size={15} /> Inicio
        </Link>
      </div>

      {/* Servicios desplegables */}
      {servicios.map((s) => {
        const abierto = servicioAbierto === s.id;
        const workflowsServicio = porServicio.get(s.id) ?? [];
        return (
          <section key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setServicioAbierto(abierto ? null : s.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-bold text-[var(--color-brand-secondary)] tabular-nums w-6 shrink-0">
                {String(s.numero).padStart(2, "0")}
              </span>
              <h2 className="flex-1 text-sm font-bold text-gray-900 min-w-0">{s.nombre}</h2>
              <span className="text-xs text-gray-400 shrink-0">{workflowsServicio.length} proc.</span>
              <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
            </button>

            {abierto && (
              <div className="px-3 pb-3 flex flex-col gap-2 border-t border-gray-50 pt-3">
                {workflowsServicio.map((w) => (
                  <WorkflowCard
                    key={w.id}
                    w={w}
                    open={procAbierto === w.id}
                    onToggle={() => setProcAbierto(procAbierto === w.id ? null : w.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
