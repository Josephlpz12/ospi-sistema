import type { Contrato, Factura, Multa, Producto, Suscripcion } from "../tipos";
import { api } from "./api";

export async function listarProductos() {
  const datos = await api<{ productos: Producto[] }>("/productos");
  return datos.productos;
}

export async function crearSuscripcion(idCliente: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ suscripcion: Suscripcion }>(`/clientes/${idCliente}/suscripciones`, {
    method: "POST",
    body: cuerpo,
  });
  return datos.suscripcion;
}

export async function listarSuscripciones(idCliente: number) {
  const datos = await api<{ suscripciones: Suscripcion[] }>(`/clientes/${idCliente}/suscripciones`);
  return datos.suscripciones;
}

export async function listarContratos(idCliente?: number) {
  const q = idCliente ? `?id_cliente=${idCliente}` : "";
  const datos = await api<{ contratos: Contrato[] }>(`/contratos${q}`);
  return datos.contratos;
}

export async function obtenerContrato(id: number) {
  return api<{ contrato: Contrato; facturas: Factura[]; multas: Multa[] }>(`/contratos/${id}`);
}

export async function crearContrato(cuerpo: Record<string, unknown>) {
  const datos = await api<{ contrato: Contrato }>("/contratos", { method: "POST", body: cuerpo });
  return datos.contrato;
}

export async function crearFactura(idContrato: number, cuerpo: Record<string, unknown>) {
  const datos = await api<{ factura: Factura }>(`/contratos/${idContrato}/facturas`, {
    method: "POST",
    body: cuerpo,
  });
  return datos.factura;
}

export async function revisarFacturasVencidas() {
  return api<{ actualizadas: number }>("/facturas/revisar-vencidas", { method: "POST" });
}

export async function registrarPago(idFactura: number, cuerpo: Record<string, unknown>) {
  return api(`/facturas/${idFactura}/pagos`, { method: "POST", body: cuerpo });
}

export async function aplicarMora(idFactura: number, cuerpo: Record<string, unknown>) {
  return api(`/facturas/${idFactura}/mora`, { method: "POST", body: cuerpo });
}

export async function reactivarContrato(id: number) {
  return api<{ contrato: Contrato; mensaje?: string }>(`/contratos/${id}/reactivar`, { method: "POST" });
}

export async function actualizarMulta(id: number, estado: string) {
  const datos = await api<{ multa: Multa }>(`/multas/${id}`, { method: "PUT", body: { estado } });
  return datos.multa;
}
