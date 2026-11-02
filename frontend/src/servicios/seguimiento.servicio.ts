import type { Asignacion, Avance, Comentario, Empleado, Fase, Tarea } from "../tipos";
import { api } from "./api";

export async function listarFases(idProyecto: number) {
  const datos = await api<{ fases: Fase[] }>(`/proyectos/${idProyecto}/fases`);
  return datos.fases;
}

export async function crearFase(idProyecto: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ fase: Fase }>(`/proyectos/${idProyecto}/fases`, { method: "POST", body: cuerpo });
  return datos.fase;
}

export async function actualizarFase(idProyecto: number, idFase: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ fase: Fase }>(`/proyectos/${idProyecto}/fases/${idFase}`, { method: "PUT", body: cuerpo });
  return datos.fase;
}

export async function eliminarFase(idProyecto: number, idFase: number) {
  await api(`/proyectos/${idProyecto}/fases/${idFase}`, { method: "DELETE" });
}

export async function listarTareas(idProyecto: number) {
  const datos = await api<{ tareas: Tarea[] }>(`/proyectos/${idProyecto}/tareas`);
  return datos.tareas;
}

export async function crearTarea(idProyecto: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ tarea: Tarea }>(`/proyectos/${idProyecto}/tareas`, { method: "POST", body: cuerpo });
  return datos.tarea;
}

export async function actualizarTarea(idProyecto: number, idTarea: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ tarea: Tarea }>(`/proyectos/${idProyecto}/tareas/${idTarea}`, { method: "PUT", body: cuerpo });
  return datos.tarea;
}

export async function eliminarTarea(idProyecto: number, idTarea: number) {
  await api(`/proyectos/${idProyecto}/tareas/${idTarea}`, { method: "DELETE" });
}

export async function listarAvances(idProyecto: number) {
  const datos = await api<{ avances: Avance[] }>(`/proyectos/${idProyecto}/avances`);
  return datos.avances;
}

export async function registrarAvance(idProyecto: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ avance: Avance }>(`/proyectos/${idProyecto}/avances`, { method: "POST", body: cuerpo });
  return datos.avance;
}

export async function listarAsignaciones(idProyecto: number) {
  const datos = await api<{ asignaciones: Asignacion[] }>(`/proyectos/${idProyecto}/asignaciones`);
  return datos.asignaciones;
}

export async function asignarEmpleado(idProyecto: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ asignacion: Asignacion }>(`/proyectos/${idProyecto}/asignaciones`, {
    method: "POST",
    body: cuerpo,
  });
  return datos.asignacion;
}

export async function quitarAsignacion(idProyecto: number, idAsignacion: number) {
  await api(`/proyectos/${idProyecto}/asignaciones/${idAsignacion}`, { method: "DELETE" });
}

export async function listarComentarios(idProyecto: number) {
  const datos = await api<{ comentarios: Comentario[] }>(`/proyectos/${idProyecto}/comentarios`);
  return datos.comentarios;
}

export async function crearComentario(idProyecto: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ comentario: Comentario }>(`/proyectos/${idProyecto}/comentarios`, {
    method: "POST",
    body: cuerpo,
  });
  return datos.comentario;
}

export async function listarEmpleados() {
  const datos = await api<{ empleados: Empleado[] }>("/empleados");
  return datos.empleados;
}
