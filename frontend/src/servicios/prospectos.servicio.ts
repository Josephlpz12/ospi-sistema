import type { Prospecto } from "../tipos";
import { api } from "./api";

export const FUENTES_PROSPECTO = ["Referido", "Sitio web", "Llamada en frío", "Evento", "Otro"] as const;
export const ESTADOS_PROSPECTO = ["Nuevo", "Contactado", "Calificado", "Descartado", "Convertido"] as const;
export const ESTADOS_ABIERTOS_PROSPECTO = ["Nuevo", "Contactado", "Calificado", "Descartado"] as const;

export function puedeConvertirProspecto(estado: string) {
  return estado === "Contactado" || estado === "Calificado";
}

export async function listarProspectos(filtros: { estado?: string; fuente?: string; incluirCerrados?: boolean }) {
  const params = new URLSearchParams();
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.fuente) params.set("fuente", filtros.fuente);
  if (filtros.incluirCerrados) params.set("incluir_cerrados", "1");
  const consulta = params.toString();
  const datos = await api<{ prospectos: Prospecto[] }>(`/prospectos${consulta ? `?${consulta}` : ""}`);
  return datos.prospectos;
}

export async function obtenerProspecto(id: number) {
  const datos = await api<{ prospecto: Prospecto }>(`/prospectos/${id}`);
  return datos.prospecto;
}

export async function guardarProspecto(cuerpo: Record<string, unknown>, id?: number) {
  if (id) {
    const datos = await api<{ prospecto: Prospecto }>(`/prospectos/${id}`, { method: "PUT", body: cuerpo });
    return datos.prospecto;
  }
  const datos = await api<{ prospecto: Prospecto }>("/prospectos", { method: "POST", body: cuerpo });
  return datos.prospecto;
}

export async function cambiarEstadoProspecto(id: number, estado: string) {
  const datos = await api<{ prospecto: Prospecto }>(`/prospectos/${id}/estado`, { method: "POST", body: { estado } });
  return datos.prospecto;
}

export async function convertirProspecto(id: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ prospecto: Prospecto; id_proyecto: number | null }>(`/prospectos/${id}/convertir`, {
    method: "POST",
    body: cuerpo,
  });
  return datos;
}
