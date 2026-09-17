import type { Documento } from "../tipos";
import { api, apiFormData, ARCHIVOS } from "./api";

export function urlDocumento(ruta: string | null) {
  if (!ruta) return "#";
  return `${ARCHIVOS}/${ruta}`;
}

export async function listarDocumentos(filtro: { id_cliente?: number; id_proyecto?: number }) {
  const params = new URLSearchParams();
  if (filtro.id_cliente) params.set("id_cliente", String(filtro.id_cliente));
  if (filtro.id_proyecto) params.set("id_proyecto", String(filtro.id_proyecto));
  const datos = await api<{ documentos: Documento[] }>(`/documentos?${params.toString()}`);
  return datos.documentos;
}

export async function subirDocumento(archivo: File, filtro: { id_cliente?: number; id_proyecto?: number }) {
  const body = new FormData();
  body.append("archivo", archivo);
  if (filtro.id_cliente) body.append("id_cliente", String(filtro.id_cliente));
  if (filtro.id_proyecto) body.append("id_proyecto", String(filtro.id_proyecto));
  const datos = await apiFormData<{ documento: Documento }>("/documentos", body);
  return datos.documento;
}

export async function eliminarDocumento(id: number) {
  await api(`/documentos/${id}`, { method: "DELETE" });
}
