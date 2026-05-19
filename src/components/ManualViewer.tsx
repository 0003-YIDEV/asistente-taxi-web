'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { PLANTILLAS, type PlantillaDummy } from '@/lib/serviciosData';
import { TramitarModal } from './TramitarModal';

interface Subsection {
  title: string;
  content: string;
}

interface Section {
  title: string;
  content: string;
  subsections: Subsection[];
}

interface ManualViewerProps {
  data: Section[];
}

export function ManualViewer({ data }: ManualViewerProps) {
  const [activeSection, setActiveSection] = useState<number | null>(0);
  const [activaPlantilla, setActivaPlantilla] = useState<PlantillaDummy | null>(
    null,
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-2">
        {data.map((section, idx) => {
          const plantillasSeccion = PLANTILLAS.filter((p) =>
            section.title.includes(p.seccion),
          );
          return (
            <div
              key={idx}
              className="border-b border-gray-100 last:border-0 pb-2"
            >
              <button
                onClick={() =>
                  setActiveSection(activeSection === idx ? null : idx)
                }
                className="flex items-center justify-between w-full text-left py-2 hover:text-brand-primary transition-colors"
              >
                <span className="font-medium flex items-center gap-2">
                  {section.title}
                  {plantillasSeccion.length > 0 && (
                    <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full">
                      {plantillasSeccion.length} plantilla
                      {plantillasSeccion.length > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                {activeSection === idx ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>

              {activeSection === idx && (
                <div className="pl-4 py-2 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {plantillasSeccion.length > 0 && (
                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/10">
                      <p className="text-xs font-semibold text-brand-secondary">
                        Tramitar este servicio · genera un borrador con los datos
                        del cliente
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plantillasSeccion.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setActivaPlantilla(p)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:opacity-90 transition"
                          >
                            <FileText size={15} /> Tramitar: {p.servicio}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {section.content && (
                    <div className="prose prose-sm max-w-none text-gray-600">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {section.subsections.map((sub, sIdx) => (
                    <div key={sIdx} className="flex flex-col gap-2">
                      <h4 className="text-sm font-semibold text-gray-800">
                        {sub.title}
                      </h4>
                      <div className="prose prose-sm max-w-none text-gray-600">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {sub.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <TramitarModal
        plantilla={activaPlantilla}
        onClose={() => setActivaPlantilla(null)}
      />
    </div>
  );
}
