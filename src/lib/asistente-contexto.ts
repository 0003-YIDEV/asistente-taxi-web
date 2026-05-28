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

// Señal de refresco: el chat la dispara tras ejecutar una acción; la vista del
// trámite la escucha y se re-fetcha para reflejar el cambio (p. ej. un paso marcado).
let señal = 0;
const señalListeners = new Set<() => void>();
export function pedirRefrescoTramite() {
  señal++;
  señalListeners.forEach((l) => l());
}
function subscribeSeñal(l: () => void) {
  señalListeners.add(l);
  return () => señalListeners.delete(l);
}
export function useSeñalRefresco(): number {
  return useSyncExternalStore(subscribeSeñal, () => señal, () => 0);
}
