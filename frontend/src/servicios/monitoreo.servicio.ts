import type { ProyectoMonitoreo } from "../tipos";
import { api } from "./api";

export async function listarProyectosActivos() {
  const datos = await api<{ proyectos: ProyectoMonitoreo[] }>("/monitoreo/proyectos-activos");
  return datos.proyectos;
}
