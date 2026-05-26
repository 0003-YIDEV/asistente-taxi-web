"use client";

import { useState } from "react";
import { MODELO_036_MAPPING, type PdfFieldMapping } from "@/lib/pdf/model036Mapping";
import { type ClienteDummy } from "@/lib/serviciosData";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";
import { generatePdfAction } from "@/lib/actions/pdf";

interface PdfFormProps {
  pdfId: string;
  cliente: ClienteDummy;
}

export function PdfForm({ pdfId, cliente }: PdfFormProps) {
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);

  // Filtrar campos que requieren entrada manual
  const camposManuales = MODELO_036_MAPPING.filter(m => m.source === 'manual');

  function handleInputChange(name: string, value: string) {
    setManualInputs(prev => ({ ...prev, [name]: value }));
  }

  async function handleDownload() {
    setGenerando(true);
    try {
      const base64 = await generatePdfAction(cliente.id, pdfId, manualInputs);
      
      // Crear link para descargar
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = `${pdfId}_${cliente.nombre.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Revisa la consola para más detalles.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800">
        <AlertCircle size={20} className="shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Datos adicionales requeridos</p>
          <p className="opacity-90">El Modelo 036 requiere información que no está en la ficha base del cliente. Por favor, completa los siguientes campos:</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {camposManuales.map((campo) => (
          <div key={campo.pdfFieldName} className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">
              {campo.label} {campo.required && <span className="text-red-500">*</span>}
            </label>
            {campo.type === 'checkbox' ? (
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={manualInputs[campo.pdfFieldName] === 'true' || campo.defaultValue === 'true'}
                  onChange={(e) => handleInputChange(campo.pdfFieldName, e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                />
                <span className="text-sm text-gray-700">Activar</span>
              </div>
            ) : (
              <input
                type={campo.type === 'date' ? 'date' : 'text'}
                placeholder={campo.defaultValue || ""}
                value={manualInputs[campo.pdfFieldName] ?? ""}
                onChange={(e) => handleInputChange(campo.pdfFieldName, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
              />
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-400">
          <FileText size={16} />
          <span className="text-xs font-medium">Template: {pdfId}.pdf</span>
        </div>
        <button
          onClick={handleDownload}
          disabled={generando}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {generando ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {generando ? "Generando..." : "Generar y Descargar PDF"}
        </button>
      </div>
    </div>
  );
}
