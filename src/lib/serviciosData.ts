// Prototipo dummy (spike de R4) — DATOS FICTICIOS. Sin BD / sin auth / sin RGPD.
// Sustituir CLIENTES_DUMMY por la entidad real de BD en R2/R4; el motor de
// relleno (fillPlantilla.ts) se reutiliza 1:1.

export interface ClienteDummy {
  id: string;
  nombre: string;
  nif: string;
  domicilio: string;
  iban: string;
  email: string;
  telefono: string;
  numLicencia: string;
  matricula: string;
  regimen: "Módulos (simplificado)" | "Estimación directa";
}

// NIFs y datos claramente FICTICIOS, solo para validar el flujo.
export const CLIENTES_DUMMY: ClienteDummy[] = [
  {
    id: "c1",
    nombre: "Carlos Martínez Ruiz",
    nif: "00000001R",
    domicilio: "C/ Exemple 12, 3r 1a, 08013 Barcelona",
    iban: "ES00 0000 0000 0000 0000 0001",
    email: "carlos.martinez@example.com",
    telefono: "600 000 001",
    numLicencia: "AMB-1234",
    matricula: "1234 ABC",
    regimen: "Módulos (simplificado)",
  },
  {
    id: "c2",
    nombre: "Lucía Fernández Gómez",
    nif: "00000002W",
    domicilio: "Av. Diagonal 220, 4t 2a, 08018 Barcelona",
    iban: "ES00 0000 0000 0000 0000 0002",
    email: "lucia.fernandez@example.com",
    telefono: "600 000 002",
    numLicencia: "AMB-5678",
    matricula: "5678 DEF",
    regimen: "Estimación directa",
  },
  {
    id: "c3",
    nombre: "Ahmed El Amrani",
    nif: "00000003A",
    domicilio: "C/ Sants 145, bxs, 08028 Barcelona",
    iban: "ES00 0000 0000 0000 0000 0003",
    email: "ahmed.elamrani@example.com",
    telefono: "600 000 003",
    numLicencia: "AMB-9012",
    matricula: "9012 GHI",
    regimen: "Módulos (simplificado)",
  },
];

export interface PlantillaDummy {
  id: string;
  servicio: string;
  descripcion: string;
  /** Substring del título de la sección del índice (manual.json) donde aparece su botón. */
  seccion: string;
  // mapping: PLACEHOLDER -> clave de ClienteDummy. Los placeholders sin entrada
  // aquí (o cuyo dato esté vacío) quedan EN BLANCO y editables a mano.
  mapping: Record<string, keyof ClienteDummy>;
  cuerpo: string;
}

export const PLANTILLAS: PlantillaDummy[] = [
  {
    id: "bienvenida",
    servicio: "Email de bienvenida al cliente",
    descripcion: "Onboarding · Anexo I · Plantilla 3 del manual",
    seccion: "Alta como autónomo",
    mapping: { NOMBRE: "nombre", EMAIL: "email", TLF: "telefono", REGIMEN: "regimen" },
    cuerpo: `Asunto: Bienvenido/a a [ASESORIA] — calendario y documentación inicial

Hola [NOMBRE],

Te damos la bienvenida como nuevo/a cliente de nuestra asesoría. Resumen para los próximos días:

1. Tus altas:
   — Alta RETA con efectos [FECHA_ALTA]. Cuota mensual: [CUOTA] €.
   — Alta modelo 037 con epígrafe 721.2. Régimen IRPF: [REGIMEN].
   — Comunicación al IMET: nº de registro [NUM_REGISTRO_IMET].

2. Próximos vencimientos:
   — Modelo 303 (1T) y 131 (1T): hasta el 20 de abril.
   — Declaración km gasóleo profesional: hasta el 31 de marzo.

3. Contacto:
   — Email: [EMAIL]   — Teléfono: [TLF]

Un cordial saludo,
[ASESOR]
[ASESORIA]`,
  },
  {
    id: "poder-aeat",
    servicio: "Poder de representación voluntaria AEAT",
    descripcion: "Anexo I · Plantilla 1 del manual (art. 46 LGT)",
    seccion: "Recomendaciones generales",
    mapping: { NOMBRE_COMPLETO: "nombre", NIF: "nif", DIRECCION_COMPLETA: "domicilio" },
    cuerpo: `D./Dña. [NOMBRE_COMPLETO], mayor de edad, con NIF [NIF] y domicilio en [DIRECCION_COMPLETA], OTORGA su representación voluntaria, conforme al art. 46 de la Ley 58/2003 General Tributaria, a:

[NOMBRE_ASESORIA], con NIF [NIF_ASESORIA] y domicilio en [DIRECCION_ASESORIA], para que en su nombre y representación realice ante la AEAT los siguientes trámites:

- Presentación de declaraciones y autoliquidaciones (037/036, 303, 130, 131, 390, 100, 347).
- Recepción y contestación de notificaciones y requerimientos.
- Solicitud de certificados de estar al corriente.

En [CIUDAD], a [FECHA].

EL PODERDANTE                         EL APODERADO
[NOMBRE_COMPLETO]                     [NOMBRE_ASESORIA]
NIF: [NIF]                            NIF: [NIF_ASESORIA]`,
  },
];
