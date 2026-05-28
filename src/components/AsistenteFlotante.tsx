"use client";

import { useRef, useState } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { asistenteGlobal } from "@/lib/actions/asistente";
import { useContextoTramite } from "@/lib/asistente-contexto";

type Msg = { rol: "user" | "assistant"; texto: string };

export function AsistenteFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contexto = useContextoTramite();

  async function enviar() {
    const q = input.trim();
    if (!q || enviando) return;
    const historial = mensajes;
    setMensajes([...mensajes, { rol: "user", texto: q }]);
    setInput(""); setEnviando(true); setError(null);
    try {
      const res = await asistenteGlobal(q, historial, contexto?.expedienteId);
      if (res.ok) setMensajes((m) => [...m, { rol: "assistant", texto: res.respuesta }]);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    }
  }

  return (
    <>
      {/* Burbuja (abajo-izquierda para no chocar con la nav de la derecha) */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-5 left-5 z-30 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-[var(--color-brand-primary)] text-white shadow-lg hover:opacity-90 transition"
          title="Asistente"
        >
          <Sparkles size={18} /> <span className="text-sm font-semibold hidden sm:inline">Asistente</span>
        </button>
      )}

      {/* Panel */}
      {abierto && (
        <div className="fixed bottom-5 left-5 z-40 w-[min(92vw,380px)] h-[min(70vh,560px)] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[var(--color-brand-primary)] text-white">
            <span className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} /> Asistente</span>
            <button onClick={() => setAbierto(false)} className="p-1 hover:opacity-80"><X size={18} /></button>
          </div>

          {contexto && (
            <div className="px-4 py-1.5 bg-blue-50 text-[11px] text-blue-700 border-b border-blue-100 truncate">
              📋 Estás en el trámite: <strong>{contexto.nombre}</strong>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {mensajes.length === 0 && !enviando && (
              <div className="m-auto text-center max-w-xs">
                <Sparkles size={26} className="mx-auto text-gray-200" />
                <p className="text-sm text-gray-400 mt-2">Pregúntame sobre cualquier trámite o cómo moverte por la app.</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {["¿Cómo doy de alta a un taxista?", "¿Dónde subo un documento?", "¿Qué trámites hay?"].map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="text-[11px] text-gray-600 border border-gray-200 rounded-full px-2.5 py-1 hover:bg-gray-50">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`max-w-[88%] text-sm rounded-2xl px-3.5 py-2 whitespace-pre-wrap ${m.rol === "user" ? "self-end bg-[var(--color-brand-primary)] text-white" : "self-start bg-gray-100 text-gray-800"}`}>{m.texto}</div>
            ))}
            {enviando && <div className="self-start flex items-center gap-2 text-sm text-gray-400 bg-gray-100 rounded-2xl px-3.5 py-2"><Loader2 size={14} className="animate-spin" /> Pensando…</div>}
            {error && <div className="self-start text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠ {error}</div>}
          </div>

          <div className="p-3 border-t border-gray-100 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Escribe tu duda…"
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-[var(--color-brand-primary)] outline-none"
            />
            <button onClick={enviar} disabled={enviando || !input.trim()} className="p-2 rounded-lg bg-[var(--color-brand-primary)] text-white hover:opacity-90 disabled:opacity-40"><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
