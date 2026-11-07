import type { Documento } from "../tipos";
import { API, api, apiFormData, borrarSesion, leerToken } from "./api";

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function abrirDocumento(id: number, nombre: string) {
  const token = leerToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const respuesta = await fetch(`${API}/documentos/${id}`, { headers });
  if (respuesta.status === 401) {
    const datos = (await respuesta.json().catch(() => ({}))) as { mensaje?: string };
    borrarSesion();
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new Error(datos.mensaje ?? "No autenticado");
  }
  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as { mensaje?: string };
    throw new Error(datos.mensaje ?? "No se pudo abrir el documento");
  }
  const blob = await respuesta.blob();
  const disposicion = (respuesta.headers.get("Content-Disposition") ?? "").toLowerCase();
  if (!disposicion.startsWith("inline")) {
    descargarBlob(blob, nombre);
    return;
  }
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url, "_blank");
  if (!ventana) descargarBlob(blob, nombre);
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
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
