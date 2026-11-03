import type { Cliente, Contacto, Direccion, Proyecto, Suscripcion } from "../tipos";
import { api } from "./api";

export async function listarClientes() {
  const datos = await api<{ clientes: Cliente[] }>("/clientes");
  return datos.clientes;
}

export async function obtenerFichaCliente(id: number) {
  const datos = await api<{ cliente: Cliente; proyectos: Proyecto[]; suscripciones: Suscripcion[] }>(
    `/clientes/${id}`,
  );
  return datos;
}

export async function guardarCliente(cuerpo: Record<string, unknown>, id?: number) {
  if (id) {
    const datos = await api<{ cliente: Cliente }>(`/clientes/${id}`, { method: "PUT", body: cuerpo });
    return datos.cliente;
  }
  const datos = await api<{ cliente: Cliente }>("/clientes", { method: "POST", body: cuerpo });
  return datos.cliente;
}

export async function inactivarCliente(id: number) {
  await api(`/clientes/${id}`, { method: "DELETE" });
}

export async function activarCliente(id: number) {
  await api(`/clientes/${id}/activar`, { method: "POST" });
}

export async function listarContactos(idCliente: number) {
  const datos = await api<{ contactos: Contacto[] }>(`/clientes/${idCliente}/contactos`);
  return datos.contactos;
}

export async function guardarContacto(idCliente: number, cuerpo: Record<string, unknown>, idContacto?: number) {
  if (idContacto) {
    const datos = await api<{ contacto: Contacto }>(`/clientes/${idCliente}/contactos/${idContacto}`, {
      method: "PUT",
      body: cuerpo,
    });
    return datos.contacto;
  }
  const datos = await api<{ contacto: Contacto }>(`/clientes/${idCliente}/contactos`, { method: "POST", body: cuerpo });
  return datos.contacto;
}

export async function eliminarContacto(idCliente: number, idContacto: number) {
  await api(`/clientes/${idCliente}/contactos/${idContacto}`, { method: "DELETE" });
}

export async function listarDirecciones(idCliente: number) {
  const datos = await api<{ direcciones: Direccion[] }>(`/clientes/${idCliente}/direcciones`);
  return datos.direcciones;
}

export async function guardarDireccion(idCliente: number, cuerpo: Record<string, unknown>, idDireccion?: number) {
  if (idDireccion) {
    const datos = await api<{ direccion: Direccion }>(`/clientes/${idCliente}/direcciones/${idDireccion}`, {
      method: "PUT",
      body: cuerpo,
    });
    return datos.direccion;
  }
  const datos = await api<{ direccion: Direccion }>(`/clientes/${idCliente}/direcciones`, {
    method: "POST",
    body: cuerpo,
  });
  return datos.direccion;
}

export async function eliminarDireccion(idCliente: number, idDireccion: number) {
  await api(`/clientes/${idCliente}/direcciones/${idDireccion}`, { method: "DELETE" });
}
