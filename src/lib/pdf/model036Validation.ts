import { z } from "zod";

/**
 * Validación de NIF/NIE (España)
 * Aproximación básica: 8 números + 1 letra (DNI) o 1 letra + 7 números + 1 letra (NIE)
 */
export const nifSchema = z.string().regex(/^[0-9XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i, {
  message: "Formato de NIF/NIE inválido",
});

/**
 * Validación de IBAN (España)
 * ES + 22 dígitos
 */
export const ibanSchema = z.string().regex(/^ES[0-9]{20}$/i, {
  message: "Formato de IBAN (España) inválido. Debe empezar por ES seguido de 20 números.",
});

/**
 * Esquema de validación para los campos manuales del Modelo 036
 */
export const model036ManualInputsSchema = z.object({
  CP: z.string().length(5, "El Código Postal debe tener 5 dígitos").regex(/^[0-9]+$/, "El Código Postal solo debe contener números"),
  Municipio: z.string().min(2, "El Municipio es obligatorio"),
  FechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  ReferenciaCatastral: z.string().length(20, "La Referencia Catastral debe tener 20 caracteres").optional().or(z.literal("")),
  IAE: z.string().min(3, "El epígrafe IAE es obligatorio"),
  CausaAlta: z.enum(["true", "false"]).optional(),
  RegimenIVA: z.enum(["true", "false"]).optional(),
  RegimenIRPF: z.enum(["true", "false"]).optional(),
});

export type Model036ManualInputs = z.infer<typeof model036ManualInputsSchema>;
