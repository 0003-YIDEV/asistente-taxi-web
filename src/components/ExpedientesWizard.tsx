"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Search, X, Loader2, ChevronLeft, Check, SkipForward, RotateCcw,
  Trash2, CircleDot, AlertTriangle, ClipboardList, Clock, FileText, FolderInput,
  Upload, FileUp, ListChecks, Database,
} from "lucide-react";
import { ClientesSidebar } from "@/components/ClientesSidebar";
import {
  listarExpedientes, getExpediente, listarWorkflowsDisponibles,
  crearExpediente, marcarPaso, abandonarExpediente, reabrirExpediente, borrarExpediente,
  guardarDatosExpediente, subirOutput, subirAportado, vincularDocExistente, desvincularDoc, listarDocsCliente,
} from "@/lib/actions/expedientes";
import { setContextoTramite } from "@/lib/asistente-contexto";

type ExpedienteResumen = {
  id: string; estado: string; pasoActual: number; workflowNombre: string;
  servicioId: string; total: number; hechos: number;
  iniciadoEn: string | Date; cerradoEn: string | Date | null;
};
type Paso = { id: string; orden: number; accion: string; nivel: string; gate: string | null; estado: string; nota: string | null };
type DocVinc = { id: string; rol: string; etiqueta: string | null; documento: { id: string; nombre: string; mime: string; carpetaId: string | null } | null };
type Output = { artefacto: string; carpeta: string };
type ExpedienteFull = {
  id: string; estado: string; pasoActual: number; datos: Record<string, string>;
  workflow: { nombre: string; servicioId: string; metaPlazo: string | null; inputs: string[]; outputs: Output[] };
  client: { id: string; nombre: string };
  pasos: Paso[];
  documentos: DocVinc[];
};
type WfDisp = { id: string; nombre: string; servicioId: string };
type DocCliente = { id: string; nombre: string; mime: string; carpetaId: string | null };

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
  const [workflows, setWorkflows] = useState<WfDisp[] | null>(null);
  const [qWf, setQWf] = useState("");
  const [creando, setCreando] = useState(false);
  const [confirmState, setConfirmState] = useState<{ mensaje: string; onOk: () => void | Promise<void> } | null>(null);

  // El asistente flotante "sabe dónde estás": al abrir un expediente fija su contexto.
  useEffect(() => {
    setContextoTramite(abierto ? { expedienteId: abierto.id, nombre: abierto.workflow.nombre } : null);
    return () => setContextoTramite(null);
  }, [abierto]);

  async function recargarExpedientes(cid: string) {
    setExpedientes((await listarExpedientes(cid)) as ExpedienteResumen[]);
  }
  async function seleccionarCliente(id: string | null) {
    setClientId(id); setAbierto(null); setError(null); setExpedientes([]);
    if (id) {
      setCargando(true);
      try { await recargarExpedientes(id); }
      catch (e) { setError(e instanceof Error ? e.message : "Error"); }
      finally { setCargando(false); }
    }
  }
  async function abrir(id: string) {
    setCargando(true); setError(null);
    try { setAbierto((await getExpediente(id)) as unknown as ExpedienteFull); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al abrir"); }
    finally { setCargando(false); }
  }
  async function refrescarAbierto() {
    if (abierto) setAbierto((await getExpediente(abierto.id)) as unknown as ExpedienteFull);
    if (clientId) await recargarExpedientes(clientId);
  }

  async function abrirNuevo() {
    if (workflows === null) {
      try { setWorkflows((await listarWorkflowsDisponibles()) as WfDisp[]); }
      catch (e) { setError(e instanceof Error ? e.message : "Error"); return; }
    }
    setQWf(""); setCreando(true);
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
    setConfirmState({ mensaje: "¿Marcar este expediente como abandonado? Podrás reabrirlo luego.", onOk: async () => { await abandonarExpediente(id); await refrescarAbierto(); } });
  }
  function pedirBorrar(id: string) {
    setConfirmState({ mensaje: "¿Borrar este expediente y todo su progreso? Esta acción es permanente.", onOk: async () => { await borrarExpediente(id); setAbierto(null); if (clientId) await recargarExpedientes(clientId); } });
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
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[var(--color-brand-primary)]" style={{ width: `${pct}%` }} /></div>
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
            onRefresh={refrescarAbierto}
            onError={(m) => setError(m)}
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
              {wfFiltrados.length === 0 ? <p className="text-xs text-gray-400 p-4 text-center">Sin resultados.</p>
                : wfFiltrados.map((w) => (
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

// ── Vista de un expediente: pestañas Pasos · Datos · Documentos ──
function ExpedienteVista({
  exp, onVolver, onMarcar, onAbandonar, onReabrir, onBorrar, onRefresh, onError,
}: {
  exp: ExpedienteFull;
  onVolver: () => void;
  onMarcar: (pasoId: string, estado: string) => void | Promise<void>;
  onAbandonar: () => void; onReabrir: () => void; onBorrar: () => void;
  onRefresh: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [tab, setTab] = useState<"pasos" | "datos" | "docs">("pasos");
  const est = ESTADO_EXP[exp.estado] ?? ESTADO_EXP.en_curso;

  const totalPasos = exp.pasos.length;
  const hechosPasos = exp.pasos.filter((p) => p.estado === "hecho" || p.estado === "saltado").length;
  const pct = totalPasos ? Math.round((hechosPasos / totalPasos) * 100) : 0;
  const totalInputs = exp.workflow.inputs.length;
  const datosLlenos = exp.workflow.inputs.filter((i) => (exp.datos[i] ?? "").trim()).length;
  const nDocs = exp.documentos.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onVolver} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ChevronLeft size={16} /> Volver</button>
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
            {exp.workflow.metaPlazo && <p className="flex items-center gap-1 text-xs text-amber-700 mt-1"><Clock size={12} /> Plazo: {exp.workflow.metaPlazo}</p>}
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${est.cls}`}>{est.label}</span>
        </div>
        {/* Indicador de completitud */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Completitud icon={<ListChecks size={13} />} label="Pasos" n={hechosPasos} total={totalPasos} />
          <Completitud icon={<Database size={13} />} label="Datos" n={datosLlenos} total={totalInputs} />
          <Completitud icon={<FileText size={13} />} label="Docs" n={nDocs} />
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[var(--color-brand-primary)] transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([["pasos", "Pasos"], ["datos", "Datos"], ["docs", "Documentos"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? "border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{label}</button>
        ))}
      </div>

      {tab === "pasos" && <PasosTab exp={exp} onMarcar={onMarcar} />}
      {tab === "datos" && <DatosTab exp={exp} onRefresh={onRefresh} onError={onError} />}
      {tab === "docs" && <DocsTab exp={exp} onRefresh={onRefresh} onError={onError} />}
    </div>
  );
}

function Completitud({ icon, label, n, total }: { icon: React.ReactNode; label: string; n: number; total?: number }) {
  return (
    <div className="bg-gray-50 rounded-lg py-1.5">
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{icon}{label}</div>
      <div className="text-sm font-semibold text-gray-800">{total === undefined ? n : `${n}/${total}`}</div>
    </div>
  );
}

function PasosTab({ exp, onMarcar }: { exp: ExpedienteFull; onMarcar: (id: string, estado: string) => void | Promise<void> }) {
  return (
    <ol className="flex flex-col gap-2">
      {exp.pasos.map((p) => {
        const niv = NIVEL[p.nivel] ?? NIVEL.humano;
        const esActual = p.orden === exp.pasoActual && exp.estado === "en_curso";
        const hecho = p.estado === "hecho"; const saltado = p.estado === "saltado";
        return (
          <li key={p.id} className={`bg-white border rounded-xl p-4 ${esActual ? "border-[var(--color-brand-primary)] shadow-sm" : "border-gray-100"}`}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {hecho ? <Check size={18} className="text-green-600" /> : saltado ? <SkipForward size={18} className="text-gray-400" /> : <CircleDot size={18} className={esActual ? "text-[var(--color-brand-primary)]" : "text-gray-300"} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-mono">#{p.orden + 1}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${niv.cls}`}>{niv.label}</span>
                  {esActual && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">Paso actual</span>}
                </div>
                <p className={`text-sm mt-1 ${hecho || saltado ? "text-gray-400 line-through" : "text-gray-800"}`}>{p.accion}</p>
                {p.gate && <p className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2"><AlertTriangle size={12} className="shrink-0 mt-0.5" /> <span>Condición: {p.gate}</span></p>}
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
  );
}

function DatosTab({ exp, onRefresh, onError }: { exp: ExpedienteFull; onRefresh: () => Promise<void>; onError: (m: string) => void }) {
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const i of exp.workflow.inputs) v[i] = exp.datos[i] ?? "";
    return v;
  });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function guardar() {
    setGuardando(true); setGuardado(false);
    try { await guardarDatosExpediente(exp.id, valores); await onRefresh(); setGuardado(true); }
    catch (e) { onError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setGuardando(false); }
  }

  if (exp.workflow.inputs.length === 0) return <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-xl p-6 text-center">Este trámite no define datos de entrada.</p>;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
      <p className="text-xs text-gray-400">Datos del trámite. Los que ya estaban en la ficha del cliente vienen pre-rellenados.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {exp.workflow.inputs.map((label) => (
          <label key={label} className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-gray-500">{label}</span>
            <input value={valores[label] ?? ""} onChange={(e) => { setValores({ ...valores, [label]: e.target.value }); setGuardado(false); }} className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-[var(--color-brand-primary)] outline-none" />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={guardar} disabled={guardando} className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">{guardando ? "Guardando…" : "Guardar datos"}</button>
        {guardado && <span className="text-xs text-green-600 flex items-center gap-1"><Check size={13} /> Guardado</span>}
      </div>
    </div>
  );
}

function DocsTab({ exp, onRefresh, onError }: { exp: ExpedienteFull; onRefresh: () => Promise<void>; onError: (m: string) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [docsCliente, setDocsCliente] = useState<DocCliente[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // destino del próximo fichero seleccionado
  const pendiente = useRef<{ tipo: "output" | "aportado"; etiqueta?: string; carpeta?: string } | null>(null);

  const outputs = exp.workflow.outputs ?? [];
  const generados = exp.documentos.filter((d) => d.rol === "generado");
  const aportados = exp.documentos.filter((d) => d.rol === "aportado");

  function pedirFichero(target: { tipo: "output" | "aportado"; etiqueta?: string; carpeta?: string }) {
    pendiente.current = target;
    fileRef.current?.click();
  }
  async function onFile(files: FileList | null) {
    if (!files || !files[0] || !pendiente.current) return;
    const t = pendiente.current; pendiente.current = null;
    const fd = new FormData(); fd.append("file", files[0]);
    setSubiendo(true);
    try {
      const res = t.tipo === "output"
        ? await subirOutput(exp.id, t.etiqueta ?? "", t.carpeta ?? "", fd)
        : await subirAportado(exp.id, null, fd);
      if (res && !res.ok && "duplicado" in res && res.duplicado) onError(`Ya existe como "${res.nombreExistente}". Usa “Elegir de la Bóveda”.`);
      else await onRefresh();
    } catch (e) { onError(e instanceof Error ? e.message : "No se pudo subir"); }
    finally { setSubiendo(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function abrirPicker() {
    try { setDocsCliente((await listarDocsCliente(exp.client.id)) as DocCliente[]); setPickerOpen(true); }
    catch (e) { onError(e instanceof Error ? e.message : "Error"); }
  }
  async function elegir(documentoId: string) {
    try { await vincularDocExistente(exp.id, documentoId, "aportado"); setPickerOpen(false); await onRefresh(); }
    catch (e) { onError(e instanceof Error ? e.message : "No se pudo vincular"); }
  }
  async function quitar(linkId: string) {
    try { await desvincularDoc(linkId); await onRefresh(); }
    catch (e) { onError(e instanceof Error ? e.message : "Error"); }
  }

  const idsVinculados = new Set(exp.documentos.map((d) => d.documento?.id).filter(Boolean));

  return (
    <div className="flex flex-col gap-4">
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files)} />
      {subiendo && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Subiendo…</div>}

      {/* Produce (outputs) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><FileUp size={15} className="text-gray-400" /> Produce</h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">Documentos que genera este trámite. Suben directos a su carpeta en la Bóveda.</p>
        {outputs.length === 0 ? <p className="text-xs text-gray-400">Este trámite no define documentos de salida.</p> : (
          <div className="flex flex-col gap-2">
            {outputs.map((o, i) => {
              const docsDeOutput = generados.filter((g) => g.etiqueta === o.artefacto);
              return (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{o.artefacto}</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1"><FolderInput size={11} /> {o.carpeta}</p>
                    </div>
                    <button onClick={() => pedirFichero({ tipo: "output", etiqueta: o.artefacto, carpeta: o.carpeta })} className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"><Upload size={12} /> Subir aquí</button>
                  </div>
                  {docsDeOutput.map((g) => (
                    <div key={g.id} className="mt-2 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <Check size={12} className="text-green-600" /> <span className="truncate flex-1">{g.documento?.nombre ?? "(documento eliminado)"}</span>
                      <button onClick={() => quitar(g.id)} className="text-gray-400 hover:text-red-600" title="Quitar vínculo"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aportados */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><FileText size={15} className="text-gray-400" /> Aportados</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => pedirFichero({ tipo: "aportado" })} className="flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"><Upload size={12} /> Subir</button>
            <button onClick={abrirPicker} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"><FolderInput size={12} /> Elegir de la Bóveda</button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">Documentos que el trámite necesita. Súbelos o engánchalos desde la Bóveda del cliente.</p>
        {aportados.length === 0 ? <p className="text-xs text-gray-400">Sin documentos aportados.</p> : (
          <div className="flex flex-col gap-1">
            {aportados.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                <FileText size={14} className="text-gray-400 shrink-0" /> <span className="truncate flex-1">{a.documento?.nombre ?? "(documento eliminado)"}</span>
                <button onClick={() => quitar(a.id)} className="text-gray-400 hover:text-red-600" title="Quitar vínculo"><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Picker: elegir de la Bóveda */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Elegir de la Bóveda</span>
              <button onClick={() => setPickerOpen(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              {docsCliente.length === 0 ? <p className="text-xs text-gray-400 p-4 text-center">El cliente no tiene documentos en la Bóveda.</p>
                : docsCliente.map((d) => {
                  const ya = idsVinculados.has(d.id);
                  return (
                    <button key={d.id} disabled={ya} onClick={() => elegir(d.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${ya ? "text-gray-300 cursor-default" : "text-gray-800 hover:bg-gray-50"}`}>
                      <FileText size={14} className="shrink-0" /> <span className="truncate flex-1">{d.nombre}</span>
                      {ya && <span className="text-[10px] text-gray-400">ya vinculado</span>}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
