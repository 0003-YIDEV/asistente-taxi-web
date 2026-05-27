"use client";

import { useEffect, useState } from "react";
import { Users, Search, Plus, Pencil, X, Loader2, Check } from "lucide-react";
import { getClients, createClient, updateClient } from "@/lib/actions/client";

type Cliente = {
  id: string; nombre: string; nif: string; domicilio: string; iban: string;
  email: string; telefono: string; numLicencia: string; matricula: string; regimen: string;
};
const VACIO = { nombre: "", nif: "", email: "", telefono: "", domicilio: "", iban: "", numLicencia: "", matricula: "", regimen: "Módulos" };

export function ClientesSidebar({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<typeof VACIO | null>(null); // null = cerrado
  const [editId, setEditId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    setCargando(true);
    try {
      setClientes((await getClients()) as Cliente[]);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    recargar();
  }, []);

  const filtrados = clientes.filter((c) =>
    [c.nombre, c.nif, c.email].some((x) => x?.toLowerCase().includes(q.toLowerCase())),
  );
  const sel = clientes.find((c) => c.id === selectedId) || null;

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...VACIO });
    setError(null);
  }
  function abrirEditar(c: Cliente) {
    setEditId(c.id);
    setForm({
      nombre: c.nombre, nif: c.nif, email: c.email, telefono: c.telefono,
      domicilio: c.domicilio, iban: c.iban, numLicencia: c.numLicencia, matricula: c.matricula, regimen: c.regimen,
    });
    setError(null);
  }

  async function guardar() {
    if (!form) return;
    if (!form.nombre.trim() || !form.nif.trim()) {
      setError("Nombre y NIF son obligatorios");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (editId) {
        await updateClient(editId, form);
      } else {
        const nuevo = await createClient(form);
        onSelect(nuevo.id);
      }
      setForm(null);
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const inputCls = "w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-[var(--color-brand-primary)] outline-none";

  return (
    <aside className="w-72 shrink-0 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col max-h-[calc(100vh-9rem)]">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-900"><Users size={16} className="text-gray-400" /> Clientes</span>
        <button onClick={abrirNuevo} className="flex items-center gap-1 text-xs font-semibold text-white bg-[var(--color-brand-primary)] px-2 py-1 rounded-lg hover:opacity-90">
          <Plus size={13} /> Nuevo
        </button>
      </div>

      <div className="p-2 border-b border-gray-50">
        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" className="bg-transparent text-sm outline-none w-full" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 p-3"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
        ) : filtrados.length === 0 ? (
          <p className="text-xs text-gray-400 p-3 text-center">{q ? "Sin resultados." : "Sin clientes. Crea el primero con “Nuevo”."}</p>
        ) : (
          filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 ${selectedId === c.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-800"}`}
            >
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{c.nombre}</span>
                <span className="text-[10px] text-gray-400">{c.nif} · {c.regimen}</span>
              </span>
              {selectedId === c.id && <Check size={14} className="shrink-0" />}
            </button>
          ))
        )}
      </div>

      {sel && (
        <div className="p-3 border-t border-gray-100 text-xs text-gray-600 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 truncate">{sel.nombre}</span>
            <button onClick={() => abrirEditar(sel)} className="flex items-center gap-1 text-[var(--color-brand-primary)] hover:underline shrink-0"><Pencil size={12} /> Editar</button>
          </div>
          <span className="truncate">📧 {sel.email || "—"}</span>
          <span className="truncate">📞 {sel.telefono || "—"}</span>
          <span className="truncate">🪪 {sel.nif} · IBAN {sel.iban ? sel.iban.slice(0, 8) + "…" : "—"}</span>
          <span className="truncate">🚕 Lic. {sel.numLicencia || "—"} · {sel.matricula || "—"}</span>
        </div>
      )}

      {/* Modal alta/edición */}
      {form && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">{editId ? "Editar cliente" : "Nuevo cliente"}</span>
              <button onClick={() => setForm(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ["nombre", "Nombre completo *"], ["nif", "NIF *"], ["email", "Email"], ["telefono", "Teléfono"],
                ["domicilio", "Domicilio"], ["iban", "IBAN"], ["numLicencia", "Nº licencia"], ["matricula", "Matrícula"],
              ] as [keyof typeof VACIO, string][]).map(([k, label]) => (
                <label key={k} className={`flex flex-col gap-1 ${k === "domicilio" ? "sm:col-span-2" : ""}`}>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                  <input className={inputCls} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </label>
              ))}
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Régimen fiscal</span>
                <select className={inputCls} value={form.regimen} onChange={(e) => setForm({ ...form, regimen: e.target.value })}>
                  <option value="Módulos">Módulos (estimación objetiva)</option>
                  <option value="Estimación directa">Estimación directa</option>
                </select>
              </label>
            </div>
            {error && <p className="px-4 text-sm text-red-600">⚠ {error}</p>}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
              <button onClick={guardar} disabled={guardando} className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {guardando ? "Guardando…" : editId ? "Guardar cambios" : "Crear cliente"}
              </button>
              <button onClick={() => setForm(null)} disabled={guardando} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
