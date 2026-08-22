import type { Proyecto } from "../tipos";
import { api } from "./api";

export async function listarProyectos() {
  const datos = await api<{ proyectos: Proyecto[] }>("/proyectos");
  return datos.proyectos;
}

export async function obtenerProyecto(id: number) {
  const datos = await api<{ proyecto: Proyecto }>(`/proyectos/${id}`);
  return datos.proyecto;
}

export async function guardarProyecto(cuerpo: Record<string, unknown>, id?: number) {
  if (id) {
    const datos = await api<{ proyecto: Proyecto }>(`/proyectos/${id}`, { method: "PUT", body: cuerpo });
    return datos.proyecto;
  }
  const datos = await api<{ proyecto: Proyecto }>("/proyectos", { method: "POST", body: cuerpo });
  return datos.proyecto;
}

export async function cancelarProyecto(id: number) {
  await api(`/proyectos/${id}`, { method: "DELETE" });
}
