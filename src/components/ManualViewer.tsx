'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, ChevronDown } from 'lucide-react';

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

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-2">
        {data.map((section, idx) => (
          <div key={idx} className="border-b border-gray-100 last:border-0 pb-2">
            <button
              onClick={() => setActiveSection(activeSection === idx ? null : idx)}
              className="flex items-center justify-between w-full text-left py-2 hover:text-brand-primary transition-colors"
            >
              <span className="font-medium">{section.title}</span>
              {activeSection === idx ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            
            {activeSection === idx && (
              <div className="pl-4 py-2 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {section.content && (
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                  </div>
                )}
                
                {section.subsections.map((sub, sIdx) => (
                  <div key={sIdx} className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-gray-800">{sub.title}</h4>
                    <div className="prose prose-sm max-w-none text-gray-600">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{sub.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
