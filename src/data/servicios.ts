export interface Procedimiento {
  id: string;
  nombre: string;
  plantillaId?: string;
  pdfId?: string;
}

export interface Servicio {
  id: string;
  numero: number;
  nombre: string;
  icono: string;
  procedimientos: Procedimiento[];
}

const SERVICIOS_DATA: Servicio[] = [
  {
    id: "inicio-actividad",
    numero: 1,
    nombre: "Servicios de Inicio de Actividad",
    icono: "PlayCircle",
    procedimientos: [
      { id: "alta-autonomo-integral", nombre: "Alta completa como autónomo taxista (paquete integral)", plantillaId: "bienvenida" },
      { id: "alta-reta", nombre: "Alta en Seguridad Social (RETA)" },
      { id: "alta-037", nombre: "Alta censal en Hacienda (Modelo 036/037)", pdfId: "modelo-036" },
      { id: "alta-imet", nombre: "Comunicación de alta al IMET / Ayuntamiento" },
      { id: "tramites-vehiculares-inicio", nombre: "Coordinación de trámites vehiculares iniciales (DGT e ITV)" },
    ],
  },
  {
    id: "cese-actividad",
    numero: 2,
    nombre: "Servicios de Cese de Actividad",
    icono: "StopCircle",
    procedimientos: [
      { id: "baja-autonomo-completa", nombre: "Baja completa como autónomo taxista" },
      { id: "baja-reta", nombre: "Baja en Seguridad Social (RETA)" },
      { id: "baja-037", nombre: "Baja censal en Hacienda (Modelo 037)" },
      { id: "baja-imet", nombre: "Baja o comunicación de cese ante IMET / Ayuntamiento" },
    ],
  },
  {
    id: "modificaciones",
    numero: 3,
    nombre: "Servicios de Modificaciones y Actualizaciones",
    icono: "PenSquare",
    procedimientos: [
      { id: "modificacion-datos-autonomo", nombre: "Modificaciones de datos del autónomo (domicilio, IBAN, estado civil, etc.)" },
      { id: "cambio-base-cotizacion", nombre: "Cambio de base de cotización RETA" },
      { id: "cambio-regimenes", nombre: "Cambio o renuncia de regímenes (IVA e IRPF)" },
      { id: "altas-bajas-vehiculos", nombre: "Altas, bajas y sustituciones de vehículos" },
      { id: "altas-bajas-conductores", nombre: "Altas, bajas y modificaciones de conductores (asalariados o colaboradores familiares)" },
    ],
  },
  {
    id: "fiscales-recurrentes",
    numero: 4,
    nombre: "Servicios Fiscales Recurrentes",
    icono: "FileText",
    procedimientos: [
      { id: "iva-303", nombre: "Gestión trimestral del IVA (Modelo 303) — Régimen simplificado y Régimen general" },
      { id: "irpf-131-130", nombre: "Gestión trimestral del IRPF (Modelo 131 en módulos y Modelo 130 en estimación directa)" },
      { id: "iva-390", nombre: "Declaración anual de IVA (Modelo 390)" },
      { id: "renta-100", nombre: "Declaración de la Renta anual (Modelo 100)" },
      { id: "operaciones-347", nombre: "Declaración de operaciones con terceros (Modelo 347)" },
      { id: "revision-imet-anual", nombre: "Revisión anual de documentación para IMET" },
    ],
  },
  {
    id: "gasoleo-profesional",
    numero: 5,
    nombre: "Servicio de Gasóleo Profesional",
    icono: "Fuel",
    procedimientos: [
      { id: "inscripcion-censo-gasoleo", nombre: "Inscripción en el censo de beneficiarios y solicitud de tarjetas gasóleo profesional" },
      { id: "devoluciones-hidrocarburos", nombre: "Gestión y seguimiento de devoluciones mensuales del Impuesto sobre Hidrocarburos" },
      { id: "declaracion-km", nombre: "Declaración anual de kilómetros recorridos" },
    ],
  },
  {
    id: "licencia-taxi",
    numero: 6,
    nombre: "Gestión de la Licencia de Taxi (IMET y Ayuntamientos)",
    icono: "Award",
    procedimientos: [
      { id: "transferencia-licencia", nombre: "Transferencia de licencia (compraventa)" },
      { id: "sustitucion-vehiculo-imet", nombre: "Sustitución, alta o baja de vehículo adscrito" },
      { id: "alta-conductor-imet", nombre: "Alta de conductor (asalariado o autónomo colaborador)" },
      { id: "revision-documentacion-licencia", nombre: "Revisión anual de documentación de la licencia" },
      { id: "tramites-imet-genericos", nombre: "Trámites genéricos e instancias ante IMET (taxi.amb.cat)" },
    ],
  },
  {
    id: "tramites-vehiculares",
    numero: 7,
    nombre: "Trámites Vehiculares",
    icono: "Car",
    procedimientos: [
      { id: "itv-taxi", nombre: "ITV especial para taxis" },
      { id: "cambio-servicio-dgt", nombre: "Cambio de servicio en DGT (a/desde autotaxi)" },
      { id: "cambio-titularidad-vehiculo", nombre: "Cambio de titularidad del vehículo" },
      { id: "fichas-tecnicas-permisos", nombre: "Gestión de fichas técnicas y permisos de circulación" },
    ],
  },
  {
    id: "defensa-representacion",
    numero: 8,
    nombre: "Servicios de Defensa y Representación",
    icono: "Shield",
    procedimientos: [
      { id: "recursos-multas", nombre: "Recursos y alegaciones contra multas de tráfico y sanciones administrativas" },
      { id: "representacion-inspecciones", nombre: "Representación ante inspecciones de Hacienda, Seguridad Social e IMET" },
      { id: "subvenciones-ayudas", nombre: "Gestión y tramitación de subvenciones y ayudas públicas" },
    ],
  },
  {
    id: "transversales-soporte",
    numero: 9,
    nombre: "Servicios Transversales y de Soporte",
    icono: "Headphones",
    procedimientos: [
      { id: "asesoramiento-inicial", nombre: "Asesoramiento inicial y checklist completo de documentación" },
      { id: "poderes-representacion", nombre: "Formalización y gestión de poderes de representación (REGAP AEAT y otros)", plantillaId: "poder-aeat" },
      { id: "archivo-digital", nombre: "Estructuración y mantenimiento del archivo digital por cliente" },
      { id: "control-plazos", nombre: "Control de plazos, alertas y prevención de recargos y sanciones" },
      { id: "comunicacion-proactiva", nombre: "Comunicación proactiva y entrega de justificantes al cliente" },
      { id: "asesoramiento-continuo", nombre: "Asesoramiento continuo en optimización fiscal, cotizaciones y planificación" },
    ],
  },
];

export function getServicios(): Servicio[] {
  return SERVICIOS_DATA;
  // R2: return await fetch('/api/servicios').then(r => r.json())
}
