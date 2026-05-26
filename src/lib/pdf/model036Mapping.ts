export type FieldSource = 'db' | 'manual';

export interface PdfFieldMapping {
  pdfFieldName: string; // Internal name or coordinate-label
  label: string;        // Human readable label for the prompt
  source: FieldSource;
  dbField?: string;     // If source is 'db', which field in the Client model
  type: 'text' | 'checkbox' | 'date';
  required: boolean;
  defaultValue?: string;
}

export const MODELO_036_MAPPING: PdfFieldMapping[] = [
  // IDENTIFICACIÓN
  {
    pdfFieldName: 'NIF',
    label: 'NIF / NIE',
    source: 'db',
    dbField: 'nif',
    type: 'text',
    required: true
  },
  {
    pdfFieldName: 'NombreApellidos',
    label: 'Nombre y Apellidos / Razón Social',
    source: 'db',
    dbField: 'nombre',
    type: 'text',
    required: true
  },
  {
    pdfFieldName: 'Telefono',
    label: 'Teléfono de contacto',
    source: 'db',
    dbField: 'telefono',
    type: 'text',
    required: false
  },
  {
    pdfFieldName: 'Email',
    label: 'Correo electrónico',
    source: 'db',
    dbField: 'email',
    type: 'text',
    required: false
  },
  // DOMICILIO (En la DB está como string único, pero el PDF pide campos separados)
  {
    pdfFieldName: 'DomicilioCompleto',
    label: 'Domicilio Fiscal (Completo)',
    source: 'db',
    dbField: 'domicilio',
    type: 'text',
    required: true
  },
  {
    pdfFieldName: 'CP',
    label: 'Código Postal',
    source: 'manual', // No está explícito en el modelo Client como campo separado
    type: 'text',
    required: true
  },
  {
    pdfFieldName: 'Municipio',
    label: 'Municipio',
    source: 'manual',
    type: 'text',
    required: true
  },
  // DATOS ESPECÍFICOS DEL TRÁMITE
  {
    pdfFieldName: 'CausaAlta',
    label: 'Alta en el censo (Casilla 110)',
    source: 'manual',
    type: 'checkbox',
    required: true,
    defaultValue: 'true'
  },
  {
    pdfFieldName: 'FechaInicio',
    label: 'Fecha de inicio de actividad',
    source: 'manual',
    type: 'date',
    required: true
  },
  {
    pdfFieldName: 'ReferenciaCatastral',
    label: 'Referencia Catastral del domicilio fiscal',
    source: 'manual', // No está en el modelo Client actual
    type: 'text',
    required: true
  },
  {
    pdfFieldName: 'IAE',
    label: 'Epígrafe IAE',
    source: 'manual',
    type: 'text',
    required: true,
    defaultValue: '721.2'
  },
  {
    pdfFieldName: 'RegimenIVA',
    label: 'Régimen de IVA (Módulos)',
    source: 'manual',
    type: 'checkbox',
    required: true,
    defaultValue: 'true'
  },
  {
    pdfFieldName: 'RegimenIRPF',
    label: 'Régimen de IRPF (Estimación Objetiva)',
    source: 'manual',
    type: 'checkbox',
    required: true,
    defaultValue: 'true'
  }
];
