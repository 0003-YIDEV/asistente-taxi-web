"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X } from "lucide-react";
import { updateWorkflow, type UpdateWorkflowInput, type PasoInput } from "@/lib/actions/workflows";
import type { Workflow, NivelAuto } from "@/data/workflows";

const NIVELES: { v: NivelAuto; label: string }[] = [
  { v: "auto", label: "🟢 Auto" },
  { v: "asistido", label: "🟡 Asistido" },
  { v: "humano", label: "🔴 Humano" },
];

const inputCls =
  "w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] outline-none";

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Editor de una lista de strings (gates, inputs, post, etc.).
function ListaEditable({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const set = (i: number, v: string) => onChange(items.map((it, idx) => (idx === i ? v : it)));
  const del = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">{label}</span>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input className={inputCls} value={it} onChange={(e) => set(i, e.target.value)} />
          <button type="button" onClick={() => del(i)} className="p-1.5 text-gray-400 hover:text-red-600 shrink-0" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="self-start flex items-center gap-1 text-xs font-medium text-[var(--color-brand-primary)] hover:underline mt-0.5"
      >
        <Plus size={13} /> Añadir
      </button>
    </div>
  );
}

export function WorkflowEditor({ w, onDone }: { w: Workflow; onDone: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(w.nombre);
  const [refManual, setRefManual] = useState(w.refManual);
  const [portal, setPortal] = useState(w.meta.portal ?? "");
  const [identificacion, setIdentificacion] = useState(w.meta.identificacion ?? "");
  const [plazo, setPlazo] = useState(w.meta.plazo ?? "");
  const [baseNormativa, setBaseNormativa] = useState(w.meta.baseNormativa ?? "");
  const [resultado, setResultado] = useState(w.meta.resultado ?? "");
  const [gateEntrada, setGateEntrada] = useState<string[]>(w.gateEntrada);
  const [inputs, setInputs] = useState<string[]>(w.inputs);
  const [pasos, setPasos] = useState<PasoInput[]>(
    w.pasos.map((p) => ({ accion: p.accion, validacion: p.validacion ?? "", nivel: p.nivel, gate: p.gate ?? "" })),
  );
  const [post, setPost] = useState<string[]>(w.post);
  const [excepciones, setExcepciones] = useState<string[]>(w.excepciones);
  const [autoPuede, setAutoPuede] = useState<string[]>(w.automatizacion.puede);
  const [autoAsistido, setAutoAsistido] = useState<string[]>(w.automatizacion.asistido ?? []);
  const [autoNoPuede, setAutoNoPuede] = useState<string[]>(w.automatizacion.noPuede);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setPaso = (i: number, patch: Partial<PasoInput>) =>
    setPasos((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const delPaso = (i: number) => setPasos((ps) => ps.filter((_, idx) => idx !== i));
  const addPaso = () => setPasos((ps) => [...ps, { accion: "", validacion: "", nivel: "humano", gate: "" }]);
  const movePaso = (i: number, dir: -1 | 1) =>
    setPasos((ps) => {
      const j = i + dir;
      if (j < 0 || j >= ps.length) return ps;
      const copy = [...ps];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  function guardar() {
    setError(null);
    const data: UpdateWorkflowInput = {
      nombre: nombre.trim(),
      refManual: refManual.trim(),
      metaPortal: portal.trim() || null,
      metaIdentificacion: identificacion.trim() || null,
      metaPlazo: plazo.trim() || null,
      metaBaseNormativa: baseNormativa.trim() || null,
      metaResultado: resultado.trim() || null,
      gateEntrada: gateEntrada.map((s) => s.trim()).filter(Boolean),
      inputs: inputs.map((s) => s.trim()).filter(Boolean),
      post: post.map((s) => s.trim()).filter(Boolean),
      excepciones: excepciones.map((s) => s.trim()).filter(Boolean),
      autoPuede: autoPuede.map((s) => s.trim()).filter(Boolean),
      autoAsistido: autoAsistido.map((s) => s.trim()).filter(Boolean),
      autoNoPuede: autoNoPuede.map((s) => s.trim()).filter(Boolean),
      pasos: pasos
        .filter((p) => p.accion.trim())
        .map((p) => ({
          accion: p.accion.trim(),
          validacion: (p.validacion ?? "").toString().trim() || null,
          nivel: p.nivel,
          gate: (p.gate ?? "").toString().trim() || null,
        })),
    };
    startTransition(async () => {
      try {
        await updateWorkflow(w.id, data);
        router.refresh(); // re-lee los datos del servidor (force-dynamic)
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="px-4 pb-4 pt-3 flex flex-col gap-4 border-t border-gray-50 bg-blue-50/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Nombre" value={nombre} onChange={setNombre} />
        <Campo label="Ref. manual" value={refManual} onChange={setRefManual} />
        <Campo label="Portal / URL" value={portal} onChange={setPortal} />
        <Campo label="Identificación" value={identificacion} onChange={setIdentificacion} />
        <Campo label="Plazo" value={plazo} onChange={setPlazo} />
        <Campo label="Resultado" value={resultado} onChange={setResultado} />
        <div className="sm:col-span-2">
          <Campo label="Base normativa" value={baseNormativa} onChange={setBaseNormativa} />
        </div>
      </div>

      <ListaEditable label="Gate de entrada" items={gateEntrada} onChange={setGateEntrada} />
      <ListaEditable label="Inputs" items={inputs} onChange={setInputs} />

      {/* Pasos */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-[var(--color-brand-secondary)] uppercase tracking-wider">Pasos</span>
        {pasos.map((p, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-2.5 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-gray-400 tabular-nums mt-2 w-4 shrink-0">{i + 1}</span>
              <textarea
                className={`${inputCls} resize-y min-h-[38px]`}
                rows={1}
                value={p.accion}
                placeholder="Acción del paso"
                onChange={(e) => setPaso(i, { accion: e.target.value })}
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" onClick={() => movePaso(i, -1)} className="p-1 text-gray-400 hover:text-gray-700" title="Subir">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => movePaso(i, 1)} className="p-1 text-gray-400 hover:text-gray-700" title="Bajar">
                  <ArrowDown size={13} />
                </button>
              </div>
              <button type="button" onClick={() => delPaso(i)} className="p-1.5 text-gray-400 hover:text-red-600 shrink-0 mt-0.5" title="Eliminar paso">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 pl-6">
              <select
                className={inputCls}
                value={p.nivel}
                onChange={(e) => setPaso(i, { nivel: e.target.value as NivelAuto })}
              >
                {NIVELES.map((n) => (
                  <option key={n.v} value={n.v}>{n.label}</option>
                ))}
              </select>
              <input
                className={inputCls}
                value={p.validacion ?? ""}
                placeholder="Validación (opcional)"
                onChange={(e) => setPaso(i, { validacion: e.target.value })}
              />
              <div className="sm:col-span-2">
                <input
                  className={inputCls}
                  value={p.gate ?? ""}
                  placeholder="Gate / punto de no retorno (opcional)"
                  onChange={(e) => setPaso(i, { gate: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addPaso}
          className="self-start flex items-center gap-1 text-xs font-medium text-[var(--color-brand-primary)] hover:underline"
        >
          <Plus size={13} /> Añadir paso
        </button>
      </div>

      <ListaEditable label="Después (dispara)" items={post} onChange={setPost} />
      <ListaEditable label="Excepciones" items={excepciones} onChange={setExcepciones} />
      <ListaEditable label="🟢 Puede automatizarse" items={autoPuede} onChange={setAutoPuede} />
      <ListaEditable label="🟡 Asistido" items={autoAsistido} onChange={setAutoAsistido} />
      <ListaEditable label="🔴 Humano obligatorio" items={autoNoPuede} onChange={setAutoNoPuede} />

      {error && <p className="text-sm text-red-600 font-medium">⚠ {error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save size={15} /> {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <X size={15} /> Cancelar
        </button>
        <span className="text-[11px] text-gray-400 ml-auto">Outputs (carpetas) se editan en código por ahora.</span>
      </div>
    </div>
  );
}
