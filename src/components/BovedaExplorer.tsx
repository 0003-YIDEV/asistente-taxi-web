"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Folder, FileText, FileImage, File as FileIcon, Upload, FolderPlus, Search,
  LayoutGrid, List, Download, Trash2, Pencil, Home, X, Loader2, ChevronRight,
} from "lucide-react";
import { ClientSelector } from "@/components/ClientSelector";
import {
  listarCarpetas, listarDocumentos, subirDocumento, descargarDocumento,
  borrarDocumento, crearCarpeta, renombrarCarpeta, borrarCarpeta,
  renombrarDocumento, buscar, moverDocumento, moverCarpeta,
} from "@/lib/actions/boveda";

type DragItem = { tipo: "doc" | "carpeta"; id: string };

type Carpeta = { id: string; nombre: string; parentId: string | null };
type Documento = { id: string; nombre: string; mime: string; tamanoBytes: number; estado: string; carpetaId: string | null };

function iconoDe(mime: string, size = 18) {
  if (mime === "application/pdf") return <FileText size={size} className="text-red-500" />;
  if (mime.startsWith("image/")) return <FileImage size={size} className="text-blue-500" />;
  return <FileIcon size={size} className="text-gray-400" />;
}
function humanBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function BovedaExplorer() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [ruta, setRuta] = useState<{ id: string | null; nombre: string }[]>([{ id: null, nombre: "Inicio" }]);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [vista, setVista] = useState<"lista" | "cuadricula">("lista");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<{ nombre: string; url: string; mime: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carpetaActual = ruta[ruta.length - 1].id;

  const cargar = useCallback(async (cid: string, carpetaId: string | null) => {
    setCargando(true);
    setError(null);
    try {
      const [cs, ds] = await Promise.all([listarCarpetas(cid, carpetaId), listarDocumentos(cid, carpetaId)]);
      setCarpetas(cs as Carpeta[]);
      setDocumentos(ds as Documento[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (clientId) cargar(clientId, carpetaActual);
  }, [clientId, carpetaActual, cargar]);

  function seleccionarCliente(id: string | null) {
    setClientId(id);
    setRuta([{ id: null, nombre: "Inicio" }]);
    setCarpetas([]);
    setDocumentos([]);
    setQ("");
  }

  function entrarCarpeta(c: Carpeta) {
    setRuta((r) => [...r, { id: c.id, nombre: c.nombre }]);
  }
  function irABreadcrumb(idx: number) {
    setRuta((r) => r.slice(0, idx + 1));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !clientId) return;
    setSubiendo(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await subirDocumento(clientId, carpetaActual, fd);
        if (!res.ok && res.duplicado) setError(`"${file.name}" ya existe como "${res.nombreExistente}" (duplicado, omitido)`);
      }
      await cargar(clientId, carpetaActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setSubiendo(false);
    }
  }

  function descargarBlob(url: string, nombre: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
  }

  async function abrirPreview(d: Documento) {
    try {
      const res = await descargarDocumento(d.id);
      const url = `data:${res.mime};base64,${res.base64}`;
      if (d.mime === "application/pdf" || d.mime.startsWith("image/")) {
        setPreview({ nombre: res.nombre, url, mime: res.mime });
      } else {
        descargarBlob(url, res.nombre);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al abrir");
    }
  }
  async function descargar(d: Documento) {
    const res = await descargarDocumento(d.id);
    descargarBlob(`data:${res.mime};base64,${res.base64}`, res.nombre);
  }

  async function nuevaCarpeta() {
    if (!clientId) return;
    const nombre = window.prompt("Nombre de la carpeta:");
    if (!nombre?.trim()) return;
    try {
      await crearCarpeta(clientId, carpetaActual, nombre.trim());
      await cargar(clientId, carpetaActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  async function eliminarCarpeta(c: Carpeta) {
    if (!clientId) return;
    if (!confirm(`¿Borrar la carpeta "${c.nombre}"? (debe estar vacía)`)) return;
    try {
      await borrarCarpeta(c.id);
      await cargar(clientId, carpetaActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  async function renombrar(c: Carpeta) {
    if (!clientId) return;
    const n = window.prompt("Nuevo nombre:", c.nombre);
    if (!n?.trim()) return;
    await renombrarCarpeta(c.id, n.trim());
    await cargar(clientId, carpetaActual);
  }
  async function eliminarDoc(d: Documento) {
    if (!clientId) return;
    if (!confirm(`¿Borrar "${d.nombre}"? Esta acción es permanente.`)) return;
    await borrarDocumento(d.id);
    await cargar(clientId, carpetaActual);
  }
  async function renombrarDoc(d: Documento) {
    if (!clientId) return;
    const n = window.prompt("Nuevo nombre:", d.nombre);
    if (!n?.trim()) return;
    await renombrarDocumento(d.id, n.trim());
    await cargar(clientId, carpetaActual);
  }
  async function ejecutarBusqueda() {
    if (!clientId) return;
    if (!q.trim()) {
      cargar(clientId, carpetaActual);
      return;
    }
    setCargando(true);
    try {
      const ds = await buscar(clientId, { texto: q.trim() });
      setDocumentos(ds as Documento[]);
      setCarpetas([]);
    } finally {
      setCargando(false);
    }
  }

  // ── Mover (drag & drop entre carpetas) ──
  async function moverItem(item: DragItem, destinoCarpetaId: string | null) {
    if (!clientId) return;
    setError(null);
    try {
      if (item.tipo === "doc") await moverDocumento(item.id, destinoCarpetaId);
      else {
        if (item.id === destinoCarpetaId) return; // soltar sobre sí misma
        await moverCarpeta(item.id, destinoCarpetaId);
      }
      await cargar(clientId, carpetaActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo mover");
    }
  }
  function onDragStartItem(e: React.DragEvent, item: DragItem) {
    e.dataTransfer.setData("app/item", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  }
  function leerItem(e: React.DragEvent): DragItem | null {
    const raw = e.dataTransfer.getData("app/item");
    if (!raw) return null;
    try { return JSON.parse(raw) as DragItem; } catch { return null; }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Home size={15} /> Inicio
          </Link>
          <ClientSelector selectedId={clientId} onSelect={seleccionarCliente} />
        </div>
        {clientId && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
              <Search size={14} className="text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ejecutarBusqueda()}
                placeholder="Buscar…"
                className="text-sm outline-none w-32"
              />
            </div>
            <button onClick={() => setVista(vista === "lista" ? "cuadricula" : "lista")} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" title="Cambiar vista">
              {vista === "lista" ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
            <button onClick={nuevaCarpeta} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FolderPlus size={15} /> Carpeta
            </button>
            <button onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90">
              <Upload size={15} /> Subir
            </button>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>
        )}
      </div>

      {!clientId && (
        <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-8 text-center">
          Selecciona un cliente para ver su bóveda documental.
        </p>
      )}

      {clientId && (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {ruta.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
                <button
                  onClick={() => irABreadcrumb(i)}
                  onDragOver={(e) => { if (leerItem(e) || e.dataTransfer.types.includes("app/item")) e.preventDefault(); }}
                  onDrop={(e) => { const it = leerItem(e); if (it) { e.preventDefault(); e.stopPropagation(); moverItem(it, seg.id); } }}
                  className={`px-1.5 py-0.5 rounded hover:bg-gray-100 ${i === ruta.length - 1 ? "font-semibold text-gray-900" : "text-gray-500"}`}
                >
                  {seg.nombre}
                </button>
              </span>
            ))}
          </div>

          {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠ {error}</p>}

          {/* Zona drag & drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const it = leerItem(e);
              if (it) { moverItem(it, carpetaActual); return; } // mover a la carpeta actual
              handleFiles(e.dataTransfer.files); // subir ficheros externos
            }}
            className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${dragOver ? "border-[var(--color-brand-primary)] bg-blue-50/40" : "border-gray-200 bg-white"}`}
          >
            {(cargando || subiendo) && (
              <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                <Loader2 size={16} className="animate-spin" /> {subiendo ? "Subiendo…" : "Cargando…"}
              </div>
            )}

            {!cargando && !subiendo && carpetas.length === 0 && documentos.length === 0 && (
              <p className="text-sm text-gray-400 text-center p-8">Carpeta vacía. Arrastra ficheros aquí o usa “Subir”.</p>
            )}

            <div className={vista === "cuadricula" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" : "flex flex-col gap-1"}>
              {carpetas.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); onDragStartItem(e, { tipo: "carpeta", id: c.id }); }}
                  onDragOver={(e) => { if (e.dataTransfer.types.includes("app/item")) { e.preventDefault(); e.stopPropagation(); } }}
                  onDrop={(e) => { const it = leerItem(e); if (it) { e.preventDefault(); e.stopPropagation(); moverItem(it, c.id); } }}
                  className={`group flex items-center gap-2 rounded-lg hover:bg-gray-50 ${vista === "cuadricula" ? "flex-col p-4 border border-gray-100" : "px-3 py-2"}`}
                >
                  <button onClick={() => entrarCarpeta(c)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <Folder size={vista === "cuadricula" ? 32 : 18} className="text-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">{c.nombre}</span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => renombrar(c)} className="p-1 text-gray-400 hover:text-gray-700" title="Renombrar"><Pencil size={13} /></button>
                    <button onClick={() => eliminarCarpeta(c)} className="p-1 text-gray-400 hover:text-red-600" title="Borrar"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {documentos.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); onDragStartItem(e, { tipo: "doc", id: d.id }); }}
                  className={`group flex items-center gap-2 rounded-lg hover:bg-gray-50 ${vista === "cuadricula" ? "flex-col p-4 border border-gray-100" : "px-3 py-2"}`}
                >
                  <button onClick={() => abrirPreview(d)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    {iconoDe(d.mime, vista === "cuadricula" ? 32 : 18)}
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm text-gray-800 truncate">{d.nombre}</span>
                      <span className="text-[10px] text-gray-400">{humanBytes(d.tamanoBytes)}{d.estado === "borrador" ? " · borrador" : ""}</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => descargar(d)} className="p-1 text-gray-400 hover:text-[var(--color-brand-primary)]" title="Descargar"><Download size={13} /></button>
                    <button onClick={() => renombrarDoc(d)} className="p-1 text-gray-400 hover:text-gray-700" title="Renombrar"><Pencil size={13} /></button>
                    <button onClick={() => eliminarDoc(d)} className="p-1 text-gray-400 hover:text-red-600" title="Borrar"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal preview */}
      {preview && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800 truncate">{preview.nombre}</span>
              <button onClick={() => setPreview(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
              {preview.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.nombre} className="max-w-full max-h-[80vh] object-contain" />
              ) : (
                <iframe src={preview.url} title={preview.nombre} className="w-full h-[80vh]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
