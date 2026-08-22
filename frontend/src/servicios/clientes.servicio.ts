import type { Cliente } from "../tipos";
import { api } from "./api";

export async function listarClientes() {
  const datos = await api<{ clientes: Cliente[] }>("/clientes");
  return datos.clientes;
}

export async function obtenerCliente(id: number) {
  const datos = await api<{ cliente: Cliente }>(`/clientes/${id}`);
  return datos.cliente;
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
