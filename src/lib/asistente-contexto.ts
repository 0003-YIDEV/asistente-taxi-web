"use client";

import { useSyncExternalStore } from "react";

// Store mínimo (pub/sub) para que el asistente flotante sepa "dónde estás".
// La vista de un expediente lo fija al abrir y lo limpia al cerrar.
export type ContextoTramite = { expedienteId: string; nombre: string } | null;

let contexto: ContextoTramite = null;
const listeners = new Set<() => void>();

export function setContextoTramite(c: ContextoTramite) {
  contexto = c;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot() {
  return contexto;
}

export function useContextoTramite(): ContextoTramite {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
