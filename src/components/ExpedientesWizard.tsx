"use client";

import { useState } from "react";
import {
  Plus, Search, X, Loader2, ChevronLeft, Check, SkipForward, RotateCcw,
  Trash2, CircleDot, AlertTriangle, ClipboardList, Clock,
} from "lucide-react";
import { ClientesSidebar } from "@/components/ClientesSidebar";
import {
  listarExpedientes, getExpediente, listarWorkflowsDisponibles,
  crearExpediente, marcarPaso, abandonarExpediente, reabrirExpediente, borrarExpediente,
} from "@/lib/actions/expedientes";

type ExpedienteResumen = {
  id: string; estado: string; pasoActual: number; workflowNombre: string;
  servicioId: string; total: number; hechos: number;
  iniciadoEn: string | Date; cerradoEn: string | Date | null;
};
type Paso = {
  id: string; orden: number; accion: string; nivel: string; gate: string | null;
  estado: string; nota: string | null;
};
type ExpedienteFull = {
  id: string; estado: string; pasoActual: number;
  workflow: { nombre: string; servicioId: string; metaPlazo: string | null };
  client: { id: string; nombre: string };
  pasos: Paso[];
};
type WfDisp = { id: string; nombre: string; servicioId: string };

const NIVEL: Record<string, { label: string; cls: string }> = {
  auto: { label: "🟢 Auto", cls: "bg-green-50 text-green-700 border-green-200" },
  asistido: { label: "🟡 Asistido", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  humano: { label: "🔴 Humano", cls: "bg-red-50 text-red-700 border-red-200" },
};
const ESTADO_EXP: Record<string, { label: string; cls: string }> = {
  en_curso: { label: "En curso", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completado: { label: "Completado", cls: "bg-green-50 text-green-700 border-green-200" },
  abandonado: { label: "Abandonado", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function ExpedientesWizard() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [expedientes, setExpedientes] = useState<ExpedienteResumen[]>([]);
  const [abierto, setAbierto] = useState<ExpedienteFull | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Modal "nuevo trámite"
  const [workflows, setWorkflows] = useState<WfDisp[] | null>(null);
  const [qWf, setQWf] = useState("");
  const [creando, setCreando] = useState(false);
  // Confirm genérico (Turbopack bloquea confirm())
  const [confirmState, setConfirmState] = useState<{ mensaje: string; onOk: () => void | Promise<void> } | null>(null);

  async function recargarExpedientes(cid: string) {
    setExpedientes((await listarExpedientes(cid)) as ExpedienteResumen[]);
  }
  async function seleccionarCliente(id: string | null) {
    setClientId(id);
    setAbierto(null);
    setError(null);
    setExpedientes([]);
    if (id) {
      setCargando(true);
      try { await recargarExpedientes(id); }
      catch (e) { setError(e instanceof Error ? e.message : "Error"); }
      finally { setCargando(false); }
    }
  }

  async function abrir(id: string) {
    setCargando(true);
    setError(null);
    try { setAbierto((await getExpediente(id)) as ExpedienteFull); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al abrir"); }
    finally { setCargando(false); }
  }
  async function refrescarAbierto() {
    if (abierto) setAbierto((await getExpediente(abierto.id)) as ExpedienteFull);
    if (clientId) await recargarExpedientes(clientId);
  }

  async function abrirNuevo() {
    if (workflows === null) {
      try { setWorkflows((await listarWorkflowsDisponibles()) as WfDisp[]); }
      catch (e) { setError(e instanceof Error ? e.message : "Error"); return; }
    }
    setQWf("");
    setCreando(true);
  }
  async function crear(workflowId: string) {
    if (!clientId) return;
    try {
      const { id } = await crearExpediente(clientId, workflowId);
      setCreando(false);
      await recargarExpedientes(clientId);
      await abrir(id);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear"); }
  }

  async function marcar(pasoId: string, estado: string) {
    try { await marcarPaso(pasoId, estado); await refrescarAbierto(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo marcar"); }
  }

  function pedirAbandonar(id: string) {
    setConfirmState({
      mensaje: "¿Marcar este expediente como abandonado? Podrás reabrirlo luego.",
      onOk: async () => { await abandonarExpediente(id); await refrescarAbierto(); },
    });
  }
  function pedirBorrar(id: string) {
    setConfirmState({
      mensaje: "¿Borrar este expediente y todo su progreso? Esta acción es permanente.",
      onOk: async () => { await borrarExpediente(id); setAbierto(null); if (clientId) await recargarExpedientes(clientId); },
    });
  }
  async function reabrir(id: string) {
    try { await reabrirExpediente(id); await refrescarAbierto(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  }

  const wfFiltrados = (workflows ?? []).filter((w) => w.nombre.toLowerCase().includes(qWf.toLowerCase()));

  return (
    <div className="flex gap-4 items-start">
      <ClientesSidebar selectedId={clientId} onSelect={seleccionarCliente} />

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠ {error}</p>}

        {!clientId && (
          <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-8 text-center">
            Selecciona un cliente en la barra lateral para ver y crear sus trámites guiados.
          </p>
        )}

        {clientId && !abierto && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Expedientes del cliente</span>
              <button onClick={abrirNuevo} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90">
                <Plus size={15} /> Nuevo trámite
              </button>
            </div>
            {cargando ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 p-4"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
            ) : expedientes.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-xl p-8 text-center">Sin trámites todavía. Crea el primero con “Nuevo trámite”.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {expedientes.map((e) => {
                  const est = ESTADO_EXP[e.estado] ?? ESTADO_EXP.en_curso;
                  const pct = e.total ? Math.round((e.hechos / e.total) * 100) : 0;
                  return (
                    <button key={e.id} onClick={() => abrir(e.id)} className="text-left bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm hover:border-gray-200 transition">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <ClipboardList size={16} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 truncate">{e.workflowNombre}</span>
                        </span>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${est.cls}`}>{est.label}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-brand-primary)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-400">{e.hechos}/{e.total}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {clientId && abierto && (
          <ExpedienteVista
            exp={abierto}
            onVolver={() => setAbierto(null)}
            onMarcar={marcar}
            onAbandonar={() => pedirAbandonar(abierto.id)}
            onReabrir={() => reabrir(abierto.id)}
            onBorrar={() => pedirBorrar(abierto.id)}
          />
        )}
      </div>

      {/* Modal nuevo trámite */}
      {creando && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setCreando(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Elige el trámite</span>
              <button onClick={() => setCreando(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-2 border-b border-gray-50">
              <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                <Search size={14} className="text-gray-400" />
                <input autoFocus value={qWf} onChange={(e) => setQWf(e.target.value)} placeholder="Buscar trámite…" className="bg-transparent text-sm outline-none w-full" />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-1">
              {wfFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">Sin resultados.</p>
              ) : wfFiltrados.map((w) => (
                <button key={w.id} onClick={() => crear(w.id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-800 flex items-center gap-2">
                  <ClipboardList size={14} className="text-gray-400 shrink-0" /> {w.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm */}
      {confirmState && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmState(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-4 text-sm text-gray-700">{confirmState.mensaje}</div>
            <div className="flex items-center gap-2 px-4 pb-4">
              <button onClick={async () => { const cb = confirmState.onOk; setConfirmState(null); try { await cb(); } catch (e) { setError(e instanceof Error ? e.message : "Error"); } }} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:opacity-90">Confirmar</button>
              <button onClick={() => setConfirmState(null)} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vista de un expediente (los pasos) ──
function ExpedienteVista({
  exp, onVolver, onMarcar, onAbandonar, onReabrir, onBorrar,
}: {
  exp: ExpedienteFull;
  onVolver: () => void;
  onMarcar: (pasoId: string, estado: string) => void | Promise<void>;
  onAbandonar: () => void;
  onReabrir: () => void;
  onBorrar: () => void;
}) {
  const total = exp.pasos.length;
  const hechos = exp.pasos.filter((p) => p.estado === "hecho" || p.estado === "saltado").length;
  const pct = total ? Math.round((hechos / total) * 100) : 0;
  const est = ESTADO_EXP[exp.estado] ?? ESTADO_EXP.en_curso;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onVolver} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-2">
          {exp.estado === "en_curso" && <button onClick={onAbandonar} className="text-xs text-gray-500 hover:underline">Abandonar</button>}
          {exp.estado === "abandonado" && <button onClick={onReabrir} className="text-xs text-[var(--color-brand-primary)] hover:underline">Reabrir</button>}
          <button onClick={onBorrar} className="flex items-center gap-1 text-xs text-red-500 hover:underline"><Trash2 size={12} /> Borrar</button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{exp.workflow.nombre}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cliente: {exp.client.nombre}</p>
            {exp.workflow.metaPlazo && (
              <p className="flex items-center gap-1 text-xs text-amber-700 mt-1"><Clock size={12} /> Plazo: {exp.workflow.metaPlazo}</p>
            )}
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${est.cls}`}>{est.label}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-brand-primary)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-500 font-medium">{hechos}/{total}</span>
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {exp.pasos.map((p) => {
          const niv = NIVEL[p.nivel] ?? NIVEL.humano;
          const esActual = p.orden === exp.pasoActual && exp.estado === "en_curso";
          const hecho = p.estado === "hecho";
          const saltado = p.estado === "saltado";
          return (
            <li key={p.id} className={`bg-white border rounded-xl p-4 ${esActual ? "border-[var(--color-brand-primary)] shadow-sm" : "border-gray-100"}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {hecho ? <Check size={18} className="text-green-600" />
                    : saltado ? <SkipForward size={18} className="text-gray-400" />
                    : <CircleDot size={18} className={esActual ? "text-[var(--color-brand-primary)]" : "text-gray-300"} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-mono">#{p.orden + 1}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${niv.cls}`}>{niv.label}</span>
                    {esActual && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">Paso actual</span>}
                  </div>
                  <p className={`text-sm mt-1 ${hecho || saltado ? "text-gray-400 line-through" : "text-gray-800"}`}>{p.accion}</p>
                  {p.gate && (
                    <p className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" /> <span>Condición: {p.gate}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {!hecho && <button onClick={() => onMarcar(p.id, "hecho")} className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100"><Check size={12} /> Hecho</button>}
                    {!hecho && !saltado && <button onClick={() => onMarcar(p.id, "saltado")} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"><SkipForward size={12} /> Saltar</button>}
                    {(hecho || saltado) && <button onClick={() => onMarcar(p.id, "pendiente")} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"><RotateCcw size={12} /> Reabrir paso</button>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
