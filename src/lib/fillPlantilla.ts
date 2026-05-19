import type { ClienteDummy, PlantillaDummy } from "./serviciosData";

export type Segmento =
  | { tipo: "texto"; valor: string }
  | { tipo: "campo"; clave: string; valor: string; faltante: boolean };

export interface ResultadoRelleno {
  segmentos: Segmento[];
  faltantes: string[];
}

// Captura los placeholders [CLAVE] como delimitadores al hacer split.
const RE_SPLIT = /(\[[A-Z0-9_]+\])/g;
const RE_ES_TOKEN = /^\[[A-Z0-9_]+\]$/;

/**
 * Función PURA y testeable. Reutilizable 1:1 en R4 con datos reales
 * (cambiar el tipo de `cliente` por la entidad de BD).
 *
 * NUNCA inventa ni infiere datos personales: si no hay valor para un
 * placeholder, el campo queda EN BLANCO (faltante=true) para completarse
 * a mano. Esto es minimización de datos (RGPD), no un detalle estético.
 */
export function rellenarPlantilla(
  plantilla: PlantillaDummy,
  cliente: ClienteDummy,
): ResultadoRelleno {
  const segmentos: Segmento[] = [];
  const faltantes: string[] = [];

  for (const parte of plantilla.cuerpo.split(RE_SPLIT)) {
    if (parte === "") continue;

    if (RE_ES_TOKEN.test(parte)) {
      const clave = parte.slice(1, -1);
      const campoCliente = plantilla.mapping[clave];
      const valor = campoCliente
        ? String(cliente[campoCliente] ?? "").trim()
        : "";
      const faltante = valor === "";
      if (faltante && !faltantes.includes(clave)) faltantes.push(clave);
      segmentos.push({ tipo: "campo", clave, valor, faltante });
    } else {
      segmentos.push({ tipo: "texto", valor: parte });
    }
  }

  return { segmentos, faltantes };
}
