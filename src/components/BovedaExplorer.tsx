"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Folder, FileText, FileImage, File as FileIcon, Upload, FolderPlus, Search,
  LayoutGrid, List, Download, Trash2, Pencil, Home, X, Loader2, ChevronRight,
  FolderInput, SlidersHorizontal, Eye, RotateCcw,
} from "lucide-react";
import { ClientesSidebar } from "@/components/ClientesSidebar";
import {
  listarCarpetas, listarDocumentos, subirDocumento, descargarDocumento,
  borrarDocumento, crearCarpeta, renombrarCarpeta, borrarCarpeta,
  renombrarDocumento, buscar, moverDocumento, moverCarpeta,
  listarTodasCarpetas, editarMetaDocumento, listarWorkflowsParaVincular,
  listarPapelera, restaurarDocumento, restaurarCarpeta,
  eliminarDefinitivoDocumento, eliminarDefinitivoCarpeta, vaciarPapelera,
} from "@/lib/actions/boveda";

type DragItem = { tipo: "doc" | "carpeta"; id: string };

type Carpeta = { id: string; nombre: string; parentId: string | null };
type Documento = {
  id: string; nombre: string; mime: string; tamanoBytes: number; estado: string;
  carpetaId: string | null; fechaDocumento?: string | Date | null; descripcion?: string | null;
  fechaVencimiento?: string | Date | null; workflowId?: string | null;
  workflow?: { nombre: string } | null;
};
type WfLink = { id: string; nombre: string };
type PapeleraData = {
  carpetas: { id: string; nombre: string; parentId: string | null }[];
  documentos: { id: string; nombre: string; mime: string; carpetaId: string | null }[];
};

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
  const [preview, setPreview] = useState<{ nombre: string; url: string; mime: string; texto?: string } | null>(null);
  const [moverDoc, setMoverDoc] = useState<Documento | null>(null);
  const [editarDoc, setEditarDoc] = useState<Documento | null>(null);
  const [detalleDoc, setDetalleDoc] = useState<Documento | null>(null);
  const [todasCarpetas, setTodasCarpetas] = useState<Carpeta[]>([]);
  const [workflowsLink, setWorkflowsLink] = useState<WfLink[]>([]);
  // Modales propios (Next 16/Turbopack bloquea window.prompt() y confirm() en el navegador).
  const [promptState, setPromptState] = useState<
    { titulo: string; etiqueta: string; valor: string; confirmar: string; onOk: (v: string) => void | Promise<void> } | null
  >(null);
  const [confirmState, setConfirmState] = useState<
    { mensaje: string; onOk: () => void | Promise<void> } | null
  >(null);
  const [papelera, setPapelera] = useState<PapeleraData | null>(null); // null = cerrada
  const [papeleraCargando, setPapeleraCargando] = useState(false);
  const [docsVersion, setDocsVersion] = useState(0); // se incrementa al recargar docs → refresca contadores de la sidebar
  const inputRef = useRef<HTMLInputElement>(null);

  const carpetaActual = ruta[ruta.length - 1].id;

  const cargar = useCallback(async (cid: string, carpetaId: string | null) => {
    setCargando(true);
    setError(null);
    try {
      const [cs, ds] = await Promise.all([listarCarpetas(cid, carpetaId), listarDocumentos(cid, carpetaId)]);
      setCarpetas(cs as Carpeta[]);
      setDocumentos(ds as Documento[]);
      setDocsVersion((v) => v + 1); // avisa a la sidebar para refrescar contadores
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
      } else if (d.mime === "text/plain") {
        const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
        const texto = new TextDecoder().decode(bytes);
        setPreview({ nombre: res.nombre, url, mime: res.mime, texto });
      } else {
        descargarBlob(url, res.nombre);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al abrir");
    }
  }

  // Abre el modal de mover (carga todas las carpetas del cliente como destinos).
  async function abrirMover(d: Documento) {
    if (!clientId) return;
    try {
      const cs = await listarTodasCarpetas(clientId);
      setTodasCarpetas(cs as Carpeta[]);
      setMoverDoc(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }
  async function confirmarMover(destinoCarpetaId: string | null) {
    if (!moverDoc || !clientId) return;
    try {
      await moverDocumento(moverDoc.id, destinoCarpetaId);
      setMoverDoc(null);
      await cargar(clientId, carpetaActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo mover");
    }
  }
  // Construye la ruta legible de una carpeta (para el selector de destino).
  function rutaCarpeta(c: Carpeta): string {
    const partes: string[] = [c.nombre];
    let p = c.parentId;
    const byId = new Map(todasCarpetas.map((x) => [x.id, x]));
    while (p) {
      const padre = byId.get(p);
      if (!padre) break;
      partes.unshift(padre.nombre);
      p = padre.parentId;
    }
    return partes.join(" / ");
  }

  async function abrirMeta(d: Documento) {
    setEditarDoc(d);
    if (workflowsLink.length === 0) {
      try { setWorkflowsLink((await listarWorkflowsParaVincular()) as WfLink[]); } catch { /* opcional */ }
    }
  }
  async function guardarMeta(campos: { estado: string; fechaDocumento: string; fechaVencimiento: string; descripcion: string; workflowId: string }) {
    if (!editarDoc || !clientId) return;
    try {
      await editarMetaDocumento(editarDoc.id, {
        estado: campos.estado,
        fechaDocumento: campos.fechaDocumento || null,
        fechaVencimiento: campos.fechaVencimiento || null,
        descripcion: campos.descripcion || null,
        workflowId: campos.workflowId || null,
      });
      setEditarDoc(null);
      await cargar(clientId, carpetaActual);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  // Badge de vencimiento: vencido / vence pronto / ok.
  function venceInfo(fecha: string | Date | null | undefined): { label: string; cls: string } | null {
    if (!fecha) return null;
    const d = new Date(fecha);
    const dias = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (dias < 0) return { label: `Vencido (${-dias}d)`, cls: "bg-red-100 text-red-700 border-red-200" };
    if (dias <= 7) return { label: `Vence en ${dias}d`, cls: "bg-red-50 text-red-700 border-red-200" };
    if (dias <= 30) return { label: `Vence en ${dias}d`, cls: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: `Vence ${d.toLocaleDateString("es-ES")}`, cls: "bg-gray-50 text-gray-500 border-gray-200" };
  }
  async function descargar(d: Documento) {
    const res = await descargarDocumento(d.id);
    descargarBlob(`data:${res.mime};base64,${res.base64}`, res.nombre);
  }

  function nuevaCarpeta() {
    if (!clientId) return;
    setPromptState({
      titulo: "Nueva carpeta", etiqueta: "Nombre de la carpeta", valor: "", confirmar: "Crear",
      onOk: async (nombre) => { await crearCarpeta(clientId, carpetaActual, nombre); await cargar(clientId, carpetaActual); },
    });
  }
  function eliminarCarpeta(c: Carpeta) {
    setConfirmState({
      mensaje: `¿Mover la carpeta "${c.nombre}" y todo su contenido a la papelera? Podrás restaurarla.`,
      onOk: async () => { if (!clientId) return; await borrarCarpeta(c.id); await cargar(clientId, carpetaActual); },
    });
  }
  function renombrar(c: Carpeta) {
    setPromptState({
      titulo: "Renombrar carpeta", etiqueta: "Nuevo nombre", valor: c.nombre, confirmar: "Guardar",
      onOk: async (n) => { if (!clientId) return; await renombrarCarpeta(c.id, n); await cargar(clientId, carpetaActual); },
    });
  }
  function eliminarDoc(d: Documento) {
    setConfirmState({
      mensaje: `¿Mover "${d.nombre}" a la papelera? Podrás restaurarlo.`,
      onOk: async () => { if (!clientId) return; await borrarDocumento(d.id); await cargar(clientId, carpetaActual); },
    });
  }
  function renombrarDoc(d: Documento) {
    setPromptState({
      titulo: "Renombrar documento", etiqueta: "Nuevo nombre", valor: d.nombre, confirmar: "Guardar",
      onOk: async (n) => { if (!clientId) return; await renombrarDocumento(d.id, n); await cargar(clientId, carpetaActual); },
    });
  }
  // ── Papelera ──
  async function abrirPapelera() {
    if (!clientId) return;
    setPapeleraCargando(true);
    try {
      setPapelera((await listarPapelera(clientId)) as PapeleraData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al abrir la papelera");
    } finally {
      setPapeleraCargando(false);
    }
  }
  async function recargarPapelera() {
    if (!clientId) return;
    setPapelera((await listarPapelera(clientId)) as PapeleraData);
    await cargar(clientId, carpetaActual);
  }
  async function restaurarDoc(docId: string) {
    await restaurarDocumento(docId);
    await recargarPapelera();
  }
  async function restaurarCarp(carpId: string) {
    await restaurarCarpeta(carpId);
    await recargarPapelera();
  }
  function eliminarDefDoc(d: { id: string; nombre: string }) {
    setConfirmState({
      mensaje: `¿Borrar definitivamente "${d.nombre}"? Esto NO se puede deshacer.`,
      onOk: async () => { await eliminarDefinitivoDocumento(d.id); await recargarPapelera(); },
    });
  }
  function eliminarDefCarp(c: { id: string; nombre: string }) {
    setConfirmState({
      mensaje: `¿Borrar definitivamente la carpeta "${c.nombre}" y todo su contenido? Esto NO se puede deshacer.`,
      onOk: async () => { await eliminarDefinitivoCarpeta(c.id); await recargarPapelera(); },
    });
  }
  function vaciar() {
    if (!clientId) return;
    setConfirmState({
      mensaje: "¿Vaciar la papelera? Se borrará TODO su contenido de forma permanente.",
      onOk: async () => { await vaciarPapelera(clientId); await recargarPapelera(); },
    });
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
    <div className="flex gap-4 items-start">
      {/* Sidebar de clientes (estilo Drive) */}
      <ClientesSidebar selectedId={clientId} onSelect={seleccionarCliente} refreshKey={docsVersion} />

      {/* Panel principal: explorador */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <Link href="/" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Home size={15} /> Inicio
          </Link>
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
              <button onClick={abrirPapelera} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50" title="Papelera">
                <Trash2 size={15} /> Papelera
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
            Selecciona un cliente en la barra lateral (o crea uno nuevo) para ver su bóveda documental.
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
                  <button onClick={() => setDetalleDoc(d)} onDoubleClick={() => abrirPreview(d)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    {iconoDe(d.mime, vista === "cuadricula" ? 32 : 18)}
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm text-gray-800 truncate">{d.nombre}</span>
                      <span className="text-[10px] text-gray-400 truncate">
                        {humanBytes(d.tamanoBytes)}
                        {d.estado === "borrador" ? " · borrador" : ""}
                        {d.workflow?.nombre ? ` · 🔗 ${d.workflow.nombre}` : ""}
                      </span>
                      {venceInfo(d.fechaVencimiento) && (
                        <span className={`mt-0.5 self-start text-[10px] font-bold px-1.5 py-0.5 rounded border ${venceInfo(d.fechaVencimiento)!.cls}`}>
                          {venceInfo(d.fechaVencimiento)!.label}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => descargar(d)} className="p-1 text-gray-400 hover:text-[var(--color-brand-primary)]" title="Descargar"><Download size={13} /></button>
                    <button onClick={() => abrirMover(d)} className="p-1 text-gray-400 hover:text-gray-700" title="Mover a…"><FolderInput size={13} /></button>
                    <button onClick={() => abrirMeta(d)} className="p-1 text-gray-400 hover:text-gray-700" title="Metadatos"><SlidersHorizontal size={13} /></button>
                    <button onClick={() => renombrarDoc(d)} className="p-1 text-gray-400 hover:text-gray-700" title="Renombrar"><Pencil size={13} /></button>
                    <button onClick={() => eliminarDoc(d)} className="p-1 text-gray-400 hover:text-red-600" title="Borrar"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      </div>
      {/* fin panel principal */}

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
              ) : preview.mime === "text/plain" ? (
                <pre className="w-full h-[80vh] overflow-auto p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono">{preview.texto}</pre>
              ) : (
                <iframe src={preview.url} title={preview.nombre} className="w-full h-[80vh]" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal mover */}
      {moverDoc && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setMoverDoc(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800 truncate">Mover “{moverDoc.nombre}” a…</span>
              <button onClick={() => setMoverDoc(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto p-2 flex flex-col gap-1">
              <button onClick={() => confirmarMover(null)} className="text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Home size={15} className="text-gray-400" /> Raíz (sin carpeta)
              </button>
              {todasCarpetas.map((c) => (
                <button key={c.id} onClick={() => confirmarMover(c.id)} className="text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Folder size={15} className="text-amber-500" /> {rutaCarpeta(c)}
                </button>
              ))}
              {todasCarpetas.length === 0 && <p className="text-sm text-gray-400 p-3">No hay carpetas. Crea una primero.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal metadatos */}
      {editarDoc && (
        <form
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setEditarDoc(null)}
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            guardarMeta({
              estado: (f.elements.namedItem("estado") as HTMLSelectElement).value,
              fechaDocumento: (f.elements.namedItem("fecha") as HTMLInputElement).value,
              fechaVencimiento: (f.elements.namedItem("venc") as HTMLInputElement).value,
              descripcion: (f.elements.namedItem("desc") as HTMLTextAreaElement).value,
              workflowId: (f.elements.namedItem("workflow") as HTMLSelectElement).value,
            });
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800 truncate">Metadatos · {editarDoc.nombre}</span>
              <button type="button" onClick={() => setEditarDoc(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Estado</span>
                <select name="estado" defaultValue={editarDoc.estado} className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200">
                  <option value="borrador">Borrador</option>
                  <option value="definitivo">Definitivo</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fecha del documento</span>
                <input
                  name="fecha"
                  type="date"
                  defaultValue={editarDoc.fechaDocumento ? new Date(editarDoc.fechaDocumento).toISOString().slice(0, 10) : ""}
                  className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fecha de vencimiento</span>
                <input
                  name="venc"
                  type="date"
                  defaultValue={editarDoc.fechaVencimiento ? new Date(editarDoc.fechaVencimiento).toISOString().slice(0, 10) : ""}
                  className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
                <span className="text-[10px] text-gray-400">ITV, seguro, licencia, apoderamiento REGAP…</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vincular a trámite (Guía)</span>
                <select name="workflow" defaultValue={editarDoc.workflowId ?? ""} className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200">
                  <option value="">— Sin vincular —</option>
                  {workflowsLink.map((w) => (
                    <option key={w.id} value={w.id}>{w.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción</span>
                <textarea name="desc" defaultValue={editarDoc.descripcion ?? ""} rows={3} className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 resize-y" />
              </label>
            </div>
            <div className="flex items-center gap-2 px-4 pb-4">
              <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90">Guardar</button>
              <button type="button" onClick={() => setEditarDoc(null)} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </form>
      )}

      {/* Panel de detalle (deslizante derecha, estilo Drive) */}
      {detalleDoc && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setDetalleDoc(null)} />
          <div className="fixed right-0 top-0 h-full w-[360px] max-w-[90vw] bg-white shadow-2xl z-40 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-900">Detalles</span>
              <button onClick={() => setDetalleDoc(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                {iconoDe(detalleDoc.mime, 48)}
                <span className="text-sm font-semibold text-gray-900 break-words">{detalleDoc.nombre}</span>
                {venceInfo(detalleDoc.fechaVencimiento) && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${venceInfo(detalleDoc.fechaVencimiento)!.cls}`}>
                    {venceInfo(detalleDoc.fechaVencimiento)!.label}
                  </span>
                )}
              </div>

              <dl className="flex flex-col gap-2 text-sm">
                {([
                  ["Tipo", detalleDoc.mime],
                  ["Tamaño", humanBytes(detalleDoc.tamanoBytes)],
                  ["Estado", detalleDoc.estado],
                  ["Fecha documento", detalleDoc.fechaDocumento ? new Date(detalleDoc.fechaDocumento).toLocaleDateString("es-ES") : "—"],
                  ["Vencimiento", detalleDoc.fechaVencimiento ? new Date(detalleDoc.fechaVencimiento).toLocaleDateString("es-ES") : "—"],
                  ["Trámite", detalleDoc.workflow?.nombre ?? "—"],
                  ["Descripción", detalleDoc.descripcion || "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{k}</dt>
                    <dd className="text-gray-800 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="p-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button onClick={() => abrirPreview(detalleDoc)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90"><Eye size={15} /> Previsualizar</button>
              <button onClick={() => descargar(detalleDoc)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"><Download size={15} /> Descargar</button>
              <button onClick={() => { const d = detalleDoc; setDetalleDoc(null); abrirMover(d); }} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"><FolderInput size={15} /> Mover</button>
              <button onClick={() => { const d = detalleDoc; setDetalleDoc(null); abrirMeta(d); }} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"><SlidersHorizontal size={15} /> Metadatos</button>
              <button onClick={() => renombrarDoc(detalleDoc)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"><Pencil size={15} /> Renombrar</button>
              <button onClick={() => { const d = detalleDoc; setDetalleDoc(null); eliminarDoc(d); }} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm font-medium text-red-600 hover:bg-red-100"><Trash2 size={15} /> Borrar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal Papelera */}
      {papelera && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={() => setPapelera(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-900"><Trash2 size={16} className="text-gray-400" /> Papelera</span>
              <div className="flex items-center gap-2">
                {(papelera.carpetas.length > 0 || papelera.documentos.length > 0) && (
                  <button onClick={vaciar} className="text-xs font-semibold text-red-600 hover:underline">Vaciar papelera</button>
                )}
                <button onClick={() => setPapelera(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 flex flex-col gap-1">
              {papeleraCargando && <div className="flex items-center gap-2 text-sm text-gray-400 p-3"><Loader2 size={14} className="animate-spin" /> Cargando…</div>}
              {!papeleraCargando && papelera.carpetas.length === 0 && papelera.documentos.length === 0 && (
                <p className="text-sm text-gray-400 p-6 text-center">La papelera está vacía.</p>
              )}
              {papelera.carpetas.map((c) => (
                <div key={c.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
                  <Folder size={18} className="text-amber-500 shrink-0" />
                  <span className="text-sm text-gray-800 truncate flex-1">{c.nombre} <span className="text-[10px] text-gray-400">(carpeta + contenido)</span></span>
                  <button onClick={() => restaurarCarp(c.id)} className="p-1 text-gray-400 hover:text-green-600" title="Restaurar"><RotateCcw size={15} /></button>
                  <button onClick={() => eliminarDefCarp(c)} className="p-1 text-gray-400 hover:text-red-600" title="Borrar definitivamente"><Trash2 size={15} /></button>
                </div>
              ))}
              {papelera.documentos.map((d) => (
                <div key={d.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
                  {iconoDe(d.mime, 18)}
                  <span className="text-sm text-gray-800 truncate flex-1">{d.nombre}</span>
                  <button onClick={() => restaurarDoc(d.id)} className="p-1 text-gray-400 hover:text-green-600" title="Restaurar"><RotateCcw size={15} /></button>
                  <button onClick={() => eliminarDefDoc(d)} className="p-1 text-gray-400 hover:text-red-600" title="Borrar definitivamente"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de entrada de texto (sustituye a window.prompt) */}
      {promptState && (
        <form
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPromptState(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            const valor = (e.currentTarget.elements.namedItem("valor") as HTMLInputElement).value.trim();
            if (!valor) return;
            const cb = promptState.onOk;
            setPromptState(null);
            try { await cb(valor); } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
          }}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">{promptState.titulo}</span>
              <button type="button" onClick={() => setPromptState(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-4 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{promptState.etiqueta}</span>
              <input
                name="valor"
                autoFocus
                defaultValue={promptState.valor}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-[var(--color-brand-primary)] outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-4 pb-4">
              <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90">{promptState.confirmar}</button>
              <button type="button" onClick={() => setPromptState(null)} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </form>
      )}

      {/* Modal de confirmación (sustituye a window.confirm) */}
      {confirmState && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmState(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-4 text-sm text-gray-700">{confirmState.mensaje}</div>
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                onClick={async () => {
                  const cb = confirmState.onOk;
                  setConfirmState(null);
                  try { await cb(); } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:opacity-90"
              >
                Eliminar
              </button>
              <button onClick={() => setConfirmState(null)} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
